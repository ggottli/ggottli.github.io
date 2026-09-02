#!/usr/bin/env python3
"""Build photos.json, photos.csv, and WebP thumbnails for /portfolio/photos.

Automatic fields (file, thumbs, date, date_source, lat, lng, width, height)
are recomputed on every run. Manual fields (title, caption, who, collection,
place) are preserved across runs and only changed by --from-csv or by hand.

Usage:
    python scripts/build_photos.py            # scan, thumb, write json + csv
    python scripts/build_photos.py --from-csv # import manual fields from
                                              # photos.csv first, then build
"""

import argparse
import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()

ROOT = Path(__file__).resolve().parent.parent
PHOTOS_DIR = ROOT / "portfolio" / "photos"
THUMBS_DIR = PHOTOS_DIR / "_thumbs"
JSON_PATH = PHOTOS_DIR / "photos.json"
CSV_PATH = PHOTOS_DIR / "photos.csv"

WIDTHS = (160, 800, 1600)
WEBP_QUALITY = 80
EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic"}
MANUAL_FIELDS = ("title", "caption", "who", "collection", "place")

EXIF_IFD = 0x8769
GPS_IFD = 0x8825
TAG_DATETIME_ORIGINAL = 0x9003
TAG_DATETIME = 0x0132


def parse_exif_date(value):
    """EXIF 'YYYY:MM:DD HH:MM:SS' -> ISO string, or None."""
    if not value:
        return None
    try:
        return datetime.strptime(str(value).strip(), "%Y:%m:%d %H:%M:%S").isoformat()
    except ValueError:
        return None


def read_exif_date(img):
    exif = img.getexif()
    date = parse_exif_date(exif.get_ifd(EXIF_IFD).get(TAG_DATETIME_ORIGINAL))
    if date is None:
        date = parse_exif_date(exif.get(TAG_DATETIME))
    return date


def dms_to_degrees(dms, ref):
    try:
        deg = float(dms[0]) + float(dms[1]) / 60 + float(dms[2]) / 3600
    except (TypeError, IndexError, ValueError, ZeroDivisionError):
        return None
    if ref in ("S", "W"):
        deg = -deg
    return round(deg, 6)


def read_exif_gps(img):
    gps = img.getexif().get_ifd(GPS_IFD)
    if not gps:
        return None, None
    lat = dms_to_degrees(gps.get(2), gps.get(1))
    lng = dms_to_degrees(gps.get(4), gps.get(3))
    if lat is None or lng is None:
        return None, None
    return lat, lng


def find_sources():
    files = []
    for p in sorted(PHOTOS_DIR.rglob("*")):
        if THUMBS_DIR in p.parents:
            continue
        if p.is_file() and p.suffix.lower() in EXTENSIONS:
            files.append(p)
    return files


def thumb_name(rel, width):
    return rel.with_name(f"{rel.stem}-{width}.webp")


def is_stale(out, src_mtime):
    return not out.exists() or out.stat().st_mtime < src_mtime


def build_outputs(src, rel, img):
    """Write missing/outdated thumbs (and a JPG copy for HEIC). Returns thumbs dict."""
    src_mtime = src.stat().st_mtime
    thumbs = {}
    loaded = None  # transpose lazily, only if something needs writing

    def full_image():
        nonlocal loaded
        if loaded is None:
            loaded = ImageOps.exif_transpose(img)
            if loaded.mode not in ("RGB", "RGBA"):
                loaded = loaded.convert("RGB")
        return loaded

    for width in WIDTHS:
        out_rel = thumb_name(rel, width)
        out = THUMBS_DIR / out_rel
        thumbs[str(width)] = f"_thumbs/{out_rel.as_posix()}"
        if not is_stale(out, src_mtime):
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        im = full_image()
        copy = im.copy()
        copy.thumbnail((min(width, im.width), im.height * 4), Image.LANCZOS)
        copy.save(out, "WEBP", quality=WEBP_QUALITY)

    if src.suffix.lower() == ".heic":
        out_rel = rel.with_name(f"{rel.stem}.jpg")
        out = THUMBS_DIR / out_rel
        thumbs["jpg"] = f"_thumbs/{out_rel.as_posix()}"
        if is_stale(out, src_mtime):
            out.parent.mkdir(parents=True, exist_ok=True)
            full_image().convert("RGB").save(out, "JPEG", quality=85)

    return thumbs


def normalize_who(value):
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [v.strip() for v in value.split(",") if v.strip()]
    return []


def load_existing():
    if not JSON_PATH.exists():
        return {}
    with open(JSON_PATH) as f:
        data = json.load(f)
    return {p["file"]: p for p in data.get("photos", [])}


def apply_csv(existing, csv_path):
    """Read manual columns back from the CSV. Blank cell = keep current value,
    a literal '-' = clear it."""
    updated = 0
    with open(csv_path, newline="") as f:
        for row in csv.DictReader(f):
            entry = existing.setdefault(row.get("file", ""), {})
            changed = False
            for field in MANUAL_FIELDS:
                cell = (row.get(field) or "").strip()
                if not cell:
                    continue
                value = "" if cell == "-" else cell
                if field == "who":
                    value = normalize_who(value)
                if entry.get(field) != value:
                    entry[field] = value
                    changed = True
            if changed:
                updated += 1
    print(f"Imported manual fields from {csv_path.name}: {updated} photos updated.")


def write_csv(photos):
    fields = ["file", "date", "date_source", "lat", "lng", *MANUAL_FIELDS]
    with open(CSV_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for p in photos:
            row = {k: p.get(k, "") for k in fields}
            row["who"] = ", ".join(p["who"])
            if row["lat"] is None:
                row["lat"] = ""
                row["lng"] = ""
            writer.writerow(row)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--from-csv",
        nargs="?",
        const=str(CSV_PATH),
        default=None,
        metavar="CSV",
        help="import title/caption/who/collection/place from the CSV before building",
    )
    args = parser.parse_args()

    if not PHOTOS_DIR.is_dir():
        sys.exit(f"No photos directory at {PHOTOS_DIR}")

    existing = load_existing()
    if args.from_csv:
        apply_csv(existing, Path(args.from_csv))

    sources = find_sources()
    seen_thumbs = set()
    photos = []
    for src in sources:
        rel = src.relative_to(PHOTOS_DIR)
        base = thumb_name(rel, WIDTHS[0])
        if base in seen_thumbs:
            sys.exit(f"Thumbnail name clash for {rel} — rename one of the files.")
        seen_thumbs.add(base)

        with Image.open(src) as img:
            date = read_exif_date(img)
            lat, lng = read_exif_gps(img)
            orientation = img.getexif().get(0x0112, 1)
            width, height = img.size
            if orientation in (5, 6, 7, 8):  # rotated 90/270
                width, height = height, width
            thumbs = build_outputs(src, rel, img)

        date_source = "exif"
        if date is None:
            date = datetime.fromtimestamp(src.stat().st_mtime).isoformat(timespec="seconds")
            date_source = "file"

        old = existing.get(rel.as_posix(), {})
        entry = {
            "file": rel.as_posix(),
            "thumbs": thumbs,
            "date": date,
            "date_source": date_source,
            "lat": lat,
            "lng": lng,
            "width": width,
            "height": height,
        }
        for field in MANUAL_FIELDS:
            entry[field] = old.get(field, "")
        entry["who"] = normalize_who(entry["who"])
        photos.append(entry)

    photos.sort(key=lambda p: (p["date"], p["file"]))

    removed = sorted(set(existing) - {p["file"] for p in photos})
    for name in removed:
        print(f"note: {name} is in photos.json but no longer on disk — dropped.")

    data = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "photos": photos,
    }
    with open(JSON_PATH, "w") as f:
        json.dump(data, f, indent=1)
        f.write("\n")
    write_csv(photos)

    no_gps = [p for p in photos if p["lat"] is None]
    no_date = [p for p in photos if p["date_source"] == "file"]
    no_who = [p for p in photos if not p["who"]]
    no_coll = [p for p in photos if not p["collection"]]
    print(f"{len(photos)} photos -> {JSON_PATH.relative_to(ROOT)}")
    print(f"  missing GPS:         {len(no_gps)}")
    print(f"  missing a real date: {len(no_date)}" + (f"  ({', '.join(p['file'] for p in no_date[:5])}{'…' if len(no_date) > 5 else ''})" if no_date else ""))
    print(f"  missing who:         {len(no_who)}")
    print(f"  missing collection:  {len(no_coll)}")


if __name__ == "__main__":
    main()
