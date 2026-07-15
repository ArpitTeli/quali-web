# Quali Web — Active Apps Script URLs

| # | Constant | URL | Connected Sheet | Functions Using It | Purpose |
|---|----------|-----|-----------------|-------------------|---------|
| 1 | `AUTH_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbwA-a6d9a2tu9vDoKX3Yc2XN6sX5eLAzI_fo0xrpC8mRnkYlvFPSHSxoTWKAeZcpFxbww/exec` | **Auth Sheet** (`1HLBEiQ-tGaTdm4Lq6JltGcfBIWcgc528-JKSD4gON2Q`) — columns: `UID, Pass, MasterSheetId` | `login()` | User auth + auto-creates per-user master sheet on first login |
| 2 | `CLOUD_MASTER_URL` | `https://script.google.com/macros/s/AKfycbxzMPAp73lSht16-PnmKh1Z4jD2t4a7Ma3fauAKbkmN4w6g_pqPvVD6xruK5ZeQTEBs3g/exec` | **Cloud Master Sheet** — columns: `Name, Phone, Tagged By, Tag, Timestamp` | `fetchCloudMaster()`, `addTag()` | Immutable log of every tagged lead. Used for dedup filtering + phone source of truth |
| 3 | `PUSH_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbwnHEf1fq1MikibZfN8dpZuXCWmZX4kxBg2VMDulm4809X7BGWRrhlGdCaD3VwXTYQD/exec` | **Shared Master Sheet** (`1LWsb7dfw5vQ3DZcLgmN523ALoys9hqYfmft6v-bA9kU`) — columns: `query, name, website, company_phone, email, pushed_by, Comments, Lead Status` | `pushLead()`, `getLeaderboard()` | Shared sheet where leads are pushed for the team + leaderboard stats |
| 4 | `MASTER_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbyRKL4dz_F3nfWWW6APiDDKiVsiJ3uorX2MZr2g0t2oWZX8qhTx5-oknx0qDIs_PjrQ/exec` | **Per-User Master Sheets** (one per user, e.g. `"Quali Master - arpit"`) — columns: `query, name, website, company_phone, email, Lead Status, Comments` | `readMasterSheet()`, `updateMasterRow()`, `discardMasterRow()`, `addMasterLead()`, `getMasterStats()` | Personal master sheet per qualifier. Read/write/discard/push leads |
| 5 | `LDS_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbxcjFWSJEJW9WIT48NUSFm7j_SRXDyaZTS_QXgll-DlisP--5vsoeS0MjzjCF90D1TH/exec` | **LDS Tabs in Auth Sheet** — `LDS_Files` (FileID, Filename, FolderPath, UploadedAt) + `LDS_Assignments` (AssignmentID, FileID, UserID, AssignedAt, CompletedAt, Status, ProgressData, FileData) + **Google Drive folder** (`15my4rIu1E0QBZUKfBYepAtdSQ2eH4sbf`) | `getFileTree()`, `claimFile()`, `saveProgress()`, `loadProgress()`, `markSheetComplete()`, `getLdsStats()` | Lead Distribution System — Drive folder scan, file claiming, progress tracking |

## Dead Code

`cloudMasterDebug()` in `src/services/api.js:64` — defined but never imported or called. Duplicate of `fetchCloudMaster()`.
