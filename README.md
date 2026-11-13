# playtest

A Claude skill that turns Claude into a test user for your app. It starts the app, uses it in a real
browser as a persona with a goal, tries to break it, and writes a findings report with screenshots.

Scripted end-to-end tests check the paths you already thought of. A playtest finds the rest: the button a
first-time user can't find, the form that loses everything on Back, the error that blames the user, the
icon that disappears in dark mode.

```
you:    playtest my app as a 72-year-old who isn't great with tech, on a phone
Claude: starts the app → plays as that person (look, decide, tap, screenshot) → break-it pass
        → report.md: Blocker / Major / Minor / Polish findings, each with steps, screenshots and errors
```

## Install

**As a Claude Code plugin** (recommended, updates with the repo):

```
/plugin marketplace add AndrewStrong615/playtest-skill
```

```
/plugin install playtest@playtest
```

**As a plain skill:** copy `skills/playtest/` to `~/.claude/skills/playtest/` for all your projects, or to
`.claude/skills/playtest/` inside one app's repository.

**Requirements:** Node 18+ and Playwright with Chromium. Claude Code cloud sessions already have both.
Anywhere else:

```bash
npm i -g playwright && npx playwright install chromium
```

## Use

Ask in your own words. The skill triggers on things like "playtest my app", "go through it as a new user",
"click around and tell me what's broken", "bug-bash the checkout", or "QA this in dark mode on desktop".
You can name a persona, a device, a flow to focus on, or an action budget. Otherwise it picks sensible
ones.

Reports land in `playtest-<date>-<persona>/report.md` next to the screenshots and a session log.

## How it works

| Part | What it does |
|---|---|
| `skills/playtest/SKILL.md` | The method: get the app running → write a charter → play in persona → break-it pass → report |
| `scripts/drive.cjs` | One long-lived browser steered one action at a time (`look`, `click "Sign in"`, `fill label=Email …`, `press Tab`, `theme dark`, `offline on` …). Each action saves a screenshot and prints new console errors and failed requests. |
| `references/personas.md` | Ten personas (hesitant older adult, impatient power user, skeptic, caregiver, keyboard-only …) and how to stay in character |
| `references/heuristics.md` | Break-it tours and what counts as a finding (function, usability, accessibility, copy, safety) |
| `references/report-template.md` | The report format and severity scale |
| `profiles/` | How to start a specific app and what must always be checked in it. `medhelp.md` is included, and `TEMPLATE.md` is for new apps. |

### App profiles

The skill first looks for `.playtest.md` at the root of the app's repository, then for a matching profile
in `profiles/`. If neither exists, it works out how to run the app from the README, scripts and existing
e2e tests, then writes a `.playtest.md` so the next session starts straight away. A profile holds the start
commands, how to get an account, app-specific personas, a must-check list of flows that may never break,
and errors that are expected in a sandbox.

### Driver quick reference

```bash
D=skills/playtest/scripts/drive.cjs
node $D start http://localhost:3000 --out playtest-out --size 390x844 [--dark]
node $D look            # accessibility tree of what's on screen + new errors
node $D click "Create account"
node $D fill label=Email jo@example.com
node $D press Enter
node $D help            # all commands
node $D stop
```

Set `PLAYTEST_PORT` to run several browsers at once (one per persona), and `PLAYTEST_CHROMIUM` to use a
specific Chromium binary.

## Safety

The skill uses made-up data only, prefers an app's free development and stub modes, asks before anything
that costs money or reaches real people, and doesn't change your app's code during a playtest.

## Tests

`skills/playtest/evals/` holds test cases in the format `claude plugin eval` reads. Run them from
`skills/playtest` with `claude plugin eval . --allow-tools Write,Edit,Bash`. They need the MedHelp app
running locally, and they are real, billed model runs.
