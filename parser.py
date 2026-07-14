import re

CATEGORY_KEYWORDS = {
    "travel": ["ola", "uber", "metro", "auto", "cab", "petrol", "fuel", "flight", "train"],
    "food": ["swiggy", "zomato", "chai", "restaurant", "dinner", "lunch", "cafe", "pizza", "burger"],
    "groceries": ["blinkit", "zepto", "instamart", "bigbasket", "milk", "groceries", "market"],
    "clothes": ["myntra", "ajio", "zara", "h&m", "shirt", "jeans", "shoes", "shopping"],
    "rent": ["rent", "landlord", "pg"],
    "bills": ["electricity", "water", "wifi", "recharge", "broadband", "gas", "bill"],
    "luxuries": ["netflix", "gym", "movie", "pub", "bar", "ott", "gaming", "spa", "vacation"],
    "investments": ["sip", "etf", "stocks", "mutual", "crypto", "gold", "fd"],
    "health": ["doctor", "medicine", "pharmacy", "hospital", "lab", "test"],
    "education": ["books", "course", "udemy", "fees", "tuition"],
}

INCOME_KEYWORDS = ["salary", "refund", "cashback", "received", "credited", "dividend", "bonus","baba", "aai", "dad", "mom","Got"]

def parse_message(text: str) -> dict:
    clean_text = text.lower().strip()
    
    # Extract Amount (Handles 500, 1.5k, 2l, rs 500, ₹500)
    amount_pattern = r'(?:rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(k|l|rs)?'
    matches = list(re.finditer(amount_pattern, clean_text))
    
    amount = 0.0
    matched_segment = ""
    
    if matches:
        for match in matches:
            num_str = match.group(1).replace(',', '')
            suffix = match.group(2)
            try:
                val = float(num_str)
                if suffix == 'k':
                    val *= 1000
                elif suffix == 'l':
                    val *= 100000
                amount = val
                matched_segment = match.group(0)
                break
            except ValueError:
                continue

    if amount == 0:
        return {"amount": 0, "category": "other", "note": text, "type": "expense"}

    # Categorize Income vs Expense
    tx_type = "expense"
    for inc_kw in INCOME_KEYWORDS:
        if inc_kw in clean_text:
            tx_type = "income"
            break

    category = "other"
    if tx_type == "expense":
        for cat, keywords in CATEGORY_KEYWORDS.items():
            if any(kw in clean_text for kw in keywords):
                category = cat
                break

    # Clean the note by removing the parsed amount and filler words
    note = clean_text.replace(matched_segment, "")
    fillers = ["spent", "for", "on", "got", "paid", "towards", "a", "an", "the"]
    for filler in fillers:
        note = re.sub(r'\b' + filler + r'\b', '', note)
    
    note = " ".join(note.split()).strip()
    if not note:
        note = category.capitalize()

    return {"amount": amount, "category": category, "note": note, "type": tx_type}