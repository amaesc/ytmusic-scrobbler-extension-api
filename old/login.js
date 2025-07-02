document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault(); // Stop normal form submit

  const username = this.username.value;
  const password = this.password.value;

  try {
    const response = await fetch('http://127.0.0.1:5000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById('loginResult').innerText = 'Login successful!';
      window.location.href = "/masterPage/masterPage.html";
    } else {
      document.getElementById('loginResult').innerText = `Login failed: ${data.error}`;
    }
  } catch (err) {
    document.getElementById('loginResult').innerText = `Error: ${err.message}`;
  }
});
