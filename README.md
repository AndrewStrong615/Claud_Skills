# Claud_Skills

Claude Code skills, packaged as plugins in one marketplace.

| Plugin | What it does |
|---|---|
| [playtest](plugins/playtest/) | Turns Claude into a test user: launches your app, plays it in a real browser as a persona, tries to break it, and writes a findings report with screenshots. |

## Install

Add this repository as a marketplace once:

```
/plugin marketplace add AndrewStrong615/Claud_Skills
```

Then install any plugin from it:

```
/plugin install playtest@claud-skills
```

Each plugin's skills are also plain folders under `plugins/<name>/skills/`. To use one without the plugin
system, copy its folder to `~/.claude/skills/` (for every project) or to `.claude/skills/` in one repository.

## Adding a skill

Put it in `plugins/<name>/` with a `.claude-plugin/plugin.json` and its skills under `skills/`, then list it
in `.claude-plugin/marketplace.json`.
