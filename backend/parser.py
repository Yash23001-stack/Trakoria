import re

CATEGORY_KEYWORDS = {
    "travel": ["ola", "uber", "metro", "auto", "cab", "petrol", "fuel", "flight", "train"],
    "food": [
        "swiggy", "zomato", "chai", "tea", "restaurant", "dinner", "lunch", "cafe",
        "pizza", "burger", "biryani", "tiffin", "paratha", "pulao", "paneer",
        "egg", "curry", "roti", "thali", "hotel", "breakfast", "snacks",
        "samosa", "chinese", "dominos", "domino's", "food"
    ],
    "groceries": ["blinkit", "zepto", "instamart", "bigbasket", "milk", "groceries", "market", "buttermilk"],
    "clothes": ["myntra", "ajio", "zara", "h&m", "shirt", "jeans", "shoes", "shopping"],
    "rent": ["rent", "landlord", "pg"],
    "bills": ["electricity", "water", "wifi", "recharge", "broadband", "gas", "bill","Split"],
    "luxuries": ["netflix", "gym", "movie", "pub", "bar", "ott", "gaming", "spa", "vacation"],
    "investments": ["sip", "etf", "stocks", "mutual", "crypto", "gold", "fd"],
    "health": ["doctor", "medicine", "pharmacy", "hospital", "lab", "test"],
    "education": ["books", "course", "udemy", "fees", "tuition"],
}

# lowercase, since clean_text is always lowercased before checking
INCOME_KEYWORDS = [
    "salary", "refund", "cashback", "received", "credited", "dividend",
    "bonus", "baba", "aai", "dad", "mom", "got"
]


def parse_message(text: str) -> dict:
    clean_text = text.lower().strip()

    # Extract Amount (Handles 500, 1.5k, 2l, rs 500, ₹500)
    # Prefer the LAST number in the message over the first — e.g.
    # "2 samosas 40" should read as amount=40, not amount=2.
    amount_pattern = r'(?:rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(k|l|rs)?'
    matches = list(re.finditer(amount_pattern, clean_text))

    amount = 0.0
    matched_segment = ""

    if matches:
        for match in reversed(matches):
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

    # Categorize by best match (most matched keywords), not first-key-wins
    category = "other"
    if tx_type == "expense":
        best_cat = None
        best_score = 0
        for cat, keywords in CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in clean_text)
            if score > best_score:
                best_score = score
                best_cat = cat
        if best_cat:
            category = best_cat

    # Clean the note: keep original casing, strip only the parsed amount + filler words
    original = text.strip()
    note = original
    if matched_segment:
        note = re.sub(re.escape(matched_segment), "", note, flags=re.IGNORECASE)

    fillers = ["spent", "for", "on", "got", "paid", "towards", "a", "an", "the"]
    for filler in fillers:
        note = re.sub(r'\b' + filler + r'\b', '', note, flags=re.IGNORECASE)

    note = " ".join(note.split()).strip()
    if not note:
        note = category.capitalize()

    return {"amount": amount, "category": category, "note": note, "type": tx_type}