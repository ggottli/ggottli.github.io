# Sprawl

**A messy, spatial thinking canvas where every card shapeshifts into what you mean.**

Sprawl is a handful of plain files (`index.html`, `sprawl.css`, `sprawl.js`, a shared featurizer and a 113 KB on-device shape model; no build step, no dependencies, no server) that run on any static host, such as GitHub Pages. Click anywhere and type. Your text becomes a card on an infinite canvas, and the card turns into the right shape automatically: a checklist, an event with a calendar button, a running timer, a poll, a bill split, a unit conversion, and more. You stay in charge of *where* things go and *how* they connect.

> **TL;DR for agents:** Markup is in `index.html`, styles in `sprawl.css`, and all logic in `sprawl.js`. The shape is chosen by `rank()`, which blends hand-written rules with a tiny classifier (`sprawl-model.js`, trained by `node model/train.js`). State is one JSON object in `localStorage['sprawl.v1']`; image bytes live in IndexedDB. Card text is the source of truth, and every smart widget is re-derived from text by deterministic parsers at render time. `python3 -I tests/run.py` runs the regression sweep. Read [Architecture](#architecture) and [Invariants](#invariants--things-not-to-break) before editing.

---

## Table of contents

1. [Why this exists](#why-this-exists)
2. [Inspiration: Kinopio + ShapeShift](#inspiration-kinopio--shapeshift)
3. [Design principles](#design-principles)
4. [Quick start](#quick-start)
5. [Feature tour](#feature-tour)
6. [The 21 card shapes](#the-21-card-shapes)
7. [Keyboard & gestures](#keyboard--gestures)
8. [Architecture](#architecture)
9. [Data model](#data-model)
10. [How classification works](#how-classification-works)
11. [How combining works](#how-combining-works)
12. [Extending Sprawl](#extending-sprawl)
13. [Invariants / things not to break](#invariants--things-not-to-break)
14. [Testing](#testing)
15. [Known limitations & ideas](#known-limitations--ideas)
16. [Version history](#version-history)
17. [Credits & sources](#credits--sources)

---

## Why this exists

Most productivity tools force a structure on you before you know what you think: a document is linear, a task app is a list, and an enterprise whiteboard is a toolbar maze built for polished diagrams. Early thinking is none of those. It's half-formed notes, a to-do, a date, a question, a link, all scattered and slowly connected.

Sprawl aims to be the place where that mess lives comfortably, and to quietly do the boring parts for you:

- Typing "call the dentist @tomorrow" should *become* a task with a due date, not stay a note you have to reformat.
- Typing "20 min stretch" should give you a working timer.
- Typing "tacos, ramen or pizza tonight?" should give you a poll you can vote on.

It's a personal tool first: fast, private, and customizable. It's built to be hosted on a personal static website.

## Inspiration: Kinopio + ShapeShift

Sprawl deliberately combines two products.

### Kinopio, the canvas and the philosophy
[Kinopio](https://kinopio.club) is a spatial note-taking canvas by Piri. Sprawl borrows its core beliefs:

- **Messy is a feature.** Kinopio argues software whiteboards are "designed around neatness and conformity," while a real whiteboard is "a $10 sheet of plastic and some markers." Its outputs are deliberately low-fidelity and conceptual.
- **Just click and type.** No toolbars between you and your thought.
- **Spatial memory.** Placing ideas and connecting them *yourself* is what makes them memorable. That's why Kinopio has **no AI features**: "the journey of placing ideas … and figuring out what things should be grouped together yourself is vitally important to building up your own spatial memory."
- **Personality and expressiveness:** backgrounds, colors, images, embeds.

Sprawl reproduces much of Kinopio's toolset: cards, connections with labels and colors, boxes, paint-select, tags, space links, frames, drawing, locking, templates, presentation mode, JSON Canvas export, and offline-first storage.

### ShapeShift, the cards
[ShapeShift](https://shapeshiftui.vercel.app) by anishfn is "an input that becomes what you mean": a single text box that turns what you type into one of 19 interactive cards. Its key architectural idea, which Sprawl adopts verbatim, is:

> **"Jev decides, code computes."**
> A classifier only decides *which card* text should become. All dates, money, math and units are computed by deterministic parsers.

ShapeShift originally used TypeSafe AI's hosted **Jev** decision model. Sprawl briefly integrated Jev too (via a proxy), then removed it, and later dropped Chrome's built-in Gemini Nano as well. The owner wanted **no servers and no API calls**. Sprawl now ships its own tiny classifier (a 113 KB logistic-regression model that runs inside the page) and blends it with a hand-written rules engine. Sprawl's example phrases and welcome content are its own; only the concept is borrowed.

### The synthesis
Kinopio says "AI shouldn't arrange your thinking." ShapeShift says "software should understand what you typed." Sprawl reconciles them:

- **The engine only labels.** It never moves, groups, connects or rewrites your ideas.
- **You always win.** Every automatic choice can be overridden, and overrides stick.
- **Spatial work stays manual.** Placement, connections, boxes and combining are all human gestures.

## Design principles

1. **Zero infrastructure.** A few static files, with no external scripts, fonts, CDNs or analytics. The shape model is a same-origin script, not a download from somewhere else. It works offline from `file://`.
2. **Private by default.** Nothing typed leaves the device. The only network calls are user-initiated: optional GitHub Gist sync, and images/embeds/links the user adds.
3. **Text is the source of truth.** Widgets are views over text. A card can always fall back to plain text without data loss.
4. **Deterministic computing.** Engines pick shapes. Parsers compute values.
5. **User overrides are sticky.** Once you pick a shape manually (`card.manual = true`), auto-detection never changes it until you choose "✨ Auto."
6. **Choose your own shapes.** Users can turn off any card type. Disabled types are never detected or suggested.
7. **Fast capture beats perfect structure.** Enter finishes a card, ⌘K captures from anywhere, and paste/drop "just works."
8. **Fun and expressive.** Themes, gradients, fonts, emoji box icons, morph animations.
9. **Works on phones.** Touch, pinch-zoom, long-press menus, responsive toolbar.

## Quick start

- **Use it:** open `index.html` in any modern browser (it loads the CSS, the featurizer, the model and `sprawl.js` from the same folder). That's it. The first visit shows a short intro with a live demo and a **Welcome** space built from boxes; Settings → *Show the intro & welcome tour* brings both back.
- **Host it:** commit the `sprawl/` folder to a static site (for example GitHub Pages) and link to it. Each visitor gets their own private, browser-local canvas.
- **Back up:** ⚙ Settings → *Export all (JSON)*, or enable GitHub Gist sync to move between devices.
- **Debug mode:** append `?debug=1` to the URL to see the classifier's confidence percentages on the shape chips while typing.

## Feature tour

### Canvas & cards
- **Click anywhere and type** to create a card. **Enter** finishes it. **Shift+Enter** adds a new line and continues checklists (`[ ]`), bullets (`-`) and numbered lists. Pressing it on an empty item ends the list. **⌥+Enter** finishes and starts a new card below. **Esc** also finishes.
- **Infinite canvas:** scroll to pan, ⌘/Ctrl+scroll or pinch to zoom (15%–300%), and **F** zooms to fit. A minimap (toggle with **M**) lets you click to navigate.
- **Connections:** drag the ● handle on a card onto another card. Drag it into empty space to branch a new connected card. Click a line to add a label, recolor it, reverse it or delete it. Labelled connections build a **legend**, and clicking a legend entry spotlights that relationship.
- **Boxes:** group cards visually. Dragging a box header moves the cards inside it. Each box has a name, an emoji icon (20 choices), a color (9), and a style (Soft, Solid, Outline or Dashed).
- **Resize from the ◢ corner** on any card or box, in both directions. **Double-click the corner to reset**: cards go back to their default width and natural height, and boxes shrink to fit their cards (or go back to 340×240 if empty).
- **Combine cards:** drop a card so it overlaps the bottom (or top) edge of another and a glowing bar previews the result, for example "Combine → ☑ Checklist · 3 items." Release to merge. Hold **⌥** to skip. See [How combining works](#how-combining-works).
- **Snap into lists:** drop a card a little *below* (or above) another instead and a dashed slot appears; the cards underneath make room and it lands aligned with a 12px gap. Dragging a card out of a list closes the gap, so lists reorder by drag.
- **Paint select:** Shift+drag (or Select mode on touch). The selection bar can retype, recolor, arrange (align, distribute, stack, row, grid), box, move to another space, lock, duplicate, copy as Markdown, save as a template, or delete.
- **Card frames:** Card, Sticky note (slightly tilted), Badge, Dashed, and No frame (bare text on the canvas).
- **Colors:** yellow, orange, red, pink, purple, blue, teal, green and gray, each with light and dark variants.
- **Lock to background (L):** locked cards behave like the canvas. You can click "through" them to create cards on top.
- **Drawing (D):** freehand ink in 9 colors and 3 widths, an eraser, and clear-all. Pinch still zooms while drawing.
- **Rich text:** `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, fenced ``` code blocks, `[text](url)`, `#tags` (click to spotlight), `[[Space Name]]` links (creates the space if missing), and `@tomorrow` / `@fri` / `@10/30` / `@nextweek` due dates, which become colored chips that turn red when overdue.
- **Images & media:** drop or paste image files (auto-compressed to ≤1000px and stored in IndexedDB, so they don't count against the text storage limit), drop images straight from other web pages, paste image URLs, or use the **＋ Add** menu. YouTube links show a thumbnail that plays inline, and Spotify links load an embedded player. The card menu has Add/Replace/Remove image. Broken images show a fallback message.
- **Recently removed:** deleted cards go to a per-space trash (last 100) and can be restored.

### Smart shapes (the ShapeShift layer)
- There are **21 card shapes** ([full table](#the-21-card-shapes)). Typing is enough, because the rules engine and the on-device model rank every shape together.
- **Live preview while typing:** shape chips appear under the text ("becomes 📅 Event · ¶ Note") with a faded **ghost** of the finished widget. **Tab / Shift+Tab** cycles shapes, and clicking a chip picks one. A picked shape sticks. Settings has a probe box that shows how any phrase would be read, with percentages.
- **Slash menu:** type `/` as the first character to list every enabled shape with an example. Arrow keys and Enter pick one, and the placeholder then shows an example to type.
- **Morph animation** when a card changes shape.
- **Choose your shapes:** ⚙ Settings → *Your card shapes* has a checkbox per type, plus **All** and **Basics only** buttons.

### Capture, search & planning
- **⌘K or /** opens the command palette:
  - **Capture:** shows a ghost preview of what your text will become. Enter sends it to the 📥 **Inbox** space or adds it to the current space.
  - **Search:** finds cards across all spaces, with highlighted snippets. Selecting one jumps to it.
  - **Tags:** start with `#`.
  - **Spaces & commands:** every action, template, and "New ⏱ Timer card" style shortcut. If your text strongly matches a command (for example "pitch deck"), the command ranks above capture.
- **☀ Today (T)** is an agenda across every space:
  - Running timers with live countdowns.
  - ⚠ Overdue items.
  - **Today**: events in time order, reminders (urgent first), and dated checklist items.
  - 🔁 Habits to tick off today.
  - Next 7 days, Later, and No date.
  - You can tick items off without leaving the panel, and clicking any item jumps to it on its canvas.
- **Spaces:** multiple canvases, pinned spaces, rename/duplicate/delete, "Linked from" backlinks, and a dedicated 📥 Inbox.
- **Templates (12):** Kanban board, Weekly plan, Decision, Meeting notes, Brainstorm, Daily journal (rotating prompts), Project one-pager, Trip planner, Research map, SWOT, Retro, and Pitch deck. You can also save any selection as your own template. Templates are placed in free space, not on top of your work.
- **Presentation mode (P):** boxes become slides, ordered top-to-bottom then left-to-right. Navigate with the arrow keys or Space, with an animated camera and full screen. The box menu has "Present from here."
- **Focus mode (.):** hides all the chrome.

### Look & feel (🎨 Style panel)
- **Quick looks (per space):** Paper, Blueprint, Notebook, Café, Midnight and Dreamy. Each one-click combination sets a background and a font.
- **Background:** 12 color presets plus a custom color picker, 9 gradients (6 light, 3 dark), patterns (dots, grid, lines, none), and an uploaded or URL background image (compressed to ≤1800px; dark/light is auto-detected from average brightness).
- **Font (per space):** Sans, Serif, Rounded, Mono, Hand.
- **Accent color (global):** 8 options, each with a light-mode and a dark-mode variant.
- **Theme:** Auto, Light or Dark.
- **Auto-contrast:** on dark backgrounds, box labels, frameless cards and the dot pattern switch to light colors, and the reverse happens on light backgrounds in dark mode.

### Data & portability
- **Autosave** to `localStorage`, debounced 250 ms and flushed when the tab hides or closes.
- **Undo/redo** (⌘Z / ⇧⌘Z), with up to 80 steps per space.
- **Export:** full JSON backup; the current space as **Markdown** (boxes become sections, widgets render their computed values, for example "split … → **$36 each**"); and the current space as a **JSON Canvas** `.canvas` file (Obsidian-compatible).
- **Import:** Sprawl JSON (merges spaces) or JSON Canvas (creates a new space; nodes are auto-classified). You can also drag a `.canvas` file onto the canvas.
- **GitHub Gist sync (optional):** push/pull the full state to a private Gist with a token that has only the `gist` scope. Auto-push is optional. The token is never included in exports or the Gist.
- **Copy as Markdown** for one card or a whole selection (⌘C with cards selected).

## The 21 card shapes

| Shape | Example input | What it renders / does |
|---|---|---|
| ¶ Note | any thought | Formatted text (bullets, code, links, tags) |
| ☑ Checklist | `pack charger, passport and headphones` | Splits into checkbox items under a "Pack:" title; done-count in the tag |
| H Heading | `# Q4 PLAN` | Large title text |
| ↗ Link | `https://vercel.com/blog check later` | Link card (host + path); YouTube/Spotify embeds; image URLs show the image |
| ? Question | `why do customers churn?` | Accent-bordered prompt |
| ❝ Quote | `"less, but better" — dieter rams` | Serif italic quote |
| 📅 Event | `coffee with maya thursday 10am` | Calendar tile, time, "in 4 days", **.ics download** + **Google Calendar** link; ✈ for trips |
| 🔔 Reminder | `remind me to renew the passport tomorrow` | Checkbox, due chip, time, **URGENT** badge; shows in Today |
| ⏱ Timer | `20 min stretch` | Live countdown, progress bar, start/pause/reset, beep + desktop notification, time in the tab title |
| 🔁 Habit | `run 3x a week`, `read daily`, `gym tue and thu` | Mon–Sun tick grid for this week, x/target, 🔥 week streak |
| 🎯 Goal | `walk 500 miles this year, 120 done`, `save $5000 by december` | Progress bar, −/+1 buttons, % and **pace** ("on track" / "behind by 2.1") |
| 🎨 Color | `#3a7bd5`, `sky blue`, `coral` | Swatch, HEX/RGB/HSL (click to copy), 6 tints |
| 🧮 Calculate | `15% of 240`, `2+2*3`, `$86 + 20% tip` | Safe math evaluator (no `eval`), copy result |
| ⇄ Convert | `4 miles in km`, `68f to c`, `100 kg to lbs` | Length, mass, volume, speed, data, time, area, temperature |
| ➗ Split | `split 86 between 3`, `split 120 between 4 tip 20%` | Per-person amount incl. tip |
| 💸 Expense | `spent 14 on lunch` | Amount, auto category icon, this-month total for the space |
| ⏳ Countdown | `days until new year`, `countdown to 12/1` | Days left (knows Christmas, Thanksgiving, NYE, Halloween, etc.) |
| 🌐 Time zone | `9am est in london`, `time in sydney` | Converted time, or live world clock rows with offsets |
| 🎲 Random | `flip a coin`, `roll 2d6`, `pick one: beach, hike or museum` | Dice faces / coin / pick, "Again" button |
| 📊 Poll | `tacos, ramen or pizza tonight?` | Tap-to-vote options with bars, leader highlighted, reset |
| 👤 Contact | `maya chen 555 201 8890 maya@example.com` | Avatar initials, tel:/mailto: links, **vCard download** |

## Keyboard & gestures

| Key / gesture | Action |
|---|---|
| Click empty canvas | New card (or finish editing / clear selection) |
| Enter · Shift+Enter | Finish card · new line (continues lists) |
| ⌥+Enter · Esc | Finish + new card below · finish |
| Tab / Shift+Tab (editing) | Cycle the suggested shape |
| `/` as first character | Shape picker |
| ⌘K or `/` (not editing) | Command palette: capture, search, commands |
| N · B · D · T · P | New card · box · draw · Today · present |
| F · M · . | Zoom to fit · minimap · focus mode |
| 1–6 (with selection) | Note, checklist, heading, link, question, quote |
| *(rebindable)* | Every single-key shortcut (N, B, D, T, P, F, M, L, `.`, `/`, `0`, `=`, `-`) can be changed in ⚙ Settings → Shortcuts: click a key and press the new one. ⌘ shortcuts, 1–6 and arrows are fixed |
| L · arrows (with selection) | Lock · nudge (Shift = 24px) |
| ⌘D · Delete · ⌘C | Duplicate · delete · copy as Markdown |
| ⌘A · ⌘Z · ⇧⌘Z | Select all · undo · redo |
| Shift+drag | Paint select |
| Drag ● handle | Connect / branch new card |
| Drag ◢ corner · double-click ◢ | Resize · reset size |
| Drop card overlapping another's edge | Combine (hold ⌥ to skip) |
| Drop card a little under/over another | Snap into a vertical list |
| Right-click / long-press | Context menu (card, box, connection, canvas) |
| Pinch | Zoom (touch) |

## Architecture

The app is a few files, all loaded by `index.html`:

| File | What it is |
|---|---|
| `index.html` | Static HTML for the chrome: toolbar, panels, palette, intro overlay |
| `sprawl.css` | All styles |
| `sprawl-features.js` | The text featurizer (hashed word/char n-grams + shape flags). Shared by the browser and the trainer; no DOM |
| `sprawl-model.js` | **Generated.** The shape model: int8 weights for 21 classes × 4096 feature buckets, base64, ~113 KB |
| `sprawl.js` | Everything else: one IIFE in strict mode, loaded at the end of the body |
| `model/data.js`, `model/train.js`, `model/eval.json` | Synthetic training data, the node trainer, and 131 hand-written eval phrases |
| `tests/run.py` | Headless-Chromium regression sweep |

Inside `sprawl.js`, search for these section banners (`// ====` comments):

| Section | Responsibility |
|---|---|
| constants | `TYPE_META` (the 21 shapes: icon, label, example, description), colors, frames, `ICONS` (inline SVG paths) + `I()` helper, fonts, accents, gradients, looks, defaults |
| state | `db` (persisted), `sel`, `editingId`, `pred` (live-typing state), `drag`, `pres`, filters |
| persistence + undo | `load/save/flush`, `migrate()` (schema upgrades), per-space undo stack of JSON snapshots |
| **PARSERS** | Pure functions: `parseWhen`, `parseCalc` + `evalExpr`, `parseConvert`, `parseTZ`, `parseCountdown`, `parseTimer`, `parseHabit`, `parseGoal`, `parseColor`, `parseSplit`, `parseExpense`, `parseRandom`, `parsePoll`, `parseContact`, `parseEvent`, `parseReminder` |
| **RULES ENGINE** | `ruleRank(text)` → `[{type, score}]` sorted; `ruleClassify`; `transform(type, text)` (e.g. checklist conversion); `enabledTypes()` |
| SHAPE MODEL | Decodes `window.SPRAWL_MODEL`; `modelProbs(text)` → softmax over 21 shapes; `rank(text)` blends rules and model; `classify()` = top of `rank()` |
| RENDERERS | `contentHTML(card)`, with `SMART_RENDER[type]` per widget, `fmt()` inline markdown, `linesHTML()` blocks, calendar/ICS helpers |
| RENDER | `cardNode`, `boxNode`, `render()` (full), `refreshCard(id)` (one card), connection curves, ink, view transform, background layers, minimap, legend |
| LIVE SHAPESHIFT | `startPred`, `onLiveInput` (debounced re-rank, slash menu), `renderLive` (chips + ghost), `pickShape`, `slashChoose` |
| MUTATIONS | create/edit/commit, remove → trash, setType, duplicate, align/arrange, move between spaces, inbox capture, space switching |
| COMBINE / SNAP | `mergeInfo` (pure: what would A+B become), `describeMerge`, `checkMerge` (hit-testing during drag for both zones), `doMerge`; `chainBelow`, `closeGap`, `doSnap` for lists |
| WIDGET ACTIONS + TICKER | `widget(card, action)` for every interactive control; a 1 s `setInterval` ticker for timers, tab title, periodic refresh of clocks/countdowns |
| IMAGE STORE | IndexedDB (`sprawl-images`): `storeImage`, `imgSrc`, `migrateImages`, `loadImages`, `inlineImages` (for export), `gcImages` |
| IMAGES / TEMPLATES / EXPORT | Image compression, `addUrl`, template definitions + placement, Markdown & JSON Canvas I/O |
| POPOVERS / MENUS | `openPop` + card, connection, box, background, space, trash, template, Add, arrange menus; selection bar |
| DRAWING / PRESENTATION | Freehand strokes (quadratic-smoothed SVG paths), slide mode |
| POINTER INPUT | Unified Pointer Events: pan, pinch, card drag (+ merge detection), connect, resize, box move/resize, marquee, long-press |
| KEYBOARD + PASTE | Global shortcuts, paste of images/URLs/text |
| COMMAND PALETTE / TODAY / STYLE / SYNC / INTRO / SETTINGS | Panels and their handlers; the intro's typing demo reuses `rank()` and `contentHTML()` |
| GO | Async boot: render icon placeholders, `migrate(load() \|\| seed())`, migrate/load images, render, fit view, open the intro on a first visit; exposes `window.__sprawl` for tests |

**Rendering model:** the DOM is rebuilt from state, never the other way around. Cards are absolutely positioned `div`s inside `#world`, which gets a CSS `translate() scale()` for pan/zoom. Connections and ink are SVG layers in the same transformed space. During drags the code mutates `style.left/top` directly for speed and saves on pointer up.

## Data model

```js
db = {
  spaces: { [id]: Space },
  order: [spaceId, ...],          // sidebar order
  current: spaceId,
  templates: [{ id, name, data: { cards, boxes, connections } }],
  settings: {
    live: true,                    // live preview while typing
    introSeen: true,               // the first-visit intro was dismissed
    keys: { newCard:'n', box:'b', … }, // single-key shortcuts (see KEY_ACTIONS / KEYS_DEFAULT)
    disabled: ['timer', ...],      // card shapes turned off
    theme: 'auto'|'light'|'dark', accent: 0..7,
    snap, minimap, legend,
    gist: { token, id, auto, last }   // token never exported
  }
}

Space = {
  id, name, kind: '' | 'inbox', pinned,
  cards: [Card], connections: [Conn], boxes: [Box], strokes: [Stroke],
  trash: [{ card, conns, at }],    // last 100 removed cards
  bg: { color?, grad?, image?, dark?, pattern: 'dots'|'grid'|'lines'|'none' },
  font: 'sans'|'serif'|'rounded'|'mono'|'hand',
  view: { x, y, z }                // camera
}

Card = {
  id, x, y, w, h?,                 // h = optional min-height from resizing
  text,                            // SOURCE OF TRUTH for content
  type,                            // one of the 21 shapes
  auto, manual,                    // manual=true → never auto-reclassified
  color, frame: ''|'sticky'|'badge'|'dashed'|'plain', locked,
  img,                             // '' | http(s) URL | 'idb:<key>' (bytes in IndexedDB; data: URLs are migrated on load)
  data: {                          // widget-only state that text can't hold
    // timer: dur,left,endAt,fin · habit: log{iso:1} · goal: done
    // poll: votes{opt:n} · random: r,rk · reminder: done
  },
  created, updated                 // updated is the reference date for relative dates
}

Conn  = { id, from, to, label, color }
Box   = { id, x, y, w, h, name, color, emoji, style: 'soft'|'solid'|'outline'|'dashed' }
Stroke= { id, pts: [x,y,x,y,...], color, w }
```

**Storage key:** `localStorage['sprawl.v1']` for the JSON; IndexedDB database `sprawl-images`, store `img`, for image blobs keyed by the `idb:` reference. **Schema changes go through `migrate()`**, which fills defaults, drops removed settings (e.g. old Jev/Ollama/Chrome-AI keys), and repairs unknown types to `note`. Exports and Gist pushes inline images as data URLs again, so backups stay portable.

## How classification works

Two voters, one rule: **parsers decide what is renderable, the model and the rules decide what it is.**

1. **`ruleRank(text)`** scores every shape from 0 to 1 using its parser plus heuristics (`split…between N` → 0.96, a date plus event words → 0.88, an imperative verb first → Checklist 0.72, Note always 0.2 as the floor). A smart shape only appears in this list if its parser accepted the text, so whatever wins can actually render. Disabled shapes are filtered out.
2. **`modelProbs(text)`** runs the on-device model: `sprawl-features.js` turns the text into hashed features (words, bigrams, character trigrams, and flags like "has a time", "ends with ?", "starts with a bullet"), and a 21-way logistic regression returns probabilities. It takes about 0.05 ms.
3. **`rank(text)`** blends them. If the rules are certain (top score ≥ 0.94, which only parser-backed shapes reach) the rules win outright. Otherwise the model's probability mass is restricted to the *feasible* shapes (the six basics plus whatever the parsers accepted) and renormalized, and each shape scores `0.5 × rules + 0.5 × model`. The model can therefore never pick a Timer for text `parseTimer` rejects, but it does settle note-vs-task-vs-question-vs-heading, "15 minute meeting friday 3pm" (event, not timer) and similar calls that rules alone get wrong.
4. **While typing**, `rank()` runs 60 ms after each keystroke; the results become chips and the top one renders as a ghost.
5. **On commit:** a shape you picked wins and sets `manual=true`; otherwise `classify()` decides and `applyType` runs `transform` (for example, comma lists become checkbox items).
6. **Relative dates** ("friday", "tomorrow") are parsed relative to `card.updated`, so "friday" doesn't drift when you reopen the app. `@date` tokens in checklists are normalized to ISO when you finish editing.

### The model
- **Training:** `node model/train.js` (about 3 seconds). `model/data.js` generates ~21,000 phrases from templates and vocab lists per shape, including the misfires found while testing ("I sat with him", "Q4 2025-2026 plan", "spend 20 min on email"). The trainer fits a multinomial logistic regression with Adagrad, quantizes the weights to int8, and writes `sprawl-model.js`.
- **Evaluation:** `model/eval.json` holds 131 hand-written inputs that were never used for training. Rules alone get 122 right; the blend gets 129. `tests/run.py` checks both numbers.
- **Changing it:** add or fix templates in `model/data.js`, add eval phrases, retrain, and look at the `miss:` lines the trainer prints. Never hand-edit `sprawl-model.js`.

## How combining works

`checkMerge` runs on every pointer move while a **single** unlocked card is dragged and ⌥ isn't held. Both drop zones need at least 40% horizontal overlap with another card:

- **Combine** when the dragged card's top is within −19…10px of the target's bottom (append) or its bottom within the same band of the target's top (prepend): the cards overlap or touch.
- **Snap into a list** when the gap is 10…90px instead: a dashed slot shows where the card will land (`x` of the target, 12px below it), and every card chained directly beneath the target (`chainBelow`, same `x` within 6px and gap ≤ 22px) shifts down in the preview. Dropping a card *above* a list member inserts before it. When a drag starts from inside a list, `closeGap` moves the cards below up. If a snap and a combine both apply, aiming at the top half of the overlapped list member means snap. The whole drop is planned once by `planSnap` from state (close the slot the card came from, then land and make room), so the preview and the result agree and nothing moves twice; dropping a card back where it came from is a no-op, a few-pixel nudge inside a list settles back into its slot, and a card never combines with its own list neighbours unless it is moved at least half its height.

`mergeInfo(target, src, mode)` is pure and computes the combine result used for both the preview label and the real merge:

| Situation | Result |
|---|---|
| Target is a **poll** | New options added from the other card's lines (≤6 words each), or poll+poll unions options **and votes** (max 8) |
| Either card is a **checklist** | One checklist: a single title kept on top, everything else becomes `[ ]` items, duplicates dropped; a short note dropped *above* an untitled checklist becomes its title |
| A **heading** is on top | Note with the heading as a **bold** first line |
| One card has an **image** | Image kept, texts joined as the caption (two images → merge not offered) |
| Anything else | Texts joined in reading order, then re-classified (e.g. "coffee thu" + "10am with maya" → Event) |

`doMerge` writes the result into the target card (keeping its position and id), takes the wider width, resets height, keeps the target's color (or adopts the source's), **rewires the source's connections** to the target (dropping self-loops and duplicates), deletes the source (not to trash, since undo covers it), and plays the morph and flash animations. One ⌘Z undoes it.

## Extending Sprawl

### Add a new card shape
1. Add an entry to `TYPE_META` with `{i: icon, l: label, ex: example, d: description}`. `d` is also what the on-device model reads.
2. Write a pure `parseX(text)` in **PARSERS** that returns structured data or `null`.
3. Score it in `ruleRank` inside the `lines.length<=2` block, and add any conflict caps.
4. Add `SMART_RENDER.x = c => html`, using `W(action, label)` for buttons and `c.data` for state.
5. If it's interactive, handle the actions in `widget()`.
6. Teach the model: add a generator and a count in `model/data.js`, add the type to `TYPES` in `model/train.js`, add a few eval phrases, run `node model/train.js`.
7. Optionally:
   - Add Markdown output in `mdOf`.
   - Include it in Today via `collectAll`.
   - Add a regression case in the test list.

### Add a template
Push into `TEMPLATES` with `{name, desc, make: () => ({cards, boxes, connections})}`. Use the `C(id,x,y,text,type,extra)` and `K(from,to,label,color)` helpers. Coordinates are relative, and placement is automatic.

### Add a Style "look", gradient, accent or font
Edit `LOOKS`, `GRADS`/`BG_GRADS` (third value `1` = dark), `ACCENTS` (`c` light, `d` dark), or `FONTS`.

### Add an icon
Add SVG path markup to `ICONS` (24×24 viewBox, stroke-based) and use `I('name')` in JS or `<i data-i="name"></i>` in static HTML.

## Invariants / things not to break

- **Card text is the source of truth.** Widgets must render from `parseX(card.text)`. Only store in `card.data` what text *cannot* express (votes, timer state, habit log, goal progress override).
- **`manual: true` must never be overridden** by auto-classification.
- **Disabled shapes** must be excluded everywhere: `ruleRank`, slash menu, Add menu, card menu, palette commands and the AI prompt (`enabledTypes()` is the single gate).
- **The model never overrides a parser.** `rank()` only lets the model choose among shapes whose parser accepted the text, and never beats a rule score ≥ 0.94. Keep it that way, or cards will pick shapes they can't render.
- **Images go through `storeImage()`** and are read with `imgSrc()`. Never put a data URL straight into `card.img` or `bg.image`; never assume `card.img` is displayable as-is.
- **No network by default.** Don't add CDNs, fonts, analytics or server calls. Network access must be user-initiated (sync, embeds, images).
- **Secrets never leave the browser.** `exportData()` strips the Gist token, and new secrets must be stripped there too.
- **Schema changes go through `migrate()`** so old saves keep loading.
- **Undo before mutate:** call `pushUndo()` before changing the current space. Drags push once at the first move.
- **Pointer events:** a new interactive element inside a card needs `data-w="action"` (widget) or explicit handling in `onDown` *before* the generic card-drag branch, or clicks will start drags/edits.
- **Popover swatches:** `.pop .row button` sets `width:auto`. Swatches rely on the more specific `.pop .row button.sw` rule, so keep it, or swatches collapse to 0 width (a real bug fixed in v4).
- **No build step, no bundler, no external scripts.** The only generated file is `sprawl-model.js`, and `node model/train.js` regenerates it. Portability is a feature.

## Testing

`python3 -I tests/run.py` drives `index.html` in headless Chromium (Python Playwright, `pip install playwright && playwright install chromium`) and checks: the intro and Welcome layout, the 34-phrase classifier regression, the model eval set (blend must stay ≥ 125/131), typing flows (comma lists, Shift+Enter, slash menu, Tab), drag/connect/snap/combine/resize, move-to-space undo, palette capture, Today, templates and presenting, the IndexedDB image store, exports, and the phone layout. It exits non-zero on any failure or console error; `--keep` leaves screenshots in `tests/out/`.

`node model/train.js` retrains the model and prints held-out accuracy and the misses. `node --check sprawl.js` is the quick syntax check.

Useful hooks: `window.__sprawl` exposes `db`, `rank`, `ruleRank`, `modelProbs`, every parser, `storeImage` and `imgSrc`. To set up a scenario, mutate `__sprawl.db`, write it to `localStorage['sprawl.v1']`, and reload. Pitfalls: clicking the same canvas spot twice edits the first card instead of making a second; inserting a template moves the camera; Playwright won't click elements outside the viewport; `innerText` reflects CSS uppercase.

## Known limitations & ideas

**Limitations**
- **Browser-local.** Text lives in localStorage (~5 MB, plenty now that images are in IndexedDB); Sprawl warns when saving fails. Use Gist sync or JSON export for backup. Browsers can evict IndexedDB under storage pressure, so back up images you care about.
- **Sync is last-write-wins** (whole-state push/pull), not real-time merging.
- **No real-time collaboration** (Kinopio has it). This is a personal tool by design.
- **The shape model** is trained on synthetic phrases, so unusual phrasings can still land on Note. Picking a shape with Tab or `/` always works, and sticks.
- **Card height** from resizing is a *minimum*, so content never gets clipped and cards grow taller than the set height if their content needs the room.
- **Time zone and city coverage** is a curated list (~70 cities/abbreviations). Holidays are US-centric.
- **Merging two image cards** isn't supported.

**Ideas for next steps**
- A backlink graph view across spaces, plus a tag browser.
- Recurring events and reminders, and an `.ics` feed of all dated items.
- A PWA manifest + service worker for install-to-home-screen.
- Optional end-to-end-encrypted sync.
- More shapes: weather (needs network), stock ticker, flashcard, rating, progress-by-date.

## Version history

| Version | Highlights |
|---|---|
| **v1** | Click-anywhere cards; 6 types (note, todo, heading, link, question, quote); rules / Chrome / Ollama classifiers; connections, boxes, paint select, 8 templates, spaces, undo, JSON/Markdown export |
| **v2** | ~25 Kinopio-inspired features: frames, lock, drawing, `[[space links]]`, images & YouTube/Spotify embeds, labelled connections + legend, arrange tools, trash, pinned spaces, minimap, ⌘K palette, Inbox capture, `@due` dates, ☀ Today, context menus & long-press, focus mode, snap-to-grid, GitHub Gist sync |
| **v3** | **ShapeShift fusion:** 15 new smart shapes (21 total) with deterministic parsers; live ghost preview, shape chips, Tab cycling, `/` picker, morph animation; agenda-style Today; presentation mode; JSON Canvas import/export; code blocks; Jev engine + Cloudflare proxy (later removed) |
| **v3.1** | Enter finishes / Shift+Enter new line with list continuation; removed all server-based engines (Jev, Ollama), keeping rules + on-device Chrome model; **choose your own card shapes** |
| **v4** | ◢ corner resize on both axes for cards & boxes + double-click reset; **drag-to-combine** with preview bar and smart merge rules; 🎨 Style panel (looks, colors, gradients, patterns, background images, fonts, accents, theme); redesigned ＋ Add menu with URL box and tiles; box emoji/style/inline rename; card image actions; drop overlay; SVG icon set; red/teal colors; dark/light background auto-contrast; fixed zero-width menu swatches |
| **v5.2** | Rebindable single-key shortcuts in Settings (conflict check, reset to defaults, button tooltips and palette hints follow); Settings trimmed to things you configure |
| **v5.1** | Snap planner rewrite (no double shifts or jumps when snapping above a card or nudging inside a list); slash menu lists all 21 shapes in a wider, scrollable list that follows the arrow keys; SVG icons for every shape in the Add menu, chips, pills, menus and palette (emoji remain only in plain-text toasts and Markdown) |
| **v5** | **On-device shape model** (113 KB logistic regression, blended with rules; Chrome Gemini removed); **snap into lists** by drag; **images in IndexedDB**; first-visit **intro** with a live typing demo and a **Welcome** space built from boxes; all example phrases are Sprawl's own; parser fixes for goals, tip math, long countdowns and weekday habits; `tests/run.py` regression sweep |
| **v4.1** | Split into `index.html` + `sprawl.css` + `sprawl.js`. Bug fixes: dates, phone numbers and "9-5" no longer become Calculate cards; a dated meeting with a duration is an Event, not a Timer; "spend 20 min" is not an Expense; year ranges are not Contacts; verb-first text with a phone number stays a task; "breakfast at 7:30" is AM; "thursday march 5" uses the explicit date; bare "sat/sun/wed" only count as weekdays with time context; habit names drop "every morning"; goals accept "$5000"; undo after *Move to space* no longer duplicates the card (multi-space snapshots); redo commits an open edit; one mouse-wheel notch no longer jumps to max zoom; ⌘K works while typing in a card; duplicated timers start fresh; date-sensitive cards re-render at midnight; the hint hides when a space only has boxes |

## Credits & sources

- **Kinopio** by Pirijan: <https://kinopio.club>, the essay "Towards a Better Whiteboard" (<https://pketh.org/towards-a-better-whiteboard.html>), and the Apptisan interview (<https://apptisan.substack.com/p/kinopio>). These are the source of the spatial-thinking, messy-by-design and no-AI-arranging principles.
- **ShapeShift** by anishfn: <https://shapeshiftui.vercel.app>, wiki at <https://github.com/anishfn/shapeshift/wiki>. This is the source of the "input that becomes what you mean" concept, the 19 example card types, "Jev decides, code computes," and the hysteresis approach to live suggestions.
- **TypeSafe AI's Jev**, the decision model ShapeShift uses. Sprawl evaluated it and removed it in favor of zero-infrastructure local rules.
- **JSON Canvas**, the open canvas file format (used by Obsidian): <https://jsoncanvas.org>.

Sprawl was built iteratively with Claude as a personal productivity tool for a static website.
