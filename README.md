# Tender Document Package Builder — AI DevFest 2026

An autonomous, client-side web application built for the AI DevFest 2026 Vibe Coding Contest that turns arbitrary tender requirements and source PDF files into a complete, validated, and correctly ordered PDF package ready for submission.

---

## Participant

- **Name:** Johurul Islam
- **Registration Number:** DEV-FEST-2026-JI

---

## Live Website

- **Deployment URL:** https://johurul-cse.github.io/Johurul-Islam/
- **Repository URL:** https://github.com/johurul-cse/Johurul-Islam

---

## Project Overview

In corporate procurement and tendering, bids are frequently rejected due to misplaced files, expired documents, duplicate uploads, or missing mandatory certificates. The Tender Document Package Builder eliminates these errors by enforcing strict real-time verification and automatically compiling compliant submission packages.

---

## Main Features (MUST-HAVE Complete)

1. **Requirements Loader (Task 4.1):**
   - Upload any valid `requirements.json` file.
   - 1-Click preset button for sample tender (`T-2026-0417`).
   - Displays tender ID, title, procuring entity, bidder name, and submission deadline.
   - Sorts required documents by defined `order`.

2. **Multi-File PDF Upload & Rejection (Task 4.2):**
   - Drag-and-drop or batch file upload of up to 30 files / 50 MB.
   - Instant page count calculation for each PDF in-browser.
   - Strict rejection of non-PDF files with clear error banners.
   - Individual file removal at any time.

3. **Strict One-to-One Matching (Task 4.3):**
   - Match each file to at most one requirement.
   - Each requirement receives at most one file.
   - Reversible and editable assignments at any point.

4. **Expiry Date Validation (Task 4.4):**
   - Date picker enabled for documents with `has_expiry = true`.
   - Real-time comparison against `submission_deadline`.

5. **Real-Time Status Rules (Task 4.5 & Section 5):**
   - **Missing:** Mandatory document with no file matched (Blocking: Yes).
   - **Expiry date needed:** Expiry-tracked document matched without date (Blocking: Yes).
   - **Expired:** Expiry date is before submission deadline (Blocking: Yes).
   - **Not provided:** Optional document with no file (Blocking: No).
   - **OK:** File matched and expiry date on or after submission deadline (Blocking: No).

6. **Content Duplicate Detection (Task 4.6):**
   - Cryptographic SHA-256 hash inspection of every uploaded file.
   - Identifies identical files regardless of filename differences.
   - Blocks duplicate copies from being matched to different documents.

7. **Compilation & Package Rules (Task 4.7 & Section 6):**
   - Generation button stays disabled while any blocking issue persists, detailing reasons.
   - Page 1 English cover page with tender metadata, creation date, and included documents table.
   - Document pages appended in exact specified order, skipping unprovided optional items.
   - Universal footer on every page: `<tender_id> | Page X of Y` where `Y` is total page count.

8. **Package Download (Task 4.8):**
   - One-click download as `<tender_id>_Package.pdf`.
   - In-app PDF preview modal.

9. **Bilingual Support (Task 4.9):**
   - Instant language toggle between English and বাংলা.
   - Full translation of UI controls, status badges, banners, and document titles (`title_en` / `title_bn`).

---

## Bonus Features Implemented

- **Smart Auto-Match:** Automatically detects document type and matches files based on filename heuristics.
- **Checklist Export:** Exports the complete verification checklist as a CSV spreadsheet.
- **Corrupted PDF Protection:** Graceful error handling for damaged or locked PDFs.
- **Local Persistence:** Auto-saves matched files and expiry dates to `localStorage`.

---

## How to Run Locally

Prerequisites: Node.js (v18+)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` or `http://localhost:3000` in Google Chrome.

## Build for Production

```bash
npm run build
```

Production static assets will be output to `dist/`.

---

## AI Tools Used

- **Gemini 3.8 Flash (High)** — System design, validation logic, UI/UX implementation, and test verification.

---

## Most Useful Prompt

> "Read the attached problem PDF completely, including all text, screenshots, diagrams, tables, and visual examples. Treat the PDF as the authoritative problem statement. Build a web app (frontend only) that helps office staff turn a set of PDF files into one complete, checked and correctly ordered PDF package, ready to submit."

---

## Known Problems

- None. All Section 4 and Section 5 requirements pass without errors.

---

## License

MIT License — Copyright (c) 2026 Johurul Islam
