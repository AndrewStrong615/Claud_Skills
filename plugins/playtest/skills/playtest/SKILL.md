---
name: playtest
description: Play-test an app the way a real person would. Launch it, drive it in a real browser as a chosen persona, explore without a script, try to break it, and write a findings report with screenshots covering bugs, dead ends, confusing copy, accessibility gaps and safety problems. Use this whenever the user asks to playtest, dogfood, QA, bug-bash, smoke-test the UI, "go through my app", "try it as a user", "click around and tell me what's broken", run a usability or exploratory test, or wants a reviewer or test user for a web, Expo or React Native web app, even if they never say "playtest". Not for writing unit tests or reviewing a code diff.
---

# Playtest

You are a test user, not a developer. Scripted end-to-end tests prove that the happy path someone already
thought of still works. A playtest finds what nobody thought of: the button a first-time user can't find,
the form that loses everything on Back, the error message that blames the user, the screen that breaks in
dark mode. You find these by using the app the way a specific person would, with their goal, patience and
skills, and by watching closely what happens.

Your job is to observe and report. Don't fix the app's code during a playtest. A fix in the middle hides the
evidence and changes what the next steps test. Offer fixes after the report.

The session has four parts: get the app running, plan, play, then report.

## 1. Get the app running

Look for a profile that says how to start this app and what matters in it, in this order:

1. A `.playtest.md` file at the root of the app's repository.
2. A bundled profile in `profiles/` (next to this file) whose name matches the app. Today there's
   `profiles/medhelp.md`.
3. If neither exists, work it out from the README, `package.json` scripts, `docker-compose.yml`,
   `Makefile`, and any existing end-to-end tests. Existing e2e tests are the best source, because they show
   which servers to start, which URL to open, and how to get past sign-up. Then write a profile from
   `profiles/TEMPLATE.md` and save it as `.playtest.md` in the app's repo, telling the user you did, so the
   next playtest starts in seconds.

Start what the profile says and confirm the app works end to end before you open a browser. A health
check that answers 200 can still sit on a dead database, so use the profile's ready check, or make one
request that touches the data, such as a sign-in with a wrong password that should answer 401, not 500.
A playtest of a half-running app produces false findings. If something fails, read its log and fix the
setup first: a stopped database, a missing `.env`, an unbuilt bundle. Fix the environment, never the app.
If you've been told not to touch the servers and something is down, don't play. Report what is down and
stop, so whoever runs the servers can fix it.

Ground rules that keep a playtest safe:
- Prefer the app's development or stub modes, such as fake AI models, sandbox payments or seeded demo data.
  They are free and repeatable. If the only way to exercise a feature costs money or reaches real people
  (a paid API key, real email or SMS, a real payment), ask before using it.
- Use made-up data only. Use names, emails at `example.com` and invented health or financial details.
  Never type real personal data, even if a persona would.
- Never approve an action that would leave the sandbox, such as sending an email or booking something real,
  unless the profile says it is safe.

## 2. Plan the session

Write a short charter before you touch the app. It keeps the session focused and makes the report easy to
read:

```
Persona:  <who, from the user, the profile, or references/personas.md>
Mission:  <a real goal this person has, e.g. "find out if my cholesterol is OK and what to ask my doctor">
Device:   <phone 390x844 | tablet 820x1180 | desktop 1440x900>, <light | dark>
Budget:   <about 40–60 actions for the mission, then the break-it pass>
```

If the user named a persona, area or flow, use it. If not, pick one or two contrasting personas, for
example a hesitant first-timer on a phone and an impatient power user on a desktop. Pick from the profile's
suggestions or `references/personas.md`. One persona done deeply beats four done shallowly. If the user
asks for several personas and you can spawn subagents, give each persona its own subagent, a different
`PLAYTEST_PORT`, and its own output folder. Then merge their findings into one report.

## 3. Play

Drive the browser with `scripts/drive.cjs`. It keeps one browser open between commands, so you act one
step at a time like a person. After every action it waits for the page to settle, saves a screenshot, and
prints any new console errors, crashes or failed requests.

```bash
D=<this skill's directory>/scripts/drive.cjs
OUT=<where the report goes>/playtest-<yyyy-mm-dd>-<persona>   # screenshots and session log
node $D start http://localhost:8082 --out $OUT --size 390x844   # add --dark for dark mode
node $D look                    # what's on screen: roles, names, values, states
node $D click "Create account"  # plain words, the way a person names a button
node $D fill label=Email jo@example.com
node $D press Enter
node $D wait "Welcome back"     # or: wait 1500
node $D help                    # every command
node $D stop
```

Plain-text targets try an exact control name first (button, link, tab, radio and so on), then partial
names, then any visible text. Each action prints what it actually hit (`-> button "Create account"`) and
flags partial matches, so check that line. Clicking "Atorvastatin" can hit "Refill Atorvastatin…". Use
`label=…`, `placeholder=…`, `'role=radio[name="…"]'`, `testid=…` or CSS when plain words aren't precise
enough. Wrap selectors that contain quotes in single quotes, or the shell eats the inner ones. If plain words don't work, a real user would also struggle. That can be a finding: a control with
no accessible name, or two controls with the same name.

Quirks worth knowing:
- `theme dark` and `--dark` set the device's preference. Many apps have their own Appearance setting that
  overrides it, so if nothing changes, use the in-app setting.
- For large-text or low-vision personas, use `zoom 150` (or 200). Browser zoom is the closest web
  equivalent to a phone's large text.
- Clicking a disabled control returns at once, saying it's disabled. Ask whether the screen tells the
  person why.
- Reusing an `--out` folder continues the screenshot numbering, and `stop` then `start` is safe.
- Every action waits up to ~3 s for the page to settle, so two separate commands are never a real double
  submit. Use `dblclick` or `press Enter 2`.
- Native `confirm()` dialogs are accepted by default and printed as a `DIALOG` line. Read it before
  reporting "no confirmation", and use `dialogs dismiss` to test Cancel. Downloads are saved to the
  output folder, so open them and check the contents.
- `press Tab` and `focus` print the focused element without a screenshot. Take a `shot` when the focus
  ring itself matters. Don't trim command output with `head`, because dialogs and errors come last.
- A reload resets anything the app doesn't persist, including an in-app theme. Re-apply it before judging
  the next screens.

**The loop.** Repeat until the mission is done or clearly blocked:

1. **Look.** Run `look` for the structure, then open the latest screenshot with the Read tool and actually
   look at it. The accessibility tree can't show overlapping text, cut-off labels, unreadable contrast, a
   spinner that never stops, or a layout that jumps. Screenshots are how you catch those, so view one at
   least every few steps and after anything surprising.
2. **Decide as the persona.** Ask what this person would do next, given what's on screen and their goal.
   Don't use what you know from the source code or the profile. The persona doesn't know the app. If they
   would hesitate, guess wrong, or give up, do that and note it, because hesitation is data.
3. **Act** with one command.
4. **Judge as a tester.** Did what happened match what the person expected? Read the NEW EVENTS block.
   A console error or 500 response after a click is a bug even when the screen looks fine.

Keep running notes as you go. Write each finding the moment you see it, with the screenshot path and the
steps that led there. Findings reconstructed from memory at the end lose the detail that makes them
fixable. A short think-aloud line per step, in the persona's voice ("Where do I see my results? I'll try
the menu"), makes the report read like a real usability session and shows where the app confused people.

**After the mission, run the break-it pass.** Pick the tours from `references/heuristics.md` that fit what
you saw, typically:
- **Bad input:** empty, very long, emoji, wrong format, pasted text with newlines, double-click submit.
- **Interruptions:** Back mid-flow, reload mid-flow, go `offline on` then retry, open a deep URL directly.
- **Other sizes and themes:** `size 1440x900`, `theme dark`. Look for clipped text and invisible icons.
- **Keyboard only:** `press Tab` repeatedly plus `focus`. Can you reach and see every control?
- **The profile's must-check list:** flows the app must always get right. Run each check with the
  profile's example, and then the way *this persona* would hit it, in their situation, vocabulary and
  typos. The profile's example is the case someone already tested, and the persona's version is where the
  gaps are. For example, in a banking app with a caregiver persona, test a payment made on someone else's
  behalf.
- **Stay inside the product's scope.** If the profile says what the app does *not* do (diagnose, give
  legal or financial advice), don't file the missing thing as a gap. Do file any place where the app
  crosses that line.

Stop when you've used the budget or keep finding the same class of issue. Then `stop` the browser.

## 4. Report

Before writing, reproduce each Blocker and Major finding once, starting from a reload or a fresh account.
A finding you can't reproduce goes in the report as "seen once" rather than being dropped or overstated.
Profiles go stale. Before filing a must-check failure as a Blocker, confirm that the rule still holds by
reading the relevant code or docs. If the app changed by design, note "profile out of date" under
Environment notes instead.

Write `report.md` in the output folder using `references/report-template.md`. Severity is about the
person, not the code:

- **Blocker:** the persona cannot finish their goal, data is lost or wrong, or a safety rule is broken.
- **Major:** they can finish, but only with a workaround, a lot of confusion, or a visible error.
- **Minor:** friction or a small defect that a person notices but gets past.
- **Polish:** copy, spacing, consistency, delight.

Each finding needs steps to reproduce, expected versus actual result, a screenshot, and any console or
network errors. That is what turns "something felt off" into a bug someone can fix. Include what worked
well too. It tells the team what not to break, and a report that's all negatives reads as noise.

If you can't write files (some subagent setups forbid it), return the whole report as your final
message, with the folder its image links are relative to, so the caller can save it. Don't drop it.

Then, in chat, give the user the report path, the top three to five findings in one line each, and an
offer to fix them or to file them as GitHub issues. Leave the servers you started running only if the user
will keep testing. Otherwise stop them.
