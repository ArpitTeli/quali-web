# Quali Web — Active Apps Script URLs

| # | Constant | URL | Connected Sheet | Functions Using It | Purpose |
|---|----------|-----|-----------------|-------------------|---------|
| 1 | `AUTH_SCRIPT_URL` | `{{QUALI_WEB_AUTH_SCRIPT_URL}}` | **Auth Sheet** (`{{AUTH_SHEET_ID}}`) — columns: `UID, Pass, MasterSheetId` | `login()` | User auth + auto-creates per-user master sheet on first login |
| 2 | `CLOUD_MASTER_URL` | `{{QUALI_WEB_CLOUD_MASTER_URL}}` | **Cloud Master Sheet** — columns: `Name, Phone, Tagged By, Tag, Timestamp` | `fetchCloudMaster()`, `addTag()` | Immutable log of every tagged lead. Used for dedup filtering + phone source of truth |
| 3 | `PUSH_SCRIPT_URL` | `{{QUALI_WEB_PUSH_SCRIPT_URL}}` | **Shared Master Sheet** (`{{SHARED_LEADS_SHEET_ID}}`) — columns: `query, name, website, company_phone, email, pushed_by, Comments, Lead Status` | `pushLead()`, `getLeaderboard()` | Shared sheet where leads are pushed for the team + leaderboard stats |
| 4 | `MASTER_SCRIPT_URL` | `{{QUALI_WEB_MASTER_SCRIPT_URL}}` | **Per-User Master Sheets** (one per user, e.g. `"Quali Master - arpit"`) — columns: `query, name, website, company_phone, email, Lead Status, Comments` | `readMasterSheet()`, `updateMasterRow()`, `discardMasterRow()`, `addMasterLead()`, `getMasterStats()` | Personal master sheet per qualifier. Read/write/discard/push leads |
| 5 | `LDS_SCRIPT_URL` | `{{QUALI_WEB_LDS_SCRIPT_URL}}` | **LDS Tabs in Auth Sheet** — `LDS_Files` (FileID, Filename, FolderPath, UploadedAt) + `LDS_Assignments` (AssignmentID, FileID, UserID, AssignedAt, CompletedAt, Status, ProgressData, FileData) + **Google Drive folder** (`{{LDS_DRIVE_FOLDER_ID}}`) | `getFileTree()`, `claimFile()`, `saveProgress()`, `loadProgress()`, `markSheetComplete()`, `getLdsStats()` | Lead Distribution System — Drive folder scan, file claiming, progress tracking |

## Dead Code

`cloudMasterDebug()` in `src/services/api.js:64` — defined but never imported or called. Duplicate of `fetchCloudMaster()`.
