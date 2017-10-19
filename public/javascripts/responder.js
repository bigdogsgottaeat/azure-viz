function uploadVideo() {
    var modal = document.getElementById('uploadDialog');
    modal.style.display = "block";

    document.getElementById("filename").value = "";

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
    var play = document.getElementById('play');
    var seekBar = document.getElementById('seekbar');
    
    document.getElementById('playerWait').style.display = 'inline-block';
    document.getElementById('player').style.display = 'none';
    
    seekBar.value = 0;
    downloaded.innerHTML = 'Loading...';
    downloaded.classList.paddingTop = '5px';
    
    videoPlayer.onprogress = function() {
        var end = 0;
      
        if (videoPlayer.buffered.length >= 1) {
            end = videoPlayer.buffered.end(0);
        }
    
        var progress = end / videoPlayer.duration;
        progress = isNaN(progress) ? 0 : progress;

        downloaded.innerHTML = videoPlayer.buffered.end(0);

    };

    videoPlayer.addEventListener("timeupdate", function() {
        var value = (100 / videoPlayer.duration) * videoPlayer.currentTime;
        seekBar.value = value;
    });

    seekBar.addEventListener("change", function() {
        var time = videoPlayer.duration * (seekBar.value / 100);
      
        videoPlayer.currentTime = time;
        play.style.paddingLeft = '6px'
        play.innerHTML = '&#x25BA;';           
        play.style.fontSize = 'small';

    });

    play.style.textAlign  = 'left';
    play.style.marginTop = '3px';
    play.style.paddingLeft = '6px'   

    videoPlayer.onloadstart = function() {
        play.disabled = true;
        play.style.backgroundColor = 'grey';
        play.style.color = 'LightGrey';
        play.style.fontSize = 'small';
        play.innerHTML = '&#x25BA;';         
   };

    videoPlayer.oncanplaythrough = function() {
        play.disabled = false;
        play.style.backgroundColor = 'rgb(0, 122, 204)';
        play.style.color = 'white';
        play.innerHTML = '&#x2590;&#x2590;';
        play.style.fontSize = 'xx-small';
        play.style.paddingLeft = '4px'

        document.getElementById('playerWait').style.display = 'none';
        document.getElementById('player').style.display = 'inline-block';        
 
        videoPlayer.play();        
    };

    play.onclick = function() {

        if (videoPlayer.paused == true) {      
            videoPlayer.play();
            play.innerHTML = '&#x2590;&#x2590;';
            play.style.fontSize = 'xx-small';
            play.style.paddingLeft = '4px'
         } else {
            videoPlayer.pause();
            play.style.paddingLeft = '6px'
            play.innerHTML = '&#x25BA;';           
            play.style.fontSize = 'small';
        }
    };

    videoPlayer.addEventListener('play', function() { 
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

   document.getElementById('waitDialog').style.display = "block";
     
    $.get('/retrieve', parameters, function(data) {
   
        $('#mainbox').html(data);

        document.getElementById('waitDialog').style.display = "none";
 
     });

}

function deleteVideo(uri, name) {  
 
    document.getElementById('deleteDialog').style.display = "block";
    

}