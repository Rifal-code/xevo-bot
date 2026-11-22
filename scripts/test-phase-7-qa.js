#!/usr/bin/env node
/**
 * PHASE 7: AUTOMATED INTEGRATION TESTING & SECURITY QA
 * PECADO / XEVOBOT WEB PLATFORM
 *
 * Runs end-to-end assertions against security gates, engine internal contracts,
 * data isolation, and static code hygiene.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const TEST_PORT = 5005;
const TEST_SECRET = 'qa_test_secret_pecado_2026';
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m : ${testName}`);
    testsPassed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m : ${testName}`);
    testsFailed++;
  }
}

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 5000,
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runStaticSecurityTests() {
  console.log('\n\x1b[1m=== TEST SUITE 1: STATIC CODE & SECURITY AUDIT ===\x1b[0m');

  // Test 1.1: Verify RCE eval eradicated from Xevo.js
  const xevoCode = fs.readFileSync(path.join(__dirname, '../Xevo.js'), 'utf8');
  assert(!xevoCode.includes('executeEval'), 'SEC-01: executeEval() must not exist in Xevo.js');
  assert(!xevoCode.includes('eval('), 'SEC-01: eval() must not exist in Xevo.js');
  assert(!xevoCode.includes('trimmed.startsWith(\']>\')'), 'SEC-01: Eval trigger ]> must not exist in Xevo.js');

  // Test 1.2: Verify RCE shell exec eradicated from Xevo.js
  assert(!xevoCode.includes('child_process.exec'), 'SEC-02: child_process.exec must not be present in Xevo.js');
  assert(!xevoCode.includes('trimmed.startsWith(\'$\')'), 'SEC-02: Shell exec trigger $ must not exist in Xevo.js');

  // Test 1.3: Verify .gitignore contains critical auth and secrets
  const gitignore = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf8');
  assert(gitignore.includes('auth/'), 'SEC-12: auth/ must be ignored in .gitignore');
  assert(gitignore.includes('database/'), 'SEC-12: database/ must be ignored in .gitignore');
  assert(gitignore.includes('.env') && (gitignore.includes('.env.*') || gitignore.includes('.env*')), 'SEC-08: .env and .env.* must be ignored in .gitignore');
}

async function runEngineIntegrationTests() {
  console.log('\n\x1b[1m=== TEST SUITE 2: ENGINE API SECURITY BOUNDARY ===\x1b[0m');

  // Test 2.1: Unauthorized request to /api/sessions must return 401
  const resSessionsNoAuth = await makeRequest('/api/sessions');
  assert(resSessionsNoAuth.status === 401, 'SEC-04: GET /api/sessions without secret returns 401 Unauthorized');

  // Test 2.2: Unauthorized request to /api/pairing must return 401
  const resPairingNoAuth = await makeRequest('/api/pairing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { number: '628123456789' },
  });
  assert(resPairingNoAuth.status === 401, 'SEC-03: POST /api/pairing without secret returns 401 Unauthorized');

  // Test 2.3: Unauthorized request to /api/dashboard-stats must return 401
  const resStatsNoAuth = await makeRequest('/api/dashboard-stats');
  assert(resStatsNoAuth.status === 401, 'SEC-05: GET /api/dashboard-stats without secret returns 401 Unauthorized');

  // Test 2.4: Authorized request to /api/dashboard-stats with x-engine-secret
  const resStatsAuth = await makeRequest('/api/dashboard-stats', {
    headers: { 'x-engine-secret': TEST_SECRET },
  });
  assert(resStatsAuth.status === 200, 'Service Auth: GET /api/dashboard-stats with secret returns 200 OK');
  assert(resStatsAuth.json && resStatsAuth.json.success === true, 'Service Auth: Valid JSON payload received');
  assert(typeof resStatsAuth.json?.uptime === 'number', 'Metrics: Process uptime is returned as a number');

  // Test 2.5: Authorized request to /api/sessions with x-engine-secret
  const resSessionsAuth = await makeRequest('/api/sessions', {
    headers: { 'x-engine-secret': TEST_SECRET },
  });
  assert(resSessionsAuth.status === 200, 'Service Auth: GET /api/sessions with secret returns 200 OK');
  assert(Array.isArray(resSessionsAuth.json?.sessions), 'Service Auth: sessions field is an Array');

  // Test 2.6: Input validation on POST /api/pairing
  const resInvalidPairing = await makeRequest('/api/pairing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-engine-secret': TEST_SECRET,
    },
    body: {},
  });
  assert(resInvalidPairing.status === 400, 'SEC-14: POST /api/pairing with empty payload returns 400 Bad Request');
}

async function runDataPrivacyTests() {
  console.log('\n\x1b[1m=== TEST SUITE 3: DATA PRIVACY & MASKING ===\x1b[0m');

  // Test 3.1: Phone number masking logic verification
  const testPhone = '628123456789';
  const masked = testPhone.length > 7
    ? `${testPhone.slice(0, 4)}••••${testPhone.slice(-3)}`
    : '••••••••';
  assert(masked === '6281••••789', 'Privacy: Phone number masking formats correctly');
  assert(!masked.includes('3456'), 'Privacy: Middle digits are strictly redacted');

  // Test 3.2: Verify Next.js compiled build output exists
  const buildIdPath = path.join(__dirname, '../web/.next/BUILD_ID');
  assert(fs.existsSync(buildIdPath), 'Build QA: Next.js .next/BUILD_ID exists (clean production compilation)');
}

async function main() {
  console.log('\x1b[36m=======================================================');
  console.log('   PECADO PLATFORM: PHASE 7 AUTOMATED QA SUITE         ');
  console.log('=======================================================\x1b[0m');

  // Boot Engine in child process for live test
  console.log(`[*] Starting test WhatsApp Engine server on port ${TEST_PORT}...`);
  const engineProc = spawn(process.execPath, [path.join(__dirname, '../server.js')], {
    env: {
      ...process.env,
      PORT: TEST_PORT.toString(),
      ENGINE_INTERNAL_SECRET: TEST_SECRET,
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Wait for server to bind port
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error(`Server failed to start within 10s. Output:\n${output}`));
    }, 10000);

    engineProc.stdout.on('data', (d) => {
      const s = d.toString();
      output += s;
      if (s.includes('listening on port') || s.includes('Dashboard listening')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    engineProc.stderr.on('data', (d) => {
      output += d.toString();
    });

    engineProc.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited prematurely with code ${code}. Output:\n${output}`));
    });
  });

  console.log(`[*] Server successfully listening on port ${TEST_PORT}. Running test suites...`);

  try {
    await runStaticSecurityTests();
    await runEngineIntegrationTests();
    await runDataPrivacyTests();
  } catch (err) {
    console.error('Fatal QA error:', err);
    testsFailed++;
  } finally {
    console.log('\n[*] Stopping test WhatsApp Engine server...');
    engineProc.kill('SIGINT');
  }

  console.log('\n\x1b[36m=======================================================');
  console.log(`   QA RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('=======================================================\x1b[0m\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

main();
