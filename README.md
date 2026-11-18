<div align="center">

# Activity Boards: Business Innovation with Agentic AI and AI Agents

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Create a board, show its QR code, everyone joins and builds it live. Screenshot it into your Practical Performance.**

[Open the boards](https://alfredang.github.io/bcm/) · [Meta Muse prompt templates](https://alfredang.github.io/bcm/prompts.html) · [Report a bug](https://github.com/alfredang/bcm/issues)

</div>

![Landing page](screenshot.png)

## What this is

The online activity tool for the WSQ course **Business Innovation with Agentic AI and AI Agents** (TGS-2023037472, Tertiary Infotech Academy). There is one activity per learning outcome. Anyone can create a board in one click; it opens with its QR code and Board ID, and everyone joins with just their name (no login), types answers into each block as sticky notes, and screenshots the finished board.

> **For the PP:** build it together on one board. Everyone pastes the board screenshot and writes their own answers.

| Activity | Board | LO · K&A | Screenshot goes into | Deep link |
|---|---|---|---|---|
| 1 | Business Model Canvas for AI Agents (the nine classic blocks, asked about AI agents) | LO1 · K1, K2, A1, A2 | **PP Task 1** | <https://alfredang.github.io/bcm/?activity=opportunity> |
| 2 | AI Agent 90-Day Action Plan (1 Set the goal · 2 Mine the process · 3 Plug in the agents · 4 Name the owner · 5 Run a 90-day pilot) | LO2 · K3, K4, A3, A4 | **PP Task 2** | <https://alfredang.github.io/bcm/?activity=actionplan> |
| 3 | Sustain and Operate with AI Agents (SCALE: Story, Commanders, Augment people, Loop information, Evaluate) | LO3 · K5, K6, A5, A6 | **PP Task 3** | <https://alfredang.github.io/bcm/?activity=change> |

The activity content (block titles, prompts, guiding questions, discussion questions, the Meta Muse prompt and the worked example) comes from the course build in [`js/templates.js`](js/templates.js). That file is generated; do not edit it by hand.

## Meridian demo boards and sample website

Meridian Services Pte Ltd is a **fictitious** facilities-maintenance company used as the worked example. Each activity has a finished demo board to refer to:

| Activity | Demo board |
|---|---|
| 1 · Business Model Canvas for AI Agents | <https://alfredang.github.io/bcm/?join=meridian-activity-1> |
| 2 · AI Agent 90-Day Action Plan | <https://alfredang.github.io/bcm/?join=meridian-activity-2> |
| 3 · Sustain and Operate with AI Agents (SCALE) | <https://alfredang.github.io/bcm/?join=meridian-activity-3> |

Bonus topic sample: the website for Meridian's new AI agent business, **Meridian Assist**, at <https://alfredang.github.io/bcm/meridian/>. Learners build their own with Codex and deploy it with Sites.

## How a class uses it

1. **Create a board.** On the landing page type your name (a board title is optional) and press *Create Activity 1 / 2 / 3 board*. The board opens straight onto its QR code, Board ID and join link (`?join=<id>`).
2. **Everyone joins.** Scan the QR code, open the join link, or type the Board ID under *Join a board*, then enter a name. Everyone on the board edits live.
3. **Draft with Meta Muse.** On the board, *Copy Muse prompt* copies the activity's prompt; *Open Meta Muse* opens <https://muse.ai/> in a new tab. Paste Muse's numbered reply into *Paste Muse answer*: the board matches each line to its block, shows a preview, and adds only the answers you tick (tagged `Muse`). Lines it can't match stay in the dialog for copying by hand.
4. **Type your answers.** Every block has a *Type your answer…* box: Enter saves (Shift+Enter for a new line; the first line becomes the headline). The **+** button opens the full note editor (tag, priority, status). Notes can be voted on, edited and dragged to reorder.
5. **Stuck?** *View example* shows how a fictional sample company filled in each block, without writing anything. *Load worked example* copies those notes onto the board, tagged `Example`.
6. **Hand it in.** *Screenshot view* hides the editing tools and adds a header strip with the course, activity, **board title**, the learner's own name, the date and the PP task. From there: **Download PNG**, **Download PDF** (one landscape A4 page) or **Print**.

## Screenshots

| Activity 1 · Business Model Canvas for AI Agents | Activity 2 · AI Agent 90-Day Action Plan |
|---|---|
| ![Activity 1](docs/screens/opportunity.png) | ![Activity 2](docs/screens/actionplan.png) |
| **Activity 3 · Sustain and Operate with AI Agents (SCALE)** | **Screenshot view (what goes into the PP)** |
| ![Activity 3](docs/screens/change.png) | ![Screenshot view](docs/screens/screenshot-view.png) |

## Tech stack

| Area | Choice |
|---|---|
| Pages | Plain HTML, CSS and ES-module JavaScript. No build step. |
| Real-time data | Firebase Cloud Firestore (modular SDK from the gstatic CDN) |
| QR codes | QRCode.js (jsDelivr) |
| Screenshot export | html2canvas and jsPDF (jsDelivr, loaded only when first used); print stylesheet as fallback |
| Hosting | GitHub Pages via GitHub Actions |
| Design | Tertiary Infotech course-site look: ivory `#FAF9F5`, charcoal `#21201C`, terracotta `#D97757`, teal `#3A7D7B`, Cambria headings, Calibri body. Light by default, dark theme on request. |

## Project structure

```
bcm/
├── index.html            # Landing (create / join), board page, modals
├── css/styles.css        # Design tokens (light + dark), layouts, screenshot + print styles
├── js/
│   ├── templates.js      # GENERATED by the course build: activities, Muse prompts, worked example
│   ├── boards.js         # Activity catalogue; classic BMC + retired activities for older boards
│   ├── app.js            # Theme, routing (#/c/<id>, ?activity=, ?join=), toast, modals
│   ├── landing.js        # Activity cards, join a board, one-click create per activity
│   ├── trainer.js        # Legacy bulk-create page (#/trainer, no longer linked)
│   ├── canvas.js         # Board page: header, blocks, typed answers, presence
│   ├── notes.js          # Sticky notes: live sync, editor, votes, reorder, worked example
│   ├── muse.js           # Copy Muse prompt; parse a pasted Muse reply into notes
│   ├── shot.js           # Screenshot view, PNG / PDF / print
│   ├── share.js          # QR code + invite link
│   └── firebase.js       # Firebase config
├── docs/screens/         # Screenshots
└── screenshot.png        # Landing page screenshot
```

## Data model (Firestore)

```
canvases/{boardId}                    title, group, org, type, ownerName, learners[],
                                      createdVia ("trainer" for bulk-created boards), createdAt
canvases/{boardId}/blocks/{blockId}/notes/{noteId}
                                      title, description, category, priority, status,
                                      authorId, authorName, votes, voters[], order,
                                      createdAt, updatedAt
canvases/{boardId}/presence/{participantId}   name, color, lastSeen
```

- `type` is the activity key (`opportunity`, `actionplan`, `change`). `title` is the board title ("Board" when left blank).
- Older boards keep working. A board with no `type` (or `bmc`) opens with the classic nine-block Business Model Canvas; a board of the retired `companymap` activity opens with its notes and a "retired activity" note. Neither can be created any more.
- `category` is free text; `Example` (worked example) and `Muse` (pasted from Meta Muse) are styled tags.

Firestore rules are set by the project owner in the Firebase console. The app expects read/write access to `canvases/**`.

## Run locally

```bash
git clone https://github.com/alfredang/bcm.git
cd bcm
python3 -m http.server 8080
```

Open <http://localhost:8080>. ES modules need an HTTP origin; `file://` will not work.

## Deploy

`.github/workflows/deploy-pages.yml` publishes the repository to GitHub Pages on every push to `main`.

## Acknowledgements

- Business Model Canvas by **Alexander Osterwalder and Yves Pigneur** (Strategyzer).
- [Firebase](https://firebase.google.com/), [QRCode.js](https://github.com/davidshimjs/qrcodejs), [html2canvas](https://html2canvas.hertzen.com/), [jsPDF](https://github.com/parallax/jsPDF).

## Developed by

**Tertiary Infotech Academy Pte Ltd**: [tertiarycourses.com.sg](https://www.tertiarycourses.com.sg/)

## License

[MIT](https://opensource.org/licenses/MIT)

---

<div align="center">Powered by <a href="https://www.tertiarycourses.com.sg/">Tertiary Infotech Academy Pte Ltd</a></div>
