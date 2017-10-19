
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var azure = require('azure-storage');
var pug = require('pug');
var multiparty = require('multiparty');
var os = require('os');
var vindexer = require("video-indexer");

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var compiledCard = pug.compileFile('./views/card.pug');

var config = require('./config.json');

var blobSvc = azure.createBlobService(process.env.AZURE_BLOB_SERVICE || config.blobService, process.env.AZURE_BLOB_STORAGE_KEY || config.blobKey);      
var tableSvc = azure.createTableService(process.env.AZURE_BLOB_SERVICE || config.blobService, process.env.AZURE_BLOB_TABLE_KEY || config.tabKey);      
var indexerSvc = new vindexer(process.env.VIDEO_INDEXER_SUBSCRIPTION || config.videoSub);
var entGen = azure.TableUtilities.entityGenerator;

var blobContainer =  process.env.AZURE_BLOB_CONTAINER || config.blobContainer;
var blobTable =  process.env.AZURE_BLOB_TABLE || config.blobTable;
var blobPart =  process.env.AZURE_BLOB_PART || config.blobPart;

var videos = {};

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

function logMessage(message) {
  
      console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + '[INFO] ' + message);
  
}
function logError(message) {
  
      console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' [ERROR] ' + message);
  
}
  
/**
 *  Respond to Search Request
 * 
 *  @param {string} uri The search Uri
 *  @param {function} callback The callback function to process the Http Request
 * 
 */
app.get('/search:filter?', function(req, res, next) {
  var filter = req.param('filter');

  if (filter.length == 0) {
    retrieveVideos(req, res, next);
    return;
  }

  indexerSvc.search({
          // Optional 
          privacy: 'Private',
          query:filter,
          pageSize: 10,
          searchInPublicAccount: false
  }) .then( function(result) { 
            var resultBreakdown = JSON.parse(result.body); 
            var iCard = 1;
            var cards =  "";
            
            if (resultBreakdown.results.length == 0) {
              res.send();
              return;
            }

            for (var iResult in resultBreakdown.results) {       
 
              createCard(resultBreakdown.results[iResult].name, resultBreakdown.results[iResult], function(error, card) {               
                
                if (!error) {
                  cards += card;
                }
                
                if (iCard == resultBreakdown.results.length) {
                  res.send(cards);
                }

                iCard += 1;

              });

            }
      
   });

});

/**
 * Respond to Get Request - Delete Video
 * 
 * @param {string} filter The URI Filter
 * @param {function} responder The responder to the web application
 * 
 */
app.get('/delete:videoId?', function(req, res, next) {
  var name = req.param('video');

  tableSvc.retrieveEntity(blobTable, blobPart, name, function(error, result, response) {  
     if (!error) {
       video = result;
       blobSvc.deleteBlob(blobContainer, name, function(error, response) {
          if (!error) { 
            logMessage('Video Blob - \'' + name + '\' - deleted');
          } else {
            logError(error);  
          }

       });

       Vindexer.deleteBreakdown(JSON.parse(video.VideoId._), {
          deleteInsights: true
       })
      .then( function(result) { 
        logMessage('Video Breakdown - \'' + JSON.parse(video.VideoId._) + '\' - deleted'); 
      });

    } else {
      logError(error);  
    }

  });

});

/**
 * Respond to Get Request - Retrieve all Videos
 * 
 * @param {string} filter The URI Filter
 * @param {function} responder The responder to the web application
 * 
 */
app.all('/retrieve', function(req, res, next) {

  retrieveVideos(req, res, next);

});

app.post('/upload', function (req, res, next) { 
  var form = new multiparty.Form();
  var files = [];

  form
  .on('part', function(part) {

    if (part.filename) {
      var size = part.byteCount;
      var name = part.filename;

      logMessage("Uploading Part - '" + name + "' - '" + size + "'");
      
      streamVideo(name, part, size, function(error) {

        if (!error) {
          logMessage("Uploaded Part '" + name + "' - '" + size + "'");
          
          res.send('Video: \'' + name + ' - uploaded');
        } else {
          logError(error);          
          res.send({'Error': error});
        }

      });

    } else {
      form.handlePart(part);
    }

  })
  .on('err', function(err) {

    logError(err);
    res.send(err)

  })
  .on('end', function() {
    res.end('Received all files');    
  });

  form.parse(req);
   
});

app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port: \'' + app.get('port') +'\'');
});

/**
 * Stream the Video
 * 
 * @param {string} name 
 * @param {string} part 
 * @param {integer} size 
 * @param {function} callback 
 */
function streamVideo(name, part, size, callback) {
  
  blobSvc.createContainerIfNotExists(blobContainer, {
       publicAccessLevel: 'blob'
    }, 
    function(error, result, response) {
   
      blobSvc.createBlockBlobFromStream(blobContainer, name, part, size, function (error) {
      
        if (!error) {      
            indexVideo(name, size, function(error, video) {
            callback(error); 
          });
  
        } else {
          callback(error); 
        } 
  
      });        
  
   });
  
}

/**
 * List all the Blobs within a container 
 * 
 * @param {*} req the HTTP request
 * @param {*} res the HTTP response
 * @param {*} next 
 */
function retrieveVideos(req, res, next) {
  
  blobSvc.listBlobsSegmented(blobContainer, null, function(error, result, response) {
    var entries = result.entries;
    
    if (!result) {
      blobSvc.createContainerIfNotExists(blobContainer, {
        publicAccessLevel: 'blob'
        }, 
        function(error, result, response) {
        });
         
        res.send();
        return;

    } else {
   
      if (result.entries.length == 0) {
        res.send();
        return;
      }
   
      var iCard = 0;
      var cards = "";
   
      for (var iEntry in result.entries) {
   
        createCard(result.entries[iEntry].name, null, function(error, card) {
             
          if (!error) {
            cards += card;
          }
   
          iCard += 1;
   
          if (iCard == result.entries.length) {
            res.send(cards);
          }
   
        });
   
      }

    }   

  });
   
}

/**
 * Call the Video Indexer
 * 
 * @param {string} name the video's filename 
 * @param {integer} size the video's size
 * @param {function} callback called when the function has completed 
 */
function indexVideo(name, size, callback) {
  
  indexerSvc.uploadVideo({
        // Optional
        videoUrl: 'https://tsoblob1.blob.core.windows.net/' + blobContainer +'/' + name,
        name:  name,
        externalId: name
    })
    .then( function(result) { 
      var videoId = result.body;
      
      logMessage('File: \'' + name + '\' -  [' + size + '] - (' + videoId + ') - indexed');
        
      tableSvc.createTableIfNotExists(blobTable, function(error, result, response) {                
 
        var video = {
          PartitionKey: entGen.String(blobPart),                    
          RowKey: entGen.String(name),
          VideoId: entGen.String(videoId),
          Size: entGen.Int64(size),
        };

        tableSvc.insertEntity(blobTable, video, function(error, result, response) {
          
          if (error) {

            logError(error);
          
          } else {
            videos[name] = video;
            
            logMessage("Entity: '" + name + "' - {" + videoId + "} - registered");

          }

          callback(error, video);

        });

    });

  });

}

/**
 * Call the Video Indexer
 * 
 * @param {string} name the video's filename 
 * @param {*} result the result
 * @param {function} callback called when the function has completed 
 */
function createCard(name, result, callback) {

  if (!videos[name] || !(videos[name].thumbnailUrl)) {
     
    getMetadata(name, result, function(error, video) {
    
    if (!error) {
      buildCard(video, callback);
    } else {
      callback(error, null);
    }
    
   })

  } else {
    
    buildCard(videos[name], callback);
    
  }

}

/**
 * Build the Card
 * 
 * @param {*} video 
  * @param {function} callback called when the function has completed 
 */
function buildCard(video, callback) {

  callback(false, compiledCard({
    name: video.RowKey._,
    createTime: (video.Timestamp) ? video.Timestamp._ : '...',
    userName:'<unknown>',
    id: 'https://tsoblob1.blob.core.windows.net/' + blobContainer + '/' + video.RowKey._,
    imageUrl: video.thumbnailUrl._.toString().endsWith('000000000000') ? '/icons/missing-image.svg' :
              video.thumbnailUrl._
  }));

}

function getMetadata(name, result, callback) {

  var video = null;
  
  tableSvc.createTableIfNotExists(blobTable, function(error, result, response) {            

    tableSvc.retrieveEntity(blobTable, blobPart, name, function(error, result, response) {  
     
      if (!error) {
 
        video = result;
        
        videos[name] = video;
      
        if (video.thumbnailUrl) {

           callback(null, video);            
        
       } else {
           var videoId = JSON.parse(video.VideoId._);
         
          video.thumbnailUrl = entGen.String('/icons/processing-image.svg');
          
          if (!videoId.statusCode && !videoId.ErrorType) {
            callback(null, video);          
            getIndexMetadata(video);
          } else {
            callback(null, video);     
            reindexVideo(name, video);               
          }

        }

      } else {

        callback(error, null);
      
      }

    });

  });

}

function reindexVideo(name, video) {
  
  indexerSvc.uploadVideo({
        // Optional
        videoUrl: 'https://tsoblob1.blob.core.windows.net/' + blobContainer + "/" +  name,
        name:  name,
        externalId: name
  })
    .then( function(result) { 
   
      var videoId = JSON.parse(result.body);

      if (!videoId.statusCode && !videoId.ErrorType) {       
      
        logMessage("Video: '" + name + "' - reindexed - [" + result.body + "]");
      
        getIndexMetadata(video);
      
      } else {
   
        logMessage("Video: '" + name + "' - reindexed (ERROR) - [" + result.body + "]");
        
      }
      
  });

}

function getIndexMetadata(video) {
 
  indexerSvc.getBreakdown(JSON.parse(video.VideoId._))
      .then( function(result) {      
    
 
    try {
     var breakdown = JSON.parse(result.body);
    } catch (e) {
      logError('Breakdown [JSON.parse]: ' + e);
      return;
    }
   
    if (breakdown.ErrorType) {
      logMessage('Index Metadata - Error: \'' + breakdown.ErrorType + '\'');
      return;
    }

    video.thumbnailUrl = entGen.String(breakdown.summarizedInsights.thumbnailUrl);
    video.userName = entGen.String(breakdown.summarizedInsights.userName);
    video.createTime = entGen.String(breakdown.summarizedInsights.createTime);
      
    tableSvc.replaceEntity(blobTable, video, function(error, result, response) {
        
      if (error) {
        logError('Replace: ' + error);
      } else {
        logMessage("Video: '" + video.RowKey._ + "' - replaced");
      }  

    });

  });

}