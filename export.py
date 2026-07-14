import json
import os
import db

def run_export():
    # Load configuration
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        config_data = json.load(f)

    clean_config = {
        "currency": config_data.get("currency", "₹"),
        "monthlyBudget": config_data.get("monthlyBudget", 19800),
        "budgets": config_data.get("budgets", {})
    }

    db.init_db()
    transactions = db.all_rows()

    # Consolidate into a single structured object
    payload = {
        "config": clean_config,
        "transactions": transactions
    }

    # Write straight into the React source folder for hot-reloading asset changes
    output_path = os.path.join(os.path.dirname(__file__), "data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    run_export()