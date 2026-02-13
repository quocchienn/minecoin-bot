require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Sử dụng PORT từ environment (Render tự inject)
const PORT = process.env.PORT || 3000;

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/minecoin')
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema User
const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  username: String,
  balance: { type: Number, default: 0 },
  energy: { type: Number, default: 1000 },
  lastTap: Date,
  lastClaim: Date,
  lastMining: { type: Date, default: Date.now },
  referralCount: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);

// Auto mining: +1 coin mỗi 30 giây nếu còn energy
setInterval(async () => {
  try {
    const users = await User.find({});
    const now = new Date();
    for (const user of users) {
      const seconds = (now - new Date(user.lastMining)) / 1000;
      if (seconds >= 30 && user.energy > 0) {
        const coins = Math.floor(seconds / 30) * 1;
        user.balance += coins;
        user.lastMining = now;
        await user.save();
      }
    }
  } catch (err) {
    console.error('Auto-mining error:', err);
  }
}, 30000);

// Serve static files cho Mini App
app.use('/public', express.static(path.join(__dirname, 'public')));

// Parse JSON cho API
app.use(express.json());

// Route chính (tránh lỗi Cannot GET /)
app.get('/', (req, res) => {
  res.send('Mine Coin Bot is running! Open Mini App from Telegram.');
});

// API lấy thông tin user
app.get('/api/user/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: Number(req.params.userId) });
    if (user) return res.json(user);
    res.status(404).json({ error: 'User not found' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API tap coin
app.post('/api/tap/:userId', async (req, res) => {
  try {
    const { taps = 1 } = req.body;
    const user = await User.findOne({ userId: Number(req.params.userId) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.energy < taps) return res.status(400).json({ error: 'Not enough energy' });

    // Reset energy nếu quá 24h
    if (user.lastTap && (Date.now() - new Date(user.lastTap).getTime()) > 24 * 60 * 60 * 1000) {
      user.energy = 1000;
    }

    user.balance += taps;
    user.energy -= taps;
    user.lastTap = new Date();
    await user.save();

    res.json({ balance: user.balance, energy: user.energy });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API claim bonus
app.post('/api/claim/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: Number(req.params.userId) });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.lastClaim && (Date.now() - new Date(user.lastClaim).getTime()) < 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Claim cooldown (1 hour)' });
    }

    user.balance += 100;
    user.lastClaim = new Date();
    await user.save();

    res.json({ balance: user.balance, message: '+100 coins claimed!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Xử lý /start từ bot → gửi nút mở Mini App
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || 'Player';

  let user = await User.findOne({ userId });
  if (!user) {
    user = new User({ userId, username });
    await user.save();
  }

  const webAppUrl = process.env.WEB_APP_URL || 'https://minecoin-bot.onrender.com';

  await ctx.reply(`Chào ${username}! Bắt đầu đào coin nào 🚀`, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '⛏️ Mở Mine Coin App',
            web_app: { url: webAppUrl }
          }
        ]
      ]
    }
  });
});

// Khởi động server + bot
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await bot.launch();
  console.log('Telegram bot launched!');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
