browser.runtime.onMessage.addListener(async (message) => {
  if (message.command === 'scrobbleTrack') {
    const song = message.song;
    const { scrobblerToken: token } = await browser.storage.local.get('scrobblerToken');

    if (!token) {
      console.warn('No scrobbler token available');
      return;
    }

    try {
      const response = await fetch('https://127.0.0.1:5000/scrobbleTrack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(song)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`Scrobble failed:`, error);
      } else {
        console.log(`✅ Track scrobbled:`, song.song_name);
      }
    } catch (err) {
      console.error('Error during scrobble:', err);
    }
  }
});
