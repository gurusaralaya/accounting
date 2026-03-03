# 🍛 Gajanan Accounting

Full-stack restaurant accounting app with Firebase, GitHub Pages hosting, role-based access, 2FA, and English/Kannada language support.

---

## ✅ Features

- **Roles**: Admin (all tabs) · Manager (Daily Dashboard + Entries only)
- **2FA**: Email OTP on login (per-user toggle)
- **Language**: English / ಕನ್ನಡ toggle — all UI text switches
- **Real-time sync**: Firestore — works across any device, anywhere
- **Tabs (Admin)**: Summary · Daily Dashboard · Entries · Pigmy Savings · History · Users
- **Tabs (Manager)**: Daily Dashboard · Entries

---

## 🚀 Deployment — Step by Step

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. **Create project** → name it (e.g. `accounting`) → Continue
3. Enable **Google Analytics** if desired → Create project

### Step 2: Enable Firebase Authentication

1. Firebase Console → **Authentication** → Get started
2. **Sign-in method** tab → Enable **Email/Password** → Save

### Step 3: Create Firestore Database

1. Firebase Console → **Firestore Database** → Create database
2. Choose **Start in production mode** → Select region (e.g. `asia-south1`) → Done
3. Go to **Rules** tab → paste the contents of `firestore.rules` → Publish

### Step 4: Register Web App & Get Config

1. Firebase Console → Project Settings (⚙️) → **Your apps** → Add app → Web (</>) 
2. App nickname: `gajanan-web` → Register app
3. Copy the `firebaseConfig` values — you'll need all 6

### Step 5: Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all values from Step 4:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

VITE_SETUP_ADMIN_EMAIL=admin@yourdomain.com
VITE_SETUP_ADMIN_PASSWORD=ChooseAStrongPassword!
VITE_SETUP_ADMIN_NAME=Admin
```

### Step 6: Create First Admin User (One-Time Setup)

```bash
npm install
node scripts/setup-admin.mjs
```

This creates the admin account in Firebase Auth and the Firestore `users` doc with `role: admin`. After this, all future users are managed inside the app under the **Users** tab.

### Step 7: Push to GitHub

```bash
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/accounting.git
git push -u origin main
```

> ⚠️ Make sure your GitHub repo name matches the `base` in `vite.config.js`

### Step 8: Add GitHub Secrets

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → New repository secret

Add all 6 Firebase secrets (same values as `.env.local`, without `VITE_SETUP_` ones):

| Secret name | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | Your API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | your-project.firebaseapp.com |
| `VITE_FIREBASE_PROJECT_ID` | your-project-id |
| `VITE_FIREBASE_STORAGE_BUCKET` | your-project.appspot.com |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 123456789 |
| `VITE_FIREBASE_APP_ID` | 1:123456789:web:abc123 |

### Step 9: Enable GitHub Pages

GitHub repo → **Settings** → **Pages**
- Source: **Deploy from a branch**
- Branch: `gh-pages` / `/ (root)` → Save

### Step 10: Access Your App

After the GitHub Action completes (~2 min):

```
https://YOUR_USERNAME.github.io/accounting/
```

---

## 👥 Managing Users

Once logged in as admin:
1. Go to **Users** tab (👥)
2. Fill in Name, Email, Role, Initial Password → **Create User**
3. Share the app URL and credentials with the new user
4. They can change their password via the **Reset Password** email

### Enabling 2FA for a user
In the Users tab, click **2FA** button next to any user to toggle email OTP on/off.

---

## 🔐 Firestore Data Structure (lightweight)

```
entries/
  {date}_i_{category}   → { type, category, amount, date, by }
  {date}_e_{category}   → { type, category, amount, date, by }

pigmy/
  {date}_dep            → { date, type:'deposit', amount, note, by }
  wd_{timestamp}        → { date, type:'withdrawal', amount, note, by }

users/
  {uid}                 → { name, email, role, mfaEnabled, createdAt }
```

**Total Firestore reads per session**: ~50–200 (well within free Spark tier limits).

---

## 🛠 Local Development

```bash
npm install
npm run dev
```

App runs at http://localhost:5173/accounting/
