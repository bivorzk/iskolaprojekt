from faker import Faker
import random
import json

fake = Faker()

CATEGORIES = [
    "Soup", "Salad", "MainDish", "SideDish", "Snack", "Dessert",
    "Drink", "Healthy", "SpecialDiet", "DailySpecial", "Other"
]

ALLERGENS = [
    "gluten", "lactose", "nuts", "soy", "eggs", "fish",
    "sesame", "sulphites", "celery", "mustard"
]

def generate_menu_item():
    name = fake.catch_phrase()
    description = fake.sentence()
    
    stock = random.randint(0, 50)
    price = round(random.uniform(2, 25), 2)

    category = random.choice(CATEGORIES)
    available = stock > 0  # auto rule

    # Random QR code (fake URL)
    qr_code = fake.url()

    # Random subset of allergens
    allergens = random.sample(ALLERGENS, random.randint(0, 3))

    nutritional_info = {
        "calories": random.randint(50, 1200),
        "protein": round(random.uniform(0, 50), 1),
        "carbs": round(random.uniform(0, 150), 1),
        "fat": round(random.uniform(0, 80), 1)
    }

    health_score = round(random.uniform(0, 10), 1)

    return {
        "name": name,
        "description": description,
        "stock": stock,
        "price": price,
        "category": category,
        "available": available,
        "QRCode": qr_code,
        "allergens": allergens,
        "nutritionalInfo": nutritional_info,
        "healthScore": health_score
    }


def generate_items(count=20, file_name="tests/menu_items.json"):
    items = [generate_menu_item() for _ in range(count)]

    with open(file_name, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=4, ensure_ascii=False)

    print(f"Generated {count} items → {file_name}")


if __name__ == "__main__":
    generate_items(20)
