# Tender Document Package Builder — Requirements Extraction

Authoritative Source: AI DevFest — Problem Statement (Tender Document Package Builder, 90-minute build time)

---

## 1. MUST-HAVE Requirements

### 1.1 Load the List (Task 4.1)
- User opens/loads `requirements.json`.
- App displays tender details:
  - Tender ID (`tender_id`)
  - Title (`title`)
  - Procuring Entity (`procuring_entity`)
  - Bidder Name (`bidder`)
  - Submission Deadline (`submission_deadline` in YYYY-MM-DD format)
- App displays the list of required documents, sorted by `order` ascending.

### 1.2 Upload Files (Task 4.2)
- User can upload multiple PDF files simultaneously.
- Show each uploaded file's name and number of pages.
- Reject any file that is not a PDF with a clear error message.
- Allow removing any uploaded file at any time.

### 1.3 Match Files (Task 4.3)
- User matches each uploaded file to exactly one required document.
- Constraints:
  - One document gets at most one file.
  - One file goes to at most one document.
- User can change or undo/unmatch any assignment at any time.

### 1.4 Enter Expiry Dates (Task 4.4)
- If a document has `has_expiry = true` and a file is matched to it, user inputs its expiry date (`YYYY-MM-DD`).

### 1.5 Check Everything & Real-time Status Rules (Task 4.5 & Section 5)
Every required document displays exactly one status, updated immediately after any change:
- **Missing**: Mandatory document (`mandatory = true`), no file matched. **[BLOCKS PACKAGE]**
- **Expiry date needed**: `has_expiry = true` and a file is matched, but no expiry date entered. **[BLOCKS PACKAGE]**
- **Expired**: Expiry date is strictly before `submission_deadline`. **[BLOCKS PACKAGE]**
- **Not provided**: Optional document (`mandatory = false`), no file matched. **[DOES NOT BLOCK]**
- **OK**: File matched, and if `has_expiry = true`, expiry date is on or after (`>=`) `submission_deadline` (same day is OK). **[DOES NOT BLOCK]**

### 1.6 Find Duplicates (Task 4.6)
- Detect identical file contents (hash/content comparison) even if file names differ.
- Mark duplicate files clearly in the uploaded files list.
- Prevent matching duplicate copies to different documents.

### 1.7 Make the Package (Task 4.7 & Section 6)
- "Generate" button remains **disabled** while any document has a blocking status, clearly explaining why.
- When there are zero blocking issues, generate a single combined PDF meeting Section 6 package rules:
  - **Cover Page (Page 1)** in English containing:
    - Tender ID
    - Tender Title
    - Procuring Entity
    - Bidder Name
    - Submission Deadline
    - Date package was made
    - Ordered list of included documents.
  - **Ordered Document Pages**: Documents appended in `order` sequence; include all pages in original order; skip unprovided optional documents.
  - **Universal Footer**: Every page (including cover) must have bottom footer: `<tender_id> | Page X of Y` where `Y` is the total package page count.
  - **Footer Readability**: Easy to read and must not obscure document content.

### 1.8 Download (Task 4.8)
- User downloads final combined PDF named `<tender_id>_Package.pdf`.

### 1.9 Bilingual Support (Task 4.9)
- Language switcher between English and Bangla (বাংলা).
- Document titles display `title_en` or `title_bn` depending on selected language.
- All interface controls, labels, status badges, and messages translated.

---

## 2. BONUS / OPTIONAL Requirements (Section 7)
- **Index Page**: Table of contents after cover page showing page numbers where each document starts.
- **Auto-Match**: Intelligent matching suggestions based on filename similarity.
- **Export Checklist**: Export verification checklist as Excel or CSV.
- **Save / Reopen Work**: State persistence using localStorage or project JSON export/import.
- **Handle Bad Files Safely**: Graceful error handling for damaged or encrypted PDFs.
- **Seal or Signature**: Stamp upload and placement on selected pages.
- **Bangla text on PDF cover/index**: High-quality font rendering.

---

## 3. Primary User Flow
1. Load `requirements.json` (via drag-and-drop, file picker, or quick sample preset).
2. Upload PDF files (multiple upload, non-PDF rejection).
3. Review uploaded files, inspect page counts, review duplicate alerts.
4. Match files to required checklist items (with auto-match assistance and quick re-assign).
5. Enter expiry dates for expiry-tracked documents.
6. Verify status indicators in real-time (Missing, Expiry date needed, Expired, Not provided, OK).
7. Once all blockers are resolved, click "Generate Package".
8. Preview and download `<tender_id>_Package.pdf`.

---

## 4. UI Requirements
- Clean, professional tender checklist layout with clear visual hierarchy.
- Prominent status badges with color coding (Green for OK, Amber/Red for Blocker, Gray for Not provided).
- Clear validation summary banner detailing blockers and why generation is prevented.
- Language toggle accessible at header.
- Responsive Google Chrome compatibility.

---

## 5. Data & Persistence Requirements
- Frontend only: All processing in-browser using Web APIs.
- Zero participant-controlled backend servers or remote DBs.
- `localStorage` for session recovery and project auto-saving.

---

## 6. Technical Constraints
- No backend/server-side code or cloud functions.
- Maximum input: up to 30 files and 50 MB total.
- Allowed browser libraries: `pdf-lib` (PDF manipulation/footer stamping), `pdfjs-dist` (page count / previews), or pure client-side PDF utilities.
- Target browser: Latest Google Chrome.

---

## 7. Submission Deliverables
- GitHub repository with clean history (at least 3 commits, commit every 30m, message format `type: message | Prompt: ...`).
- Generated file: `output/<tender_id>_Package.pdf` from sample pack.
- Status screenshots: `screenshots/`.
- Public HTTPS live link.
