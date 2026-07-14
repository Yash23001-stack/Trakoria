import json
import os
from datetime import datetime
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv
import db
import parser
import export

load_dotenv()

TOKEN = os.getenv("BOT_TOKEN")
CHAT_ID = os.getenv("CHAT_ID")

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    config_data = json.load(f)

CURRENCY = config_data.get("currency", "₹")
GLOBAL_BUDGET = config_data.get("monthlyBudget", 50000)

def generate_progress_bar(current: float, total: float) -> str:
    if total <= 0: return ""
    fraction = min(current / total, 1.0)
    filled = int(fraction * 12)
    return "█" * filled + "░" * (12 - filled)

async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("⚡ *Ledger Bot Active.*\nSend text messages like: '500 uber cab' or 'salary 60000'", parse_mode="Markdown")

async def total_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    current_month = datetime.now().strftime("%Y-%m")
    spent = db.month_total(current_month, chat_id)
    bar = generate_progress_bar(spent, GLOBAL_BUDGET)
    await update.message.reply_text(f"📅 *Status*\nSpent: {CURRENCY}{spent:,} / {CURRENCY}{GLOBAL_BUDGET:,}\n`{bar}`", parse_mode="Markdown")

async def undo_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    undone = db.undo_last(update.effective_chat.id)
    if undone:
        export.run_export()
        await update.message.reply_text(f"🗑️ *Deleted:* {CURRENCY}{undone['amount']:,} from {undone['category']}")
    else:
        await update.message.reply_text("❌ Nothing to undo.")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    parsed = parser.parse_message(update.message.text)
    
    if parsed["amount"] <= 0:
        await update.message.reply_text("⚠️ No clear numbers found. Example: '450 for dinner'")
        return

    db.add(datetime.now().strftime("%Y-%m-%d"), parsed["category"], parsed["amount"], parsed["note"], parsed["type"], chat_id)
    export.run_export()

    spent = db.month_total(datetime.now().strftime("%Y-%m"), chat_id)
    bar = generate_progress_bar(spent, GLOBAL_BUDGET)
    sign = "+" if parsed["type"] == "income" else "-"
    
    await update.message.reply_text(f"✅ *Logged*\n`{sign} {CURRENCY}{parsed['amount']:,}` → {parsed['category'].upper()}\n📊 Month Burn:\n`{bar}` ({spent:,})", parse_mode="Markdown")

def main():
    db.init_db()
    export.run_export()
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start_cmd))
    app.add_handler(CommandHandler("total", total_cmd))
    app.add_handler(CommandHandler("undo", undo_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    print("Bot is listening...")
    app.run_polling()

if __name__ == "__main__":
    main()