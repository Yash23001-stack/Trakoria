import sqlite3
from contextlib import closing

DB_NAME = "expenses.db"


def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with closing(get_connection()) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS txns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                note TEXT NOT NULL,
                type TEXT NOT NULL,
                chat_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_txns_chat_date
            ON txns (chat_id, date)
        """)
        conn.commit()


def add(date_str: str, category: str, amount: float, note: str, tx_type: str, chat_id: int):
    with closing(get_connection()) as conn:
        conn.execute(
            "INSERT INTO txns (date, category, amount, note, type, chat_id) VALUES (?, ?, ?, ?, ?, ?)",
            (date_str, category, amount, note, tx_type, chat_id)
        )
        conn.commit()


def undo_last(chat_id: int) -> dict:
    with closing(get_connection()) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, amount, note, category FROM txns WHERE chat_id = ? ORDER BY id DESC LIMIT 1",
            (chat_id,)
        )
        row = cursor.fetchone()
        if row:
            cursor.execute("DELETE FROM txns WHERE id = ?", (row['id'],))
            conn.commit()
            return dict(row)
        return None


def all_rows():
    with closing(get_connection()) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, date, category, amount, note, type, chat_id FROM txns ORDER BY date DESC, id DESC"
        )
        return [dict(row) for row in cursor.fetchall()]


def delete_txn(txn_id: int):
    with closing(get_connection()) as conn:
        conn.execute("DELETE FROM txns WHERE id = ?", (txn_id,))
        conn.commit()


def month_total(month_str: str, chat_id: int) -> float:
    with closing(get_connection()) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT SUM(amount) FROM txns WHERE chat_id = ? AND type = 'expense' AND strftime('%Y-%m', date) = ?",
            (chat_id, month_str)
        )
        res = cursor.fetchone()[0]
        return float(res) if res else 0.0