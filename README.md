# Quali Web — Lead Review Tool

Browser-based lead qualifier. Upload Excel files, open Google Search tabs, triage leads (Good/Maybe/Bad), maintain a per-user master sheet via Google Apps Script, and push qualified leads to a shared Google Sheet.

No backend server — pure static SPA. Google Sheets + Apps Script serve as the data layer.

Part of a 3-app product suite for a web dev startup: **Quali** (lead qualifier) + **Manager CRM** + **Dev Board**.

## Tech Stack

- **React** 19 + **Vite** 8
- **SheetJS** (xlsx) for client-side Excel parsing
- **Recharts** for leaderboard pie chart
- **Motion** (framer-motion) for animations
- **Lucide React** for icons
- **Google Apps Script** as the backend (4 deployed scripts)
- **localStorage** for session, config, todos, activities

## Features

- **Glassmorphic login** — UID + password auth via Apps Script
- **Excel import** — drag-and-drop or browse `.xlsx`/`.xls` files
- **Auto column detection** — maps `name`, `query`, `website`, `company_phone`, `email` case-insensitively
- **Multi-file support** — load multiple Excel files into one session
- **Batch Google Search** — opens tabs via hidden `<a>` tag (bypasses popup blockers)
- **BottomBar** — Spotify-style docked panel for triage
- **Tag leads** — Good (green), Maybe (yellow), Bad (red)
- **Cloud master dedup** — skips leads already tagged by other qualifiers
- **Per-user master sheet** — auto-created Google Sheet per user on first login
- **Master viewer** — full table with Discard, Push, and Comments
- **Push to shared sheet** — sends qualified leads via Apps Script
- **Manual lead add** — add leads directly from the UI
- **Export** — download tagged leads as Excel
- **Competition leaderboard** — pie chart of who pushed the most leads
- **Notifications** — activity log with time-ago formatting
- **Tasks** — local todo list with priorities and filtering
- **Landing page** — 3-column layout with master cards, leaderboard, and notifications

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens at `http://localhost:5173`.

## Build

```bash
npm run build
```

Output goes to `dist/`. Deploy as a static site (Vercel, Netlify, etc.).

## Preview

```bash
npm run preview
```

## Project Structure

```
quali-web/
├── src/
│   ├── App.jsx                     # Main app — auth, batch, master viewer, export
│   ├── main.jsx                    # React entry point
│   ├── index.css                   # All styles (2800+ lines)
│   ├── lib/
│   │   ├── utils.js                # cn() utility
│   │   └── excel.js                # detectColumns(), mapRowData()
│   ├── services/
│   │   ├── api.js                  # All Apps Script fetch() calls (4 URLs)
│   │   └── storage.js              # localStorage wrapper
│   ├── assets/
│   │   └── Qrux logo.png          # Login background
│   └── components/
│       ├── BottomBar.jsx           # Docked triage panel
│       ├── FilePicker.jsx          # Excel drag-and-drop
│       ├── SetupView.jsx           # Column mapping + batch size
│       ├── LoginView.jsx           # Login form
│       ├── AddLeadModal.jsx        # Manual lead entry
│       ├── Toast.jsx               # Toast notifications
│       ├── base-ui/                # Shadcn-inspired primitives
│       │   ├── avatar.jsx
│       │   ├── badge.jsx
│       │   ├── button.jsx
│       │   ├── card.jsx
│       │   ├── checkbox.jsx
│       │   ├── input.jsx
│       │   ├── label.jsx
│       │   ├── select.jsx
│       │   └── table.jsx
│       └── right-panel/
│           ├── MasterCard.jsx      # Expandable stat card
│           ├── CompetitionWidget.jsx # Leaderboard pie chart
│           ├── ActivitiesCard.jsx  # Notifications panel
│           └── TodoList.jsx        # Task management
├── APPS_SCRIPT_AUTH_UPDATED.js     # Auth + auto-create master sheet
├── APPS_SCRIPT_PER_USER_MASTER.js  # Per-user master CRUD
├── index.html
├── vite.config.js
└── package.json
```

## Apps Scripts

Quali Web uses 4 Google Apps Scripts deployed as Web Apps:

### 1. Auth (`APPS_SCRIPT_AUTH_UPDATED.js`)

- Handles UID + password login
- Auto-creates a personal Google Sheet per user on first login (`Quali Master - {uid}`)
- Auto-creates `MasterSheetId` column in auth sheet if missing

**Deploy:** Extensions → Apps Script → paste code → Deploy → Web App → Execute as: Me → Access: Anyone

### 2. Cloud Master

- Maintains a shared list of all tagged leads (name + phone)
- Used for cross-user dedup (skip leads others already tagged)
- Append-only log with timestamp

### 3. Push

- Receives pushed leads and writes to a shared Google Sheet
- Columns: `query, name, website, company_phone, email, pushed_by, Comments, Lead Status`
- Dedup by name or phone

### 4. Per-User Master (`APPS_SCRIPT_PER_USER_MASTER.js`)

- CRUD operations on per-user master sheets
- Actions: `readMaster`, `updateMasterRow`, `discardMasterRow`, `addMasterLead`, `getMasterStats`
- Row matching: case-insensitive by `name` + `website` (separate fields, no delimiter)

## Data Architecture

```
┌─────────────────────────────────────────────────┐
│                  Quali Web (SPA)                 │
│  localStorage: session, config, todos, activities│
└───────────┬─────────────────────┬───────────────┘
            │                     │
            ▼                     ▼
    ┌───────────────┐   ┌──────────────────┐
    │  Auth Script   │   │  Cloud Master    │
    │  (login +      │   │  (dedup check +  │
    │  master sheet) │   │  tag log)        │
    └───────┬───────┘   └──────────────────┘
            │
            ▼
    ┌───────────────────┐
    │ Per-User Master   │
    │ (read/write/      │
    │  discard/stats)   │
    └───────┬───────────┘
            │
            ▼
    ┌───────────────────┐     ┌──────────────────┐
    │ User's Google     │     │ Shared Google    │
    │ Sheet             │     │ Sheet (push)     │
    │ (Quali Master - X)│     └──────────────────┘
    └───────────────────┘
```

## API Reference

All API calls go through `src/services/api.js` → `post(url, body)` → `fetch()`.

| Function | Script | Action | Purpose |
|----------|--------|--------|---------|
| `login(uid, password)` | Auth | `login` | Authenticate user |
| `fetchCloudMaster()` | Cloud Master | `getTaggedNames` | Get all tagged names/phones |
| `addTag({name, phone, taggedBy, tag})` | Cloud Master | `addTag` | Log a tag |
| `readMasterSheet(sheetId)` | Per-User Master | `readMaster` | Read all rows |
| `updateMasterRow(sheetId, rowKey, field, value)` | Per-User Master | `updateMasterRow` | Update a cell |
| `discardMasterRow(sheetId, rowKey)` | Per-User Master | `discardMasterRow` | Delete a row |
| `addMasterLead(sheetId, row)` | Per-User Master | `addMasterLead` | Append a row |
| `getMasterStats(sheetId)` | Per-User Master | `getMasterStats` | Get count by status |
| `pushLead(data)` | Push | *(direct)* | Push to shared sheet |
| `getLeaderboard()` | Push | `leaderboard` | Get push counts |

## Phone Normalization

All phone numbers are normalized the same way across all entry points:

```javascript
function normalizePhone(raw) {
  if (!raw) return ''
  let str = String(raw).trim()
  if (str.startsWith('+91')) str = str.slice(3)  // strip +91 prefix
  let digits = str.replace(/\D/g, '')             // keep digits only
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(-10)                        // return last 10 digits
}
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import repo in Vercel
3. Framework: Vite, Build: `npm run build`, Output: `dist`
4. Deploy

### Manual

```bash
npm run build
# Upload dist/ to any static host
```

## Environment

No environment variables needed. All config is in `src/services/api.js` (hardcoded Apps Script URLs).

## Version History

Current: **0.0.0** (pre-release)

## License

Private — All rights reserved.
