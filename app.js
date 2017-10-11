
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

var thumbnailUrlMap = {};

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.all('/retrieve', function(req, res, next) {
  
  var cards = "";
  
  blobSvc.listBlobsSegmented('videos', null, function(error, result, response) {

     for (var iBlob in result.entries) {

      var imageUrl = '/icons/video.svg';
      if (!thumbnailUrlMap[result.entries[iBlob].name]) {
         getImage(result.entries[iBlob].name);
      } else {
        imageUrl = thumbnailUrlMap[result.entries[iBlob].name];
      }

      console.log('Image Url: ' + imageUrl);

      cards += compiledCard({
        name: result.entries[iBlob].name,
        createTime: result.entries[iBlob].lastModified,
        userName:'Alex De Gruiter',
        id: 'https://tsoblob1.blob.core.windows.net/videos/' + result.entries[iBlob].name,
        imageUrl: imageUrl
      });

     }
     
     res.send(cards);
     
  });

});

app.post('/upload', function (req, res, next) { 
  var form = new multiparty.Form();

  var files = [];

  form
  .on('part', function(part) {

    if (part.filename) {
      files.push(part.filename);

      var size = part.byteCount - part.byteOffset;
      var name = part.filename;

      console.log("Name: '" + name + "' - [" + size + "] - uploading");
      
      blobSvc.createContainerIfNotExists('videos', {
          publicAccessLevel: 'blob'
        }, function(error, result, response) {
          if (!error) {
            console.log('Container: \'videos\' - created');         
          }
        });

      blobSvc.createBlockBlobFromStream('videos', name, part, size, function (error) {
        if (!error) {
          console.log('File: \'' + name + '\' -  [' + size + '] - uploaded');
          res.send('File: \'' + name + '\' - uploaded');
          
          indexVideo(name, size);
             
       } else {
          console.log('Error: ' + error);          
          res.send({'Error': error});
        }

      })

    } else {
      form.handlePart(part);
    }

  })
  .on('err', function(err) {
    console.log('Error:' + err);
    res.send(err)
  })
  .on('end', function() {
    res.end('received all files');    
  });

  form.parse(req);
   
});

app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port: \'' + app.get('port') +'\'');
});

function indexVideo(name, size) {
  
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
        var entGen = azure.TableUtilities.entityGenerator;

        var entity = {
          PartitionKey: entGen.String('part1'),                    
          RowKey: entGen.String(name),
          VideoId: entGen.String(videoId),
          Size: entGen.Int64(size)
        };
          
        tableSvc.insertEntity('vizvideos', entity, function(error, result, response) {
          if (error) {
            console.log('Insert: ' + error);
          } else {
            console.log("Entity: '" + name + "' - [" + size + "] - {" + videoId + "} - registered");
          }
        });

    });

  });

}
  
function getImage(name) {

  tableSvc.createTableIfNotExists('vizvideos', function(error, result, response) {                
      
  tableSvc.retrieveEntity('vizvideos', 'part1', name, function(error, result, response) {
        if (!error) {
          var entity = result;

          if (entity.thumbnailUrl._) {
            thumbnailUrlMap[name] = entity.thumbnailUrl._;
            console.log("Map: '" + name + "' : '" + entity.thumbnailUrl._ + "'- updated");
            
            return;
          }
          
          indexerSvc.getBreakdown(entity.VideoId._.replace(/\"/g, ''))
              .then( function(result) {             
              var breakdown = JSON.parse(result.body);

              console.log(breakdown.summarizedInsights.thumbnailUrl);

              var entGen = azure.TableUtilities.entityGenerator;
              
              entity.thumbnailUrl = entGen.String(breakdown.summarizedInsights.thumbnailUrl);
              
              tableSvc.replaceEntity('vizvideos', entity, function(error, result, response) {
              
                if (error) {
                  console.log('Replace: ' + error);
                } else {
                  console.log("Entity: '" + entity.RowKey._ + "' + '" + breakdown.summarizedInsights.thumbnailUrl + "'- replaced");
                }    
              });

           });

        }

      });

    });

}