const tg = window.Telegram.WebApp;
tg.ready();
tg.expand(); // Full screen

const user = tg.initDataUnsafe.user;
const userId = user ? user.id : null;

if (!userId) {
    document.getElementById('status').innerText = 'Không lấy được user ID. Thử mở lại từ bot.';
} else {
    const API_BASE = '/api'; // Vì cùng domain

    // Load user data
    fetch(`${API_BASE}/user/${userId}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('balance').innerText = data.balance;
            document.getElementById('energy').innerText = data.energy;
        });

    // Tap event
    const coin = document.getElementById('coin');
    coin.addEventListener('click', () => {
        fetch(`${API_BASE}/tap/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taps: 1 })
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    document.getElementById('status').innerText = data.error;
                } else {
                    document.getElementById('balance').innerText = data.balance;
                    document.getElementById('energy').innerText = data.energy;
                }
            });
    });

    // Claim button
    document.getElementById('claimBtn').addEventListener('click', () => {
        fetch(`${API_BASE}/claim/${userId}`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else {
                    document.getElementById('balance').innerText = data.balance;
                    alert('+100 coin claimed!');
                }
            });
    });
}