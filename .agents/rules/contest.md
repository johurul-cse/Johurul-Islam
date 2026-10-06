---
trigger: always_on
description: "AI DevFest 2026 official Vibe-Coding contest constraints."
---

# AI DevFest 2026 — Contest Rules

Source: official rulebook supplied for this workspace.

## Core

- Solo contest.
- 90-minute build/deploy period.
- Frontend-only browser application.
- Problem is revealed at T+0.
- Main tasks must be completed before bonus tasks.
- App must support Bangla and English.
- Public HTTPS deployment is required by T+90.
- GitHub repository is required.

## Technical restrictions

Do NOT use:
- participant-controlled backend servers
- server-side code
- serverless functions
- participant-controlled persistent backend/database/online storage
- Firebase, Supabase or Appwrite for prohibited persistent backend/storage use

Allowed:
- browser storage: localStorage, sessionStorage, IndexedDB
- normal browser APIs
- static hosting
- permitted external HTTPS APIs with browser CORS
- frameworks and open-source packages

External APIs must not become a participant-controlled persistent backend. If an external API fails, the main application should still work.

## AI

Any AI tool may be used, free or paid, and multiple AI tools are allowed.

The participant is responsible for all submitted code and must be able to explain it.

## Zero start

Project code must be written during the contest.

Do not use old code, old projects, personal templates, or another participant's code.

Open-source libraries and official starter tools allowed by the rulebook remain permitted.

## Bilingual

All main labels, buttons, messages and instructions must be available in Bangla and English.

## Secrets

Never put passwords, tokens, API keys or login details in source code, Git history, repository or live site.

## GitHub

Repository:
`devfest-<registration-number>`

- Public repository.
- No project code before T+0.
- At least 3 commits.
- At least one commit every 30 minutes.
- Every commit message must include what changed and the prompt used; manual work should say `Manual edit`.
- No force push.
- No rebasing pushed commits.
- No deleting the repository.
- Final eligible commit must be created and pushed by T+90.

## Submission

README must include:
- name
- registration number
- public HTTPS live link
- how to run
- main features done
- bonus features
- known problems
- AI tools used
- most useful prompt

Repository must contain:
- source code
- README.md
- required output files, if any
- MIT LICENSE

## Deployment

Live website must:
- use HTTPS
- be public
- work in latest Google Chrome
- require no login
- require no installation
- match the final eligible commit

## After T+90

No code, Git or deployment changes are allowed.

## Integrity

Never:
- use pre-contest project code
- copy/share code with participants
- communicate with other participants during the contest
- access unauthorized storage/devices
- bypass restrictions
- change Git history
