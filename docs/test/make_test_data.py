#!/usr/bin/env python3
"""Generate a synthetic 3,000-row photos.json for load-testing photos.html.

Run from the repo root:  python3 docs/test/make_test_data.py
Then open:               photos.html?data=/docs/test/photos-3000.json
"""
import json
import random
from pathlib import Path

random.seed(7)
OUT = Path(__file__).parent / "photos-3000.json"

HOTSPOTS = [
    ("West Lafayette, IN", 40.4237, -86.9212, 0.03),
    ("Carmel, IN", 39.978, -86.118, 0.05),
    ("Indianapolis, IN", 39.7684, -86.1581, 0.05),
    ("Northern Indiana", 41.375, -85.68, 0.08),
    ("Chicago, IL", 41.8781, -87.6298, 0.1),
    ("Denver, CO", 39.7392, -104.9903, 0.3),
    ("Hilton Head, SC", 32.2163, -80.7526, 0.1),
    ("New York, NY", 40.7128, -74.006, 0.1),
    ("San Francisco, CA", 37.7749, -122.4194, 0.2),
    ("Seattle, WA", 47.6062, -122.3321, 0.2),
    ("Nashville, TN", 36.1627, -86.7816, 0.1),
    ("Kona, HI", 19.6399, -155.9969, 0.15),
    ("Boston, MA", 42.3601, -71.0589, 0.1),
    ("Jackson, WY", 43.4799, -110.7624, 0.4),
    ("Phoenix, AZ", 33.4484, -112.074, 0.3),
]
WHO = ["family", "friends", "Mom", "Dad", "Jack", "Tommy", "Purdue", "work"]
COLLECTIONS = ["Lake summers", "Purdue", "49 states", "Growing up", "Game days",
               "Work", "High school", "Holidays", "Road trips", "Golf"]
THUMBS = ["sample-lake", "sample-purdue", "sample-boat"]

photos = []
for i in range(3000):
    year = random.choices(range(2004, 2027), weights=[1] * 10 + [2] * 6 + [4] * 7)[0]
    date = f"{year}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}T{random.randint(8, 21):02d}:{random.randint(0, 59):02d}:00"
    if random.random() < 0.08:
        lat = lng = None
        place = ""
    else:
        place, clat, clng, spread = random.choice(HOTSPOTS)
        lat = round(clat + random.gauss(0, spread), 6)
        lng = round(clng + random.gauss(0, spread), 6)
    stem = random.choice(THUMBS)
    width, height = random.choice([(2400, 1600), (1600, 2400), (3024, 4032),
                                   (4032, 3024), (2000, 2000), (1280, 960)])
    photos.append({
        "file": f"synthetic-{i:04d}.jpg",
        "thumbs": {w: f"thumbs/{stem}-{w}.webp" for w in ("160", "800", "1600")},
        "date": date,
        "date_source": "exif",
        "lat": lat,
        "lng": lng,
        "width": width,
        "height": height,
        "title": f"Synthetic photo {i}" if random.random() < 0.5 else "",
        "caption": "",
        "who": random.sample(WHO, random.choice([0, 1, 1, 1, 2])),
        "collection": random.choice(COLLECTIONS) if random.random() < 0.8 else "",
        "place": place,
    })

photos.sort(key=lambda p: p["date"])
OUT.write_text(json.dumps({"generated": "test", "photos": photos}))
print(f"wrote {OUT} ({len(photos)} photos)")
