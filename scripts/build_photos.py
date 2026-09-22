#!/usr/bin/env python3
"""Build photos.json, photos.csv, and WebP thumbnails from the Apple Photos library.

Source of truth is the Photos app:

  * Album "Website"            -> which photos are on the site
  * Folder "Collections"       -> each album inside it is a collection;
                                  photos in those albums are exported too
  * Faces (People)             -> who
  * Title / Description        -> title / caption
  * Location + Photos' place   -> lat, lng, place
  * Capture date               -> date

Flow: select photos with osxphotos, export edited-or-original JPEGs to
portfolio/photos/export/ (gitignored), then write thumbs + photos.json.

Manual fixes go in overrides.json (edit by hand, or via photos.csv with
--from-csv). Overrides win over Photos data and survive re-runs.

Usage:
    python scripts/build_photos.py                # export from Photos, build
    python scripts/build_photos.py --skip-export  # rebuild from last export
    python scripts/build_photos.py --from-csv     # fold CSV edits into overrides, then build
"""

import argparse
import csv
import json
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OSXPHOTOS = Path(sys.executable).with_name("osxphotos")

ALBUM = "Website"
COLLECTIONS_FOLDER = "Collections"

WIDTHS = (160, 800, 1600)
WEBP_QUALITY = 80
JPEG_QUALITY = 0.85
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MANUAL_FIELDS = ("title", "caption", "who", "collection", "place")


# ---------------------------------------------------------------- Photos ---

def open_library():
    try:
        import osxphotos
    except ImportError:
        sys.exit("osxphotos is not installed: .venv/bin/pip install -r scripts/requirements.txt")
    print("Reading Photos library…")
    return osxphotos.PhotosDB()


def select_photos(db, album_name, folder_name):
    """Photos in the album plus photos in any album inside the folder.
    Returns (photos, {uuid: [collection names]})."""
    albums = {a.title: a for a in db.album_info if not a.folder_names}
    if album_name not in albums:
        sys.exit(f'No album named "{album_name}" in Photos. Create it and add photos.')

    collections = {}
    for a in db.album_info:
        if a.folder_names and a.folder_names[0] == folder_name:
            for p in a.photos:
                collections.setdefault(p.uuid, []).append(a.title)

    by_uuid = {p.uuid: p for p in albums[album_name].photos}
    for a in db.album_info:
        if a.folder_names and a.folder_names[0] == folder_name:
            for p in a.photos:
                by_uuid.setdefault(p.uuid, p)

    photos, skipped = [], []
    for p in by_uuid.values():
        if p.intrash or p.hidden or not p.isphoto:
            skipped.append(p)
            continue
        photos.append(p)
    if skipped:
        print(f"Skipping {len(skipped)} items (videos, hidden, or in trash).")
    return photos, collections


def run_export(photos, export_dir, dry_run=False):
    export_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
        f.write("\n".join(p.uuid for p in photos) + "\n")
        uuid_file = f.name
    cmd = [
        str(OSXPHOTOS), "export", str(export_dir),
        "--uuid-from-file", uuid_file,
        "--filename", "{uuid}",
        "--update", "--cleanup",
        "--skip-original-if-edited", "--edited-suffix", "",
        "--convert-to-jpeg", "--jpeg-quality", str(JPEG_QUALITY),
        "--skip-live", "--skip-bursts", "--skip-raw",
        "--download-missing", "--use-photokit",
        "--retry", "2",
        "--no-progress",
    ]
    if dry_run:
        cmd.append("--dry-run")
    print(f"Exporting {len(photos)} photos to {rel(export_dir)}…")
    result = subprocess.run(cmd)
    Path(uuid_file).unlink(missing_ok=True)
    if result.returncode != 0:
        sys.exit(f"osxphotos export failed (exit {result.returncode}).")


def rel(path):
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def find_export(export_dir, uuid):
    for p in export_dir.glob(f"{uuid}.*"):
        if p.suffix.lower() in IMAGE_EXTENSIONS:
            return p
    return None


# -------------------------------------------------------------- metadata ---

US_STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire",
    "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina",
    "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania",
    "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee",
    "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "DC": "Washington, D.C.",
}
US_STATE_NAMES = set(US_STATES.values())


def format_place(place):
    """'City, State' in the US, 'City, Country' elsewhere. Photos' state list
    mixes in regions like 'Wabash Valley', so prefer a real state name."""
    if place is None:
        return ""
    names = place.names
    country = (names.country or [""])[0]
    city = (names.city or names.additional_city_info or names.area_of_interest or [""])[0]
    if country == "United States":
        region = next((r for r in names.state_province if r in US_STATE_NAMES), None)
        if region is None:
            abbr = place.address.state_province if place.address else None
            region = US_STATES.get(abbr or "", (names.state_province or [""])[0])
        parts = [city, region]
    else:
        parts = [city, country]
    return ", ".join(p for p in parts if p)


def photo_who(p):
    seen, out = set(), []
    for name in p.persons:
        if name == "_UNKNOWN_" or name in seen:
            continue
        seen.add(name)
        out.append(name)
    return out


def photo_date(p):
    d = p.date
    if d is None:
        return None
    return d.replace(tzinfo=None).isoformat(timespec="seconds")


def derive_entry(p, src, collections):
    rel = src.name
    lat, lng = p.location
    colls = sorted(set(collections.get(p.uuid, [])))
    return {
        "file": rel,
        "thumbs": {},
        "date": photo_date(p),
        "date_source": "photos",
        "lat": round(lat, 6) if lat is not None else None,
        "lng": round(lng, 6) if lng is not None else None,
        "width": None,
        "height": None,
        "title": p.title or "",
        "caption": p.description or "",
        "who": photo_who(p),
        "collection": colls[0] if colls else "",
        "place": format_place(p.place),
        "_collections": colls,
    }


# ----------------------------------------------------------------- thumbs ---

def thumb_name(rel, width):
    return Path(rel).with_name(f"{Path(rel).stem}-{width}.webp")


def is_stale(out, src_mtime):
    return not out.exists() or out.stat().st_mtime < src_mtime


def build_thumbs(src, thumbs_dir):
    """Write missing/outdated thumbs. Returns (thumbs dict, width, height)."""
    src_mtime = src.stat().st_mtime
    thumbs = {}
    loaded = None

    with Image.open(src) as img:
        orientation = img.getexif().get(0x0112, 1)
        width, height = img.size
        if orientation in (5, 6, 7, 8):
            width, height = height, width

        def full_image():
            nonlocal loaded
            if loaded is None:
                loaded = ImageOps.exif_transpose(img)
                if loaded.mode not in ("RGB", "RGBA"):
                    loaded = loaded.convert("RGB")
            return loaded

        for w in WIDTHS:
            out_rel = thumb_name(src.name, w)
            out = thumbs_dir / out_rel
            thumbs[str(w)] = f"thumbs/{out_rel.as_posix()}"
            if not is_stale(out, src_mtime):
                continue
            out.parent.mkdir(parents=True, exist_ok=True)
            im = full_image()
            copy = im.copy()
            copy.thumbnail((min(w, im.width), im.height * 4), Image.LANCZOS)
            copy.save(out, "WEBP", quality=WEBP_QUALITY)

    return thumbs, width, height


def prune_thumbs(thumbs_dir, keep):
    removed = 0
    for f in thumbs_dir.rglob("*"):
        if f.is_file() and f.name != ".gitkeep":
            rel = f"thumbs/{f.relative_to(thumbs_dir).as_posix()}"
            if rel not in keep:
                f.unlink()
                removed += 1
    if removed:
        print(f"Removed {removed} stale thumbnails.")


# -------------------------------------------------------------- overrides ---

def load_overrides(path):
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def save_overrides(path, overrides):
    overrides = {k: v for k, v in sorted(overrides.items()) if v}
    with open(path, "w") as f:
        json.dump(overrides, f, indent=1, ensure_ascii=False)
        f.write("\n")


def normalize_who(value):
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [v.strip() for v in value.split(",") if v.strip()]
    return []


def import_csv(csv_path, derived, overrides):
    """Non-blank CSV cell that differs from Photos data becomes an override.
    Blank = leave alone. '-' = force the field empty."""
    changed = 0
    with open(csv_path, newline="") as f:
        for row in csv.DictReader(f):
            file = row.get("file", "")
            if file not in derived:
                continue
            ov = overrides.setdefault(file, {})
            for field in MANUAL_FIELDS:
                cell = (row.get(field) or "").strip()
                if not cell:
                    continue
                value = "" if cell == "-" else cell
                if field == "who":
                    value = normalize_who(value)
                if value == derived[file][field]:
                    if field in ov:
                        del ov[field]
                        changed += 1
                elif ov.get(field) != value:
                    ov[field] = value
                    changed += 1
    print(f"Imported {csv_path.name}: {changed} override(s) changed.")


def apply_overrides(entry, ov):
    for field, value in ov.items():
        if field in MANUAL_FIELDS:
            entry[field] = normalize_who(value) if field == "who" else value


# ---------------------------------------------------------------- outputs ---

def write_csv(csv_path, photos):
    fields = ["file", "date", "lat", "lng", *MANUAL_FIELDS]
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for p in photos:
            row = {k: p.get(k, "") for k in fields}
            row["who"] = ", ".join(p["who"])
            if row["lat"] is None:
                row["lat"] = ""
                row["lng"] = ""
            writer.writerow(row)


def write_json(json_path, photos):
    unchanged = False
    if json_path.exists():
        with open(json_path) as f:
            unchanged = json.load(f).get("photos") == photos
    if unchanged:
        print("photos.json unchanged — not rewritten.")
        return
    data = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "photos": photos,
    }
    with open(json_path, "w") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write("\n")


def summary(photos, json_path, multi_coll, missing):
    def lst(items, key=lambda p: p["file"], n=5):
        if not items:
            return ""
        return f"  ({', '.join(key(p) for p in items[:n])}{'…' if len(items) > n else ''})"

    no_gps = [p for p in photos if p["lat"] is None]
    no_who = [p for p in photos if not p["who"]]
    no_coll = [p for p in photos if not p["collection"]]
    no_place = [p for p in photos if not p["place"]]
    no_title = [p for p in photos if not p["title"]]
    print(f"{len(photos)} photos -> {rel(json_path)}")
    print(f"  missing GPS:        {len(no_gps)}")
    print(f"  missing place:      {len(no_place)}")
    print(f"  missing who:        {len(no_who)}")
    print(f"  missing collection: {len(no_coll)}")
    print(f"  missing title:      {len(no_title)}")
    if multi_coll:
        print(f"  in several collections (first used): {len(multi_coll)}" + lst(multi_coll))
    if missing:
        print(f"  NOT exported (not downloaded from iCloud?): {len(missing)}" +
              lst(missing, key=lambda p: p.original_filename))


# ------------------------------------------------------------------- main ---

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--album", default=ALBUM, help=f'Photos album to publish (default "{ALBUM}")')
    parser.add_argument("--collections-folder", default=COLLECTIONS_FOLDER,
                        help=f'Photos folder whose albums are collections (default "{COLLECTIONS_FOLDER}")')
    parser.add_argument("--photos-dir", default=str(ROOT / "portfolio" / "photos"),
                        help="output directory (default portfolio/photos)")
    parser.add_argument("--skip-export", action="store_true",
                        help="don't run osxphotos export; reuse files already in export/")
    parser.add_argument("--from-csv", nargs="?", const=True, default=None, metavar="CSV",
                        help="fold manual edits from photos.csv into overrides.json before building")
    parser.add_argument("--dry-run", action="store_true", help="show what export would do, write nothing")
    args = parser.parse_args()

    photos_dir = Path(args.photos_dir).resolve()
    export_dir = photos_dir / "export"
    thumbs_dir = photos_dir / "thumbs"
    json_path = photos_dir / "photos.json"
    csv_path = photos_dir / "photos.csv"
    overrides_path = photos_dir / "overrides.json"
    photos_dir.mkdir(parents=True, exist_ok=True)

    db = open_library()
    selected, collections = select_photos(db, args.album, args.collections_folder)
    print(f'"{args.album}": {len(selected)} photos'
          + (f", {sum(1 for p in selected if p.uuid in collections)} in collections" if collections else ""))

    if not args.skip_export:
        run_export(selected, export_dir, dry_run=args.dry_run)
    if args.dry_run:
        return

    derived, missing, multi_coll = {}, [], []
    for p in selected:
        src = find_export(export_dir, p.uuid)
        if src is None:
            missing.append(p)
            continue
        entry = derive_entry(p, src, collections)
        if len(entry["_collections"]) > 1:
            multi_coll.append(entry)
        derived[entry["file"]] = entry

    overrides = load_overrides(overrides_path)
    if args.from_csv:
        src_csv = csv_path if args.from_csv is True else Path(args.from_csv)
        import_csv(src_csv, derived, overrides)
        save_overrides(overrides_path, overrides)
    dropped = sorted(set(overrides) - set(derived))
    for name in dropped:
        print(f"note: override for {name} no longer matches an exported photo.")

    photos, keep = [], set()
    for file, entry in derived.items():
        thumbs, w, h = build_thumbs(export_dir / file, thumbs_dir)
        entry["thumbs"], entry["width"], entry["height"] = thumbs, w, h
        keep.update(thumbs.values())
        apply_overrides(entry, overrides.get(file, {}))
        del entry["_collections"]
        photos.append(entry)
    photos.sort(key=lambda p: (p["date"] or "", p["file"]))

    prune_thumbs(thumbs_dir, keep)
    write_json(json_path, photos)
    write_csv(csv_path, photos)
    summary(photos, json_path, multi_coll, missing)


if __name__ == "__main__":
    main()
