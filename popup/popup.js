document.addEventListener('DOMContentLoaded', () => {
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const messageEl = document.getElementById('message');

  const authSection = document.getElementById('auth-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const logoutBtn = document.getElementById('logout-btn');

  function showSection(sectionId) {
    authSection.style.display = 'none';
    dashboardSection.style.display = 'none';

    if (sectionId === 'auth') {
      authSection.style.display = 'block';
    } else if (sectionId === 'dashboard') {
      dashboardSection.style.display = 'block';
    }
  }

  function switchTab(tab) {
    if (tab === 'login') {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
      clearMessage();
    } else {
      registerTab.classList.add('active');
      loginTab.classList.remove('active');
      registerForm.classList.add('active');
      loginForm.classList.remove('active');
      clearMessage();
    }
  }

  loginTab.addEventListener('click', () => switchTab('login'));
  registerTab.addEventListener('click', () => switchTab('register'));

  function clearMessage() {
    messageEl.textContent = '';
    messageEl.className = '';
  }

  function showMessage(text, isSuccess = false) {
    messageEl.textContent = text;
    messageEl.className = isSuccess ? 'success' : '';
  }

  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    clearMessage();

    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    if (!email || !password) {
      showMessage('Please fill in all fields.');
      return;
    }

    fetch('https://127.0.0.1:5000/loginUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(response => response.json().then(data => ({ status: response.status, body: data })))
    .then(({ status, body }) => {
      if (status === 200) {
        browser.storage.local.set({ 
          isLoggedIn: true, 
          userEmail: email, 
          scrobblerToken: body.token 
        }).then(() => {
          showMessage('Logged in successfully!', true);
          setTimeout(() => {
            showSection('dashboard');
            browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
              browser.tabs.sendMessage(tabs[0].id, { command: 'getNowPlaying' }).then((song) => {
                if (song) {
                  updateDashboard(song);
                } else {
                  updateDashboard(null);
                }
              }).catch(err => {
                console.error('Error fetching now playing song:', err);
                updateDashboard(null);
              });
            });
          }, 500);
        });
      } else {
        showMessage(body.error || 'Login failed');
      }
    })
    .catch(err => {
      console.error('Login error:', err);
      showMessage('Could not connect to server');
    });
  });

  registerForm.addEventListener('submit', e => {
    e.preventDefault();
    clearMessage();

    const email = registerForm.email.value.trim();
    const password = registerForm.password.value;
    const passwordConfirm = registerForm['password-confirm'].value;

    if (!email || !password || !passwordConfirm) {
      showMessage('Please fill in all fields.');
      return;
    }

    if (password !== passwordConfirm) {
      showMessage('Passwords do not match.');
      return;
    }

    fetch('https://127.0.0.1:5000/addNewUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(response => response.json().then(data => ({ status: response.status, body: data })))
    .then(({ status, body }) => {
      if (status === 201) {
        showMessage('Registered successfully! You can now log in.', true);
        setTimeout(() => {
          switchTab('login');
        }, 1500);
      } else {
        showMessage(body.error || 'Registration failed');
      }
    })
    .catch(err => {
      console.error('Registration error:', err);
      showMessage('Could not connect to server');
    });
  });

  logoutBtn.addEventListener('click', () => {
    browser.storage.local.remove(['isLoggedIn', 'userEmail', 'scrobblerToken']).then(() => {
      showMessage('Logged out.', true);
      showSection('auth');
      switchTab('login');
    });
  });

  browser.storage.local.get(['isLoggedIn', 'userEmail']).then((result) => {
    if (result.isLoggedIn) {
      showSection('dashboard');
      // Fetch song info on popup load if logged in
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        browser.tabs.sendMessage(tabs[0].id, { command: 'getNowPlaying' }).then((song) => {
          if (song) {
            updateDashboard(song);
          } else {
            updateDashboard(null);
          }
        }).catch(err => {
          console.error('Error fetching now playing song:', err);
          updateDashboard(null);
        });
      });
    } else {
      showSection('auth');
    }
  });
});

browser.runtime.onMessage.addListener((message) => {
  if (message.command === 'updateNowPlaying') {
    updateDashboard(message.song);
  }
});

function updateDashboard(song) {
  const currentPhoto = document.getElementById('current-photo');
  const currentSong = document.getElementById('current-song');
  const currentArtist = document.getElementById('current-artist');
  const currentAlbum = document.getElementById('current-album');
  const currentYear = document.getElementById('current-year');

  if (song && song.title && song.artist) {
    currentPhoto.src = song.albumPhotoSrc || '';
    currentPhoto.alt = song.albumPhotoSrc ? 'Album cover' : 'No album image';
    currentSong.textContent = song.title || 'Unknown Title';
    currentArtist.textContent = song.artist || 'Unknown Artist';
    currentAlbum.textContent = song.album || 'Unknown Album';
    currentYear.textContent = song.year || '';
  } else {
    currentPhoto.src = '';
    currentPhoto.alt = 'No album image';
    currentSong.textContent = 'No song detected.';
    currentArtist.textContent = '-';
    currentAlbum.textContent = '-';
    currentYear.textContent = '';
  }
}


document.getElementById('history-btn').addEventListener('click', () => {
  browser.tabs.create({
    url: browser.runtime.getURL('../history/history.html')
  });
});


document.getElementById('settings-btn').addEventListener('click', () => {
  browser.tabs.create({
    url: browser.runtime.getURL('../settings/settings.html')
  });
});
