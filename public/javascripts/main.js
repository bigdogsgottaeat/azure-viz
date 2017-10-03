$(function() {

    $('#criteria').on('keyup', function(e) {
        var parameters = {filter:'all'};

        if (e.keyCode == 13) {
            $.get('/retrieve', parameters, function(data) {
                $('#mainbox').html(data);
             });
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