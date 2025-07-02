async function getNowPlaying() {
  const titleEl = document.querySelector('.title.ytmusic-player-bar');
  const bylineEl = document.querySelector('.byline.ytmusic-player-bar');
  const albumArtEl = document.querySelector('img.image.style-scope.ytmusic-player-bar');

  let artist = null, album = null, year = null;

  if (bylineEl) {
    const parts = bylineEl.innerText.trim().split(' • ');
    artist = parts[0] || null;
    album = parts[1] || null;
    year = parts[2] || null;
  }

  return {
    title: titleEl ? titleEl.innerText.trim() : null,
    artist,
    album,
    year,
    albumPhotoSrc: albumArtEl ? albumArtEl.src : null
  };
}

let lastSongText = '';

const playerBar = document.querySelector('ytmusic-player-bar');
if (playerBar) {
  const observer = new MutationObserver(async () => {
    const song = await getNowPlaying();
    if (song.title && song.artist) {
      const songText = `${song.title} by ${song.artist}`;
      if (songText !== lastSongText) {
        lastSongText = songText;

        console.log("Sending to the API...");
        browser.runtime.sendMessage({
          command: 'scrobbleTrack',
          song: {
            photo_url: song.albumPhotoSrc,
            song_name: song.title,
            album_name: song.album,
            artist_name: song.artist,
            song_year: song.year
          }
        });

        // Also notify popup or other parts if needed
        browser.runtime.sendMessage({ command: 'updateNowPlaying', song });
      }
    }
  });

  observer.observe(playerBar, { childList: true, subtree: true });

} else {
  console.warn('ytmusic-player-bar not found. Is this YouTube Music?');
}

// Listen to popup request for now playing info
browser.runtime.onMessage.addListener((message) => {
  if (message.command === 'getNowPlaying') {
    return getNowPlaying();
  }
});
