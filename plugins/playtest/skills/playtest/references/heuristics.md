# What to look for

## Tours for the break-it pass

Pick the tours that fit what you saw during the mission. Each one targets a class of bug that happy-path
tests almost never cover.

- **Garbage input:** empty submit; whitespace only; 5,000 characters; emoji and accents (`Zoë 🙂`);
  `<b>html</b>` and `' OR 1=1`; wrong formats (letters in a number, a date of 31/02); pasted text with line
  breaks. Watch for crashes, raw error dumps, silent truncation, and text that breaks the layout.
- **Double trouble:** double-click submit buttons, press Enter twice, send the same message twice quickly.
  Watch for duplicate records and duplicate charges.
- **Interrupted flow:** `back` in the middle of a multi-step flow, `reload` mid-form, open a deep link
  directly with `goto`, sign out and back in. Watch for lost input, broken state, and a blank screen.
- **No network:** `offline on`, try the main action, then `offline off` and retry. Is there a clear
  message? Does it recover without a reload?
- **Slow and long:** a long conversation or list (scroll it). A response that streams for a while. Does the
  UI stay usable, and can you scroll back up while it loads?
- **Empty and first-run states:** a brand-new account with no data. Every list and dashboard should say
  what goes there and how to fill it, not show a blank area or "undefined".
- **Undo and destructive actions:** delete, remove, disconnect, cancel. Is there a confirmation that names
  the thing? Can you undo? Does the count update everywhere?
- **Sizes and themes:** phone (390x844), tablet (820x1180), desktop (1440x900), `theme dark`. Look for
  clipped or overlapping text, invisible icons in dark mode, buttons pushed off screen, and horizontal
  scrolling.
- **Keyboard only:** Tab through a whole screen with `focus` after each step. Every control should be
  reachable, in a sensible order, with a visible focus ring. Escape should close dialogs, and focus should
  land somewhere sensible when they close.
- **Return visit:** reload the app, or sign out and in. Is everything where you left it?

## What counts as a finding

**Function:** errors, crashes, wrong data, actions that do nothing, duplicate actions, lost input, stale
counts, broken links, 4xx/5xx responses, console errors (the driver prints them after each step).

**Usability**, checked against Nielsen's heuristics in plain words:
- Can I tell what's happening? Look for loading feedback, progress, and confirmation that something saved.
- Does it speak my language? Look for jargon, internal IDs, raw error codes, and "null".
- Can I get out? Look for Back, Cancel, Close and Undo.
- Is it consistent? The same thing should have the same name and place everywhere.
- Does it prevent mistakes? Look for confirmations on destructive or costly actions and sensible defaults.
- Does it show options, or do I have to remember? Recent items and suggestions are better than blank boxes.
- Error messages should say what happened and what to do next, without blame.
- Can I find help when stuck?

**Accessibility** (quick checks, not a full audit):
- Unlabelled controls appear in `look` as `button` or `img` with no name.
- Text contrast that's hard to read in the screenshot, especially grey on white and anything in dark mode.
- Touch targets under ~44x44 px on phone sizes (`focus` prints the focused element's size).
- Information carried by colour alone.
- Focus that is invisible or lost after dialogs.

**Copy and trust:** a tone that doesn't fit the moment (cheerful copy on an error, casual copy on a health
or money screen), unclear consent, surprise costs, and pre-ticked boxes.

**Safety:** whatever the profile's must-check list says. In apps that handle health, money or other
people's data, also check that urgent paths are obvious and that nothing irreversible happens without a
clear confirmation.

## What not to report

- Behaviour the profile marks as expected in this environment, such as a sandbox service that can't be
  reached, or a stub AI that only knows certain prompts. Note it once under "Environment notes".
- Personal taste with no effect on the persona. "I'd prefer blue" is not a finding. "The only Save button
  is the same grey as the background in dark mode" is.
