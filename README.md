# 🖥️ LedgerOS

> ### Offline Financial Operating System
>
> **Privacy First • Offline First • Terminal Inspired • Local SQLite Storage**

LedgerOS is a terminal-inspired personal finance operating system built with **React**, **FastAPI**, and **SQLite**.

Unlike traditional finance applications, LedgerOS never uploads your financial data to any cloud service. Everything runs locally on your machine, giving you complete ownership of your data while providing powerful analytics, budgeting, and financial insights.

---

## 📸 Preview

### 🔒 Secure Lock Screen

![Lock Screen](screenshots/lockscreen.png)

---

### 📊 Dashboard

![Dashboard](screenshots/dashboard.png)

---

### 📅 Calendar Heatmap

![Calendar](screenshots/calendar.png)

---

### 📈 Analytics

![Analytics](screenshots/analytics.png)

---

# ✨ Features

- 🔒 PIN Protected Access
- 💻 Terminal Inspired User Interface
- 📊 Real-time Financial Dashboard
- 📅 Interactive Calendar Heatmap
- 📈 Daily Burn Rate Analytics
- 💰 Budget Tracking
- 🔥 Spending Streak Tracking
- 📉 Category Allocation Charts
- 📜 Transaction Timeline
- 🤖 Telegram Expense Logging
- 💾 SQLite Database Snapshots
- 📤 Export to CSV
- 📤 Export to JSON
- ⚡ FastAPI Backend
- 💾 Offline SQLite Storage
- 🔐 Privacy First Architecture

---

# 🏗️ Architecture

```text
                React + Vite
                     │
                     ▼
             FastAPI Backend
                     │
                     ▼
              SQLite Database
                     ▲
                     │
          Telegram Expense Bot
```

---

# 🛠️ Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | React.js + Vite |
| Styling | CSS + Tailwind CSS |
| Backend | FastAPI |
| Language | Python |
| Database | SQLite |
| Charts | Recharts |
| Bot | Telegram Bot API |

---

# 📂 Project Structure

```text
LedgerOS/

├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── api.py
├── bot.py
├── db.py
├── parser.py
├── export.py
├── config.json
├── README.md
├── .gitignore
└── .env.example
```

---

# 🚀 Installation

## 1️⃣ Clone Repository

```bash
git clone https://github.com/Yash23001-stack/LedgerOS.git

cd LedgerOS
```

---

## 2️⃣ Backend Setup

Install Python dependencies

```bash
pip install fastapi
pip install uvicorn
pip install python-dotenv
pip install python-telegram-bot
```

Run the backend

```bash
uvicorn api:app --reload
```

---

## 3️⃣ Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

## 4️⃣ Open LedgerOS

```
http://localhost:5173
```

---

# 🔐 Environment Variables

Create a `.env` file in the project root.

```env
BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
APP_PIN=0000
```

---

# 📤 Export Options

LedgerOS supports

- CSV Export
- JSON Export
- SQLite Database Snapshot

All generated completely offline.

---

# 🤖 Telegram Integration

LedgerOS supports logging expenses directly from Telegram.

Example:

```
500 Tea

1200 Petrol

Salary 20000
```

The bot automatically categorizes and inserts the transaction into the local SQLite database.

---

# 🔒 Privacy First

LedgerOS follows one simple philosophy.

✅ No Cloud

✅ No Tracking

✅ No Analytics

✅ No Advertisements

✅ No Subscription

✅ No Data Collection

Everything stays on **your own machine**.

---

# 🛣️ Roadmap

- [x] Offline Dashboard
- [x] PIN Authentication
- [x] Telegram Integration
- [x] CSV Export
- [x] JSON Export
- [x] SQLite Snapshot
- [x] Calendar Heatmap
- [x] Burn Rate Analytics
- [ ] Transaction Search
- [ ] PDF Reports
- [ ] Desktop Version (Tauri)
- [ ] Multi Profile Support
- [ ] Budget Templates

---

# 🌟 Why LedgerOS?

Most finance applications rely on cloud storage and online accounts.

LedgerOS takes a different approach.

Instead of storing your financial history on someone else's servers, LedgerOS keeps everything on your own device.

You own your data.

Always.

---

# 👨‍💻 Author

**Yash Bhandari**

Built as a privacy-first personal finance operating system using React, FastAPI and SQLite.

If you found this project interesting, consider giving it a ⭐ on GitHub.

---

## 📜 License

This project is licensed under the MIT License.