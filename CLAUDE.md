# Project: Zapier Facebook Lead Ads → Pipedrive Sequence Integration

## Overview

A Zapier custom integration that automatically captures leads from Facebook Lead Ads and enrolls them into Pipedrive email sequences (campaigns). Built on `zapier-platform-core@15.5.1`.

## Zap Flow

1. **TRIGGER** — `new_facebook_lead`: Polls Facebook Graph API (v19.0) for new leads from a specific Lead Ad form
2. **ACTION** — `create_pipedrive_person`: Creates a Person in Pipedrive (deduplicates by email, auto-creates Organization if needed)
3. **ACTION** — `add_to_pipedrive_sequence`: Enrolls the Person in a Pipedrive Campaign/Sequence

## Architecture

```
index.js                              — App entry point, registers all modules
authentication.js                     — Pipedrive OAuth2 config + bearer token middleware
triggers/new_facebook_lead.js         — Facebook Lead Ads polling trigger
creates/create_pipedrive_person.js    — Create/dedupe Person in Pipedrive
creates/add_to_pipedrive_sequence.js  — Enroll Person in a Pipedrive campaign
searches/get_pipedrive_sequences.js   — Dynamic dropdown: lists active campaigns
test/index.test.js                    — Jest unit tests
```

## Key Design Decisions

- **Email deduplication**: `create_pipedrive_person` searches by exact email match before creating; returns existing record with `_was_duplicate: true` flag
- **Organization auto-creation**: If a company name is provided but no matching Org exists in Pipedrive, one is created on the fly
- **Facebook field normalization**: Lead form field names vary; the trigger normalizes `full_name`, `name`, `first_name`/`last_name` into a consistent structure and preserves `raw_fields` for custom questions
- **Dynamic dropdown**: The `sequenceId` field in the sequence action uses `get_pipedrive_sequences` as a dynamic source so users pick campaigns by name

## Auth

- **Pipedrive**: OAuth2 with auto-refresh (configured in `authentication.js`)
- **Facebook**: Page Access Token passed as input field (Facebook's built-in Zapier auth handles the OAuth side)
- Environment variables: `PIPEDRIVE_CLIENT_ID`, `PIPEDRIVE_CLIENT_SECRET` (see `.env.example`)

## Commands

- `npm test` — Run Jest tests
- `npm install` — Install dependencies (requires Node >= 18)
- `zapier push` — Deploy to Zapier (requires `zapier-platform-cli`)
- `zapier validate` — Validate app schema before deploy

## Conventions

- All modules export a Zapier-standard object with `key`, `noun`, `display`, `operation`
- API base URLs defined as constants at top of each file
- Error handling uses `z.errors.Error` and `z.errors.RefreshAuthError`
- Tests use sample data fallbacks when APIs are unreachable

---

## New Account / Machine Setup

### Switching accounts on the same Mac

1. Log out of Claude Code (`/logout` or via settings)
2. Log in with the new account
3. Navigate to the project: `cd "/Users/admin/Strategy Agent"`
4. The new account will read this `CLAUDE.md` automatically — it picks up the project config on first open
5. Copy the memory files so the new account has full context:
   ```bash
   cp -r ~/.claude/projects/-Users-admin-Strategy-Agent/memory/ \
     ~/.claude/projects/-Users-admin-Strategy-Agent-NEW-ACCOUNT/memory/
   ```
   *(The destination folder name will match the new account's hash — Claude creates it on first launch)*

### Moving to a different machine

Three things to copy:

| What | From | To |
|------|------|----|
| Project folder | `/Users/admin/Strategy Agent/` | Same path on new machine |
| Presentation | `/Users/admin/Desktop/AtomBeam Strategy/` | Same path on new machine |
| Memory files | `~/.claude/projects/-Users-admin-Strategy-Agent/memory/` | Equivalent path on new machine |

### Fastest option — start fresh on the new account

The memory files at `~/.claude/projects/-Users-admin-Strategy-Agent/memory/` contain everything Claude references. Paste the contents of `MEMORY.md` and `project_atombeam_presentation.md` into your **first message** on the new account and it will have full context immediately.

> The HTML presentation file is completely self-contained — no server, no dependencies, opens in any browser on any machine.
