"""
fixMissingImages.py — Assign Unsplash images to recipes missing imageUrl in MongoDB.
Usage: python scripts/fixMissingImages.py
Requires MONGODB_URI in environment or .env.local
"""

import os
import sys
import re

# Load .env.local if python-dotenv is available, else read manually
try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    load_dotenv(env_path)
except ImportError:
    # Manually parse .env.local
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, value = line.partition('=')
                    os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

try:
    from pymongo import MongoClient
except ImportError:
    print("pymongo not installed. Run: pip install pymongo")
    sys.exit(1)

MONGODB_URI = os.environ.get('MONGODB_URI', '')
if not MONGODB_URI:
    print("ERROR: MONGODB_URI not found in environment or .env.local")
    sys.exit(1)

PLACEHOLDER = 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400'

# Keyword → image URL mapping (first match wins, checked in order)
KEYWORD_MAP = [
    # Soups & Stews
    ('pho',               'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400'),
    ('ramen',             'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400'),
    ('chowder',           'https://images.unsplash.com/photo-1547592180-85f173990554?w=400'),
    ('soup',              'https://images.unsplash.com/photo-1547592180-85f173990554?w=400'),
    ('stew',              'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400'),
    ('broth',             'https://images.unsplash.com/photo-1547592180-85f173990554?w=400'),
    ('bisque',            'https://images.unsplash.com/photo-1547592180-85f173990554?w=400'),
    ('chili',             'https://images.unsplash.com/photo-1547592180-85f173990554?w=400'),
    # Asian dishes
    ('sushi',             'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400'),
    ('bibimbap',          'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400'),
    ('pad thai',          'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400'),
    ('kimchi',            'https://images.unsplash.com/photo-1583224964978-2257b8a576b5?w=400'),
    ('dumpling',          'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400'),
    ('gyoza',             'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400'),
    ('wonton',            'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400'),
    ('dim sum',           'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400'),
    ('fried rice',        'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400'),
    ('stir fry',          'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400'),
    ('stir-fry',          'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400'),
    ('teriyaki',          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'),
    ('miso',              'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400'),
    ('udon',              'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400'),
    ('soba',              'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400'),
    ('tempura',           'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400'),
    ('noodle',            'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400'),
    ('curry',             'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400'),
    ('banh mi',           'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400'),
    ('spring roll',       'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400'),
    ('satay',             'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400'),
    ('bulgogi',           'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'),
    ('biryani',           'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400'),
    ('tikka',             'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400'),
    # Salads
    ('shrimp salad',      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'),
    ('caesar salad',      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'),
    ('greek salad',       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'),
    ('salad',             'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'),
    ('coleslaw',          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'),
    ('slaw',              'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'),
    # Pasta & Italian
    ('carbonara',         'https://images.unsplash.com/photo-1608756687911-aa1599ab3bd9?w=400'),
    ('lasagna',           'https://images.unsplash.com/photo-1619895092538-128341789043?w=400'),
    ('lasagne',           'https://images.unsplash.com/photo-1619895092538-128341789043?w=400'),
    ('risotto',           'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400'),
    ('gnocchi',           'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400'),
    ('pasta',             'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400'),
    ('spaghetti',         'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400'),
    ('linguine',          'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400'),
    ('fettuccine',        'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400'),
    ('penne',             'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400'),
    ('pizza',             'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400'),
    ('focaccia',          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400'),
    # Seafood
    ('seafood chowder',   'https://images.unsplash.com/photo-1547592180-85f173990554?w=400'),
    ('fish and chips',    'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400'),
    ('shrimp',            'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400'),
    ('prawn',             'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400'),
    ('lobster',           'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400'),
    ('crab',              'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400'),
    ('salmon',            'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400'),
    ('tuna',              'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400'),
    ('cod',               'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400'),
    ('tilapia',           'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400'),
    ('seafood',           'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400'),
    ('fish',              'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400'),
    # Meat dishes
    ('steak',             'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=400'),
    ('ribeye',            'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=400'),
    ('beef',              'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=400'),
    ('meatball',          'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=400'),
    ('meatloaf',          'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=400'),
    ('roast beef',        'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=400'),
    ('brisket',           'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=400'),
    ('chicken wing',      'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400'),
    ('chicken breast',    'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400'),
    ('chicken thigh',     'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400'),
    ('roast chicken',     'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400'),
    ('rotisserie',        'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400'),
    ('chicken',           'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400'),
    ('pork chop',         'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400'),
    ('pork belly',        'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400'),
    ('pulled pork',       'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400'),
    ('pork',              'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400'),
    ('bacon',             'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400'),
    ('lamb',              'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400'),
    ('turkey',            'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400'),
    ('duck',              'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400'),
    # Burgers & Sandwiches
    ('cheeseburger',      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'),
    ('burger',            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'),
    ('sandwich',          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'),
    ('wrap',              'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'),
    ('sub',               'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'),
    ('hot dog',           'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'),
    # Mexican
    ('taco',              'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400'),
    ('burrito',           'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400'),
    ('enchilada',         'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400'),
    ('quesadilla',        'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400'),
    ('guacamole',         'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400'),
    ('nachos',            'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400'),
    ('fajita',            'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400'),
    ('tamale',            'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400'),
    # Breakfast
    ('french toast',      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400'),
    ('pancake',           'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400'),
    ('waffle',            'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400'),
    ('omelette',          'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400'),
    ('omelet',            'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400'),
    ('frittata',          'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400'),
    ('scrambled egg',     'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400'),
    ('egg',               'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400'),
    ('granola',           'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400'),
    ('oatmeal',           'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400'),
    ('porridge',          'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400'),
    # Desserts
    ('cheesecake',        'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400'),
    ('tiramisu',          'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400'),
    ('brownie',           'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('chocolate cake',    'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('cupcake',           'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('muffin',            'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('cookie',            'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('cake',              'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('pie',               'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('tart',              'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('pudding',           'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('ice cream',         'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('sorbet',            'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('chocolate',         'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('dessert',           'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('donut',             'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    ('macaron',           'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
    # Rice & Grains
    ('fried rice',        'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400'),
    ('rice bowl',         'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400'),
    ('rice',              'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400'),
    ('quinoa',            'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'),
    ('couscous',          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'),
    # Bread & Baked
    ('bread',             'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'),
    ('sourdough',         'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'),
    ('baguette',          'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'),
    ('roll',              'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'),
    ('biscuit',           'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'),
    ('scone',             'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'),
    # Vegetables & Sides
    ('roasted vegetable', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
    ('vegetable',         'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
    ('roasted potato',    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
    ('mashed potato',     'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
    ('potato',            'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
    ('fries',             'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
    ('mushroom',          'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
    ('broccoli',          'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
    ('asparagus',         'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
    ('spinach',           'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
    # Drinks & Smoothies
    ('smoothie',          'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400'),
    ('juice',             'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400'),
    ('cocktail',          'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400'),
    ('lemonade',          'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400'),
]

DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'


def assign_image(title: str) -> str:
    t = title.lower()
    for keyword, url in KEYWORD_MAP:
        if keyword in t:
            return url
    return DEFAULT_IMAGE


def is_missing_image(url) -> bool:
    if not url:
        return True
    if url == PLACEHOLDER:
        return True
    url_str = str(url).strip()
    if not url_str:
        return True
    return False


def main():
    client = MongoClient(MONGODB_URI)
    # Extract DB name from URI or default to 'recipematch'
    db_name = 'recipematch'
    uri_path = MONGODB_URI.split('/')[-1].split('?')[0]
    if uri_path:
        db_name = uri_path

    db = client[db_name]
    collection = db['recipes']

    total = collection.count_documents({})
    print(f"Total recipes in DB: {total}")

    # Find recipes with missing/empty/placeholder imageUrl
    missing_query = {
        '$or': [
            {'imageUrl': {'$exists': False}},
            {'imageUrl': None},
            {'imageUrl': ''},
            {'imageUrl': PLACEHOLDER},
        ]
    }

    missing_docs = list(collection.find(missing_query, {'_id': 1, 'title': 1, 'imageUrl': 1}))
    print(f"Recipes with missing images: {len(missing_docs)}")

    if not missing_docs:
        print("No recipes need image updates.")
        with_images = collection.count_documents({'imageUrl': {'$exists': True, '$ne': None, '$ne': ''}})
        print(f"Total recipes now with images: {with_images} / {total}")
        return

    BATCH_SIZE = 500
    fixed = 0

    for i in range(0, len(missing_docs), BATCH_SIZE):
        batch = missing_docs[i:i + BATCH_SIZE]
        updates = []
        for doc in batch:
            new_url = assign_image(doc.get('title', ''))
            updates.append({
                'filter': {'_id': doc['_id']},
                'update': {'$set': {'imageUrl': new_url}},
            })

        from pymongo import UpdateOne
        ops = [UpdateOne(u['filter'], u['update']) for u in updates]
        result = collection.bulk_write(ops)
        fixed += result.modified_count
        print(f"  Processed batch {i // BATCH_SIZE + 1}: updated {result.modified_count} recipes")

    print(f"\nFixed {fixed} recipes with missing images")
    with_images = collection.count_documents({'imageUrl': {'$exists': True, '$ne': None, '$ne': ''}})
    print(f"Total recipes now with images: {with_images} / {total}")

    client.close()


if __name__ == '__main__':
    main()
