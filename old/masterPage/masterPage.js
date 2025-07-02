// Simple SPA navigation logic
const navLinks = document.querySelectorAll('nav a');
const sections = {
  'Now Playing': document.getElementById('now-playing'),
  History: document.getElementById('history'),
  Settings: document.getElementById('settings'),
};

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();

    // Remove active class from all links
    navLinks.forEach(l => l.classList.remove('active'));

    // Add active class to clicked link
    link.classList.add('active');

    // Hide all sections
    Object.values(sections).forEach(section => section.hidden = true);

    // Show selected section
    const selected = link.textContent.trim();
    if (sections[selected]) {
      sections[selected].hidden = false;
    }
  });
});

// Scrobble button logic
const scrobbleBtn = document.getElementById('scrobble-btn');
const historyList = document.getElementById('history-list');

scrobbleBtn.addEventListener('click', () => {
  const title = document.querySelector('.track-title').textContent;
  const artist = document.querySelector('.track-artist').textContent;
  const album = document.querySelector('.track-album').textContent;

  const timestamp = new Date().toLocaleString();

  const listItem = document.createElement('li');
  listItem.textContent = `${timestamp} - ${artist} - ${title} (${album})`;
  historyList.prepend(listItem);

  alert(`Scrobbled: ${artist} - ${title}`);
});

// Settings form logic
const settingsForm = document.getElementById('settings-form');

settingsForm.addEventListener('submit', e => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const apikey = document.getElementById('apikey').value.trim();

  if (!username || !apikey) {
    alert('Please fill in both Username and API Key.');
    return;
  }

  // Save to localStorage (or send to backend)
  localStorage.setItem('scrobbler_username', username);
  localStorage.setItem('scrobbler_apikey', apikey);

  alert('Settings saved!');
});

// Load saved settings on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedUsername = localStorage.getItem('scrobbler_username');
  const savedApiKey = localStorage.getItem('scrobbler_apikey');

  if (savedUsername) document.getElementById('username').value = savedUsername;
  if (savedApiKey) document.getElementById('apikey').value = savedApiKey;
});
