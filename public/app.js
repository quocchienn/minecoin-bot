const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const user = tg.initDataUnsafe.user;
const userId = user ? user.id : null;

if (!userId) {
  document.getElementById('status').innerText = 'Không lấy được thông tin người dùng.';
} else {
  const API = '/api';

  // Load dữ liệu user
  fetch(`${API}/user/${userId}`)
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        document.getElementById('status').innerText = data.error;
      } else {
        document.getElementById('balance').innerText = data.balance;
        document.getElementById('energy').innerText = data.energy;
      }
    })
    .catch(() => document.getElementById('status').innerText = 'Lỗi kết nối server');

  // Tap coin
  document.getElementById('coin').addEventListener('click', () => {
    fetch(`${API}/tap/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taps: 1 })
    })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        document.getElementById('status').innerText = data.error;
      } else {
        document.getElementById('balance').innerText = data.balance;
        document.getElementById('energy').innerText = data.energy;
        document.getElementById('status').innerText = '';
      }
    })
    .catch(() => document.getElementById('status').innerText = 'Lỗi khi tap');
  });

  // Claim
  document.getElementById('claimBtn').addEventListener('click', () => {
    fetch(`${API}/claim/${userId}`, { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
        } else {
          document.getElementById('balance').innerText = data.balance;
          alert(data.message || '+100 coin đã nhận!');
        }
      })
      .catch(() => alert('Lỗi khi claim'));
  });
}
