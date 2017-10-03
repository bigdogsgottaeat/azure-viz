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

