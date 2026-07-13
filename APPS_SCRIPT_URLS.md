# Quali Web — Active Apps Script URLs

| # | Constant | URL | Connected Sheet | Functions Using It | Purpose |
|---|----------|-----|-----------------|-------------------|---------|
| 1 | `AUTH_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbxDTPJExdQGRYcYsk32bll-1u-9Y8ofcD-ZkM3ITsTE-3jKnKpXBgRMVJ6nHnp3NsBGKg/exec` | **Auth Sheet** (`1HLBEiQ-tGaTdm4Lq6JltGcfBIWcgc528-JKSD4gON2Q`) — columns: `UID, Pass, MasterSheetId` | `login()` | User auth + auto-creates per-user master sheet on first login |
| 2 | `CLOUD_MASTER_URL` | `https://script.google.com/macros/s/AKfycbzzdnjM8crblZhT7Fpw_yoRpS465ZGV9pRGJEkiFad0FB4lEfh_u3FY9Oi4ze683TgB6A/exec` | **Cloud Master Sheet** — columns: `Name, Phone, Tagged By, Tag, Timestamp` | `fetchCloudMaster()`, `addTag()` | Immutable log of every tagged lead. Used for dedup filtering + phone source of truth |
| 3 | `PUSH_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbykxuCQoi6WnnTXKdid4Ql6mwET2C68sMKZCvh7frIcGz5Wxe5lW8YR6c7Yo2s1qhPx/exec` | **Shared Master Sheet** (`1LWsb7dfw5vQ3DZcLgmN523ALoys9hqYfmft6v-bA9kU`) — columns: `query, name, website, company_phone, email, pushed_by, Comments, Lead Status` | `pushLead()`, `getLeaderboard()` | Shared sheet where leads are pushed for the team + leaderboard stats |
| 4 | `MASTER_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbw4mIswXp7eGcze1rb8QWWY8Wi7Q2tw1gwc_Q-f5YAtwVoIoByrLHaY39QvsWxpPNU9/exec` | **Per-User Master Sheets** (one per user, e.g. `"Quali Master - arpit"`) — columns: `query, name, website, company_phone, email, Lead Status, Comments` | `readMasterSheet()`, `updateMasterRow()`, `discardMasterRow()`, `addMasterLead()`, `getMasterStats()` | Personal master sheet per qualifier. Read/write/discard/push leads |

## Dead Code

`cloudMasterDebug()` in `src/services/api.js:64` — defined but never imported or called. Duplicate of `fetchCloudMaster()`.
