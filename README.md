![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)

![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)

![Offline First](https://img.shields.io/badge/Offline-First-success)
<div align="center">

#  Trakoria

### **Track Money. Own Your Data.**

**Privacy First • Offline First • Local Storage • Terminal Inspired**

A modern, offline-first personal finance workspace built with **React**, **FastAPI**, and **SQLite**.

No cloud.
No subscriptions.
No tracking.

Your financial data stays on **your own machine**.

---

![Hero](screenshots/dashboard.png)

</div>

---

# Features

- 🔒 PIN Protected Authentication
- 💻 Terminal Inspired Interface
- 📊 Interactive Financial Dashboard
- 📈 Daily Burn Rate Analytics
- 📅 Spending Calendar Heatmap
- 📉 Category Allocation Charts
- 💰 Budget Tracking
- 🔥 Spending Streak Tracking
- 📜 Transaction Timeline
- 🤖 Telegram Expense Logging
- 💾 SQLite Database
- 📤 CSV Export
- 📤 JSON Export
- 💽 SQLite Snapshot Backup
- ⚡ FastAPI REST API
- 🌙 Fully Offline
- 🔐 Privacy First

---

# 📸 Preview

##  Secure Lock Screen

<p align="center">
<img src="screenshots/lockscreen.png" width="90%">
</p>

---

##  Dashboard

<p align="center">
<img src="screenshots/dashboard.png" width="90%">
</p>

---

##  Calendar Heatmap

<p align="center">
<img src="screenshots/calendar.png" width="90%">
</p>

---

##  Analytics

<p align="center">
<img src="screenshots/analytics.png" width="90%">
</p>

---

##  Data Operations

<p align="center">
<img src="screenshots/export.png" width="90%">
</p>

---

#  Demo

A short walkthrough of Trakoria.

>  **Demo Video**

```
demo/demo.mp4
```

Watch a complete walkthrough of Trakoria.

---

#  Architecture

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

#  Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | React.js + Vite |
| Styling | CSS |
| Backend | FastAPI |
| Language | Python |
| Database | SQLite |
| Charts | Recharts |
| Bot | Telegram Bot API |

---

#  Project Structure


Trakoria/

├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── screenshots/
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

# Installation

## Clone Repository

```bash
git clone https://github.com/Yash23001-stack/Trakoria.git

cd Trakoria
```

---

## Backend

Install dependencies

```bash
pip install fastapi uvicorn python-dotenv python-telegram-bot
```

Run server

```bash
uvicorn api:app --reload
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## Open Application

```
http://localhost:5175
```

---

#  Environment Variables

Create a `.env` file.

```env
BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
APP_PIN=0000
```

---

#  Export Support

Trakoria supports

- CSV Export
- JSON Export
- SQLite Database Snapshot

Everything is generated locally.

---

#  Telegram Integration

Log expenses directly from Telegram.

Example

```
500 Tea

1200 Petrol

Salary 20000
```

The bot parses the message and stores it directly into the local SQLite database.

---

#  Privacy First

Trakoria follows one simple philosophy.

✅ No Cloud

✅ No Tracking

✅ No Analytics

✅ No Advertisements

✅ No Subscription

✅ No Data Collection

Everything stays on **your own machine**.


---

# Why Trakoria?

Most personal finance applications rely on cloud storage and online accounts.

Trakoria takes a different approach.

Your financial data belongs to **you**, not a server.

Whether you're tracking daily expenses, planning a monthly budget, or reviewing spending habits, everything remains private and available offline.

**Track Money. Own Your Data.**

---

# Author

### Yash Bhandare

Built with ❤️ using

- React
- FastAPI
- SQLite
- Python

If you found this project useful, consider giving it a ⭐.

---

#  License

Licensed under the MIT License.