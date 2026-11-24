#!/usr/bin/env node
// build-laws-package.mjs: rebuild the open-data package for the plug-in solar law table.
//
//   node build-laws-package.mjs [--input <file>] [--out <dir>] [--release <tag>] [--notes <file>] [--check]
//
// Reads ONLY the site's public CSV (SOURCE_URL; --input <file> for local runs, refused in CI unless --check),
// validates it, and only if every check passes writes, inside --out, nothing but WRITES:
//   laws.csv      the same rows and columns, LF line endings, RFC 4180 quoting
//   laws.json     { ..., last_checked, row_count, columns, rows } (blank cells become null)
//   README.md, hf/README.md   only the <!-- marker --> values (description, dates, counts)
//   CHANGELOG.md  one data-version line, only with --release and only when rows changed
// Checks (gate #1228 condition 2): exactly EXPECTED_ROWS rows; the header matches COLUMNS; no
// blank state or status; known status values; valid ISO dates, checked_on not in the future;
// https links. Any failure exits 1 before a single file is written.
// Output is deterministic: an unchanged CSV gives byte-identical files.
// Exit codes: 0 ok; 1 a check failed; 2 usage. Node 20+, no dependencies.
// In the public repo it lives at scripts/ and runs with --out .
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_URL = 'https://sunderstand.com/plug-in-solar/legislation/laws.csv';
export const CANONICAL_URL = 'https://sunderstand.com/plug-in-solar/legislation';
// The one sync input. The script never fetches anything else (Dave, gate #1228 condition 4).
Object.freeze(SOURCE_URL);
// Files the build may write, relative to --out. Nothing else (no product, utility or quiz data).
export const WRITES = Object.freeze(['laws.csv', 'laws.json', 'README.md', 'hf/README.md', 'CHANGELOG.md']);
// Dave, gate #1228 condition 2: the table has exactly this many rows (50 states, DC, 5 territories).
// A different count stops the sync; change it here only with a reviewed PR.
export const EXPECTED_ROWS = 56;
export const TERRITORIES = Object.freeze(['American Samoa', 'Guam', 'Northern Mariana Islands', 'Puerto Rico', 'US Virgin Islands']);
export const DC = 'District of Columbia';
export const DISCLAIMER = 'Informational, not legal advice; verify with the source link.';

// Counts come from the data, never typed (gate #1228 condition 1).
export function counts(records) {
  const names = records.map((r) => r.state);
  const territories = names.filter((n) => TERRITORIES.includes(n)).length;
  const dc = names.filter((n) => n === DC).length;
  return { rows: records.length, states: records.length - territories - dc, dc, territories };
}

// The one-line description used everywhere (README, Kaggle, HF, listings). It names only what the
// file has: there is no size-limit column, and not every row has a bill, link or date.
export function description(records) {
  const c = counts(records);
  const where = [`all ${c.states} US states`, c.dc ? 'DC' : null, c.territories ? `${c.territories} territories` : null].filter(Boolean);
  const list = where.length > 1 ? `${where.slice(0, -1).join(', ')} and ${where[where.length - 1]}` : where[0];
  return `Plug-in (balcony) solar law status for ${list}: bill, status, start date, source link and date checked, where each exists.`;
}

// The column dictionary. The README, Kaggle and HF metadata repeat it; a new column or a new
// status on the site fails the build so the dictionary is updated before anything ships.
export const COLUMNS = [
  { name: 'state', type: 'string', required: true, description: 'State, District of Columbia or territory name.' },
  { name: 'bill', type: 'string', required: false, description: 'The bill or act number; blank where no bill exists or while the number is being confirmed.' },
  { name: 'status', type: 'string (enum)', required: true, description: 'Plain-English law status (see allowed values).' },
  { name: 'takes_effect', type: 'date (YYYY-MM-DD)', required: false, description: 'The date a signed law takes effect; blank if none.' },
  { name: 'source_link', type: 'URL', required: false, description: 'The government page that was read (statute, bill, legislature record or governor\'s announcement); blank where there is none.' },
  { name: 'source_page', type: 'URL', required: false, description: 'Sunderstand\'s page for that state; blank for the territories.' },
  { name: 'checked_on', type: 'date (YYYY-MM-DD)', required: false, description: 'The date the row was last checked; blank for the territories (not yet researched).' },
];

// Status values the site can publish, with the meaning the legislation page legend gives.
// "Signed, takes effect <Mon D, YYYY>" carries its own date, so it is a pattern.
export const STATUSES = [
  { value: 'Law in force', meaning: 'A law is in force.' },
  { value: 'Signed, takes effect <Mon D, YYYY>', pattern: /^Signed, takes effect [A-Z][a-z]{2} \d{1,2}, \d{4}$/, meaning: 'Signed into law, not yet in effect (the date is also in takes_effect).' },
  { value: 'Passed, awaiting governor', meaning: 'Passed, awaiting signature.' },
  { value: 'Law found, details being checked', meaning: 'We are checking what the law requires.' },
  { value: 'Bill in progress', meaning: 'A bill has been filed and has not passed.' },
  { value: 'Bill did not pass (may return)', meaning: 'A bill did not pass; it may return.' },
  { value: 'No law found', meaning: 'We have not found a plug-in solar law.' },
  { value: 'Not yet researched', meaning: "We have not looked into this territory's rules yet." },
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (s) => DATE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', i = 0, q = false;
  text = text.replace(/^﻿/, '');
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"' && field === '') { q = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && text[i + 1] === '\n') { i++; continue; }
    if (c === '\n' || c === '\r') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (q) throw new Error('unterminated quoted field');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

const cell = (v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (header, records) =>
  [header, ...records.map((r) => header.map((h) => r[h]))].map((r) => r.map(cell).join(',')).join('\n') + '\n';

export function validate(header, records, today = new Date().toISOString().slice(0, 10)) {
  const errors = [];
  const want = COLUMNS.map((c) => c.name);
  if (header.join(',') !== want.join(',')) errors.push(`columns are [${header}], expected [${want}]; update COLUMNS and the README dictionary first`);
  if (records.length !== EXPECTED_ROWS) errors.push(`${records.length} rows; expected exactly ${EXPECTED_ROWS}`);
  const seen = new Set();
  records.forEach((r, n) => {
    const at = `row ${n + 2} (${r.state || '?'})`;
    for (const c of COLUMNS) if (c.required && !r[c.name]) errors.push(`${at}: ${c.name} is blank`);
    if (seen.has(r.state)) errors.push(`${at}: duplicate state`);
    seen.add(r.state);
    if (r.status && !STATUSES.some((s) => (s.pattern ? s.pattern.test(r.status) : s.value === r.status))) errors.push(`${at}: unknown status "${r.status}"; add it to STATUSES and the README`);
    for (const d of ['takes_effect', 'checked_on']) if (r[d] && !isDate(r[d])) errors.push(`${at}: ${d} "${r[d]}" is not a valid YYYY-MM-DD date`);
    if (r.checked_on && isDate(r.checked_on) && r.checked_on > today) errors.push(`${at}: checked_on ${r.checked_on} is in the future`);
    for (const u of ['source_link', 'source_page']) if (r[u] && !/^https:\/\/[^\s]+$/.test(r[u])) errors.push(`${at}: ${u} is not an https URL`);
    if (r.source_page && !r.source_page.startsWith('https://sunderstand.com/')) errors.push(`${at}: source_page is not a sunderstand.com page`);
    if (/^Signed, takes effect/.test(r.status)) {
      if (!r.takes_effect) errors.push(`${at}: signed but takes_effect is blank`);
      else {
        const d = new Date(`${r.takes_effect}T00:00:00Z`);
        const said = `${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
        if (!r.status.endsWith(said)) errors.push(`${at}: status says "${r.status}" but takes_effect is ${r.takes_effect}`);
      }
    }
  });
  return errors;
}

export function buildJson(records) {
  const dates = records.map((r) => r.checked_on).filter(Boolean).sort();
  const last = dates[dates.length - 1] || null;
  return {
    name: 'US plug-in (balcony) solar laws by state',
    description: description(records),
    publisher: 'Sunderstand',
    canonical_url: CANONICAL_URL,
    source_csv: SOURCE_URL,
    license: 'CC-BY-4.0',
    last_checked: last,
    row_count: records.length,
    columns: COLUMNS.map(({ name, type, description }) => ({ name, type, description })),
    rows: records.map((r) => Object.fromEntries(COLUMNS.map((c) => [c.name, r[c.name] === '' ? null : r[c.name]]))),
    disclaimer: DISCLAIMER,
  };
}

// Replace the text between <!-- name --> and <!-- /name --> markers.
export function fillMarker(text, name, value) {
  const re = new RegExp(`(<!-- ${name} -->)[\\s\\S]*?(<!-- /${name} -->)`, 'g');
  return text.replace(re, `$1${value}$2`);
}

export function diffRows(prev, next) {
  const key = (r) => r.state;
  const a = new Map((prev || []).map((r) => [key(r), r]));
  const b = new Map(next.map((r) => [key(r), r]));
  const lines = [];
  for (const [k, r] of b) {
    const o = a.get(k);
    if (!o) { lines.push(`- Added ${k}: ${r.status}`); continue; }
    const ch = COLUMNS.map((c) => c.name).filter((c) => (o[c] ?? null) !== (r[c] ?? null));
    if (ch.length) lines.push(`- ${k}: ${ch.map((c) => `${c} ${JSON.stringify(o[c] ?? '')} → ${JSON.stringify(r[c] ?? '')}`).join('; ')}`);
  }
  for (const k of a.keys()) if (!b.has(k)) lines.push(`- Removed ${k}`);
  return lines;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const out = resolve(arg('--out') || join(here, '../plug-in-solar-laws'));
  const input = arg('--input');
  // In CI the only input is SOURCE_URL; --input is for local runs, tests and read-only --check.
  if (input && process.env.CI && !process.argv.includes('--check')) { console.error('--input is not allowed in CI; the sync reads only ' + SOURCE_URL); process.exit(2); }
  const release = arg('--release');
  const notesFile = arg('--notes');
  const checkOnly = process.argv.includes('--check');
  if (!existsSync(join(out, 'README.md'))) { console.error(`no README.md in ${out}; pass --out <package dir>`); process.exit(2); }

  let text;
  if (input) text = readFileSync(input, 'utf8');
  else {
    const res = await fetch(SOURCE_URL, { redirect: 'error', headers: { 'user-agent': 'sunderstand-open-data-sync' } });
    if (!res.ok) { console.error(`GET ${SOURCE_URL}: ${res.status}`); process.exit(1); }
    text = await res.text();
  }
  const [header, ...body] = parseCsv(text);
  const records = body.map((r) => {
    if (r.length !== header.length) throw new Error(`a row has ${r.length} fields, header has ${header.length}: ${r.join(',')}`);
    return Object.fromEntries(header.map((h, i) => [h, r[i].trim()]));
  });
  const errors = validate(header, records);
  if (errors.length) { console.error(`laws.csv failed ${errors.length} check(s):\n  ${errors.join('\n  ')}`); process.exit(1); }

  const json = buildJson(records);
  const csvOut = toCsv(header, records);
  const jsonOut = JSON.stringify(json, null, 2) + '\n';
  const jsonPath = join(out, 'laws.json');
  const prev = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, 'utf8')) : null;
  const changes = diffRows(prev?.rows, json.rows);
  const summary = `${json.row_count} rows, last checked ${json.last_checked}, ${changes.length} changed row(s)`;
  if (checkOnly) { console.log(`ok: ${summary}`); changes.forEach((l) => console.log(l)); return; }

  const write = (p, body) => {
    const rel = relative(out, p).split(sep).join('/');
    if (!WRITES.includes(rel)) throw new Error(`refusing to write ${rel}: not in WRITES`);
    writeFileSync(p, body);
  };
  write(join(out, 'laws.csv'), csvOut);
  write(jsonPath, jsonOut);
  for (const f of ['README.md', 'hf/README.md']) {
    const p = join(out, f);
    if (!existsSync(p)) continue;
    let t = readFileSync(p, 'utf8');
    t = fillMarker(t, 'last_checked', json.last_checked);
    t = fillMarker(t, 'row_count', String(json.row_count));
    t = fillMarker(t, 'description', description(records));
    t = fillMarker(t, 'source_link_rows', String(records.filter((r) => r.source_link).length));
    write(p, t);
  }
  if (release && changes.length && prev) {
    // Data-version lines only (gate #1228 condition 3): date and rows changed, no prose.
    const cl = join(out, 'CHANGELOG.md');
    const line = `- ${release}: ${changes.length} row(s) changed; data last checked ${json.last_checked}; ${json.row_count} rows\n`;
    write(cl, readFileSync(cl, 'utf8').replace(/\n*$/, '\n') + line);
    if (notesFile) writeFileSync(notesFile, line);
  }
  console.log(`wrote ${out}: ${summary}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
