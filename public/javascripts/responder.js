function uploadVideo() {
    var modal = document.getElementById('uploadDialog');
    modal.style.display = "block";

 }

function requestSearch() {
   var parameters = {filter:'all'};
        
    $.get('/retrieve', parameters, function(data) {
   
        $('#mainbox').html(data);

     });

}