/* eslint-disable */
/**
 * Fills the Google Play "Data safety" CSV export with Perzent's answers so it can be imported
 * back (Play Console → App content → Data safety → Import from CSV).
 *
 *   node scripts/fill-data-safety.js <export.csv> <out.csv>
 *
 * The export lists every question/response row with an empty "Response value" column; we set
 * "true" on the rows that apply and "false" on the yes/no questions that must be answered.
 * Keep this in sync with play-store/LISTING.md §4 and the privacy policy.
 */
const fs = require('fs');

const [, , input, output] = process.argv;
if (!input || !output) { console.error('usage: node fill-data-safety.js <export.csv> <out.csv>'); process.exit(1); }

const DELETION_URL = 'https://perzent.jspcoders.app/account-deletion';

const APP = 'PSL_APP_FUNCTIONALITY', FRAUD = 'PSL_FRAUD_PREVENTION_SECURITY', ACCOUNT = 'PSL_ACCOUNT_MANAGEMENT';

/** Data types Perzent collects. shared=true means visible to the employee's employer inside Perzent. */
const TYPES = {
  PSL_APPROX_LOCATION:        { shared: true,  collect: [APP],            share: [APP] },
  PSL_PRECISE_LOCATION:       { shared: true,  collect: [APP, FRAUD],     share: [APP, FRAUD] },
  PSL_NAME:                   { shared: true,  collect: [APP, ACCOUNT],   share: [APP] },
  PSL_PHONE:                  { shared: false, collect: [ACCOUNT] },
  PSL_EMAIL:                  { shared: false, collect: [ACCOUNT] },
  PSL_USER_GENERATED_CONTENT: { shared: true,  collect: [APP],            share: [APP] },   // check-in/out, breaks
  PSL_PERFORMANCE_DIAGNOSTICS:{ shared: true,  collect: [APP, FRAUD],     share: [APP, FRAUD] }, // battery, GPS state, mock flag
  PSL_DEVICE_ID:              { shared: false, collect: [FRAUD] },        // one-phone binding
};

/** Top-level answers keyed by "questionId|responseId" (responseId may be empty). */
const TOP = {
  'PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA|': 'true',
  'PSL_DATA_COLLECTION_ENCRYPTED_IN_TRANSIT|': 'true',
  'PSL_SUPPORTED_ACCOUNT_CREATION_METHODS|PSL_ACM_NONE': 'true',
  'PSL_SUPPORT_DATA_DELETION_BY_USER|DATA_DELETION_YES': 'true',
  'PSL_DATA_DELETION_URL|': DELETION_URL,
  'PSL_INDEPENDENTLY_VALIDATED|': 'false',
};

// Minimal CSV parser/serialiser (fields may be quoted and contain commas/quotes/newlines).
function parse(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const esc = (v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const rows = parse(fs.readFileSync(input, 'utf8').replace(/^﻿/, ''));
const header = rows[0];
let set = 0;
const filled = [];
for (const r of rows.slice(1)) {
  const [qid, rid] = r;
  let value = null;
  const top = TOP[`${qid}|${rid}`];
  if (top !== undefined) value = top;
  // Data-type checkboxes
  if (qid.startsWith('PSL_DATA_TYPES_') && TYPES[rid]) value = 'true';
  // Per-type usage answers
  const m = qid.match(/^PSL_DATA_USAGE_RESPONSES:(PSL_[A-Z_]+):([A-Z_]+)$/);
  if (m && TYPES[m[1]]) {
    const t = TYPES[m[1]], part = m[2];
    if (part === 'PSL_DATA_USAGE_COLLECTION_AND_SHARING') value = rid === 'PSL_DATA_USAGE_ONLY_COLLECTED' ? 'true' : t.shared ? 'true' : 'false';
    else if (part === 'PSL_DATA_USAGE_EPHEMERAL') value = 'false';
    else if (part === 'DATA_USAGE_USER_CONTROL') value = rid === 'PSL_DATA_USAGE_USER_CONTROL_REQUIRED' ? 'true' : 'false';
    else if (part === 'DATA_USAGE_COLLECTION_PURPOSE') value = t.collect.includes(rid) ? 'true' : 'false';
    else if (part === 'DATA_USAGE_SHARING_PURPOSE') value = t.shared ? (t.share.includes(rid) ? 'true' : 'false') : '';
  }
  if (value !== null) { r[2] = value; set++; if (value && value !== 'false') filled.push(`${r[4]}  =>  ${value}`); }
}
fs.writeFileSync(output, rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n');
console.log(`rows answered: ${set}; positive answers: ${filled.length}`);
console.log(filled.join('\n'));
