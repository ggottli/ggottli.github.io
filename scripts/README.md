# Photo pipeline

`build_photos.py` turns the images in `/portfolio/photos/` into
`photos.json`, `photos.csv`, and WebP thumbnails in `/portfolio/photos/thumbs/`.
Originals are never modified.

## Setup

```
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
```

## Everyday use

Drop images (jpg, jpeg, png, heic) into `/portfolio/photos/`, then:

```
.venv/bin/python scripts/build_photos.py
```

This reads EXIF for date and GPS, writes thumbnails at 160/800/1600px
(skipping ones that are already up to date), and rewrites `photos.json`
and `photos.csv`. HEIC files also get a full-size JPG copy in `thumbs/`.

A photo with no GPS gets `lat`/`lng` of null. A photo with no EXIF date
falls back to the file's modified time and is flagged `"date_source": "file"`
so you know to fix it. The summary at the end lists what's missing.

## Filling in titles, captions, who, collection, place

Those five fields are yours; the script never overwrites them on a
normal run. Edit them in `photos.csv` with a spreadsheet, then import:

```
.venv/bin/python scripts/build_photos.py --from-csv
```

CSV rules:

- `who` is comma-separated: `Mom, Dad, friends`.
- A blank cell means "leave whatever is there" — safe to import a
  partially filled sheet.
- A cell containing just `-` clears the field.

The CSV is regenerated from `photos.json` on every run, so treat the
JSON as the source of truth and the CSV as the editing surface: edit,
import, done. Don't leave unimported edits sitting in the CSV.

## GitHub Actions

`.github/workflows/photos.yml` runs the script (with `--from-csv` when
the CSV exists) on any push that touches `/portfolio/photos/` and
commits the regenerated `photos.json`, `photos.csv`, and thumbnails.
So pushing new images — or an edited `photos.csv` — is enough.
