# CloudCare Patient Registration — Voice AI Agent

A Vapi-powered voice agent ("Riley") that registers patients over the phone by
having a natural conversation, then writes the record through the same
validated REST API that a web or admin client would use. The agent and the
API share one Express + TypeScript service layer backed by SQLite
(`node:sqlite`), so a phone call and an HTTP request produce identically
validated, identically shaped data.

## Live demo

```
Phone number: +1 (732) 660-9117
API base URL: https://api-production-718d.up.railway.app
```

```bash
# Health check
curl "https://api-production-718d.up.railway.app/health"

# Create a patient
curl -X POST "https://api-production-718d.up.railway.app/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Davis",
    "date_of_birth": "04/12/1988",
    "sex": "female",
    "phone_number": "+1 (415) 555-0142",
    "address_line_1": "742 Evergreen Terrace",
    "city": "San Francisco",
    "state": "California",
    "zip_code": "94110"
  }'

# List patients (optional filters: last_name, date_of_birth, phone_number)
curl "https://api-production-718d.up.railway.app/patients?last_name=davis"

# Get one patient
curl "https://api-production-718d.up.railway.app/patients/<patient_id>"

# Update a patient (partial body)
curl -X PUT "https://api-production-718d.up.railway.app/patients/<patient_id>" \
  -H "Content-Type: application/json" \
  -d '{"email": "jane@example.com"}'

# Soft-delete a patient
curl -X DELETE "https://api-production-718d.up.railway.app/patients/<patient_id>"

# Call history for a patient (transcripts/summaries logged by the voice agent)
curl "https://api-production-718d.up.railway.app/patients/<patient_id>/calls"

# Vapi webhook (Vapi calls this; shown for reference only, requires the shared secret)
curl -X POST "https://api-production-718d.up.railway.app/vapi/webhook" \
  -H "Content-Type: application/json" \
  -H "x-vapi-secret: $VAPI_WEBHOOK_SECRET" \
  -d '{"message": {"type": "tool-calls", "toolCallList": []}}'
```

## Architecture

```
Caller (phone)
   |
   v
Vapi platform  ---------------------------------------------
  - Telephony (inbound number)                              |
  - Deepgram nova-3 (multi: EN/ES) speech-to-text            |
  - OpenAI gpt-4.1 (tool-calling LLM, system prompt)          |
  - TTS (voice: "Elliot")                                    |
--------------------------------------------------------------
   | HTTPS POST, x-vapi-secret header
   v
Express app  (src/app.ts)
   |
   +-- /vapi/webhook  -> src/vapi/webhook.ts
   |        - verifies shared secret
   |        - parses tool-calls / end-of-call-report events
   |        - dispatches to src/vapi/toolHandlers.ts
   |
   +-- /patients/*    -> src/routes/patients.ts (REST)
   |
   v (both paths converge here)
Patient service  (src/services/patientService.ts)
   - zod validation (src/validation/*)
   - business rules (idempotent create, soft delete, filters)
   |
   v
Patient / CallLog repositories  (src/db/patientRepository.ts, callLogRepository.ts)
   - parameterized SQL, INSERT/SELECT/UPDATE
   |
   v
SQLite (node:sqlite), file on a Railway persistent volume (/data/patients.db)
```

| Folder | Responsibility |
|---|---|
| `src/vapi/` | Vapi integration: system prompt, assistant/tool schema, webhook adapter, tool-call handlers |
| `src/routes/` | REST route wiring (Express `Router`) |
| `src/services/` | Business logic: validation entry point, create/update/delete/list rules, shared by voice and REST |
| `src/validation/` | zod schemas and pure normalizer functions (phone, ZIP, state, sex, date) |
| `src/db/` | Schema DDL, connection setup, repositories (parameterized SQL only) |
| `src/lib/` | Cross-cutting: response envelope, typed app errors, JSON logger |
| `src/middleware/` | Express error handler and request logger |
| `src/config/` | Environment variable loading/validation |
| `src/scripts/` | One-off scripts: DB seeding, Vapi assistant provisioning |

**Key decision — one service, two front doors.** `src/vapi/toolHandlers.ts`
and `src/routes/patients.ts` both call into `createPatientService`
(`src/services/patientService.ts`), so a phone call and a `curl` request run
through identical zod validation and identical database writes; there is no
separate "voice validation" to drift out of sync with the API. Tool results
returned to the LLM are `{ status, instruction, ...data }`
(`src/vapi/toolHandlers.ts`): `status` is a fixed enum
(`success` / `validation_error` / `already_exists` / `not_found` /
`system_error` / ...) and `instruction` is an imperative sentence telling the
model exactly what to say or do next. This makes the agent's error handling
deterministic — the LLM is never asked to interpret an HTTP status code or
guess how to phrase a DB failure; the server has already decided.

## Tech stack

| Choice | Why |
|---|---|
| **Vapi** | The assignment's own FAQ points toward using a platform rather than assembling telephony/STT/TTS/LLM from scratch; Vapi owns the phone call, speech pipeline, and tool-calling loop, so the app only needs an HTTPS webhook. |
| **OpenAI gpt-4.1** (via Vapi, `VAPI_MODEL`) | Reliable, well-tested function/tool calling, which this agent depends on for every field it collects. Configurable per deploy via the `VAPI_MODEL` env var read in `src/scripts/vapiSetup.ts`. |
| **Deepgram nova-3, `multi`** | Vapi's transcriber; `multi` lets the same phone number handle English and Spanish callers without a language-detection step (see the "Language" section of the system prompt). |
| **Node.js + Express + TypeScript (strict)** | Small, well-understood REST surface; strict TypeScript catches shape mismatches between the zod-validated input and the SQLite row types at compile time. |
| **zod** | Declarative schemas double as the single source of truth for both "is this valid" and "what exactly is wrong," which the webhook needs to turn into a spoken re-prompt (`toFieldErrors` in `src/validation/patientSchema.ts`). |
| **SQLite via `node:sqlite`** | Zero-infrastructure persistence for a take-home. `better-sqlite3` was tried first and segfaulted on load under Node 22 on Windows; `node:sqlite` (`DatabaseSync`) offers the same synchronous-statement API style with no native build step, so a Railway build cannot fail on a native addon. Trade-off: `node:sqlite` is still marked experimental in Node 22, so the experimental-module warning is explicitly suppressed in the `start` script (`node --disable-warning=ExperimentalWarning dist/server.js`). |
| **Railway + persistent volume** | SQLite is a single file; Railway's volume feature mounts durable storage at `/data`, and `DB_PATH=/data/patients.db` points the app at it so the database survives redeploys. |
| **vitest + supertest** | Fast, TypeScript-native test runner; supertest drives the Express app in-process (no real network) for both the REST suite and the webhook suite. |

## Data model

`patients` table (`src/db/schema.ts`), all normalization implemented in
`src/validation/normalizers.ts` and `src/validation/patientSchema.ts`:

| Field | Type | Required | Validation / normalization |
|---|---|---|---|
| `patient_id` | TEXT (UUID) | server-generated | `randomUUID()`, CHECK `length = 36` |
| `first_name` / `last_name` | TEXT | yes | letters (any script) plus hyphen/apostrophe/space, 1–50 chars, sanitized (control chars stripped, curly quotes normalized, whitespace collapsed) |
| `date_of_birth` | TEXT (ISO `YYYY-MM-DD`) | yes | accepts `MM/DD/YYYY` or ISO on input; must be a real calendar date, not in the future, on/after `1900-01-01`; stored ISO, returned as `MM/DD/YYYY` (`isoToUsDate`) |
| `sex` | TEXT enum | yes | aliases (`m`, `man`, `f`, `woman`, `decline`, `prefer not to say`, ...) mapped to exactly one of `Male` / `Female` / `Other` / `Decline to Answer` |
| `phone_number` | TEXT (10 digits) | yes | strips `+1`, spaces, dashes, parens, dots; requires area code starting 2–9; exchange code is **not** NANP-validated, so demo numbers like `555-123-4567` pass |
| `email` | TEXT, nullable | no | zod `.email()`, lowercased |
| `address_line_1` | TEXT | yes | sanitized text, 1–100 chars |
| `address_line_2` | TEXT, nullable | no | sanitized text, 1–100 chars |
| `city` | TEXT | yes | sanitized text, 1–100 chars |
| `state` | TEXT (2-letter code) | yes | accepts a 2-letter code or a full state name (`"California"` -> `CA`) via `toStateCode` |
| `zip_code` | TEXT | yes | 5 digits, or ZIP+4; 9 bare digits are auto-formatted to `12345-6789` |
| `insurance_provider` | TEXT, nullable | no | sanitized text, 1–100 chars |
| `insurance_member_id` | TEXT, nullable | no | spaces/hyphens stripped, uppercased, then must be 1–30 alphanumeric characters |
| `preferred_language` | TEXT | no (defaults `'English'`) | letters/spaces/hyphens, 1–50 chars |
| `emergency_contact_name` | TEXT, nullable | no | same rules as name fields |
| `emergency_contact_phone` | TEXT, nullable | no | same rules as `phone_number` |
| `created_at` / `updated_at` | TEXT (ISO datetime) | server-generated | set on insert/update |
| `deleted_at` | TEXT, nullable | server-generated | soft-delete marker |

Additional schema notes:
- `patients` and `call_logs` are declared `STRICT` (SQLite column-type
  enforcement) with `CHECK` constraints mirroring the core zod rules (name
  length, phone digit count/length, DOB format, sex enum, ZIP format), so a
  write that bypassed the service layer would still be rejected at the DB.
- Partial indexes on `phone_number`, `last_name` (case-insensitive) and
  `date_of_birth`, all scoped `WHERE deleted_at IS NULL`, so soft-deleted
  rows are free to reuse a phone number without bloating the live-row index.
- `DELETE /patients/:id` is a soft delete (`deleted_at` set); the row is
  never physically removed, and every read (`findById`, `list`) filters
  `deleted_at IS NULL`.
- `call_logs` stores one row per Vapi call: `call_id`, the `patient_id` it
  was linked to (nullable — null means the call never reached a save),
  `caller_number`, `ended_reason`, `summary`, `transcript`. Upserts
  (`ON CONFLICT (call_id) DO UPDATE`) make both the tool-call link and the
  end-of-call report idempotent regardless of arrival order.

## API reference

Every response uses the envelope `{ "data": ..., "error": ... }`
(`src/lib/envelope.ts`); exactly one of the two is non-null.

Success:
```json
{ "data": { "patient_id": "...", "first_name": "Jane", "...": "..." }, "error": null }
```

Error:
```json
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "One or more fields are invalid", "details": [{ "field": "date_of_birth", "message": "date_of_birth cannot be in the future" }] } }
```

| Method & path | Purpose | Status codes |
|---|---|---|
| `GET /health` | Liveness check | `200` |
| `GET /patients` | List patients; optional query filters `last_name`, `date_of_birth` (`MM/DD/YYYY` or ISO), `phone_number` | `200`; `400` if a filter is malformed or repeated |
| `GET /patients/:id` | Fetch one patient | `200`; `400` if `:id` is not a UUID; `404` if not found or soft-deleted |
| `POST /patients` | Create a patient | `201`; `400` malformed JSON, unrecognized field, or (on parse) request body isn't a JSON object; `413` body over 100kb; `422` field-level validation, `error.details` is an array of `{ field, message }` |
| `PUT /patients/:id` | Partially update a patient (any subset of writable fields) | `200`; `400` invalid UUID or empty body (`"Provide at least one field to update"`); `404`; `422` field validation |
| `DELETE /patients/:id` | Soft-delete a patient | `200` with `{ patient_id, deleted_at }`; `400` invalid UUID; `404` |
| `GET /patients/:id/calls` | Call history (transcripts/summaries) linked to this patient by the voice agent | `200`; `400` invalid UUID; `404` if the patient doesn't exist |
| `POST /vapi/webhook` | Vapi server-message endpoint (tool-calls, end-of-call-report, status-update); requires `x-vapi-secret` (or `Authorization: Bearer <secret>`) matching `VAPI_WEBHOOK_SECRET` | `200` (always, once authenticated — tool failures are encoded in the JSON body for the LLM, not as HTTP errors); `401` if the secret is missing/wrong and one is configured |
| any unmatched route | — | `404 NOT_FOUND` |
| any unhandled server exception | — | `500 INTERNAL_ERROR` |

`x-vapi-secret` verification uses `timingSafeEqual`
(`src/vapi/webhook.ts`); if `VAPI_WEBHOOK_SECRET` is unset the check is
skipped (local dev only).

## Voice agent

**Conversation flow:** greet -> silently check for a returning caller by
caller ID -> collect name, DOB, sex, phone, address in a fixed but
adaptive order (multiple fields can be given out of order in one turn) ->
offer optional fields exactly once -> read everything back and get an
explicit "yes" -> call the save tool -> speak the result. Corrections
during read-back only re-confirm the changed field. Nothing is written to
the database before the caller's confirmation.

| Tool | Called when | Result `status` values |
|---|---|---|
| `find_patient_by_phone` | First turn (no arguments, uses caller ID), or whenever the caller gives a different phone number | `found`, `not_found`, `no_phone`, `invalid_phone`, `system_error` |
| `create_patient` | After read-back confirmation, for a new registration | `success`, `validation_error`, `already_exists`, `system_error` |
| `update_patient` | After read-back confirmation, for a returning caller changing details | `success`, `validation_error`, `not_found`, `system_error` |

### System prompt (verbatim, `src/vapi/systemPrompt.ts`)

```
# Role
You are Riley, a warm, efficient patient intake coordinator at Sunrise Health Clinic, speaking with a caller on the phone. Your job is to register new patients (or update returning patients) by collecting their demographic information in a natural conversation, confirming it, and saving it.

# Context
- Caller ID: {{customer.number}} (may be empty for web test calls).
- Current date and time: {{now}}. Use it to judge whether a date of birth is in the future.

# How you speak
- This is a live phone call. Keep every reply to one or two short sentences. Ask one thing at a time, except that street, city, state and ZIP can come together.
- Sound like a friendly human coordinator, not a form. Use brief natural acknowledgements ("Got it", "Perfect, thanks") and vary them. Never say the same acknowledgement twice in a row.
- Never use lists, bullet points, markdown, emojis or field names like "first_name". Never mention tools, systems, JSON or databases.
- Say numbers the way people do: phone numbers in groups ("four one five, five five five, zero one four two"), dates as words ("April twelfth, nineteen eighty-eight").
- If the caller interrupts, stop and respond to what they said.
- If the caller gives several details at once or out of order, capture all of them and only ask for what is still missing. Never re-ask for something you already have.

# Step 1: Returning caller check
On your first turn after the caller speaks, call find_patient_by_phone with no arguments (it uses caller ID). Do not mention that you are checking.
- If it returns "found": say "It looks like we already have a record for <first name> <last name>. Would you like to update your information instead?" Before changing anything, ask for their date of birth and make sure it matches the record. If it does not match, treat them as a new patient. If they want to update, go to "Updating a returning patient".
- If "not_found" or anything else: continue with a new registration without comment.
If the caller later gives a phone number different from caller ID, call find_patient_by_phone with that number and handle a match the same way.

# Step 2: Collect required information
Collect all of these, in roughly this order, adapting to the caller:
1. First and last name. Ask them to spell the last name, and the first name if it is unusual. Letters spoken with pauses ("D-A-V-I-S") should be joined into the name.
2. Date of birth. It must be a real date and not in the future. If invalid, say what is wrong in plain words and ask only for the date again.
3. Sex, phrased as: "And for our records, what sex should I put down: male, female, other, or would you prefer not to say?" Map to exactly one of: Male, Female, Other, Decline to Answer.
4. Phone number. If caller ID is present, ask "Is the number you're calling from the best one to reach you?" and read it back. Otherwise collect it. It must be a 10-digit U.S. number; if the caller gives the wrong number of digits, ask for it again.
5. Home address: street address, apartment or unit if any, city, state and ZIP code. Store state as the 2-letter abbreviation. The ZIP must be 5 digits (or ZIP+4).

# Step 3: Offer the optional information, once
After the required fields, ask exactly once: "I can also collect your insurance information, emergency contact, and preferred language. Would you like to provide any of those?"
- Collect only what they choose: insurance provider and member ID; emergency contact full name and phone number; preferred language; optionally email.
- If they decline, move on. Never push.

# Step 4: Confirm before saving
Read back everything you collected in a natural, compact way, spelling the last name, then ask "Did I get all of that right?"
- If they correct something, update only that detail, confirm just the corrected value ("Got it, Davis, D-A-V-I-S"), and ask if everything else is correct. Do not re-read the whole record.
- Only after a clear yes, say something like "Great, let me get that saved for you" and call create_patient with every collected field. Dates as MM/DD/YYYY, phone numbers as 10 digits.

# Step 5: Handle the result
Every tool result has a "status" and an "instruction". Always follow the instruction.
- success: say "You're all set, <first name>." Add one short friendly line, ask if there is anything else, and if not say goodbye and end the call.
- validation_error: nothing was saved. Explain the problem simply, re-ask only those fields, confirm the fixed values, and call the tool again.
- already_exists: a matching record exists; offer to update it instead.
- system_error: apologize, say clearly that their information was NOT saved, and offer to try once more. If it fails again, ask them to call back later. Never claim it was saved.

# Updating a returning patient
After verifying date of birth, ask what they would like to change. Collect the new values (same rules as above), read back only the changed details, and after a yes call update_patient with the patient_id and only the changed fields. Then confirm using their first name.

# Starting over
If the caller wants to start over, reassure them ("No problem, let's start fresh"), forget everything collected in this call and begin again from their name. Nothing is saved until they confirm, so there is nothing to undo.

# Language
If the caller speaks Spanish or says "Hablo español", switch to Spanish for the rest of the call and set preferred language to Spanish. Keep saved values in their standard form (sex options in English, dates as MM/DD/YYYY).

# Boundaries
- You only handle registration. For medical questions, say a clinician will be happy to help at their visit. If the caller describes an emergency, tell them to hang up and dial 911.
- Never reveal any other patient's information. From a lookup, only say the name to confirm identity.
- If the caller is silent or unclear, gently ask again. If they want to leave before confirming, tell them nothing was saved and they can call back anytime.
```

`FIRST_MESSAGE`: *"Hi, thanks for calling Sunrise Health Clinic, this is
Riley. I can get you registered as a patient in just a few minutes. Can I
start with your first and last name?"*

### Prompt design notes

- **Voice, not chat.** Replies are capped at one or two sentences and lists/
  markdown/field names are explicitly forbidden, because long or
  form-shaped turns read as robotic when spoken aloud (comment in
  `systemPrompt.ts`).
- **LLM collects and confirms; the server validates.** The prompt asks for
  light inline checks (future DOB, digit counts) so the agent can re-prompt
  quickly without a round trip, but the API remains the authority — every
  tool result carries an explicit `status`/`instruction` the agent must
  follow rather than reason about independently.
- **Nothing is saved until an explicit "yes."** This is what makes
  "start over" and a dropped call safe: an abandoned call can never leave a
  half-written record, because `create_patient`/`update_patient` are only
  called after read-back confirmation.
- **Corrections re-confirm only the changed field**, not the whole record,
  so fixing one typo doesn't cost the caller a second full read-back.
- **`{{customer.number}}` and `{{now}}`** are Vapi template variables
  filled in per call, giving the model caller ID (for the returning-caller
  check) and the current date (to judge a future DOB) without a tool call.
- **Silent returning-caller lookup.** `find_patient_by_phone` is called on
  the first turn with no visible acknowledgement ("Do not mention that you
  are checking"), so a new caller never hears a confusing pause explained.
- **Numbers spoken naturally** (phone digits grouped, dates as words) match
  how a human receptionist would read them back, improving perceived
  conversational quality over a robotic digit-by-digit read.

## Edge cases & resilience

| Scenario | Handling | Where |
|---|---|---|
| Invalid date of birth (impossible date, future date, pre-1900) | zod schema rejects with a specific message; tool handler returns `validation_error` with `errors`; prompt re-asks only DOB | `src/validation/patientSchema.ts` (`dateOfBirth`), `src/vapi/toolHandlers.ts` (`handleFailure`), Step 2/5 of prompt |
| 3-digit / malformed phone number | `normalizePhone` returns `null` -> 422 `validation_error`; prompt says "ask for it again" | `src/validation/normalizers.ts` (`normalizePhone`), Step 2.4 of prompt |
| Caller corrects a value mid-flow | Prompt re-confirms only the corrected field, not the whole record | Step 4 of prompt |
| Caller gives details out of order / several at once | Prompt captures everything given, asks only for what's missing | "How you speak" section of prompt |
| Caller interrupts | Prompt: stop and respond to what they said (Vapi handles barge-in at the platform level) | "How you speak" section of prompt |
| Caller asks to start over | Prompt discards in-call state and restarts from name; since nothing is saved pre-confirmation there is nothing to undo | "Starting over" section of prompt |
| Dropped call before confirmation | No `create_patient`/`update_patient` call ever fired, so no row exists; `end-of-call-report` is still logged with `outcome: 'no_record_saved'` | `src/vapi/webhook.ts` (`end-of-call-report` branch) |
| Database write failure | `create`/`update` throw; `handleFailure` returns `status: 'system_error'` with an instruction that explicitly forbids claiming success; proven by a test that closes the DB mid-call and asserts the spoken instruction mentions "not saved" | `src/vapi/toolHandlers.ts` (`handleFailure`), `tests/vapiWebhook.test.ts` ("turns a database failure into a spoken system_error, never silence") |
| Server unreachable from Vapi | Vapi's own `request-failed` tool message is configured so the caller still hears an apology instead of dead air | `src/vapi/assistantConfig.ts` (`SAVE_FAILED`, `messages: [{ type: 'request-failed', ... }]`) |
| Duplicate `create_patient` tool call (retry, model double-call) | Matches on phone number + first/last name before inserting; returns `already_exists` instead of a second row | `src/vapi/toolHandlers.ts` (`create_patient` idempotency guard), `tests/vapiWebhook.test.ts` ("does not create a duplicate...") |
| Returning caller | `find_patient_by_phone` looks up by caller ID (or a stated number) before registration begins; prompt offers to update instead of re-registering | `src/vapi/toolHandlers.ts` (`find_patient_by_phone`), Step 1 of prompt |
| Spanish-speaking caller | Deepgram transcriber runs in `multi` mode (EN/ES); prompt switches spoken language on request while keeping stored values in their standard form | `src/vapi/assistantConfig.ts` (`transcriber.language`), "Language" section of prompt |

## Observability

Structured JSON-lines logs are written to stdout (`info`/`warn`) and stderr
(`error`) via `src/lib/logger.ts`; Railway captures both streams. Log event
names present in the code (`log.info` / `log.warn` / `log.error` call
sites):

- `http.request` — every HTTP request, with method, path, status, duration
- `vapi.unauthorized` — webhook call rejected for a bad/missing secret
- `vapi.tool_call` — every tool invocation, with tool name, args, and result status
- `vapi.tool_failed` — a tool handler hit an unexpected (non-4xx) error
- `vapi.call_link_failed` — linking a call to a patient record failed (non-fatal, logged only)
- `vapi.call_ended` — end-of-call report, including `outcome` (`patient_saved` / `no_record_saved`)
- `vapi.event` — any other Vapi server-message type (e.g. `status-update`)
- `patient.created` / `patient.updated` / `patient.deleted` — service-layer writes
- `seed.skipped` — a seed record was skipped because it already exists
- `server.started` / `server.stopping` — process lifecycle
- `unhandled.error` — uncaught error reaching the Express error handler

## Setup

### Local

```bash
npm install
cp .env.example .env
npm run seed     # inserts two demo patients (skips any that already exist by phone)
npm run dev       # tsx watch, http://localhost:3000
npm test           # vitest run
```

### Vapi provisioning

```bash
npm run vapi:setup
```

Reads `VAPI_API_KEY`, `PUBLIC_BASE_URL`, `VAPI_WEBHOOK_SECRET` (and the
optional `VAPI_MODEL` / `VAPI_VOICE_ID` / `VAPI_TRANSCRIBER_LANGUAGE` /
`VAPI_PHONE_AREA_CODE`) from `.env` and builds the assistant definition from
`src/vapi/assistantConfig.ts`. It is idempotent: it looks up an existing
assistant by name (`Riley - Patient Registration`) and `PATCH`es it if
found, otherwise `POST`s a new one; it only provisions a phone number if
`VAPI_PHONE_AREA_CODE` is set and no number is already attached to the
assistant, so re-running the script is safe.

### Railway deploy

```bash
railway init
# add a volume mounted at /data (Railway dashboard or `railway volume add`)
railway variables set DB_PATH=/data/patients.db
railway variables set VAPI_WEBHOOK_SECRET=<generated secret>
railway up
```

Build command: `npm run build` (`tsc` -> `dist/`). Start command:
`npm start` (`node --disable-warning=ExperimentalWarning dist/server.js`).
Then run `npm run vapi:setup` locally (or in CI) with `PUBLIC_BASE_URL` set
to the deployed Railway URL to point the assistant's webhook at it.

Requires **Node.js >= 22.13.0** (`package.json` `engines.node`) for
`node:sqlite` support.

## Environment variables

| Variable | Used by | Required | Default |
|---|---|---|---|
| `PORT` | server | no | `3000` (Railway injects this) |
| `DB_PATH` | server | no | `./data/patients.db` (set to `/data/patients.db` on Railway) |
| `VAPI_WEBHOOK_SECRET` | server (verifies webhook calls) + `vapi:setup` (configures Vapi to send it) | recommended in production; server runs open if unset | *(empty)* |
| `VAPI_API_KEY` | `vapi:setup` only | yes, for provisioning | — |
| `PUBLIC_BASE_URL` | `vapi:setup` only | yes, for provisioning | — |
| `VAPI_MODEL` | `vapi:setup` only | no | `gpt-4.1` |
| `VAPI_VOICE_ID` | `vapi:setup` only | no | `Elliot` |
| `VAPI_TRANSCRIBER_LANGUAGE` | `vapi:setup` only | no | `multi` |
| `VAPI_PHONE_AREA_CODE` | `vapi:setup` only | no (skips phone provisioning if unset) | — |

## Testing

`tests/patients.test.ts` (REST API, in-memory SQLite per test):
- creation with field normalization and defaults (sex, phone, state, DOB
  round-trip, `preferred_language` default)
- 422 with per-field `details` for invalid phone/DOB/ZIP, and for missing
  required fields
- rejection of impossible calendar dates (e.g. Feb 30)
- 400 for unknown fields and malformed JSON
- filtering by `last_name`, `date_of_birth`, `phone_number`, and 400 for a
  malformed filter
- get/update/soft-delete lifecycle, including that a deleted patient 404s
  on subsequent GET/DELETE and is excluded from list results
- UUID validation on path params, and 400 on an empty update body

`tests/vapiWebhook.test.ts` (webhook, in-memory SQLite per test):
- 401 when the shared secret is missing
- `find_patient_by_phone` using caller ID, not-found and found cases
- `create_patient` idempotency: a retried call with the same phone/name
  returns `already_exists` instead of a second row
- field-level `validation_error` surfaced through the tool result
- `update_patient` applying only the changed fields
- a closed/broken database turning into a `system_error` tool result whose
  instruction mentions the record was not saved (proves the DB-failure
  edge case is handled, not silent)
- `end-of-call-report` persisting the transcript/summary and linking it to
  the patient created earlier in the call, retrievable via
  `GET /patients/:id/calls`

## Known limitations & trade-offs

- **No authentication on the REST API.** Left open so reviewers can hit the
  endpoints directly; the webhook is the only authenticated path
  (`x-vapi-secret`).
- **PHI in logs.** Patient records, transcripts and summaries are logged in
  full to satisfy the observability requirement of this assessment; a
  production system would redact or omit PHI from logs.
- **SQLite is single-instance.** Fine for a demo/single Railway service; it
  does not support multiple app instances writing concurrently.
- **`node:sqlite` is experimental** in the Node 22 line; the API is stable
  enough for this use case but the experimental-module warning has to be
  explicitly suppressed at startup.
- **Phone number uniqueness is not enforced.** By design — families and
  households legitimately share a phone number, so duplicate detection uses
  phone *and* name together, not phone alone.
- **Phone validation is not NANP-strict.** The exchange code isn't checked
  against NANP rules, so demo numbers like `555-123-4567` validate; this
  keeps the demo usable with fake numbers while still rejecting obviously
  malformed input (wrong digit count, leading 0/1 area code).
- **LLM transcription can mishear names.** The prompt asks the caller to
  spell last names (and unusual first names) specifically to reduce this
  risk, but it isn't eliminated.
- **No rate limiting** on the REST API or webhook.
- **The free Vapi number is US inbound only.**

## Next steps

- API authentication (API keys or JWT) on the REST surface
- Migrate from SQLite to Postgres with a real migration tool
- PHI redaction in logs and encryption at rest
- Appointment scheduling as a follow-on voice/REST flow
- An admin dashboard over the existing REST API
- Call recording retention policy
- Rate limiting on both the REST API and the webhook
- CI (typecheck + test on every push)
- Latency/turn-taking tuning based on real call recordings
- An eval harness of recorded test conversations to catch prompt regressions
