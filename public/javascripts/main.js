$(function() {

    $('#refresh').on('click', function(e) {
       var parameters = {files:'all'};
        
        document.getElementById('waitDialog').style.display = "block";
                      
        $.get('/retrieve', parameters, function(data) {
            $('#mainbox').html(data);
                document.getElementById('waitDialog').style.display = "none";                            
        });    
    });
         
    $('#okUploadConfirmation').on('click', function(e) {

        document.getElementById('confirmationDialog').style.display = "none";
        
    });

    $('#search').on('click', function(e) {
        var parameters = {filter:$('#criteria').val()};
 
        document.getElementById('waitDialog').style.display = "block";
               
        $.get('/search', parameters, function(data) {
            $('#mainbox').html(data);
            document.getElementById('waitDialog').style.display = "none";                            
         });    
    });

    $('#criteria').on('keyup', function(e) {
    
        if (e.keyCode == 13) {
            var parameters = {filter:$('#criteria').val()};
 
            document.getElementById('waitDialog').style.display = "block";
 
            $.get('/search', parameters, function(data) {
                $('#mainbox').html(data);
                document.getElementById('waitDialog').style.display = "none";                
             });
        }        

    });

    $('#selector').on('change', function(e) {

        if ($('#selector').val() != null) {
            $('#filename').val($('#selector').val());
            $('#upload').css("color", "white");
            $('#upload').css("background-color", "#4CAF50");
            $('#upload').prop("disabled" , false);
        }

    });

    $('#upload').on('click', function(e) {

        try {           
            var files = $('#selector').get(0).files;

            var fileData = new FormData();

            for (var iFile = 0; iFile < files.length; iFile++) {
                fileData.append('file', files[iFile]);
            }

            document.getElementById('uploadDialog').style.display = "none";
            document.getElementById('waitDialog').style.display = "block";
            
            $.ajax({
                url: '/upload',
                type: 'POST',
                maxChunkSize: 10000000,
                async: true,
                contentType: false,
                processData: false,
                data: fileData,
                success: function (result) {
                    var parameters = {filter:'all'};

                    $.get('/retrieve', parameters, function(data) {
                        $('#mainbox').html(data);
                        document.getElementById('waitDialog').style.display = "none"; 
                        $('#uploadedFileName').html('Video: \'' + $('#filename').val().replace(/^.*[\\\/]/, '') + '\'');
                        document.getElementById('confirmationDialog').style.display = "block";
                     });   
                     
                },
                xhr: function() {
                    var xhr = $.ajaxSettings.xhr();

                    xhr.upload.addEventListener('progress', function (event) {
                    }, false);
                   
                    xhr.upload.onload = function() {
                    };

                    return xhr;

                },
                error: function (err) {
                    document.getElementById('waitDialog').style.display = "none";  
                    
                    alert('Error: [' + err.status + '] - \'' + err.statusText + '\'');

                    var notification = new Notification("Error in upload", {
                        dir: "auto",
                        lang: "",
                        body:'Error: [' + err.status + '] - \'' + err.statusText + '\'',
                        tag: "Upload Error"

                });
                }
            });
        } catch(e) {
            alert(e);
        }

    
    });

});

$(document).ready(function() {
    var parameters = {filter:'all'};
   
    var modal = document.getElementById('waitDialog');
    modal.style.display = "block";
 
    $.get('/retrieve', parameters, function(data) {
        modal.style.display = "none";
        $('#mainbox').html(data);
      });

    for (var iSpanClose in document.getElementsByClassName("close")) {
        var spanClose =  document.getElementsByClassName("close")[iSpanClose];

        spanClose.onclick = function() {
            var uploadDialog = document.getElementById('uploadDialog');     
            uploadDialog.style.display = "none";

            var playVideoDialog = document.getElementById('playVideoDialog');     
            playVideoDialog.style.display = "none";

            var deleteDialog = document.getElementById('deleteDialog');     
            deleteDialog.style.display = "none";
  
            var confirmationDialog = document.getElementById('confirmationDialog');     
            confirmationDialog.style.display = "none";

            var videoPlayer = document.getElementById('vid1');
            videoPlayer.pause();  
            
            var source = document.getElementById('vid1-source');
            source.setAttribute('src', '');
            videoPlayer.load();

        }

    }

});