from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import csv
import io
import db
from fastapi.responses import FileResponse
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# --- SECURITY & MIDDLEWARE ---
# Allows your React app to talk to this Python server securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_config():
    """Loads your settings and API keys from config.json"""
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def verify_pin(x_pin: str = Header(None)):
    """Rejects requests with an invalid PIN"""
    correct_pin = os.getenv("APP_PIN", "0000")

    if x_pin != correct_pin:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid PIN"
        )

# --- 1. THE DASHBOARD DATA ROUTE ---
@app.get("/api/data", dependencies=[Depends(verify_pin)])
def get_dashboard_data(): # type: ignore
    db.init_db()
    transactions = db.all_rows()
    config_data = get_config()
    
    clean_config = {
        "currency": config_data.get("currency", "₹"),
        "monthlyBudget": config_data.get("monthlyBudget", 19800),
        "budgets": config_data.get("budgets", {})
    }
    
    return {
        "config": clean_config,
        "transactions": transactions
    } # type: ignore

# --- 2. THE DELETE TRANSACTION ROUTE ---
@app.delete("/api/transactions/{txn_id}", dependencies=[Depends(verify_pin)])
def delete_transaction(txn_id: int):
    db.delete_txn(txn_id)
    return {"status": "success"}

# --- 3. THE EXPORT CSV ROUTE ---
@app.get("/api/export", dependencies=[Depends(verify_pin)])
def export_csv():
    transactions = db.all_rows()
    
    # Create a temporary spreadsheet in the server's memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write the column headers
    writer.writerow(["ID", "Date", "Category", "Amount", "Note", "Type"])
    
    # Write all the data rows
    for txn in transactions:
        writer.writerow([txn['id'], txn['date'], txn['category'], txn['amount'], txn['note'], txn['type']])
        
    output.seek(0)
    
    # Send it securely to the React frontend as a downloadable file
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=Personal Expense Tracer_export.csv"}
    ) # type: ignore
# --- 4. THE SQLITE SNAPSHOT ROUTE ---
@app.get("/api/backup", dependencies=[Depends(verify_pin)])
def create_snapshot():
    # Grabs the live expenses.db file and forces a download
    date_str = datetime.now().strftime("%Y_%m_%d")
    return FileResponse(
        "expenses.db", 
        media_type="application/octet-stream", 
        filename=f"backup_{date_str}.db"
    )
