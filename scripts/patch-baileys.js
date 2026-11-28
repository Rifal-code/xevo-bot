'use strict';

// Idempotent patch for @whiskeysockets/baileys@6.7.24 so that 8-character
// pairing-code linking works against current WhatsApp servers.
// See: plan_solusi_permanen_pairing_whatsapp.md (Phase 4 artifact plan)
//
// Usage:
//   node scripts/patch-baileys.js          (apply, idempotent)
//   node scripts/patch-baileys.js --check  (verify only, exit 1 if missing)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BAILEYS_PKG = path.join(ROOT, 'node_modules', '@whiskeysockets', 'baileys', 'package.json');
const LIB = path.join(ROOT, 'node_modules', '@whiskeysockets', 'baileys', 'lib');

function fail(msg) {
  console.error('❌ patch-baileys: ' + msg);
  process.exit(1);
}
function ok(msg) {
  console.log('✅ patch-baileys: ' + msg);
}

if (!fs.existsSync(BAILEYS_PKG)) {
  fail('Baileys is not installed. Run `npm install` first.');
}

const pkg = JSON.parse(fs.readFileSync(BAILEYS_PKG, 'utf8'));
if (pkg.version !== '6.7.24') {
  fail('Expected @whiskeysockets/baileys@6.7.24, found ' + pkg.version + '. ' +
       'Review and update this script before changing the Baileys version.');
}

const checkMode = process.argv.includes('--check');

const patches = [
  {
    name: 'nonce: Buffer.alloc(1) (socket.js)',
    file: path.join(LIB, 'Socket', 'socket.js'),
    from: "                            content: '0'\n",
    to: "                            content: Buffer.alloc(1)\n",
    already: "                            content: Buffer.alloc(1)\n",
  },
  {
    name: 'validateConnection: registration path when pairingCode && !registered (socket.js)',
    file: path.join(LIB, 'Socket', 'socket.js'),
    from: "        if (!creds.me) {\n",
    to: "        if (!creds.me || (!!creds.pairingCode && !creds.registered)) {\n",
    already: "        if (!creds.me || (!!creds.pairingCode && !creds.registered)) {\n",
  },
  {
    name: 'stage check on link_code_companion_reg (messages-recv.js)',
    file: path.join(LIB, 'Socket', 'messages-recv.js'),
    from: "                const linkCodeCompanionReg = getBinaryNodeChild(node, 'link_code_companion_reg');\n                const ref = toRequiredBuffer(getBinaryNodeChildBuffer(linkCodeCompanionReg, 'link_code_pairing_ref'));\n",
    to: "                const linkCodeCompanionReg = getBinaryNodeChild(node, 'link_code_companion_reg');\n                if (linkCodeCompanionReg?.attrs?.stage !== 'primary_hello')\n                    break;\n                const ref = toRequiredBuffer(getBinaryNodeChildBuffer(linkCodeCompanionReg, 'link_code_pairing_ref'));\n",
    already: "                if (linkCodeCompanionReg?.attrs?.stage !== 'primary_hello')\n",
  },
  {
    name: 'configureSuccessfulPairing: registered=true (validate-connection.js)',
    file: path.join(LIB, 'Utils', 'validate-connection.js'),
    from: "        platform: platformNode?.attrs.name\n",
    to: "        platform: platformNode?.attrs.name,\n        registered: true\n",
    already: "        platform: platformNode?.attrs.name,\n        registered: true\n",
  },
];

let applied = 0;
let skipped = 0;

for (const p of patches) {
  if (!fs.existsSync(p.file)) {
    fail('File not found: ' + p.file);
  }
  const src = fs.readFileSync(p.file, 'utf8');

  if (src.includes(p.already)) {
    skipped++;
    console.log('  ↳ ' + p.name + ' — already applied');
    continue;
  }

  if (!src.includes(p.from)) {
    fail('Pattern not found for "' + p.name + '" in ' + p.file +
         '. The installed Baileys may differ from 6.7.24; aborting.');
  }

  if (checkMode) {
    fail('Patch NOT applied: "' + p.name + '". Run without --check to apply.');
  }

  const next = src.replace(p.from, p.to);
  fs.writeFileSync(p.file, next, 'utf8');
  applied++;
  console.log('  ↳ ' + p.name + ' — applied');
}

if (checkMode) {
  ok('all ' + patches.length + ' patches verified as applied.');
} else {
  ok(applied + ' applied, ' + skipped + ' already applied (' + patches.length + ' total).');
}
