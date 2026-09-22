# Photo pipeline

`build_photos.py` reads the Apple Photos library on this Mac and turns it
into `portfolio/photos/photos.json`, `photos.csv`, and WebP thumbnails in
`portfolio/photos/thumbs/`. Nothing in Photos is ever modified.

Photos is the source of truth. Tag and date things there, then rebuild.

| On the site   | Comes from Photos                                        |
|---------------|----------------------------------------------------------|
| which photos  | the album **Website**                                    |
| collection    | albums inside a folder named **Collections** (optional)  |
| who           | named faces (People)                                     |
| title         | Title                                                    |
| caption       | Description                                              |
| date          | capture date                                             |
| lat / lng     | location                                                 |
| place         | Photos' reverse-geocoded place, as "City, State"         |

Photos in a Collections album are published even if they aren't in
Website, so you can sort straight into collections. Edited photos export
as edited. Videos, hidden, and trashed items are skipped.

## Setup (once)

```
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
```

## Everyday use

Add photos to the Website album (or a Collections album), then:

```
.venv/bin/python scripts/build_photos.py
```

The first run exports every photo as a full-size JPEG into
`portfolio/photos/export/` (gitignored, rebuilt from Photos, safe to
delete) and writes thumbnails at 160/800/1600px. Later runs only touch
what changed, and remove thumbnails for photos you took out of the album.
Then commit `photos.json`, `photos.csv`, `overrides.json`, and `thumbs/`
and push. The site only serves the thumbnails, so originals never enter git.

The summary at the end lists how many photos lack GPS, a place, a named
person, a collection, or a title, and any that couldn't be downloaded
from iCloud (open Photos and let it finish syncing, then rerun).

Useful flags:

- `--skip-export` rebuilds JSON and thumbs from the last export without
  touching Photos.
- `--dry-run` shows what the export would do.
- `--album NAME` / `--collections-folder NAME` change the Photos names.

## Overriding what Photos says

Sometimes you want the site to differ from Photos (a nicer collection
name, a person who has no face tag). Those live in
`portfolio/photos/overrides.json` and win over Photos on every run.

Easiest way to edit them: open `photos.csv` in a spreadsheet, change
title/caption/who/collection/place cells, then:

```
.venv/bin/python scripts/build_photos.py --from-csv
```

- Blank cell: leave alone. A cell that matches Photos removes any
  override. A cell containing just `-` forces the field empty.
- `who` is comma-separated: `Mom, Dad, friends`.
- The CSV is regenerated every run, so import edits right after making them.

## Collection intros

`portfolio/photos/collections.json` holds an optional title and intro
paragraph per collection, keyed by slug. It is hand-written and not
touched by the script.
