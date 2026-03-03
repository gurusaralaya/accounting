#!/usr/bin/env node
/**
 * setup-admin.mjs  — First-time admin bootstrap
 *
 * This script bypasses Firestore security rules by using the
 * Firebase REST API with the project's Web API key directly.
 * This is safe for setup only — the script is never deployed.
 *
 * Usage:  node scripts/setup-admin.mjs
 */

import { readFileSync } from 'fs'
import { resolve }      from 'path'

// ── 1. Load .env.local ───────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
let envVars = {}

try {
  const raw = readFileSync(envPath, 'utf8')
  raw.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) return
    const k = trimmed.slice(0, eqIdx).trim()
    const v = trimmed.slice(eqIdx + 1).trim()
    envVars[k] = v
  })
  console.log('✅  Loaded .env.local')
} catch {
  console.error('\n❌  Cannot read .env.local')
  console.error('   Run:  cp .env.example .env.local  then fill in your Firebase values.\n')
  process.exit(1)
}

// ── 2. Validate env vars ─────────────────────────────────────────────────────
const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_SETUP_ADMIN_EMAIL',
  'VITE_SETUP_ADMIN_PASSWORD',
]

let missingVars = false
required.forEach(k => {
  if (!envVars[k] || envVars[k].includes('your_') || envVars[k].includes('...')) {
    console.error('❌  Missing or unfilled: ' + k)
    missingVars = true
  }
})
if (missingVars) {
  console.error('\n   Open .env.local and fill in all the Firebase values from your Firebase Console.\n')
  process.exit(1)
}

const API_KEY    = envVars.VITE_FIREBASE_API_KEY
const PROJECT_ID = envVars.VITE_FIREBASE_PROJECT_ID
const EMAIL      = envVars.VITE_SETUP_ADMIN_EMAIL
const PASSWORD   = envVars.VITE_SETUP_ADMIN_PASSWORD
const NAME       = envVars.VITE_SETUP_ADMIN_NAME || 'Admin'

const AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1'
const FS_BASE   = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents'

console.log('\n Bootstrapping admin: ' + EMAIL)
console.log('    Project:            ' + PROJECT_ID + '\n')

// ── 3. Helpers ───────────────────────────────────────────────────────────────
async function authPost(endpoint, body) {
  const url = AUTH_BASE + '/' + endpoint + '?key=' + API_KEY
  const res  = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data)
    throw Object.assign(new Error(msg), { status: res.status, data })
  }
  return data
}

async function firestoreWrite(idToken, uid, fields) {
  const mask = 'name,email,role,mfaEnabled,createdAt'
    .split(',').map(f => 'updateMask.fieldPaths=' + f).join('&')
  const url = FS_BASE + '/users/' + uid + '?' + mask
  const res  = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + idToken,
    },
    body: JSON.stringify({ fields }),
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

// ── 4. Main ──────────────────────────────────────────────────────────────────
async function main() {

  // Step A: Create or sign in
  let uid, idToken

  console.log('Step 1/3 — Creating / verifying Firebase Auth account...')
  try {
    const res = await authPost('accounts:signUp', {
      email: EMAIL, password: PASSWORD, returnSecureToken: true,
    })
    uid     = res.localId
    idToken = res.idToken
    console.log('✅  Auth account created  (UID: ' + uid + ')')
  } catch (err) {
    if (err.message === 'EMAIL_EXISTS') {
      console.log('   Account already exists — signing in...')
      try {
        const res = await authPost('accounts:signInWithPassword', {
          email: EMAIL, password: PASSWORD, returnSecureToken: true,
        })
        uid     = res.localId
        idToken = res.idToken
        console.log('✅  Signed in  (UID: ' + uid + ')')
      } catch (signInErr) {
        console.error('\n❌  Sign-in failed: ' + signInErr.message)
        if (signInErr.message === 'INVALID_PASSWORD') {
          console.error('   The password in .env.local does not match the existing account.')
          console.error('   Fix: update VITE_SETUP_ADMIN_PASSWORD, or reset in Firebase Console.')
        }
        process.exit(1)
      }
    } else if (err.message?.includes('WEAK_PASSWORD')) {
      console.error('\n❌  Password too weak — Firebase requires at least 6 characters.')
      console.error('   Update VITE_SETUP_ADMIN_PASSWORD in .env.local\n')
      process.exit(1)
    } else if (err.message?.includes('INVALID_API_KEY') || err.status === 400) {
      console.error('\n❌  Invalid API key — check VITE_FIREBASE_API_KEY in .env.local\n')
      process.exit(1)
    } else {
      console.error('\n❌  Auth error: ' + err.message)
      process.exit(1)
    }
  }

  // Step B: Write Firestore doc
  console.log('\nStep 2/3 — Writing admin role to Firestore...')

  const fields = {
    name:       { stringValue: NAME },
    email:      { stringValue: EMAIL },
    role:       { stringValue: 'admin' },
    mfaEnabled: { booleanValue: false },
    createdAt:  { stringValue: new Date().toISOString() },
  }

  const { ok, status, data } = await firestoreWrite(idToken, uid, fields)

  if (ok) {
    console.log('✅  Firestore doc written — role: admin')
  } else {
    const errCode = data?.error?.status  || 'UNKNOWN'
    const errMsg  = data?.error?.message || JSON.stringify(data)

    console.error('\n❌  Firestore write failed  [' + status + ' ' + errCode + ']')
    console.error('    ' + errMsg)

    if (errCode === 'PERMISSION_DENIED') {
      console.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHY: The security rules block writes unless there is already
     an admin — but this is the very first run, so none exist.

FIX — Temporarily open the rules, run the script, then restore:

  1. Firebase Console → Firestore Database → Rules tab
  2. Replace everything with this TEMPORARY rule:

       rules_version = '2';
       service cloud.firestore {
         match /databases/{database}/documents {
           match /{document=**} {
             allow read, write: if request.auth != null;
           }
         }
       }

  3. Click Publish
  4. Run this script again:  node scripts/setup-admin.mjs
  5. After success, RESTORE the original rules from firestore.rules
     and click Publish again

  UID to use if you prefer to add the doc manually instead:
  ${uid}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    } else if (errCode === 'NOT_FOUND') {
      console.error('\nFIX: Firestore database does not exist yet.')
      console.error('  Firebase Console → Firestore Database → Create database')
      console.error('  Then paste firestore.rules into Rules tab → Publish')
      console.error('  Then run this script again.')
    }
    process.exit(1)
  }

  // Step C: Verify
  console.log('\nStep 3/3 — Verifying...')
  const vr = await fetch(FS_BASE + '/users/' + uid, {
    headers: { 'Authorization': 'Bearer ' + idToken },
  })
  if (vr.ok) {
    const doc  = await vr.json()
    const role = doc?.fields?.role?.stringValue
    if (role === 'admin') {
      console.log('✅  Confirmed — Firestore shows role: "admin"')
    } else {
      console.warn('⚠️   Document saved but role = "' + role + '" — expected "admin"')
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Setup complete!

    Email:    ${EMAIL}
    Password: ${PASSWORD}
    Role:     admin
    UID:      ${uid}

⚠️  Change your password after first login!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message)
  process.exit(1)
})
