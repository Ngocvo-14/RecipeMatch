#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
importKaggle.py
Import Food.com and RecipeNLG Kaggle datasets into the RecipeMatch MongoDB database.

Usage:
    python scripts/importKaggle.py

Requirements (install once):
    pip install pymongo pandas
"""

import ast
import sys
import io
from datetime import datetime, timezone

# Force UTF-8 output on Windows so Unicode characters print correctly
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── Dependency check ──────────────────────────────────────────────────────────
try:
    import pandas as pd
except ImportError:
    print("Installing pandas…")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas"])
    import pandas as pd

try:
    from pymongo import MongoClient
except ImportError:
    print("Installing pymongo…")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pymongo"])
    from pymongo import MongoClient

# ── Config ────────────────────────────────────────────────────────────────────

MONGO_URI = (
    "mongodb+srv://ngocvo14198_db_user:MxqSBLQufaueA3Xi"
    "@recipematch-cluster.xnfgsjh.mongodb.net/?appName=RecipeMatch-Cluster"
)
DB_NAME         = "test"
COLLECTION_NAME = "recipes"

FOODCOM_CSV    = r"C:\Users\ngocv\Desktop\kaggle-data\foodcom\RAW_recipes.csv"
RECIPENLG_CSV  = r"C:\Users\ngocv\Desktop\kaggle-data\recipenlg\RecipeNLG_dataset.csv"

FOODCOM_LIMIT  = 8_000
RECIPENLG_LIMIT = 3_000
BATCH_SIZE     = 200

# ── Image URL map (keyword → Unsplash URL) ────────────────────────────────────

IMAGE_MAP = [
    ("pho",           "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400"),
    ("ramen",         "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400"),
    ("sushi",         "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400"),
    ("bibimbap",      "https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400"),
    ("pad thai",      "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400"),
    ("kimchi",        "https://images.unsplash.com/photo-1583224964978-2257b8a576b5?w=400"),
    ("dumpling",      "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400"),
    ("fried rice",    "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400"),
    ("curry",         "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400"),
    ("stir fry",      "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400"),
    ("stir-fry",      "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400"),
    ("pasta",         "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400"),
    ("spaghetti",     "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400"),
    ("linguine",      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400"),
    ("pizza",         "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400"),
    ("burger",        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400"),
    ("sandwich",      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400"),
    ("taco",          "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400"),
    ("burrito",       "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400"),
    ("salad",         "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400"),
    ("soup",          "https://images.unsplash.com/photo-1547592180-85f173990554?w=400"),
    ("stew",          "https://images.unsplash.com/photo-1547592180-85f173990554?w=400"),
    ("chowder",       "https://images.unsplash.com/photo-1547592180-85f173990554?w=400"),
    ("chicken",       "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400"),
    ("beef",          "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=400"),
    ("steak",         "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=400"),
    ("fish",          "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400"),
    ("salmon",        "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400"),
    ("seafood",       "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400"),
    ("shrimp",        "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400"),
    ("cake",          "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400"),
    ("cookie",        "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400"),
    ("dessert",       "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400"),
    ("chocolate",     "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400"),
    ("breakfast",     "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400"),
    ("egg",           "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400"),
    ("pancake",       "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400"),
    ("waffle",        "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400"),
    ("rice",          "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400"),
]
DEFAULT_IMAGE = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400"


def get_image_url(title: str) -> str:
    t = title.lower()
    for keyword, url in IMAGE_MAP:
        if keyword in t:
            return url
    return DEFAULT_IMAGE


# ── Shared helpers ─────────────────────────────────────────────────────────────

PROTEIN_WORDS  = {"chicken", "beef", "pork", "fish", "shrimp", "salmon",
                  "lamb", "turkey", "bacon"}
DAIRY_WORDS    = {"cheese", "butter", "cream", "milk", "yogurt"}
PRODUCE_WORDS  = {"onion", "garlic", "tomato", "pepper", "carrot", "potato",
                  "mushroom", "spinach", "lettuce", "cucumber", "zucchini",
                  "broccoli"}


def estimate_cost(ingredient_names: list) -> int:
    """Estimate recipe cost from a list of ingredient name strings."""
    proteins = dairy = produce = 0
    for name in ingredient_names:
        n = name.lower()
        if any(w in n for w in PROTEIN_WORDS):
            proteins += 1
        elif any(w in n for w in DAIRY_WORDS):
            dairy += 1
        elif any(w in n for w in PRODUCE_WORDS):
            produce += 1
    pantry = max(0, len(ingredient_names) - proteins - dairy - produce)
    cost = proteins * 4 + dairy * 2 + produce * 1 + pantry * 0.5
    return max(3, min(30, round(cost)))


def difficulty_from_count(n: int) -> str:
    if n <= 5:
        return "Easy"
    if n <= 10:
        return "Medium"
    return "Hard"


def safe_literal_eval(val, default=None):
    """ast.literal_eval with fallback."""
    try:
        return ast.literal_eval(val)
    except Exception:
        return default if default is not None else []


# ── Food.com helpers ──────────────────────────────────────────────────────────

def detect_cuisine_foodcom(tags: list) -> str:
    tag_set = {t.lower() for t in tags}
    if tag_set & {"italian", "pasta", "pizza"}:
        return "Italian"
    if tag_set & {"mexican", "tex-mex"}:
        return "Mexican"
    if "vietnamese" in tag_set:
        return "Vietnamese"
    if "korean" in tag_set:
        return "Korean"
    if "japanese" in tag_set:
        return "Japanese"
    if "chinese" in tag_set:
        return "Chinese"
    if "thai" in tag_set:
        return "Thai"
    if "indian" in tag_set:
        return "Indian"
    if tag_set & {"asian"}:
        return "Asian"
    if "american" in tag_set:
        return "American"
    if "french" in tag_set:
        return "French"
    if tag_set & {"mediterranean", "greek"}:
        return "Mediterranean"
    return "International"


def detect_mealtype_foodcom(tags: list) -> str:
    tag_set = {t.lower() for t in tags}
    if tag_set & {"breakfast", "brunch"}:
        return "Breakfast"
    if "lunch" in tag_set:
        return "Lunch"
    if tag_set & {"dinner", "main-dish"}:
        return "Dinner"
    if tag_set & {"desserts", "sweet"}:
        return "Dessert"
    if tag_set & {"appetizers", "snacks"}:
        return "Snack"
    return "Dinner"


def detect_diet_foodcom(tags: list) -> list:
    tag_set = {t.lower() for t in tags}
    if "vegan" in tag_set:
        return ["vegan", "vegetarian"]
    if "vegetarian" in tag_set:
        return ["vegetarian"]
    return []


def parse_nutrition_foodcom(nutrition_raw) -> dict:
    """
    Food.com nutrition is [calories, total_fat_%DV, sugar_%DV, sodium_%DV,
                            protein_%DV, saturated_fat_%DV, carbs_%DV]
    """
    nums = safe_literal_eval(nutrition_raw, [])
    if len(nums) < 7:
        return {"calories": 0, "fat": 0, "sugar": 0, "sodium": 0,
                "protein": 0, "carbs": 0, "fiber": 0,
                "saturatedFat": 0, "cholesterol": 0}
    return {
        "calories":     round(float(nums[0]), 1),
        "fat":          round(float(nums[1]) * 78   / 100, 1),
        "sugar":        round(float(nums[2]) * 50   / 100, 1),
        "sodium":       round(float(nums[3]) * 2300 / 100, 1),
        "protein":      round(float(nums[4]) * 50   / 100, 1),
        "saturatedFat": round(float(nums[5]) * 20   / 100, 1),
        "carbs":        round(float(nums[6]) * 275  / 100, 1),
        "fiber":        0,
        "cholesterol":  0,
    }


def build_foodcom_doc(row) -> dict:
    tags         = safe_literal_eval(row["tags"], [])
    steps        = safe_literal_eval(row["steps"], [])
    raw_ings     = safe_literal_eval(row["ingredients"], [])
    ingredients  = [{"name": x.strip(), "quantity": "", "unit": ""} for x in raw_ings if x.strip()]
    ing_names    = [i["name"] for i in ingredients]
    n_ings       = len(ingredients)

    return {
        "title":         str(row["name"]).strip().title(),
        "description":   str(row.get("description", "")).strip()[:500],
        "cuisine":       detect_cuisine_foodcom(tags),
        "mealType":      detect_mealtype_foodcom(tags),
        "diet":          detect_diet_foodcom(tags),
        "cookTime":      int(row["minutes"]),
        "servings":      4,
        "difficulty":    difficulty_from_count(n_ings),
        "estimatedCost": estimate_cost(ing_names),
        "ingredients":   ingredients,
        "instructions":  [s.strip().capitalize() for s in steps if str(s).strip()],
        "imageUrl":      get_image_url(str(row["name"])),
        "nutrition":     parse_nutrition_foodcom(row["nutrition"]),
        "tags":          [t.lower() for t in tags],
        "source":        "Food.com",
        "sourceId":      str(row["id"]),
        "createdAt":     datetime.now(timezone.utc),
        "updatedAt":     datetime.now(timezone.utc),
    }


# ── RecipeNLG helpers ─────────────────────────────────────────────────────────

ASIAN_KEYWORDS = [
    "pho", "ramen", "bibimbap", "kimchi", "pad thai", "sushi", "dumpling",
    "banh mi", "curry", "stir fry", "stir-fry", "fried rice", "teriyaki",
    "miso", "udon", "soba", "bulgogi", "japchae", "poke", "laksa",
    "rendang", "satay", "noodle", "wonton", "gyoza", "tempura", "tonkatsu",
    "okonomiyaki", "takoyaki", "bun bo", "bun rieu", "com tam", "banh xeo",
    "hu tieu",
]


def detect_cuisine_recipenlg(title: str) -> str:
    t = title.lower()
    viet_kw  = ["pho", "banh", "bun bo", "com tam", "hu tieu", "banh xeo"]
    korean_kw = ["bibimbap", "kimchi", "bulgogi", "japchae", "tteok", "doenjang"]
    japan_kw  = ["ramen", "sushi", "tempura", "miso", "udon", "soba", "tonkatsu"]
    chinese_kw = ["dumpling", "wonton", "dim sum", "kung pao", "mapo", "congee"]
    thai_kw   = ["pad thai", "som tum", "tom yum", "massaman", "green curry"]
    indian_kw = ["curry", "tikka", "biryani", "dal", "naan", "masala"]
    italian_kw = ["pasta", "pizza", "risotto", "lasagna", "carbonara"]
    mexican_kw = ["taco", "burrito", "enchilada", "guacamole", "salsa"]

    if any(k in t for k in viet_kw):   return "Vietnamese"
    if any(k in t for k in korean_kw): return "Korean"
    if any(k in t for k in japan_kw):  return "Japanese"
    if any(k in t for k in chinese_kw): return "Chinese"
    if any(k in t for k in thai_kw):   return "Thai"
    if any(k in t for k in indian_kw): return "Indian"
    if any(k in t for k in italian_kw): return "Italian"
    if any(k in t for k in mexican_kw): return "Mexican"
    return "International"


def build_recipenlg_doc(row) -> dict:
    raw_ings   = safe_literal_eval(row["ingredients"], [])
    directions = safe_literal_eval(row["directions"],  [])
    ner_words  = safe_literal_eval(row["NER"],         [])

    ingredients = [{"name": x.strip(), "quantity": "", "unit": ""} for x in raw_ings if x.strip()]
    # Use NER words for cost estimation (they're cleaner ingredient names)
    cost_names  = ner_words if ner_words else [i["name"] for i in ingredients]

    title = str(row["title"]).strip()
    return {
        "title":         title.title(),
        "description":   "",
        "cuisine":       detect_cuisine_recipenlg(title),
        "mealType":      "Dinner",
        "diet":          [],
        "cookTime":      30,
        "servings":      4,
        "difficulty":    difficulty_from_count(len(ingredients)),
        "estimatedCost": estimate_cost(cost_names),
        "ingredients":   ingredients,
        "instructions":  [d.strip().capitalize() for d in directions if str(d).strip()],
        "imageUrl":      get_image_url(title),
        "nutrition":     {"calories": 0, "protein": 0, "carbs": 0,
                          "fat": 0, "sugar": 0, "sodium": 0, "fiber": 0,
                          "saturatedFat": 0, "cholesterol": 0},
        "tags":          [],
        "source":        "RecipeNLG",
        "sourceUrl":     str(row.get("link", "")),
        "createdAt":     datetime.now(timezone.utc),
        "updatedAt":     datetime.now(timezone.utc),
    }


# ── Batch insert helper ───────────────────────────────────────────────────────

def insert_batch(collection, docs: list, existing_titles: set) -> tuple[int, int]:
    """
    Insert a batch of docs, skipping titles already in existing_titles.
    Returns (inserted_count, skipped_count).
    """
    new_docs = []
    skipped  = 0
    for doc in docs:
        key = doc["title"].lower()
        if key in existing_titles:
            skipped += 1
        else:
            new_docs.append(doc)
            existing_titles.add(key)   # prevent intra-batch duplicates

    if not new_docs:
        return 0, skipped

    try:
        result = collection.insert_many(new_docs, ordered=False)
        return len(result.inserted_ids), skipped
    except Exception as e:
        # Partial-insert errors (e.g., duplicate key on _id) — count what got through
        inserted = getattr(e, "details", {}).get("nInserted", 0) if hasattr(e, "details") else 0
        print(f"  [warn] Batch insert partial error: {e!r} — {inserted} inserted")
        return inserted, skipped


# ── Part 1: Food.com ──────────────────────────────────────────────────────────

def import_foodcom(collection, existing_titles: set) -> tuple[int, int]:
    print(f"\n{'='*60}")
    print("PART 1: Importing Food.com recipes …")
    print(f"{'='*60}")

    print(f"  Reading {FOODCOM_CSV} …")
    df = pd.read_csv(FOODCOM_CSV, low_memory=False)
    print(f"  Loaded {len(df):,} rows")

    # Filter
    df = df[
        df["minutes"].between(5, 300) &
        df["n_ingredients"].between(3, 20) &
        df["n_steps"].between(3, 25) &
        df["name"].notna() &
        (df["name"].str.strip() != "")
    ].copy()
    print(f"  After filters: {len(df):,} rows")

    total_inserted = 0
    total_skipped  = 0
    batch: list    = []
    processed      = 0

    for _, row in df.iterrows():
        if total_inserted >= FOODCOM_LIMIT:
            break

        try:
            doc = build_foodcom_doc(row)
        except Exception as e:
            continue  # skip malformed rows silently

        batch.append(doc)
        processed += 1

        if len(batch) >= BATCH_SIZE:
            ins, skip = insert_batch(collection, batch, existing_titles)
            total_inserted += ins
            total_skipped  += skip
            batch = []

        if processed % 500 == 0:
            print(f"  … processed {processed:,} rows | inserted so far: {total_inserted:,}")

    # Flush remaining
    if batch:
        ins, skip = insert_batch(collection, batch, existing_titles)
        total_inserted += ins
        total_skipped  += skip

    print(f"  Food.com done — inserted: {total_inserted:,}, skipped: {total_skipped:,}")
    return total_inserted, total_skipped


# ── Part 2: RecipeNLG ─────────────────────────────────────────────────────────

def import_recipenlg(collection, existing_titles: set) -> tuple[int, int]:
    print(f"\n{'='*60}")
    print("PART 2: Importing RecipeNLG recipes …")
    print(f"{'='*60}")

    print(f"  Reading {RECIPENLG_CSV} …")
    df = pd.read_csv(RECIPENLG_CSV, low_memory=False)
    print(f"  Loaded {len(df):,} rows")

    # Drop rows with empty directions or too few ingredients
    df = df[
        df["directions"].notna() &
        (df["directions"].str.strip() != "[]") &
        (df["directions"].str.strip() != "") &
        df["ingredients"].notna() &
        df["title"].notna()
    ].copy()
    print(f"  After filters: {len(df):,} rows")

    # Identify Asian rows (prioritise them)
    def is_asian(title) -> bool:
        t = str(title).lower()
        return any(k in t for k in ASIAN_KEYWORDS)

    asian_mask  = df["title"].apply(is_asian)
    asian_df    = df[asian_mask]
    other_df    = df[~asian_mask]

    print(f"  Asian-tagged rows: {len(asian_df):,}")
    print(f"  Other rows:        {len(other_df):,}")

    # Combine: Asian first, then fill up to RECIPENLG_LIMIT with others
    combined = pd.concat([asian_df, other_df], ignore_index=True)

    total_inserted = 0
    total_skipped  = 0
    batch: list    = []
    processed      = 0

    for _, row in combined.iterrows():
        if total_inserted >= RECIPENLG_LIMIT:
            break

        try:
            raw_ings = safe_literal_eval(row["ingredients"], [])
            if len(raw_ings) < 3:
                total_skipped += 1
                continue

            raw_dirs = safe_literal_eval(row["directions"], [])
            if not raw_dirs:
                total_skipped += 1
                continue

            doc = build_recipenlg_doc(row)
        except Exception:
            continue

        batch.append(doc)
        processed += 1

        if len(batch) >= BATCH_SIZE:
            ins, skip = insert_batch(collection, batch, existing_titles)
            total_inserted += ins
            total_skipped  += skip
            batch = []

        if processed % 500 == 0:
            print(f"  … processed {processed:,} rows | inserted so far: {total_inserted:,}")

    # Flush remaining
    if batch:
        ins, skip = insert_batch(collection, batch, existing_titles)
        total_inserted += ins
        total_skipped  += skip

    print(f"  RecipeNLG done — inserted: {total_inserted:,}, skipped: {total_skipped:,}")
    return total_inserted, total_skipped


# ── Post-import: fix missing imageUrl ────────────────────────────────────────

def fix_missing_images(collection) -> int:
    print("\nFixing recipes with missing imageUrl …")
    cursor  = collection.find(
        {"$or": [{"imageUrl": {"$exists": False}}, {"imageUrl": ""}, {"imageUrl": None}]},
        {"_id": 1, "title": 1}
    )
    updated = 0
    for doc in cursor:
        url = get_image_url(str(doc.get("title", "")))
        collection.update_one({"_id": doc["_id"]}, {"$set": {"imageUrl": url}})
        updated += 1
    print(f"  Fixed {updated:,} recipes missing imageUrl")
    return updated


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Connecting to MongoDB …")
    client     = MongoClient(MONGO_URI, serverSelectionTimeoutMS=15_000)
    db         = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    # Ping to verify connection
    client.admin.command("ping")
    print("  Connected ✓")

    # Load existing titles to avoid duplicates
    print("Loading existing recipe titles from DB …")
    existing_titles: set = set()
    for doc in collection.find({}, {"title": 1}):
        t = doc.get("title", "")
        if t:
            existing_titles.add(str(t).lower())
    print(f"  Found {len(existing_titles):,} existing recipes")

    total_before = collection.count_documents({})

    # Run imports
    fc_inserted, fc_skipped = import_foodcom(collection, existing_titles)
    nl_inserted, nl_skipped = import_recipenlg(collection, existing_titles)

    # Fix missing images
    fix_missing_images(collection)

    total_after = collection.count_documents({})

    print(f"\n{'='*60}")
    print("=== IMPORT COMPLETE ===")
    print(f"{'='*60}")
    print(f"Food.com imported:    {fc_inserted:,}")
    print(f"RecipeNLG imported:   {nl_inserted:,}")
    print(f"Total new recipes:    {fc_inserted + nl_inserted:,}")
    print(f"Duplicates skipped:   {fc_skipped + nl_skipped:,}")
    print(f"Total in DB now:      {total_after:,}")
    print(f"(was {total_before:,} before this run)")
    print(f"{'='*60}")

    client.close()


if __name__ == "__main__":
    main()
