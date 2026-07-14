#  Personal Expense Tracer

> **A privacy-first, offline personal finance tracker built with FastAPI, React, and SQLite.**

Personal Expense Tracer is a modern personal finance application designed around a **local-first philosophy**. It enables you to securely manage your income and expenses while ensuring your financial data never leaves your machine.

Unlike cloud-based finance applications, Personal Expense Tracer stores everything locally using SQLite and serves a responsive dashboard through a lightweight FastAPI backend and a React frontend.

---

# ✨ Features

## 🔒 Privacy First

* 100% offline operation
* No cloud databases
* No third-party analytics
* No subscriptions
* Your data remains on your own computer

---

## 📊 Interactive Dashboard

* Real-time financial overview
* Income vs Expense tracking
* Budget utilization
* Monthly spending summary
* Category-wise analytics
* Burn-rate monitoring
* Responsive desktop and mobile interface

---

## ⚡ Fast & Lightweight

* SQLite database
* FastAPI backend
* React + Vite frontend
* Instant API responses
* Minimal resource usage

---

## 🔐 Secure Access

* Local PIN authentication
* Every API request is protected
* PIN verification through FastAPI middleware
* No online authentication providers

---

## 📁 Data Export

Export your financial ledger anytime.

* CSV Export
* Local database backup
* Portable SQLite database

---

# 🏗️ Architecture

```text
                User

                  │
                  ▼

         React + Vite Dashboard

                  │
         HTTP Requests (x-pin)

                  ▼

             FastAPI Backend

                  │

        PIN Verification Layer

                  │

                  ▼

              SQLite Database

                  │

                  ▼

          Local File Storage
```

---

# ⚙️ Tech Stack

## Backend

* Python 3.11+
* FastAPI
* SQLite

## Frontend

* React 18
* Vite
* Tailwind CSS
* Recharts

## Security

* Custom PIN Authentication
* FastAPI Dependency Injection
* Protected API Routes

---

# 📂 Project Structure

Personal Expense Tracer/

├── api.py                 # FastAPI routes
├── db.py                  # SQLite database operations
├── auth.py                # PIN verification
├── config.json            # Local configuration
├── expenses.db            # SQLite database
├── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── README.md
└── LICENSE

---

# 🚀 Getting Started

## Prerequisites

Install the following before starting:

* Python 3.11 or later
* Node.js (LTS recommended)
* npm

---

# 1. Clone the Repository

```bash
git clone https://github.com/your-username/personal-expense-tracer.git

cd personal-expense-tracer
```

---

# 2. Configure the Application

Create a file named:

```text
config.json
```

Example:

```json
{
  "pin": "1234",
  "currency": "₹",
  "monthlyBudget": 20000,
  "budgets": {
    "Food": 5000,
    "Transport": 3000,
    "Rent": 6500,
    "Bills": 2000,
    "Other": 3500
  }
}
```

---

# 3. Install Backend Dependencies

```bash
python -m pip install fastapi "uvicorn[standard]"
```

---

# 4. Start the Backend

```bash
python -m uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

Backend URL:

```text
http://localhost:8000
```

---

# 5. Install Frontend Dependencies

```bash
cd frontend

npm install
```

---

# 6. Start the Frontend

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

# 🔐 Authentication

Personal Expense Tracer uses a simple local PIN authentication mechanism.

Workflow:

```text
User enters PIN

        │

        ▼

React sends x-pin header

        │

        ▼

FastAPI verifies PIN

        │

        ▼

Access Granted
```

Every protected endpoint requires the following request header:

```http
x-pin: 1234
```

---

# 📊 Dashboard

The dashboard includes:

* Current Balance
* Monthly Income
* Monthly Expenses
* Budget Remaining
* Category Breakdown
* Expense Trends
* Income vs Expense
* Burn Rate
* Recent Transactions

---

# 📦 Database

Personal Expense Tracer stores all financial data in a local SQLite database.

Database file:

```text
expenses.db
```

Typical transaction fields:

| Field       | Description          |
| ----------- | -------------------- |
| id          | Transaction ID       |
| amount      | Transaction amount   |
| type        | Income or Expense    |
| category    | Transaction category |
| description | User description     |
| timestamp   | Date and time        |

---

# 🔒 Security Philosophy

Personal Expense Tracer is designed with a **local-first security model**.

* Data never leaves your machine.
* No cloud storage.
* No third-party authentication.
* No external APIs required.
* PIN-protected API endpoints.
* SQLite database stored locally.

> **Important:** If you plan to expose the application beyond your local network, implement HTTPS and a stronger authentication mechanism before deployment.

---

# 📈 Roadmap

Planned features include:

* [ ] Recurring transactions
* [ ] Advanced search & filters
* [ ] PDF reports
* [ ] Excel export
* [ ] Savings goals
* [ ] Multiple wallets
* [ ] Investment tracking
* [ ] Desktop application (Tauri)
* [ ] Progressive Web App (PWA)
* [ ] Database encryption
* [ ] Automatic local backups

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/new-feature
```

3. Commit your changes.

```bash
git commit -m "Add new feature"
```

4. Push the branch.

```bash
git push origin feature/new-feature
```

5. Open a Pull Request.

---

# 📄 License

This project is licensed under the **MIT License**.

---

# 👨‍💻 Author

**Yash Bhandare**

**Personal Expense Tracer was built to demonstrate how modern personal finance software can be fast, secure, and completely private without relying on cloud infrastructure.**
