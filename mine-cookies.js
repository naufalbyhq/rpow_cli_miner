#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_COOKIE_FILE = path.join(__dirname, "..", "cookies.txt");
const DEFAULT_PROXY_FILE = path.join(__dirname, "..", "proxies.txt.webshare");
const DEFAULT_STATE_DIR = path.join(__dirname, "states");

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function readLines(file) {
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseWebshareProxy(line) {
  if (/^https?:\/\//i.test(line)) return line;
  const [host, port, username, password, ...extraParts] = line.split(":");
  if (!host || !port || !username || !password || extraParts.length > 0) return "";
  return `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function runWithLimit(items, limit, worker) {
  let nextIndex = 0;
  const results = [];
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      try {
        await worker(item);
        results.push({ item, ok: true });
      } catch (error) {
        results.push({ item, ok: false, error });
        console.error(`\n=== Cookie ${item} failed: ${error.message} ===`);
      }
    }
  });

  await Promise.all(workers);
  return results.sort((a, b) => a.item - b.item);
}

function numberArg(value, fallback, name) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${name} must be a positive integer.`);
  return number;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cookiesFile = path.resolve(args.cookies || DEFAULT_COOKIE_FILE);
  const proxiesFile = path.resolve(args.proxies || DEFAULT_PROXY_FILE);
  const stateDir = path.resolve(args["state-dir"] || DEFAULT_STATE_DIR);
  const start = numberArg(args.start, 1, "--start");
  const limit = args.limit ? numberArg(args.limit, undefined, "--limit") : null;
  const count = numberArg(args.count, 1, "--count");
  const parallel = numberArg(args.parallel, 1, "--parallel");
  const engine = args.engine || "gpu";
  const workers = args.workers;
  const logEveryMs = args["log-every-ms"] || "5000";

  if (!["gpu", "native", "node"].includes(engine)) {
    throw new Error("--engine must be gpu, native, or node.");
  }

  const cookies = readLines(cookiesFile);
  const proxies = readLines(proxiesFile).map(parseWebshareProxy).filter(Boolean);
  const end = limit ? Math.min(cookies.length, start + limit - 1) : cookies.length;

  if (cookies.length === 0) throw new Error(`No cookies found in ${cookiesFile}.`);
  if (start > cookies.length) throw new Error(`${cookiesFile} has ${cookies.length} cookie line(s); cannot start at ${start}.`);
  if (proxies.length < end) throw new Error(`${proxiesFile} has ${proxies.length} valid proxy/proxies, but cookie index ${end} needs a matching proxy.`);

  fs.mkdirSync(stateDir, { recursive: true });

  const work = [];

  for (let index = start; index <= end; index += 1) {
    work.push(index);
  }

  console.log(`Mining ${work.length} cookie(s) with parallel=${parallel}, count=${count}, engine=${engine}.`);

  const results = await runWithLimit(work, parallel, async (index) => {
    const stateFile = path.join(stateDir, `.rpow-cookie-${index}.json`);
    const proxy = proxies[index - 1];
    console.log(`\n=== Cookie ${index}/${end} | proxy ${index} | count ${count} | engine ${engine} ===`);

    await run(process.execPath, [
      path.join(__dirname, "import-cookie-state.js"),
      "--cookies", cookiesFile,
      "--index", String(index),
      "--out", stateFile,
    ]);

    await run(process.execPath, [
      path.join(__dirname, "rpow-cli.js"),
      "mine",
      "--count", String(count),
      "--engine", engine,
      "--state", stateFile,
      "--proxy", proxy,
      "--proxy-file", proxiesFile,
      "--proxy-index", String(index),
      "--log-every-ms", String(logEveryMs),
      ...(workers ? ["--workers", String(workers)] : []),
    ]);
  });

  const okCount = results.filter((result) => result.ok).length;
  const failCount = results.length - okCount;
  console.log(`\nDone. Success: ${okCount}. Failed: ${failCount}.`);
  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
