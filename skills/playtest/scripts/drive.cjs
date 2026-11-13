#!/usr/bin/env node
// drive.cjs: one long-lived browser that a playtester steers one action at a time.
//
//   node drive.cjs start <url> [--out DIR] [--size 390x844] [--dark]   launch the browser (background)
//   node drive.cjs <command> [args...]                                 act, then report what happened
//   node drive.cjs stop                                                close the browser
//
// Every action waits for the page to settle, saves a screenshot and prints the new console errors,
// page crashes and failed requests, so nothing that goes wrong between two looks is missed.
// `node drive.cjs help` lists the commands. The browser listens on 127.0.0.1:$PLAYTEST_PORT (9333).

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.PLAYTEST_PORT || 9333);

const HELP = `Commands (targets: plain text, label=…, placeholder=…, role=button[name="…"], testid=…, or CSS):
  look                     visible page as an accessibility tree (roles, names, states), plus new errors
  text                     the page's visible text
  shot [name]              screenshot of the viewport
  fullshot [name]          screenshot of the whole page
  click <target>           click (plain text tries button, link, tab, then any text)
  dblclick <target>        double-click (a fast double submit)
  fill <target> <text>     clear a field and type into it
  type <text>              type into whatever has focus
  press <key> [times]      e.g. Enter, Escape, ArrowDown; "press Enter 2" presses twice with no pause
                           (a real double submit). Tab and Shift+Tab print the new focus, no screenshot
  hover <target>           hover
  select <target> <value>  choose an <option>
  wait <text|ms>           wait for text to appear (30 s) or for some milliseconds
  scroll <down|up|top|bottom|target>
  goto <url> | back | forward | reload
  focus                    what has keyboard focus (role, name), for keyboard-only passes
  size <w>x<h>             resize the viewport (390x844 phone, 820x1180 tablet, 1440x900 desktop)
  zoom <percent>           browser zoom / large text, e.g. zoom 150 (zoom 100 to reset)
  theme <dark|light>       the device's colour-scheme preference (an in-app theme setting overrides it)
  offline <on|off>         cut or restore the network
  events                   every error and failed request since start
  eval <js>                run JavaScript in the page and print the result. Careful: apps that keep
                           earlier screens mounted (Expo Router, tabs) hold hidden copies of controls,
                           so document.querySelector can hit an invisible one
  dialogs <accept|dismiss> how to answer the next confirm()/alert()/prompt() dialogs (default accept).
                           Every dialog is printed as a DIALOG line; downloads are saved to the out folder
  stop                     close the browser`;

// ---------------------------------------------------------------- client

async function call(body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port: PORT, method: "POST", path: "/", headers: { "content-type": "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });
}

async function alive() {
  try {
    return (await call({ cmd: "ping" })).startsWith("pong");
  } catch {
    return false;
  }
}

async function client(argv) {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === "help" || cmd === "--help") return console.log(HELP);
  if (cmd === "start") {
    if (await alive()) return console.log(`A browser is already running on port ${PORT}. Run \`stop\` first.`);
    const opts = { url: null, out: "playtest-out", size: "390x844", dark: false };
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--out") opts.out = args[++i];
      else if (args[i] === "--size") opts.size = args[++i];
      else if (args[i] === "--dark") opts.dark = true;
      else opts.url = args[i];
    }
    opts.out = path.resolve(opts.out);
    fs.mkdirSync(opts.out, { recursive: true });
    const log = fs.openSync(path.join(opts.out, "driver.log"), "a");
    spawn(process.execPath, [__filename, "__serve", JSON.stringify(opts)], {
      detached: true,
      stdio: ["ignore", log, log],
    }).unref();
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (await alive()) {
        if (opts.url) return console.log(await call({ cmd: "goto", args: [opts.url] }));
        return console.log(`Browser ready. Screenshots go to ${opts.out}`);
      }
    }
    console.error(`The browser did not start. See ${path.join(opts.out, "driver.log")}`);
    process.exit(1);
  }
  if (!(await alive())) {
    console.error("No browser is running. Start one with: node drive.cjs start <url> --out <dir>");
    process.exit(1);
  }
  const out = await call({ cmd, args });
  console.log(out);
  if (cmd === "stop") {
    // Wait until the port is free, so an immediate \`start\` works.
    for (let i = 0; i < 50 && (await alive()); i++) await new Promise((r) => setTimeout(r, 100));
  }
  if (out.startsWith("ERROR")) process.exitCode = 2;
}

// ---------------------------------------------------------------- server

function loadPlaywright() {
  for (const name of ["playwright", "@playwright/test", "playwright-core"]) {
    try {
      return require(name);
    } catch {}
  }
  try {
    // A global install that Node's resolver doesn't see from this directory.
    const root = require("child_process").execSync("npm root -g").toString().trim();
    return require(path.join(root, "playwright"));
  } catch {}
  console.error("Playwright is not installed. Run: npm i -g playwright && npx playwright install chromium");
  process.exit(1);
}

async function serve(opts) {
  const { chromium } = loadPlaywright();
  const launch = {};
  if (process.env.PLAYTEST_CHROMIUM) launch.executablePath = process.env.PLAYTEST_CHROMIUM;
  const browser = await chromium.launch(launch);
  const [w, h] = opts.size.split("x").map(Number);
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    colorScheme: opts.dark ? "dark" : "light",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);

  const events = [];
  let reported = 0;
  // Continue numbering after earlier sessions in the same folder instead of overwriting them.
  let shots = Math.max(0, ...fs.readdirSync(opts.out).map((f) => parseInt(f, 10)).filter((n) => n > 0));
  let base = { width: w, height: h };
  let zoom = 100;
  const note = (kind, text) => events.push({ kind, text: String(text).slice(0, 400), url: page.url() });
  page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && note(`console.${m.type()}`, m.text()));
  page.on("pageerror", (e) => note("pageerror", e.message));
  page.on("requestfailed", (r) => note("requestfailed", `${r.method()} ${r.url()} ${r.failure()?.errorText ?? ""}`));
  page.on("response", (r) => r.status() >= 400 && note(`http ${r.status()}`, `${r.request().method()} ${r.url()}`));
  let dialogMode = "accept";
  const shown = []; // dialogs and downloads, printed prominently after the action that caused them
  page.on("dialog", (d) => {
    shown.push(`DIALOG (${d.type()}, ${dialogMode}ed): ${d.message()}`);
    (dialogMode === "accept" ? d.accept() : d.dismiss()).catch(() => {});
  });
  page.on("download", async (d) => {
    const file = path.join(opts.out, `download-${d.suggestedFilename()}`);
    await d.saveAs(file).catch(() => {});
    shown.push(`DOWNLOAD saved: ${file}`);
  });

  const journal = fs.createWriteStream(path.join(opts.out, "session.jsonl"), { flags: "a" });

  const fresh = () => {
    const list = events.slice(reported);
    reported = events.length;
    let out = shown.length ? "\n" + shown.splice(0).join("\n") : "";
    if (list.length) out += "\nNEW EVENTS:\n" + list.map((e) => `  [${e.kind}] ${e.text}`).join("\n");
    return out;
  };

  const settle = async () => {
    await page.waitForLoadState("networkidle", { timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(400); // animations and sheets
  };

  const shoot = async (name, fullPage = false) => {
    shots += 1;
    const safe = (name || "step").replace(/[^a-z0-9-]+/gi, "-").slice(0, 40);
    const file = path.join(opts.out, `${String(shots).padStart(3, "0")}-${safe}.png`);
    await page.screenshot({ path: file, fullPage });
    return file;
  };

  const looksLikeSelector = (t) => /^(css=|xpath=|text=|role=|internal:|#|\.|\/\/|\[)/.test(t) || /[>\[\]]/.test(t);

  const resolve = async (target) => {
    const visible = (l) => l.filter({ visible: true });
    let m;
    if ((m = target.match(/^label=(.+)$/))) return pick(visible(page.getByLabel(m[1])), target);
    if ((m = target.match(/^placeholder=(.+)$/))) return pick(visible(page.getByPlaceholder(m[1])), target);
    if ((m = target.match(/^testid=(.+)$/))) return pick(visible(page.getByTestId(m[1])), target);
    if (looksLikeSelector(target)) return pick(visible(page.locator(target)), target);
    // Plain words: what a person would call the thing they tap.
    const exact = { name: target, exact: true };
    for (const role of ["button", "link", "tab", "menuitem", "checkbox", "radio", "switch", "textbox"]) {
      const l = visible(page.getByRole(role, exact));
      if (await l.count()) return pick(l, target);
    }
    for (const l of [
      visible(page.getByRole("button", { name: target })),
      visible(page.getByRole("link", { name: target })),
      visible(page.getByLabel(target)),
      visible(page.getByText(target, { exact: true })),
      visible(page.getByText(target)),
    ]) {
      if (await l.count()) return pick(l, target);
    }
    throw new Error(`Nothing visible matches "${target}". Run \`look\` to see what is on screen.`);
  };

  const pick = async (locator, target) => {
    const n = await locator.count();
    if (!n) throw new Error(`Nothing visible matches "${target}". Run \`look\` to see what is on screen.`);
    const el = locator.first();
    // Say what was actually hit, so a partial-name match on the wrong control is visible at once.
    const hit = await el
      .evaluate((e) => {
        const role = e.getAttribute("role") || { A: "link", BUTTON: "button", INPUT: "textbox", TEXTAREA: "textbox", SELECT: "combobox" }[e.tagName] || e.tagName.toLowerCase();
        const name = (e.getAttribute("aria-label") || e.innerText || e.getAttribute("placeholder") || e.value || "").trim().replace(/\s+/g, " ").slice(0, 90);
        return { role, name };
      })
      .catch(() => ({ role: "?", name: "" }));
    let note = ` -> ${hit.role} "${hit.name}"`;
    if (hit.name && hit.name.toLowerCase() !== target.toLowerCase() && !looksLikeSelector(target) && !/^\w+=/.test(target))
      note += " (partial match: check it is the one you meant)";
    if (n > 1) note += ` (${n} matches; used the first)`;
    return { el, note };
  };

  // A person tapping a disabled control just sees nothing happen; say so instead of timing out.
  const enabled = async (el, target, note) => {
    if (await el.isDisabled().catch(() => false))
      throw new Error(`"${target}"${note} is disabled, so tapping it does nothing. Does the screen say why?`);
  };

  // One line describing what has keyboard focus (role, name, box, outline).
  const focused = () =>
    page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return "nothing (body)";
      const r = e.getBoundingClientRect();
      const raw = e.getAttribute("aria-label") || e.innerText || e.getAttribute("placeholder") || "";
      const name = raw.trim().replace(/\s+/g, " ").slice(0, 80);
      const role = e.getAttribute("role") || e.tagName.toLowerCase();
      const box = `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
      return `${role} "${name}" at ${box}; outline: ${getComputedStyle(e).outlineStyle}`;
    });

  const after = async (label, extra = "", shot = true) => {
    await settle();
    const file = shot ? `\nscreenshot: ${await shoot(label)}` : "";
    return `OK ${label}${extra}\nurl: ${page.url()}${file}${fresh()}`;
  };

  const commands = {
    ping: async () => "pong",
    goto: async ([url]) => {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      return after(`goto`, res ? ` (HTTP ${res.status()})` : "");
    },
    back: async () => (await page.goBack(), after("back")),
    forward: async () => (await page.goForward(), after("forward")),
    reload: async () => (await page.reload(), after("reload")),
    look: async () => {
      const tree = await page.locator("body").ariaSnapshot({ timeout: 8000 });
      const clipped = tree.length > 14000 ? tree.slice(0, 14000) + "\n… (clipped; scroll or use `text`)" : tree;
      return `url: ${page.url()}\ntitle: ${await page.title()}\n${clipped}${fresh()}`;
    },
    text: async () => {
      const t = await page.evaluate(() => document.body.innerText);
      return (t.length > 8000 ? t.slice(0, 8000) + "\n… (clipped)" : t) + fresh();
    },
    shot: async ([name]) => `screenshot: ${await shoot(name || "shot")}${fresh()}`,
    fullshot: async ([name]) => `screenshot: ${await shoot(name || "full", true)}${fresh()}`,
    click: async ([target]) => {
      const { el, note } = await resolve(target);
      await enabled(el, target, note);
      await el.click();
      return after(`click ${target}`, note);
    },
    dblclick: async ([target]) => {
      const { el, note } = await resolve(target);
      await enabled(el, target, note);
      await el.dblclick();
      return after(`dblclick ${target}`, note);
    },
    hover: async ([target]) => {
      const { el, note } = await resolve(target);
      await el.hover();
      return after(`hover ${target}`, note);
    },
    fill: async ([target, ...words]) => {
      const { el, note } = await resolve(target);
      await el.fill(words.join(" "));
      return after(`fill ${target}`, note);
    },
    type: async (words) => (await page.keyboard.type(words.join(" "), { delay: 15 }), after("type")),
    press: async ([key, times]) => {
      const n = Math.max(1, Math.min(20, Number(times) || 1));
      for (let i = 0; i < n; i++) await page.keyboard.press(key);
      if (/^(Shift\+)?Tab$/.test(key)) {
        await page.waitForTimeout(150);
        return `OK press ${key}${n > 1 ? ` x${n}` : ""}\nfocused: ${await focused()}${fresh()}`;
      }
      return after(`press ${key}${n > 1 ? ` x${n}` : ""}`);
    },
    dialogs: async ([mode]) => {
      dialogMode = mode === "dismiss" ? "dismiss" : "accept";
      return `Dialogs will be ${dialogMode}ed from now on.`;
    },
    select: async ([target, value]) => {
      const { el, note } = await resolve(target);
      await el.selectOption(value);
      return after(`select ${target}`, note);
    },
    wait: async ([what, ...rest]) => {
      if (/^\d+$/.test(what) && !rest.length) {
        await page.waitForTimeout(Number(what));
        return after(`wait ${what}ms`, "", false);
      }
      const text = [what, ...rest].join(" ");
      await page.getByText(text).filter({ visible: true }).first().waitFor({ timeout: 30000 });
      return after(`wait for "${text}"`);
    },
    scroll: async ([where]) => {
      if (where === "top" || where === "bottom") {
        await page.evaluate((to) => {
          const els = [document.scrollingElement, ...document.querySelectorAll("*")].filter(
            (e) => e && e.scrollHeight > e.clientHeight + 20 && getComputedStyle(e).overflowY !== "visible"
          );
          for (const e of els) e.scrollTop = to === "top" ? 0 : e.scrollHeight;
        }, where);
      } else if (where === "down" || where === "up" || !where) {
        const { width, height } = page.viewportSize();
        await page.mouse.move(width / 2, height / 2);
        await page.mouse.wheel(0, where === "up" ? -height * 0.7 : height * 0.7);
      } else {
        const { el } = await resolve(where);
        await el.scrollIntoViewIfNeeded();
      }
      return after(`scroll ${where || "down"}`);
    },
    focus: async () => `focused: ${await focused()}${fresh()}`,
    size: async ([wh]) => {
      const [nw, nh] = wh.split("x").map(Number);
      base = { width: nw, height: nh };
      await page.setViewportSize({ width: Math.round((nw * 100) / zoom), height: Math.round((nh * 100) / zoom) });
      return after(`size ${wh}`, zoom !== 100 ? ` at zoom ${zoom}%` : "");
    },
    zoom: async ([pct]) => {
      // Browser zoom shrinks the CSS viewport: a 390 px phone at 150% lays out like a 260 px one.
      zoom = Number(String(pct).replace("%", "")) || 100;
      const width = Math.round((base.width * 100) / zoom);
      const height = Math.round((base.height * 100) / zoom);
      await page.setViewportSize({ width, height });
      return after(`zoom ${zoom}`, ` (CSS viewport ${width}x${height} for a ${base.width}x${base.height} screen)`);
    },
    theme: async ([scheme]) => (await page.emulateMedia({ colorScheme: scheme }), after(`theme ${scheme}`)),
    offline: async ([state]) => (await context.setOffline(state === "on"), after(`offline ${state}`)),
    events: async () => {
      reported = events.length;
      if (!events.length) return "No errors or failed requests so far.";
      return events.map((e, i) => `${i + 1}. [${e.kind}] ${e.text}\n   on ${e.url}`).join("\n");
    },
    eval: async (code) => {
      const result = await page.evaluate(code.join(" "));
      return JSON.stringify(result, null, 2)?.slice(0, 6000) + fresh();
    },
    stop: async () => {
      setTimeout(async () => {
        await browser.close().catch(() => {});
        process.exit(0);
      }, 100);
      return `Browser closed. ${events.length} error(s)/failed request(s) logged in this session.`;
    },
  };

  http
    .createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        let out;
        const { cmd, args = [] } = JSON.parse(body || "{}");
        const fn = commands[cmd];
        try {
          out = fn ? await fn(args) : `ERROR unknown command "${cmd}".\n${HELP}`;
        } catch (e) {
          const file = await shoot(`error-${cmd}`).catch(() => null);
          out = `ERROR ${cmd} ${args.join(" ")}: ${e.message.split("\n")[0]}${file ? `\nscreenshot: ${file}` : ""}${fresh()}`;
        }
        if (cmd !== "ping") journal.write(JSON.stringify({ t: new Date().toISOString(), cmd, args, out: out.slice(0, 600) }) + "\n");
        res.end(out);
      });
    })
    .listen(PORT, "127.0.0.1");
}

if (process.argv[2] === "__serve") serve(JSON.parse(process.argv[3]));
else client(process.argv.slice(2));
