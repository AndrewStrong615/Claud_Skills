# Playtest profile: <app name>

Save a copy as `.playtest.md` at the root of the app's repository. The playtest skill reads it first.

## Start it

Commands to run from the repository root, in order, with how to tell each one is ready:

```bash
# e.g. database
# e.g. backend:  cd api && npm run dev            → ready when http://localhost:3000/health answers
# e.g. frontend: npm run dev -- --port 5173       → ready when http://localhost:5173 answers
```

- **App URL:** http://localhost:<port>
- **Free / stub modes:** <env vars that swap paid or external services for local fakes>
- **Stop:** <how to stop what was started>

## Getting in

<How to get an account: sign-up steps, a seed user, or a demo button. Use example.com emails.>

## What the app is for

<One paragraph: who uses it and the main jobs they come to do.>

## Personas worth testing

- <app-specific persona with a real goal>

## Must-check list

Flows that must always work, checked in every session:
- <e.g. checkout total matches the cart>

## Expected in this environment (not bugs)

- <e.g. the maps tile server is blocked, so maps are blank>

## Don't

- <actions that would reach real people, cost money or change shared data>
