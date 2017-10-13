
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

var compiledCard = pug.compileFile('./views/card.pug')
var blobSvc = azure.createBlobService('tsoblob1', 'ueeY47IjZthiit45wMvVzecnqnkxJnoz0EPfxLHA5gJNGBKRuF7RsBOPHrQ2Ou2QBFNbj+RqP+k89srwPssDaQ==');      
var tableSvc = azure.createTableService('tsoblob1', 'ueeY47IjZthiit45wMvVzecnqnkxJnoz0EPfxLHA5gJNGBKRuF7RsBOPHrQ2Ou2QBFNbj+RqP+k89srwPssDaQ==');      
var indexerSvc = new vindexer('55fdf694c6844b27996f06384fa210b8');
var entGen = azure.TableUtilities.entityGenerator;

var videos = {};

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/search:filter?', function(req, res, next) {

  var filter = req.param('filter')

  if (filter.length == 0) {
    retrieveVideos(req, res, next);
    return;
  }

  console.log('Search: '  + filter);
  
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

app.get('/delete:videoId?', function(req, res, next) {
});
  
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

      console.log("Name: '" + name + "' - [" + size + "] - uploading");
      
      streamVideo(name, part, size, function(error) {

        if (!error) {
          res.send('Video: \'' + name + ' - uploaded')
        } else {
          console.log('Error: ' + error);          
          res.send({'Error': error});
        }

      });

    } else {
      form.handlePart(part);
    }

  })
  .on('err', function(err) {
    console.log('Error:' + err);
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


function streamVideo(name, part, size, callback) {
  
  blobSvc.createContainerIfNotExists('videos', {
       publicAccessLevel: 'blob'
    }, 
    function(error, result, response) {
   
      blobSvc.createBlockBlobFromStream('videos', name, part, size, function (error) {
      
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
  
function retrieveVideos(req, res, next) {
  
  blobSvc.listBlobsSegmented('videos', null, function(error, result, response) {
    var entries = result.entries;
    
    if (!result) {
      blobSvc.createContainerIfNotExists('videos', {
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
function indexVideo(name, size, callback) {
  
  indexerSvc.uploadVideo({
        // Optional
        videoUrl: 'https://tsoblob1.blob.core.windows.net/videos/' + name,
        name:  name,
        externalId: name
    })
    .then( function(result) { 
      var videoId = result.body;
      
      console.log('File: \'' + name + '\' -  [' + size + '] - {' + videoId + '} - indexed');
        
      tableSvc.createTableIfNotExists('vizvideos', function(error, result, response) {                
 
        var video = {
          PartitionKey: entGen.String('part1'),                    
          RowKey: entGen.String(name),
          VideoId: entGen.String(videoId),
          Size: entGen.Int64(size),
        };

        tableSvc.insertEntity('vizvideos', video, function(error, result, response) {
          if (error) {
            console.log('Insert: ' + error);
          } else {
            videos[name] = video;
            
            console.log("Entity: '" + name + "' - {" + videoId + "} - registered" - " + result");

          }

          callback(error, video);

        });

    });

  });

}

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

function buildCard(video, callback) {

  callback(false, compiledCard({
    name: video.RowKey._,
    createTime: (video.Timestamp) ? video.Timestamp._ : '...',
    userName:'<unknown>',
    id: 'https://tsoblob1.blob.core.windows.net/videos/' + video.RowKey._,
    imageUrl: video.thumbnailUrl._.toString().endsWith('000000000000') ? '/icons/missing-image.svg' :
              video.thumbnailUrl._
  }));

}

function getMetadata(name, result, callback) {

  var video = null;
  
  tableSvc.createTableIfNotExists('vizvideos', function(error, result, response) {            

    tableSvc.retrieveEntity('vizvideos', 'part1', name, function(error, result, response) {  
     
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
        videoUrl: 'https://tsoblob1.blob.core.windows.net/videos/' + name,
        name:  name,
        externalId: name
  })
    .then( function(result) { 
   
      var videoId = JSON.parse(result.body);

      if (!videoId.statusCode && !videoId.ErrorType) {       
      
        console.log("Video: '" + name + "' - reindexed - [" + result.body + "]");
      
        getIndexMetadata(video);
      
      } else {
   
        console.log("Video: '" + name + "' - reindexed (ERROR) - [" + result.body + "]");
        
      }
      
  });

}

function getIndexMetadata(video) {
 
  indexerSvc.getBreakdown(JSON.parse(video.VideoId._))
      .then( function(result) {      
    
 
    try {
     var breakdown = JSON.parse(result.body);
    } catch (e) {
      console.log('Breakdown [JSON.parse]: ' + e);
      return;
    }
   
    if (breakdown.ErrorType) {
      console.log('Index Metadata - Error: \'' + breakdown.ErrorType + '\'');
      return;
    }

    video.thumbnailUrl = entGen.String(breakdown.summarizedInsights.thumbnailUrl);
    video.userName = entGen.String(breakdown.summarizedInsights.userName);
    video.createTime = entGen.String(breakdown.summarizedInsights.createTime);
      
    tableSvc.replaceEntity('vizvideos', video, function(error, result, response) {
        
      if (error) {
        console.log('Replace: ' + error);
      } else {
        console.log("Video: '" + video.RowKey._ + "' - replaced");
      }  

    });

  });

}