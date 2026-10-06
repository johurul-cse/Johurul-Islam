---
trigger: manual
description: "Final contest audit before T+90."
---

# Final Contest Audit

Do not add new features.

## Functional
- All MUST-HAVEs work.
- Main user journey works end-to-end.
- Forms validate.
- Navigation works.
- Persistence works where required.

## Bilingual
- English works.
- Bangla works.
- Language switcher works.
- Main labels/messages/instructions are translated.

## Browser
- No obvious console/runtime errors.
- No broken buttons.
- No broken imports.
- Responsive layout is acceptable.
- Loading/empty/error states are handled.

## Security
- No API keys.
- No passwords.
- No tokens.
- No secrets in repository/history/live site.

## Repository
- Public.
- Correct `devfest-<registration-number>` name.
- At least 3 commits.
- At least one commit every 30 minutes.
- Commit messages contain change + prompt.
- MIT LICENSE exists.
- README is complete.

## Deployment
- HTTPS.
- Public.
- No login.
- Works in Chrome.
- Main features work.
- Deployment matches final eligible commit.

## Stop condition
If the checklist passes, do not make risky changes.
