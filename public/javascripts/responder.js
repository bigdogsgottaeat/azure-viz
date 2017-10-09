function uploadVideo() {
    var modal = document.getElementById('uploadDialog');
    modal.style.display = "block";

 }

 
 /**
   * Video Player - to play selected videos
   *
   * @param {String} uri
   * @api private
   */
function playVideo(uri) {
    var modal = document.getElementById('playVideoDialog');
    modal.style.display = "block";

    var videoPlayer = document.getElementById('vid1');
    var source = document.getElementById('vid1-source');
    var downloaded = document.getElementById('downloaded');
    
    videoPlayer.onprogress = function() {
        var end = 0;
      
        if (videoPlayer.buffered.length >= 1) {
            end = videoPlayer.buffered.end(0);
        }
    
        var progress = end / videoPlayer.duration;
        progress = isNaN(progress) ? 0 : progress;

       downloaded.innerHTML = videoPlayer.buffered.end(0);

    };

    videoPlayer.onloadstart = function() {
        alert('onloadstart ');
    };

    videoPlayer.oncanplaythrough = function() {
        alert('oncanplaythrough ');
    };

    videoPlayer.addEventListener('play', function() { 
   //     var play = document.getElementById('play');
    //    play.innerHTML = '<span id="pauseButton">&#x2590;&#x2590;</span>';
    }, false); 


    videoPlayer.load();
    
    source.setAttribute('src', uri);
    
}

 /**
   * Request to search the Video Library
   *
   * @api private
   */
function requestSearch() {
   var parameters = {filter:'all'};
        
    $.get('/retrieve', parameters, function(data) {
   
        $('#mainbox').html(data);

     });

}