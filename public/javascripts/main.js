$(function() {

    $('#criteria').on('keyup', function(e) {
    
        if (e.keyCode == 13) {
            var parameters = {filter:'all'};
            $.get('/retrieve', parameters, function(data) {
                $('#mainbox').html(data);
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
                type: "POST",
                contentType: false,
                processData: false,
                data: fileData,
                success: function (result) {
                   
                    var parameters = {filter:'all'};
                    $.get('/retrieve', parameters, function(data) {
                        $('#mainbox').html(data);
                     });   
                     
                     document.getElementById('waitDialog').style.display = "none";
                     
                },
                xhr: function() {
                    var xhr = $.ajaxSettings.xhr();

                    xhr.upload.onprogress = function(evt) {
                    }
                    xhr.upload.onload = function() {
                   };

                    return xhr;

                },
                error: function (err) {
                    document.getElementById('waitDialog').style.display = "none";  

                    var notification = new Notification("Error in uploaded", {
                        dir: "auto",
                        langg: "",
                        body: "Error in uploading file",
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

    var spanClose = document.getElementsByClassName("close")[0];
      
    spanClose.onclick = function() 
    {
        var uploadDialog = document.getElementById('uploadDialog');
        
        uploadDialog.style.display = "none";
          
    }

});