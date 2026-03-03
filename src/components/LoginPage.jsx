import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  multiFactor,
  getMultiFactorResolver,
} from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const EN_FONT = "'Nunito', sans-serif"
const KN_FONT = "'Noto Sans Kannada', 'Nunito', sans-serif"

const T = {
  en: {
    title: 'Gajanan Accounting',
    sub: 'Daily Accounting System',
    emailLabel: 'Email Address',
    passLabel: 'Password',
    emailPh: 'you@example.com',
    passPh: '••••••••',
    signIn: 'Sign In',
    signingIn: 'Signing in…',
    mfaTitle: 'Two-Factor Verification',
    mfaSub: 'Enter the 6-digit code sent to your email',
    codePh: '000000',
    verify: 'Verify',
    verifying: 'Verifying…',
    resend: 'Resend code',
    contact: 'Contact your admin to create or reset your account.',
    lang: 'Language',
    wrongCode: 'Invalid code. Please try again.',
    codeExpired: 'Code expired. Please resend.',
    invalidCreds: 'Invalid email or password.',
  },
  kn: {
    title: 'ಗಜಾನನ ರೆಸ್ಟೋರೆಂಟ್',
    sub: 'ದೈನಂದಿನ ಲೆಕ್ಕಪತ್ರ ವ್ಯವಸ್ಥೆ',
    emailLabel: 'ಇಮೇಲ್ ವಿಳಾಸ',
    passLabel: 'ಪಾಸ್‌ವರ್ಡ್',
    emailPh: 'you@example.com',
    passPh: '••••••••',
    signIn: 'ಸೈನ್ ಇನ್',
    signingIn: 'ಸೈನ್ ಇನ್ ಆಗುತ್ತಿದೆ…',
    mfaTitle: 'ಎರಡು-ಅಂಶ ಪರಿಶೀಲನೆ',
    mfaSub: 'ನಿಮ್ಮ ಇಮೇಲ್‌ಗೆ ಕಳುಹಿಸಿದ 6-ಅಂಕಿಯ ಕೋಡ್ ನಮೂದಿಸಿ',
    codePh: '000000',
    verify: 'ಪರಿಶೀಲಿಸಿ',
    verifying: 'ಪರಿಶೀಲಿಸುತ್ತಿದೆ…',
    resend: 'ಕೋಡ್ ಮರುಕಳಿಸಿ',
    contact: 'ಖಾತೆ ರಚಿಸಲು ಅಡ್ಮಿನ್ ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    lang: 'ಭಾಷೆ',
    wrongCode: 'ತಪ್ಪಾದ ಕೋಡ್. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    codeExpired: 'ಕೋಡ್ ಮುಕ್ತಾಯವಾಗಿದೆ. ಮರುಕಳಿಸಿ.',
    invalidCreds: 'ತಪ್ಪಾದ ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್.',
  }
}

// Simple 6-digit OTP stored in Firestore for email-based 2FA
async function sendOTP(uid, userEmail) {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiry = Date.now() + 10 * 60 * 1000 // 10 min
  await updateDoc(doc(db, 'users', uid), { otp: code, otpExpiry: expiry })

  // Use Firebase email (send via a Cloud Function is ideal, but we'll use
  // the built-in email verification trigger workaround: store OTP and show it)
  // For production: replace this with a Cloud Function that emails the OTP.
  // For now: the OTP is shown on screen (dev mode) OR emailed via EmailJS.
  return code
}

async function verifyOTP(uid, enteredCode) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return false
  const { otp, otpExpiry } = snap.data()
  if (Date.now() > otpExpiry) return 'expired'
  return otp === enteredCode
}

function inp(font) {
  return {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: '12px 14px',
    color: '#f3f4f6',
    fontSize: 15,
    fontFamily: font,
    outline: 'none',
    boxSizing: 'border-box',
  }
}

export default function LoginPage() {
  const [lang, setLang]         = useState('en')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // MFA state
  const [mfaStep, setMfaStep]   = useState(false)
  const [otp, setOtp]           = useState('')
  const [pendingUid, setPendingUid] = useState(null)
  const [devOtp, setDevOtp]     = useState(null) // shown in dev when no email service

  const t    = T[lang]
  const font = lang === 'kn' ? KN_FONT : EN_FONT

  const label = {
    fontSize: 12, color: '#9ca3af', display: 'block',
    marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const uid  = cred.user.uid
      const snap = await getDoc(doc(db, 'users', uid))
      const profile = snap.data() || {}

      if (profile.mfaEnabled) {
        // Sign user out temporarily — they must complete OTP first
        await auth.signOut()
        const code = await sendOTP(uid, email)
        setPendingUid(uid)
        setDevOtp(code) // Remove this line when you have a real email service
        setMfaStep(true)
      }
      // If mfaEnabled is false, onAuthStateChanged in useAuth will pick up the login
    } catch (err) {
      setError(t.invalidCreds)
    }
    setLoading(false)
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await verifyOTP(pendingUid, otp.trim())
    if (result === 'expired') {
      setError(t.codeExpired)
    } else if (!result) {
      setError(t.wrongCode)
    } else {
      // OTP correct — sign back in
      // We stored password in component state for this re-auth
      try {
        await signInWithEmailAndPassword(auth, email, password)
        // Clear OTP from Firestore
        await updateDoc(doc(db, 'users', pendingUid), { otp: null, otpExpiry: null })
      } catch {
        setError(t.invalidCreds)
      }
    }
    setLoading(false)
  }

  const handleResend = async () => {
    if (!pendingUid) return
    const code = await sendOTP(pendingUid, email)
    setDevOtp(code)
    setError('')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: font, padding: 16,
      backgroundImage: 'radial-gradient(ellipse at 10% 0%, rgba(251,146,60,0.06) 0%, transparent 55%)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Lang switcher */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <select value={lang} onChange={e => setLang(e.target.value)} style={{
            background: '#1e2d3d', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, padding: '6px 10px', color: '#f1f5f9', fontSize: 13,
            fontFamily: font, outline: 'none', cursor: 'pointer',
          }}>
            <option value="en" style={{ background: '#1e2d3d' }}>🇬🇧 English</option>
            <option value="kn" style={{ background: '#1e2d3d' }}>🇮🇳 ಕನ್ನಡ</option>
          </select>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20, padding: '40px 36px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, margin: '0 auto 14px',
              background: 'linear-gradient(135deg,#fb923c,#f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
            }}>🍛</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f9fafb', margin: 0 }}>{t.title}</h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>{t.sub}</p>
          </div>

          {!mfaStep ? (
            /* ── Login form ── */
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={label}>{t.emailLabel}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={t.emailPh} required style={inp(font)} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={label}>{t.passLabel}</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={t.passPh} required style={inp(font)} />
              </div>
              {error && <ErrorBox msg={error} />}
              <PrimaryBtn loading={loading} label={t.signIn} loadingLabel={t.signingIn} font={font} />
            </form>
          ) : (
            /* ── OTP form ── */
            <form onSubmit={handleVerifyOTP}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#f9fafb', marginBottom: 8 }}>{t.mfaTitle}</h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>{t.mfaSub}</p>

              {/* Dev mode: show OTP in a hint box */}
              {devOtp && (
                <div style={{
                  background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  fontSize: 13, color: '#fb923c',
                }}>
                  🔐 Dev mode — OTP: <strong style={{ fontSize: 18, letterSpacing: 3 }}>{devOtp}</strong>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    Remove the <code>setDevOtp</code> line in LoginPage.jsx when you add an email service.
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label style={label}>Verification Code</label>
                <input type="text" inputMode="numeric" maxLength={6}
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.codePh} required style={{ ...inp(font), textAlign: 'center', fontSize: 22, letterSpacing: 6 }} />
              </div>
              {error && <ErrorBox msg={error} />}
              <PrimaryBtn loading={loading} label={t.verify} loadingLabel={t.verifying} font={font} />
              <button type="button" onClick={handleResend} style={{
                width: '100%', background: 'none', border: 'none',
                color: '#6b7280', fontSize: 13, cursor: 'pointer', marginTop: 12,
                fontFamily: font, textDecoration: 'underline',
              }}>{t.resend}</button>
            </form>
          )}

          <p style={{ textAlign: 'center', fontSize: 12, color: '#4b5563', marginTop: 24, lineHeight: 1.6 }}>
            {t.contact}
          </p>
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
      borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#f87171',
    }}>{msg}</div>
  )
}

function PrimaryBtn({ loading, label, loadingLabel, font }) {
  return (
    <button type="submit" disabled={loading} style={{
      width: '100%',
      background: loading ? '#374151' : 'linear-gradient(135deg,#fb923c,#f59e0b)',
      border: 'none', borderRadius: 10, color: '#fff', padding: 13,
      cursor: loading ? 'not-allowed' : 'pointer',
      fontFamily: font, fontWeight: 800, fontSize: 15,
      boxShadow: loading ? 'none' : '0 4px 14px rgba(251,146,60,0.3)',
      transition: 'all 0.2s',
    }}>
      {loading ? loadingLabel : label}
    </button>
  )
}
