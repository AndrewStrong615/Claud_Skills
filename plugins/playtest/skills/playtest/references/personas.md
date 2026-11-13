# Personas

A persona is a set of constraints on your choices. Before each action, check it against these traits:
what does this person know, how patient are they, and what are they afraid of? Adapt the details
(age, condition, job) to the app; the behaviour is what matters.

| Persona | Tech comfort | Patience | Device | How they behave |
|---|---|---|---|---|
| **First-timer** | Medium | Medium | Phone | Reads headings, skims body text, taps the biggest button. Never opens settings. Expects the app to explain itself. |
| **Hesitant older adult** (70s) | Low | High, but anxious | Phone, large text (`zoom 150`) | Reads every word. Wary of "Agree" and of anything that might share data or cost money. Stuck on icons without labels, small targets and jargon. Uses Back a lot. |
| **Impatient power user** | High | Very low | Desktop | Skips onboarding, tries keyboard shortcuts, opens three things at once, pastes long text, double-clicks, expects instant feedback. Gives up on spinners over ~5 seconds. |
| **Skeptic** | High | Medium | Desktop | Looks for the privacy policy, data export and delete-account options before trusting anything. Tests what happens when they say No. Notices dark patterns. |
| **Caregiver** | Medium | Low (busy, interrupted) | Phone | Manages someone else's account or data. Switches context often, leaves mid-flow, comes back later. Confused by which person they're acting for. |
| **Stressed user** | Any | Very low | Phone, one hand | Something's wrong right now (symptom, failed payment, lost file). Types in fragments with typos, wants the one answer fast, and needs the urgent path to be obvious. |
| **Screen-reader / keyboard user** | High with their tools | Medium | Desktop, no mouse | Moves with Tab and Enter only (`press Tab`, `focus`). Relies on accessible names (`look`). Lost when focus disappears or jumps. |
| **Non-native speaker** | Medium | Medium | Phone | Reads literally and is tripped up by idioms and abbreviations. May type in another language or mix languages. |
| **Returning user** | Medium | Medium | Any | Has used the app before and expects their data and settings to be where they left them. Tests sign out and sign back in, reloads, and old links. |
| **Edge-case explorer** | High | High | Any | Deliberately tries the weird paths: empty states, maximum lengths, zero and negative numbers, time zones, deleting the thing currently in use. |

Profiles may add app-specific personas. Prefer those when they fit, because they carry real goals.

## Staying in character

- Choose what to do as the persona; judge the result as a tester. The persona might not notice a 500 in
  the console, but you do and you report it.
- Don't use knowledge the persona doesn't have, such as routes, test IDs, or what the source code says
  will happen. If the only way forward is something they wouldn't know, that is a finding.
- When the persona would give up, note "would abandon here: <why>", then continue as a tester so the
  rest of the flow still gets covered.
