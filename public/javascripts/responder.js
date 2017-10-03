function requestSearch() {
   var parameters = {filter:'all'};
        
    $.get('/retrieve', parameters, function(data) {
   
        $('#mainbox').html(data);

     });

}