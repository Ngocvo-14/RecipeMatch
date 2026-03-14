"""
deduplicateRecipes.py
Finds duplicate recipe titles in MongoDB, keeps the best-scored document,
and deletes the rest.

Score = hasImage×3 + len(instructions) + hasNutrition×2 + source_bonus
Source bonuses: 'seed'=3, 'mealdb'=2, 'foodcom'=1, 'recipenlg'=0
"""

import sys
import io
import re
from collections import defaultdict
from pymongo import MongoClient

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

MONGO_URI = (
    "mongodb+srv://ngocvo14198_db_user:MxqSBLQufaueA3Xi"
    "@recipematch-cluster.xnfgsjh.mongodb.net/"
)
DB_NAME = "test"
COLLECTION = "recipes"

SOURCE_BONUS = {"seed": 3, "mealdb": 2, "foodcom": 1, "recipenlg": 0}


def score_doc(doc: dict) -> int:
    has_image = 1 if doc.get("imageUrl") and str(doc.get("imageUrl", "")).startswith("http") else 0
    instructions = doc.get("instructions") or []
    if isinstance(instructions, str):
        instructions = [l for l in re.split(r"\n|\. ", instructions) if l.strip()]
    instruction_count = len(instructions)
    has_nutrition = 1 if doc.get("nutrition") and isinstance(doc.get("nutrition"), dict) else 0
    source = str(doc.get("source", "")).lower()
    bonus = SOURCE_BONUS.get(source, 0)
    return has_image * 3 + instruction_count + has_nutrition * 2 + bonus


def main():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    col = db[COLLECTION]

    total = col.count_documents({})
    print(f"Total recipes before dedup: {total}")

    # Group by normalized title
    print("Loading all recipe titles (this may take a moment)...")
    cursor = col.find({}, {"_id": 1, "title": 1, "imageUrl": 1, "instructions": 1, "nutrition": 1, "source": 1}, batch_size=500)

    title_groups: dict[str, list] = defaultdict(list)
    for doc in cursor:
        title = str(doc.get("title", "")).strip().lower()
        if title:
            title_groups[title].append(doc)

    duplicates = {t: docs for t, docs in title_groups.items() if len(docs) > 1}
    print(f"Found {len(duplicates)} duplicate title groups")

    if not duplicates:
        print("No duplicates found. Database is clean.")
        client.close()
        return

    ids_to_delete = []
    for title, docs in duplicates.items():
        # Score each doc; fetch full doc only for top candidate check
        scored = sorted(docs, key=score_doc, reverse=True)
        keep_id = scored[0]["_id"]
        for doc in scored[1:]:
            ids_to_delete.append(doc["_id"])

    print(f"Deleting {len(ids_to_delete)} duplicate documents...")

    # Delete in batches of 500
    deleted_total = 0
    batch_size = 500
    for i in range(0, len(ids_to_delete), batch_size):
        batch = ids_to_delete[i : i + batch_size]
        result = col.delete_many({"_id": {"$in": batch}})
        deleted_total += result.deleted_count
        print(f"  Deleted batch {i//batch_size + 1}: {result.deleted_count} docs")

    remaining = col.count_documents({})
    print(f"\nDeduplication complete!")
    print(f"  Removed : {deleted_total}")
    print(f"  Remaining: {remaining}")

    client.close()


if __name__ == "__main__":
    main()
