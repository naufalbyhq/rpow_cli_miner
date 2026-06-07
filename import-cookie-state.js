#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_COOKIE_FILE = path.join(__dirname, "..", "cookies.txt");
const DEFAULT_OUT = path.join(__dirname, ".rpow-cookie-1.json");

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

function readCookieLines(file) {
  const content = fs.readFileSync(file, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseCookieHeader(cookieHeader) {
  const cookies = {};
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (name && value) cookies[name] = value;
  }
  return cookies;
}

function decodeSessionEmail(session) {
  if (!session) return null;
  const payload = session.split(".")[0];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
    return typeof decoded.email === "string" ? decoded.email : null;
  } catch {
    return null;
  }
}

function writeState({ cookieLine, cookieIndex, outFile }) {
  const cookies = parseCookieHeader(cookieLine);
  if (!cookies.rpow_session) {
    throw new Error(`Cookie line ${cookieIndex} does not include rpow_session.`);
  }

  const state = {
    cookies,
    email: decodeSessionEmail(cookies.rpow_session) || undefined,
    imported_from: "../cookies.txt",
    cookie_index: cookieIndex,
    imported_at: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cookieFile = path.resolve(args.cookies || DEFAULT_COOKIE_FILE);
  const cookieIndex = Number(args.index || args._[0] || 1);
  const outFile = path.resolve(args.out || DEFAULT_OUT);

  if (!Number.isInteger(cookieIndex) || cookieIndex < 1) {
    throw new Error("--index must be a positive integer using 1-based cookie line numbering.");
  }

  const cookieLines = readCookieLines(cookieFile);
  const cookieLine = cookieLines[cookieIndex - 1];

  if (!cookieLine) {
    throw new Error(`${cookieFile} has ${cookieLines.length} cookie line(s); cannot use index ${cookieIndex}.`);
  }

  const state = writeState({ cookieLine, cookieIndex, outFile });
  console.log(`Wrote ${outFile}`);
  console.log(`Cookie index: ${cookieIndex}`);
  if (state.email) console.log(`Email: ${state.email}`);
  console.log("Next: node rpow-cli.js me --state \"<state-file>\"");
}

main();
