# Sprawl

**A messy, spatial thinking canvas where every card shapeshifts into what you mean.**

Sprawl is three plain files (`index.html`, `sprawl.css` and `sprawl.js`, ~2,900 lines in all, no build step, no dependencies, no server) that run on any static host, such as GitHub Pages. Click anywhere and type. Your text becomes a card on an infinite canvas, and the card turns into the right shape automatically: a checklist, an event with a calendar button, a running timer, a poll, a bill split, a unit conversion, and more. You stay in charge of *where* things go and *how* they connect.

> **TL;DR for agents:** Markup is in `index.html`, styles in `sprawl.css`, and all logic in `sprawl.js`. State is one JSON object in `localStorage['sprawl.v1']`. Card text is the source of truth, and every smart widget is re-derived from text by deterministic parsers at render time. Read [Architecture](#architecture) and [Invariants](#invariants--things-not-to-break) before editing.

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
- Typing "25 min focus" should give you a working timer.
- Typing "pizza or burgers for friday?" should give you a poll you can vote on.

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

ShapeShift originally used TypeSafe AI's hosted **Jev** decision model. Sprawl briefly integrated Jev too (via a proxy), then removed it. The owner wanted **no servers and no API calls**. Sprawl uses a hand-written rules engine instead, with optional on-device Gemini Nano in Chrome.

### The synthesis
Kinopio says "AI shouldn't arrange your thinking." ShapeShift says "software should understand what you typed." Sprawl reconciles them:

- **The engine only labels.** It never moves, groups, connects or rewrites your ideas.
- **You always win.** Every automatic choice can be overridden, and overrides stick.
- **Spatial work stays manual.** Placement, connections, boxes and combining are all human gestures.

## Design principles

1. **Zero infrastructure.** Three static files, with no external scripts, fonts, CDNs or analytics. It works offline from `file://`.
2. **Private by default.** Nothing typed leaves the device. The only network calls are user-initiated: optional GitHub Gist sync, and images/embeds/links the user adds.
3. **Text is the source of truth.** Widgets are views over text. A card can always fall back to plain text without data loss.
4. **Deterministic computing.** Engines pick shapes. Parsers compute values.
5. **User overrides are sticky.** Once you pick a shape manually (`card.manual = true`), auto-detection never changes it until you choose "✨ Auto."
6. **Choose your own shapes.** Users can turn off any card type. Disabled types are never detected or suggested.
7. **Fast capture beats perfect structure.** Enter finishes a card, ⌘K captures from anywhere, and paste/drop "just works."
8. **Fun and expressive.** Themes, gradients, fonts, emoji box icons, morph animations.
9. **Works on phones.** Touch, pinch-zoom, long-press menus, responsive toolbar.

## Quick start

- **Use it:** open `index.html` in any modern browser (it loads `sprawl.css` and `sprawl.js` from the same folder). That's it.
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
- **Combine cards:** drop a card just under (or just over) another and a glowing bar previews the result, for example "Combine → ☑ Checklist · 3 items." Release to merge. Hold **⌥** to skip combining. See [How combining works](#how-combining-works).
- **Paint select:** Shift+drag (or Select mode on touch). The selection bar can retype, recolor, arrange (align, distribute, stack, row, grid), box, move to another space, lock, duplicate, copy as Markdown, save as a template, or delete.
- **Card frames:** Card, Sticky note (slightly tilted), Badge, Dashed, and No frame (bare text on the canvas).
- **Colors:** yellow, orange, red, pink, purple, blue, teal, green and gray, each with light and dark variants.
- **Lock to background (L):** locked cards behave like the canvas. You can click "through" them to create cards on top.
- **Drawing (D):** freehand ink in 9 colors and 3 widths, an eraser, and clear-all. Pinch still zooms while drawing.
- **Rich text:** `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, fenced ``` code blocks, `[text](url)`, `#tags` (click to spotlight), `[[Space Name]]` links (creates the space if missing), and `@tomorrow` / `@fri` / `@10/30` / `@nextweek` due dates, which become colored chips that turn red when overdue.
- **Images & media:** drop or paste image files (auto-compressed to ≤1000px), drop images straight from other web pages, paste image URLs, or use the **＋ Add** menu. YouTube links show a thumbnail that plays inline, and Spotify links load an embedded player. The card menu has Add/Replace/Remove image. Broken images show a fallback message.
- **Recently removed:** deleted cards go to a per-space trash (last 100) and can be restored.

### Smart shapes (the ShapeShift layer)
- There are **21 card shapes** ([full table](#the-21-card-shapes)). Typing is enough, because the rules engine ranks every shape.
- **Live preview while typing:** shape chips appear under the text ("becomes 📅 Event · ¶ Note") with a faded **ghost** of the finished widget. **Tab / Shift+Tab** cycles shapes, and clicking a chip picks one. A picked shape sticks.
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
| ☑ Checklist | `buy milk, eggs, bread and coffee` | Splits into checkbox items under a "Buy:" title; done-count in the tag |
| H Heading | `# Q4 PLAN` | Large title text |
| ↗ Link | `https://vercel.com/blog check later` | Link card (host + path); YouTube/Spotify embeds; image URLs show the image |
| ? Question | `why do customers churn?` | Accent-bordered prompt |
| ❝ Quote | `"ship it" — someone wise` | Serif italic quote |
| 📅 Event | `dinner with priya friday 8pm` | Calendar tile, time, "in 4 days", **.ics download** + **Google Calendar** link; ✈ for trips |
| 🔔 Reminder | `remind me to pay rent tomorrow urgent` | Checkbox, due chip, time, **URGENT** badge; shows in Today |
| ⏱ Timer | `25 min focus` | Live countdown, progress bar, start/pause/reset, beep + desktop notification, time in the tab title |
| 🔁 Habit | `gym 3x a week`, `read daily` | Mon–Sun tick grid for this week, x/target, 🔥 week streak |
| 🎯 Goal | `read 12 books this year, 4 done` | Progress bar, −/+1 buttons, % and **pace** ("on track" / "behind by 2.1") |
| 🎨 Color | `#ff6b35`, `tiffany blue`, `coral` | Swatch, HEX/RGB/HSL (click to copy), 6 tints |
| 🧮 Calculate | `18% of 3450`, `2+2*3`, `sqrt(16)` | Safe math evaluator (no `eval`), copy result |
| ⇄ Convert | `5 miles in km`, `72f to c`, `100 kg to lbs` | Length, mass, volume, speed, data, time, area, temperature |
| ➗ Split | `split 120 between 4 tip 20%` | Per-person amount incl. tip |
| 💸 Expense | `spent 450 on uber` | Amount, auto category icon, this-month total for the space |
| ⏳ Countdown | `days until christmas`, `countdown to 12/1` | Days left (knows Christmas, Thanksgiving, NYE, Halloween, etc.) |
| 🌐 Time zone | `3pm pst in ist`, `time in tokyo` | Converted time, or live world clock rows with offsets |
| 🎲 Random | `roll 2d6`, `flip a coin`, `pick one: a, b or c` | Dice faces / coin / pick, "Again" button |
| 📊 Poll | `pizza or burgers for friday?` | Tap-to-vote options with bars, leader highlighted, reset |
| 👤 Contact | `rahul 98200 12345 rahul@mail.com` | Avatar initials, tel:/mailto: links, **vCard download** |

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
| L · arrows (with selection) | Lock · nudge (Shift = 24px) |
| ⌘D · Delete · ⌘C | Duplicate · delete · copy as Markdown |
| ⌘A · ⌘Z · ⇧⌘Z | Select all · undo · redo |
| Shift+drag | Paint select |
| Drag ● handle | Connect / branch new card |
| Drag ◢ corner · double-click ◢ | Resize · reset size |
| Drop card under/over another | Combine (hold ⌥ to skip) |
| Right-click / long-press | Context menu (card, box, connection, canvas) |
| Pinch | Zoom (touch) |

## Architecture

The app is three files: `sprawl.css` (all styles), `index.html` (static HTML for the chrome: toolbar, panels, palette) and `sprawl.js` (one IIFE in strict mode, loaded at the end of the body). Search for these section banners (`// ====` comments):

| Section | Responsibility |
|---|---|
| constants | `TYPE_META` (the 21 shapes: icon, label, example, description), colors, frames, `ICONS` (inline SVG paths) + `I()` helper, fonts, accents, gradients, looks, defaults |
| state | `db` (persisted), `sel`, `editingId`, `pred` (live-typing state), `drag`, `pres`, filters |
| persistence + undo | `load/save/flush`, `migrate()` (schema upgrades), per-space undo stack of JSON snapshots |
| **PARSERS** | Pure functions: `parseWhen`, `parseCalc` + `evalExpr`, `parseConvert`, `parseTZ`, `parseCountdown`, `parseTimer`, `parseHabit`, `parseGoal`, `parseColor`, `parseSplit`, `parseExpense`, `parseRandom`, `parsePoll`, `parseContact`, `parseEvent`, `parseReminder` |
| **RULES ENGINE** | `ruleRank(text)` → `[{type, score}]` sorted; `ruleClassify`; `transform(type, text)` (e.g. checklist conversion); `enabledTypes()` |
| AI ENGINES | Optional Chrome built-in model (Gemini Nano via `LanguageModel` API); prompt lists only enabled types; falls back to rules on any failure |
| RENDERERS | `contentHTML(card)`, with `SMART_RENDER[type]` per widget, `fmt()` inline markdown, `linesHTML()` blocks, calendar/ICS helpers |
| RENDER | `cardNode`, `boxNode`, `render()` (full), `refreshCard(id)` (one card), connection curves, ink, view transform, background layers, minimap, legend |
| LIVE SHAPESHIFT | `startPred`, `onLiveInput` (debounced re-rank, slash menu), `renderLive` (chips + ghost), `pickShape`, `slashChoose` |
| MUTATIONS | create/edit/commit, remove → trash, setType, duplicate, align/arrange, move between spaces, inbox capture, space switching |
| COMBINE | `mergeInfo` (pure: what would A+B become), `describeMerge`, `checkMerge` (hit-testing during drag), `doMerge` |
| WIDGET ACTIONS + TICKER | `widget(card, action)` for every interactive control; a 1 s `setInterval` ticker for timers, tab title, periodic refresh of clocks/countdowns |
| IMAGES / TEMPLATES / EXPORT | Image compression, `addUrl`, template definitions + placement, Markdown & JSON Canvas I/O |
| POPOVERS / MENUS | `openPop` + card, connection, box, background, space, trash, template, Add, arrange menus; selection bar |
| DRAWING / PRESENTATION | Freehand strokes (quadratic-smoothed SVG paths), slide mode |
| POINTER INPUT | Unified Pointer Events: pan, pinch, card drag (+ merge detection), connect, resize, box move/resize, marquee, long-press |
| KEYBOARD + PASTE | Global shortcuts, paste of images/URLs/text |
| COMMAND PALETTE / TODAY / STYLE / SYNC / SETTINGS | Panels and their handlers |
| GO | Boot: render icon placeholders, `migrate(load() \|\| seed())`, render, fit view; exposes `window.__sprawl` for tests |

**Rendering model:** the DOM is rebuilt from state, never the other way around. Cards are absolutely positioned `div`s inside `#world`, which gets a CSS `translate() scale()` for pan/zoom. Connections and ink are SVG layers in the same transformed space. During drags the code mutates `style.left/top` directly for speed and saves on pointer up.

## Data model

```js
db = {
  spaces: { [id]: Space },
  order: [spaceId, ...],          // sidebar order
  current: spaceId,
  templates: [{ id, name, data: { cards, boxes, connections } }],
  settings: {
    ai: 'rules' | 'chrome',
    live: true,                    // live preview while typing
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
  color, frame: ''|'sticky'|'badge'|'dashed'|'plain', locked, img,
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

**Storage key:** `localStorage['sprawl.v1']`. **Schema changes go through `migrate()`**, which fills defaults, drops removed settings (e.g. old Jev/Ollama keys), and repairs unknown types to `note`.

## How classification works

1. **`ruleRank(text)`** scores every shape from 0 to 1 using its parser plus heuristics. Examples:
   - `split…between N` → Split 0.96.
   - A date/time plus event words ("lunch", "meeting", "flight"…) → Event 0.88.
   - An imperative verb first ("call", "email", "buy"…) → Checklist 0.72.
   - Cross-rules resolve conflicts. "remind me" caps Checklist, a Poll caps Question, and a verb-first line without event words caps Event.
   - Note is always present at 0.2 as the fallback. Disabled shapes are filtered out.
2. **While typing**, the top results become chips and the top one renders as a ghost. With the Chrome engine, a debounced on-device call runs with **hysteresis** (ShapeShift's trick): the suggestion only switches when a challenger wins twice in a row or is very confident, so the UI doesn't flicker.
3. **On commit:**
   - A shape you picked wins and sets `manual=true`.
   - Otherwise rules (or the stable AI answer) decide, and `applyType` runs `transform` (for example, comma lists become checkbox items).
4. **Relative dates** ("friday", "tomorrow") are parsed relative to `card.updated`, so "friday" doesn't drift to next week's Friday when you reopen the app. `@date` tokens in checklists are normalized to ISO when you finish editing.

The rules engine scores **35/35** on the regression set, which includes all of ShapeShift's published examples.

## How combining works

`checkMerge` runs on every pointer move while a **single** unlocked card is dragged and ⌥ isn't held. A merge candidate needs at least 40% horizontal overlap with another card, with the dragged card's top within about 38px of the target's bottom (append) or its bottom within about 38px of the target's top (prepend). `mergeInfo(target, src, mode)` is pure and computes the result used for both the preview label and the real merge:

| Situation | Result |
|---|---|
| Target is a **poll** | New options added from the other card's lines (≤6 words each), or poll+poll unions options **and votes** (max 8) |
| Either card is a **checklist** | One checklist: a single title kept on top, everything else becomes `[ ]` items, duplicates dropped; a short note dropped *above* an untitled checklist becomes its title |
| A **heading** is on top | Note with the heading as a **bold** first line |
| One card has an **image** | Image kept, texts joined as the caption (two images → merge not offered) |
| Anything else | Texts joined in reading order, then re-classified (e.g. "dinner fri" + "8pm with priya" → Event) |

`doMerge` writes the result into the target card (keeping its position and id), takes the wider width, resets height, keeps the target's color (or adopts the source's), **rewires the source's connections** to the target (dropping self-loops and duplicates), deletes the source (not to trash, since undo covers it), and plays the morph and flash animations. One ⌘Z undoes it.

## Extending Sprawl

### Add a new card shape
1. Add an entry to `TYPE_META` with `{i: icon, l: label, ex: example, d: description}`. `d` is also what the on-device model reads.
2. Write a pure `parseX(text)` in **PARSERS** that returns structured data or `null`.
3. Score it in `ruleRank` inside the `lines.length<=2` block, and add any conflict caps.
4. Add `SMART_RENDER.x = c => html`, using `W(action, label)` for buttons and `c.data` for state.
5. If it's interactive, handle the actions in `widget()`.
6. Optionally:
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
- **No network by default.** Don't add CDNs, fonts, analytics or server calls. Network access must be user-initiated (sync, embeds, images).
- **Secrets never leave the browser.** `exportData()` strips the Gist token, and new secrets must be stripped there too.
- **Schema changes go through `migrate()`** so old saves keep loading.
- **Undo before mutate:** call `pushUndo()` before changing the current space. Drags push once at the first move.
- **Pointer events:** a new interactive element inside a card needs `data-w="action"` (widget) or explicit handling in `onDown` *before* the generic card-drag branch, or clicks will start drags/edits.
- **Popover swatches:** `.pop .row button` sets `width:auto`. Swatches rely on the more specific `.pop .row button.sw` rule, so keep it, or swatches collapse to 0 width (a real bug fixed in v4).
- **Keep it three dependency-free files** (`index.html`, `sprawl.css`, `sprawl.js`). No build step, no bundler, no external scripts. Portability is a feature.

## Testing

There's no test framework in the repo. Development used **headless Chromium via Playwright (Python)** against `file:///…/sprawl/index.html`. Useful hooks:

- `window.__sprawl` exposes `db` and the parsers (`ruleRank`, `parseWhen`, `parseCalc`, `parseConvert`, `parseTZ`, `parseGoal`, `parsePoll`, `parseContact`, `parseExpense`, `parseSplit`, `parseCountdown`, `parseHabit`, `parseTimer`, `parseRandom`, `parseColor`).
- To set up a scenario, mutate `__sprawl.db`, write it to `localStorage['sprawl.v1']`, and reload.

Suites used so far, worth recreating:
1. **Classifier regression:** 35 inputs (ShapeShift's examples + edge cases) → expected type. Must stay 35/35.
2. **Typing UX:** ghost/chips appear, Tab cycles, the slash menu picks, Enter commits, Shift+Enter continues lists, the comma list becomes a checklist.
3. **Widgets:** timer runs and updates the title, poll votes, habit ticks, goal +1, ⌘K capture as a reminder, Today sections, Pitch deck + presentation.
4. **Settings:** old Jev/Ollama saves migrate to rules, and disabling Timer/Calculate removes them from detection and menus.
5. **v4:** card resize on both axes + double-click reset, box resize + fit-reset, six combine scenarios (checklist, heading, poll option, image caption, prepend under title, ⌥ skip), Style looks/gradient/pattern/accent/font, Add menu URL → image/link, box emoji/color/style/rename.
6. **Visual:** screenshots at 1400×900 and 390×844 (mobile).

Quick syntax check: `node --check sprawl.js`.

## Known limitations & ideas

**Limitations**
- **Browser-local storage (~5 MB).** Many large images can fill it, and Sprawl warns when saving fails. Use Gist sync or JSON export for backup.
- **Sync is last-write-wins** (whole-state push/pull), not real-time merging.
- **No real-time collaboration** (Kinopio has it). This is a personal tool by design.
- **The Chrome built-in model** requires desktop Chrome with built-in AI enabled. Elsewhere, rules are used.
- **Card height** from resizing is a *minimum*, so content never gets clipped and cards grow taller than the set height if their content needs the room.
- **Time zone and city coverage** is a curated list (~70 cities/abbreviations). Holidays are US-centric.
- **Merging two image cards** isn't supported.

**Ideas for next steps**
- IndexedDB storage for larger image libraries.
- Snap cards into vertical lists (Kinopio's list-snapping) and reorder by drag.
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
| **v4.1** | Split into `index.html` + `sprawl.css` + `sprawl.js`. Bug fixes: dates, phone numbers and "9-5" no longer become Calculate cards; a dated meeting with a duration is an Event, not a Timer; "spend 20 min" is not an Expense; year ranges are not Contacts; verb-first text with a phone number stays a task; "breakfast at 7:30" is AM; "thursday march 5" uses the explicit date; bare "sat/sun/wed" only count as weekdays with time context; habit names drop "every morning"; goals accept "$5000"; undo after *Move to space* no longer duplicates the card (multi-space snapshots); redo commits an open edit; one mouse-wheel notch no longer jumps to max zoom; ⌘K works while typing in a card; duplicated timers start fresh; date-sensitive cards re-render at midnight; the hint hides when a space only has boxes |

## Credits & sources

- **Kinopio** by Pirijan: <https://kinopio.club>, the essay "Towards a Better Whiteboard" (<https://pketh.org/towards-a-better-whiteboard.html>), and the Apptisan interview (<https://apptisan.substack.com/p/kinopio>). These are the source of the spatial-thinking, messy-by-design and no-AI-arranging principles.
- **ShapeShift** by anishfn: <https://shapeshiftui.vercel.app>, wiki at <https://github.com/anishfn/shapeshift/wiki>. This is the source of the "input that becomes what you mean" concept, the 19 example card types, "Jev decides, code computes," and the hysteresis approach to live suggestions.
- **TypeSafe AI's Jev**, the decision model ShapeShift uses. Sprawl evaluated it and removed it in favor of zero-infrastructure local rules.
- **JSON Canvas**, the open canvas file format (used by Obsidian): <https://jsoncanvas.org>.

Sprawl was built iteratively with Claude as a personal productivity tool for a static website.
