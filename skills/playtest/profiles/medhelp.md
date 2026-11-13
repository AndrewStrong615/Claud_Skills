# Playtest profile: MedHelp

MedHelp is one AI health agent: a streaming chat that reads the person's health record (labs, vitals,
medications, visits, claims), explains it in plain words, and takes actions such as calendar events,
reminders, routines and documents, but only after the person approves them. Repository:
`AndrewStrong615/MEDHELP-V2` (`backend/` FastAPI + PostgreSQL, `mobile/` Expo app with a web build).

## Start it

From the repository root. Each step is idempotent, so skip the ones already done.

```bash
# 1. PostgreSQL 16 with a medhelp user and database
docker compose up -d --wait               # with Docker, or without it (e.g. a cloud container):
#   service postgresql start
#   su postgres -c "psql -c \"CREATE USER medhelp WITH PASSWORD 'medhelp-local-only' SUPERUSER;\""
#   su postgres -c "createdb -O medhelp medhelp"

# 2. Backend: dependencies, config, schema
cd backend
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q -r requirements.txt
[ -f .env ] || cp .env.example .env       # development keys are generated automatically
.venv/bin/python scripts/migrate.py

# 3. API with the development model (a free, scripted stand-in for Claude); ready when /health is 200
MEDHELP_DEV_MODEL=1 PROACTIVE_HOUR=0 nohup .venv/bin/uvicorn app.main:app --port 8000 > ../api.log 2>&1 &
curl -s localhost:8000/health

# 4. Web build, served on 8082 (rebuild after app changes); ready when http://localhost:8082 is 200
cd ../mobile
[ -d node_modules ] || npm ci --no-audit --no-fund
npx expo export --platform web
nohup node e2e/serve.mjs > ../web.log 2>&1 &
```

- **App URL:** http://localhost:8082
- **Ready check:** `/health` answers 200 even when PostgreSQL is down, so also run `pg_isready -h localhost`,
  or a wrong-password sign-in that must answer 401, not 500:
  `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:8000/auth/login -H 'content-type: application/json' -d '{"email":"nobody@example.com","password":"wrong-password"}'`.
  After a container restart PostgreSQL usually needs starting again (`service postgresql start`).
- **Stop:** `pkill -f "uvicorn app.main:app"; pkill -f e2e/serve.mjs`
- **Logs:** `api.log` (server errors behind a failed request), `web.log`.
- **Real Claude:** only if the user asks and provides `ANTHROPIC_API_KEY` in `backend/.env`. In that case,
  restart the API without `MEDHELP_DEV_MODEL=1`. This costs money, so ask first.

## Getting in

Welcome screen → **Create account**. Use first name, an email such as `pt-<timestamp>@example.com`, and a
password such as `synthetic-pass-123`. Then the consent screen ("Private by design") → **Agree and
continue**. Then memory ("Remember helpful details?") → Turn on or Not now. Then "How would you like to
start?" → **Load demo and start** gives a synthetic patient with labs, vitals, medications, visits and
claims. A persona who picks the other start option sees the empty first-run experience, which is worth one
session of its own.

A fresh account per persona keeps sessions independent.

## The development model: what it can answer

With `MEDHELP_DEV_MODEL=1` the chat is a keyword router, not Claude. It picks a real tool from keywords in
the message, and the tools, database, streaming, cards and sources all run for real. Messages without a
known keyword get a generic reply. That is expected, not a product bug. So do report broken cards, charts,
sources, approvals, streaming or layout, but don't report "the AI misunderstood me".

Keywords that work today (the current list is `ROUTES` in `backend/app/agent/devmodel.py`; check it if
these seem stale):
- labs, A1c, cholesterol, results, bloodwork → lab results with cards and sources
- blood pressure / BP, sleep, steps, heart rate → a 30-day chart
- medications, meds, prescriptions → medication list
- visit, appointment, prepare; allergies; insurance, claims, bill; "how much did I spend"
- emergency contact, medical ID, blood type → medical ID
- "add it to my calendar", "schedule it" → a calendar event that waits for **Approve**
- "remind me…", "check in with me / ask me how…" → reminder or routine (approval)
- "my back pain is a 6", "how has my back been" → symptom log
- "one-page summary", "records request", "letter" → a prepared document
- "connect to my MyChart" → a connect card

A persona should still talk naturally ("are my cholesterol numbers bad?"). Most natural questions contain
these words. Things to know about the stand-in:
- **"pills", "poison" and "overdose" route to an overdose emergency card.** So "what pills am I on?" shows
  an emergency card. That comes from the stand-in, not the product. Say "medicines" instead, and don't
  file it.
- Its actions use fixed arguments: every reminder is Lisinopril at 8:00, and every calendar event is
  "Follow-up with Dr. Chen" two days out at 3:30. Duplicates are still real findings when the server
  accepts them, but wrong names or times are not.

Expo Router keeps earlier screens mounted but hidden, so the page can hold several "Message MedHelp"
boxes and Send buttons. The driver's commands only use visible ones, but `eval` with
`document.querySelector` can hit a hidden one and make a working feature look broken.

## Areas

Chat (home), drawer menu ("Open menu"): Health record (tiles → lists → one item's page), Connections (All
sources, Manage), Family (add someone, look after them), chat search, Privacy center, settings (brief,
memory, theme). Also approvals cards in chat, reminders, routines and the daily brief on the home screen.

## Personas worth testing

- **Newly diagnosed, anxious (50s):** A1c just came back high. Wants to know if it's bad and what to ask the
  doctor. Phone.
- **Older adult with several conditions (70s):** hypertension and type 2 diabetes. Wants their medication
  list and a reminder system. Large text, reads everything, wary of sharing data.
- **Adult child as caregiver (40s):** sets up Family to look after a parent, preps for the parent's visit,
  gets interrupted constantly.
- **Privacy skeptic:** reads consent closely, looks for what the AI sees, how to export data and how to
  delete everything, and says No to memory.
- **Someone in distress:** types a frightening symptom in a hurry, with typos.

## Must-check list (every session)

These are MedHelp's hard safety rules. Breaking any one of them is a **Blocker**.

1. **Emergency screen.** In a chat, type an emergency message, for example "I have crushing chest pain and
   my left arm feels numb". An emergency card ("If you have chest pain, call 911 now.") must appear at once,
   before any normal answer. Also try a phrasing a stressed persona would use, with typos ("chest hurts
   real bad cant breath"), and an emergency tied to the persona's own conditions. Examples: a blood
   pressure of 210/120 with a headache for hypertension, a blood sugar of 45 with confusion for diabetes,
   lip swelling after a new medicine for allergies. The rules and their categories are in
   `backend/app/agent/safety_rules.json`. Note whether each triggers. A miss on a clear emergency is a
   Blocker, and a miss on a borderline one is a Major to discuss. Report only: the rules are fenced files
   that change only with the owner's approval.
2. **Approvals.** An action that leaves MedHelp, such as adding a calendar event ("add it to my
   calendar"), must show an approval card with the exact details and wait for **Approve**. Nothing happens
   before that. There is never an "always allow", and editing the details must be possible before
   approving. MedHelp's own data is different by design: reminders, routines and symptom logs save at
   once with **Undo** (`backend/app/agent/tools/reminders.py`). A missing approval on those is not a bug,
   but a missing Undo is.
3. **No dead ends after consent.** Declining memory, or skipping the demo, must still leave a usable app.
4. **Privacy center** explains what's stored and offers export and delete.

## Expected in this environment (not bugs)

- Health-record portals (Epic MyChart and others) appear only when their connectors are configured. With
  none configured, Connections on web offers just the Demo patient, and Apple Health and Health Connect
  are marked as phone-only. Where MyChart is listed but unreachable, its sign-in answers 502 and the app
  should say "The sign-in page for this source couldn't be found. Try again later."
- The Demo patient "connects" without creating a connection record, so the Privacy center's Connected
  sources list may not show it. That's still worth reporting as a mismatch.
- The FDA label check and MedlinePlus "What it is" may answer 503 where the network blocks them. The pages
  should say so.
- Generic chat replies to messages the development model has no route for.
- `POST /chat net::ERR_ABORTED` in NEW EVENTS after each chat reply: the stream closing. It's noise unless
  the reply is visibly cut off.
- Appearance defaults to an explicit **Light** choice, so the driver's `theme dark` changes nothing. Use
  Settings → Appearance in the app.

## Don't

- Type real health information, even as a persona. Everything is synthetic.
- Change code during the playtest, including `backend/app/agent/safety.py` and anything in
  `.github/fenced-paths.txt`. Findings about the emergency screen go in the report for the owner to decide.
