
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

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.all('/retrieve', function(req, res, next) {
  console.log('retrieving');
  
  var cards = "";
  
  blobSvc.listBlobsSegmented('videos', null, function(error, result, response) {

     for (var iBlob in result.entries) {

      cards += compiledCard({
        name: result.entries[iBlob].name,
        createTime: result.entries[iBlob].lastModified,
        userName:'Alex De Gruiter',
        id: 'https://tsoblob1.blob.core.windows.net/videos/' + result.entries[iBlob].name 
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

      console.log("Name: '" + name + "' - '" + size + "'");
      
      blobSvc.createBlockBlobFromStream('videos', name, part, size, function (error) {
        console.log(error);
        res.send({'Azure': error});
      })

    } else {
      form.handlePart(part);
    }

  })
  .on('err', function(err) {
    console.log(err);
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
