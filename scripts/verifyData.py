"""
verifyData.py
Checks and fixes recipe data quality in MongoDB.

Checks:
  1. Recipes with empty instructions -> attempts to split from string
  2. Recipes with missing/broken imageUrl -> applies keyword fallback
  3. Recipes with empty ingredients array -> deletes them
  4. Samples 5 Food.com recipes to verify nutrition values
  5. Cost distribution check
  6. Prints full DB health report
"""

import sys
import io
import re
import random
from pymongo import MongoClient

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

MONGO_URI = (
    "mongodb+srv://ngocvo14198_db_user:MxqSBLQufaueA3Xi"
    "@recipematch-cluster.xnfgsjh.mongodb.net/"
)
DB_NAME = "test"
COLLECTION = "recipes"

# Keyword -> Unsplash image URL fallback map
IMAGE_FALLBACKS = {
    "chicken": "https://images.unsplash.com/photo-1598103442097-8b74394b95c2?w=400",
    "pasta":   "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400",
    "beef":    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
    "salmon":  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400",
    "salad":   "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
    "soup":    "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400",
    "rice":    "https://images.unsplash.com/photo-1536304993881-ff86e0c9b4a5?w=400",
    "pizza":   "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400",
    "bread":   "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
    "cake":    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400",
    "cookie":  "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400",
    "steak":   "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
    "shrimp":  "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400",
    "taco":    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400",
    "burger":  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
    "noodle":  "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400",
    "ramen":   "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400",
    "curry":   "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",
    "default": "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400",
}


def get_image_fallback(title: str) -> str:
    title_lower = title.lower()
    for keyword, url in IMAGE_FALLBACKS.items():
        if keyword in title_lower:
            return url
    return IMAGE_FALLBACKS["default"]


def is_valid_image(url) -> bool:
    return bool(url and isinstance(url, str) and url.startswith("http"))


def main():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    col = db[COLLECTION]

    total = col.count_documents({})
    print(f"\nTotal recipes: {total}\n")

    # ── 1. Fix empty instructions ──────────────────────────────────────────────
    print("=== 1. Checking empty instructions ===")
    empty_instructions = list(col.find(
        {"$or": [{"instructions": {"$exists": False}}, {"instructions": []}, {"instructions": ""}]},
        {"_id": 1, "title": 1, "instructions": 1}
    ))
    print(f"Recipes with empty/missing instructions: {len(empty_instructions)}")

    fixed_instructions = 0
    for doc in empty_instructions:
        instr = doc.get("instructions")
        if isinstance(instr, str) and instr.strip():
            # Split string into list
            parts = [p.strip() for p in re.split(r"\n|\. ", instr) if p.strip()]
            if parts:
                col.update_one({"_id": doc["_id"]}, {"$set": {"instructions": parts}})
                fixed_instructions += 1
    print(f"Fixed {fixed_instructions} recipes by splitting instruction strings")

    # ── 2. Fix missing images ──────────────────────────────────────────────────
    print("\n=== 2. Checking missing/broken images ===")
    no_image = list(col.find(
        {"$or": [
            {"imageUrl": {"$exists": False}},
            {"imageUrl": None},
            {"imageUrl": ""},
            {"imageUrl": {"$not": {"$regex": "^http"}}},
        ]},
        {"_id": 1, "title": 1}
    ))
    print(f"Recipes with missing/invalid imageUrl: {len(no_image)}")

    fixed_images = 0
    for doc in no_image:
        title = doc.get("title", "")
        fallback = get_image_fallback(title)
        col.update_one({"_id": doc["_id"]}, {"$set": {"imageUrl": fallback}})
        fixed_images += 1
    print(f"Fixed {fixed_images} recipes with fallback images")

    # ── 3. Delete recipes with empty ingredients ───────────────────────────────
    print("\n=== 3. Checking empty ingredients ===")
    empty_ingredients = col.count_documents(
        {"$or": [{"ingredients": {"$exists": False}}, {"ingredients": []}]}
    )
    print(f"Recipes with empty ingredients: {empty_ingredients}")
    if empty_ingredients > 0:
        result = col.delete_many(
            {"$or": [{"ingredients": {"$exists": False}}, {"ingredients": []}]}
        )
        print(f"Deleted {result.deleted_count} recipes with no ingredients")

    # ── 4. Sample Food.com nutrition ───────────────────────────────────────────
    print("\n=== 4. Sampling Food.com nutrition values ===")
    foodcom_with_nutrition = list(col.aggregate([
        {"$match": {"source": "foodcom", "nutrition": {"$exists": True, "$ne": None}}},
        {"$sample": {"size": 5}},
        {"$project": {"title": 1, "nutrition": 1}},
    ]))
    if foodcom_with_nutrition:
        for r in foodcom_with_nutrition:
            print(f"  {r['title'][:50]}: {r.get('nutrition')}")
    else:
        print("  No Food.com recipes with nutrition found")

    # ── 5. Cost distribution ──────────────────────────────────────────────────
    print("\n=== 5. Cost distribution ===")
    cost_pipeline = [
        {"$group": {
            "_id": None,
            "min": {"$min": "$estimatedCost"},
            "max": {"$max": "$estimatedCost"},
            "avg": {"$avg": "$estimatedCost"},
            "count": {"$sum": 1},
        }}
    ]
    cost_result = list(col.aggregate(cost_pipeline))
    if cost_result:
        c = cost_result[0]
        print(f"  Min: ${c['min']:.2f}  Max: ${c['max']:.2f}  Avg: ${c['avg']:.2f}  Count: {c['count']}")
    stale_8 = col.count_documents({"estimatedCost": 8})
    print(f"  Still at default $8: {stale_8}")

    # ── 6. Health report ──────────────────────────────────────────────────────
    print("\n=== 6. DB Health Report ===")
    total_after = col.count_documents({})
    with_image = col.count_documents({"imageUrl": {"$regex": "^http"}})
    with_instructions = col.count_documents({"instructions": {"$not": {"$size": 0}, "$exists": True}})
    with_nutrition = col.count_documents({"nutrition": {"$exists": True, "$ne": None}})

    # Top 10 cuisines
    cuisine_pipeline = [
        {"$group": {"_id": "$cuisine", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    top_cuisines = list(col.aggregate(cuisine_pipeline))

    # Duplicate count
    dup_pipeline = [
        {"$group": {"_id": {"$toLower": "$title"}, "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
        {"$count": "duplicateGroups"},
    ]
    dup_result = list(col.aggregate(dup_pipeline))
    dup_groups = dup_result[0]["duplicateGroups"] if dup_result else 0

    print(f"  Total recipes       : {total_after}")
    print(f"  With valid image    : {with_image} ({with_image/total_after*100:.1f}%)")
    print(f"  With instructions   : {with_instructions} ({with_instructions/total_after*100:.1f}%)")
    print(f"  With nutrition data : {with_nutrition} ({with_nutrition/total_after*100:.1f}%)")
    print(f"  Duplicate title groups: {dup_groups}")
    print(f"\n  Top 10 Cuisines:")
    for c in top_cuisines:
        print(f"    {c['_id'] or '(none)':20s} {c['count']}")

    client.close()
    print("\nVerification complete!")


if __name__ == "__main__":
    main()
