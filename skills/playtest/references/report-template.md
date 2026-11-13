# Report template

Save as `report.md` in the session's output folder, next to the screenshots, so that relative image links
work. Keep the headings as they are, so reports from different sessions can be compared.

```markdown
# Playtest: <app> — <persona>, <date>

**Mission:** <goal>  ·  **Device:** <size, theme>  ·  **Build:** <git commit or version, if known>
**Result:** <Completed | Completed with workarounds | Blocked at "<step>">  ·  **Actions:** <n>  ·
**Findings:** <n> Blocker, <n> Major, <n> Minor, <n> Polish

## Summary
<3–5 sentences: how the session went for this person, the biggest problems, and the overall impression.>

## Findings

### B1. <Short title that says what's wrong> — Blocker
- **Where:** <screen or flow>
- **Steps:**
  1. <step>
  2. <step>
- **Expected:** <what the persona expected>
- **Actual:** <what happened>
- **Evidence:** ![<what it shows>](<screenshot file name>) · Console/network: `<error, if any>`
- **Reproduced:** <yes, from a fresh account | seen once>
- **Suggested fix:** <optional, one line>

### M1. … — Major
### m1. … — Minor
### P1. … — Polish

## What worked well
- <specific things the persona found easy or pleasant>

## Session log
| # | Persona's thought | Action | What happened |
|---|---|---|---|
| 1 | "Let's see what this is." | Opened the app | Welcome screen, two buttons |

## Coverage
- **Explored:** <screens and flows visited>
- **Break-it tours run:** <list>
- **Not covered:** <what's left for next time and why>

## Environment notes
<stub services, expected sandbox errors, setup problems fixed before the session>
```

For several personas, write one report per persona, then add a `summary.md` that merges the findings,
removes duplicates (noting which personas hit each finding), and ranks them by severity.
