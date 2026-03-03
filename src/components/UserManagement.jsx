import { useState, useEffect } from 'react'
import {
  collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from '../firebase/config'

const EN_FONT = "'Nunito', sans-serif"
const KN_FONT = "'Noto Sans Kannada', 'Nunito', sans-serif"

const TU = {
  en: {
    title: 'User Management',
    sub: 'Create accounts, assign roles, manage 2FA',
    createTitle: '➕ Create New User',
    nameLabel: 'Full Name', emailLabel: 'Email', roleLabel: 'Role',
    passLabel: 'Initial Password', createBtn: 'Create User', creating: 'Creating…',
    adminRole: 'Admin', managerRole: 'Manager',
    permTitle: 'Role Permissions',
    adminPerms: ['Summary Dashboard','Daily Dashboard','Entries','Pigmy Savings','History','User Management'],
    managerPerms: ['Daily Dashboard','Entries (today only)'],
    managerDenied: ['Summary','Pigmy Savings','History','User Management'],
    usersTitle: 'All Users',
    colName: 'Name', colEmail: 'Email', colRole: 'Role', colMfa: '2FA', colActions: 'Actions',
    editRole: '✏️ Role', resetPass: '🔑 Reset', deleteLbl: '🗑',
    cancel: 'Cancel', you: 'YOU', current: 'Current session',
    mfaOn: '✅ On', mfaOff: '⬜ Off',
    toggleMfa: 'Toggle 2FA',
    resetSent: (e) => `✅ Password reset sent to ${e}`,
    deleteConfirm: 'Delete this user? This cannot be undone.',
    userCreated: '✅ User created',
    roleUpdated: '✅ Role updated',
    userDeleted: '🗑 User removed',
    mfaToggled: (s) => `✅ 2FA ${s ? 'enabled' : 'disabled'}`,
    namePh: 'e.g. Ramesh Patil',
  },
  kn: {
    title: 'ಬಳಕೆದಾರ ನಿರ್ವಹಣೆ',
    sub: 'ಖಾತೆ ರಚಿಸಿ, ಪಾತ್ರ ನಿಗದಿ ಮಾಡಿ, 2FA ನಿರ್ವಹಿಸಿ',
    createTitle: '➕ ಹೊಸ ಬಳಕೆದಾರ ರಚಿಸಿ',
    nameLabel: 'ಪೂರ್ಣ ಹೆಸರು', emailLabel: 'ಇಮೇಲ್', roleLabel: 'ಪಾತ್ರ',
    passLabel: 'ಆರಂಭಿಕ ಪಾಸ್‌ವರ್ಡ್', createBtn: 'ಬಳಕೆದಾರ ರಚಿಸಿ', creating: 'ರಚಿಸಲಾಗುತ್ತಿದೆ…',
    adminRole: 'ಅಡ್ಮಿನ್', managerRole: 'ಮ್ಯಾನೇಜರ್',
    permTitle: 'ಪಾತ್ರ ಅನುಮತಿಗಳು',
    adminPerms: ['ಸಾರಾಂಶ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್','ದೈನಂದಿನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್','ನಮೂದುಗಳು','ಪಿಗ್ಮಿ ಉಳಿತಾಯ','ಇತಿಹಾಸ','ಬಳಕೆದಾರ ನಿರ್ವಹಣೆ'],
    managerPerms: ['ದೈನಂದಿನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್','ನಮೂದುಗಳು (ಇಂದಷ್ಟೇ)'],
    managerDenied: ['ಸಾರಾಂಶ','ಪಿಗ್ಮಿ ಉಳಿತಾಯ','ಇತಿಹಾಸ','ಬಳಕೆದಾರ ನಿರ್ವಹಣೆ'],
    usersTitle: 'ಎಲ್ಲ ಬಳಕೆದಾರರು',
    colName: 'ಹೆಸರು', colEmail: 'ಇಮೇಲ್', colRole: 'ಪಾತ್ರ', colMfa: '2FA', colActions: 'ಕ್ರಿಯೆಗಳು',
    editRole: '✏️ ಪಾತ್ರ', resetPass: '🔑 ರೀಸೆಟ್', deleteLbl: '🗑',
    cancel: 'ರದ್ದು', you: 'ನೀವು', current: 'ಪ್ರಸ್ತುತ ಸೆಶನ್',
    mfaOn: '✅ ಆನ್', mfaOff: '⬜ ಆಫ್',
    toggleMfa: '2FA ಬದಲಿಸಿ',
    resetSent: (e) => `✅ ರೀಸೆಟ್ ಇಮೇಲ್ ಕಳಿಸಲಾಗಿದೆ: ${e}`,
    deleteConfirm: 'ಈ ಬಳಕೆದಾರನನ್ನು ಅಳಿಸಲೇ? ಇದನ್ನು ರದ್ದು ಮಾಡಲಾಗದು.',
    userCreated: '✅ ಬಳಕೆದಾರ ರಚಿಸಲಾಗಿದೆ',
    roleUpdated: '✅ ಪಾತ್ರ ನವೀಕರಿಸಲಾಗಿದೆ',
    userDeleted: '🗑 ಬಳಕೆದಾರ ತೆಗೆದುಹಾಕಲಾಗಿದೆ',
    mfaToggled: (s) => `✅ 2FA ${s ? 'ಸಕ್ರಿಯ' : 'ನಿಷ್ಕ್ರಿಯ'}`,
    namePh: 'ಉದಾ: ರಮೇಶ್ ಪಾಟೀಲ್',
  }
}

const card = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14, padding: '20px 24px', marginBottom: 20,
}

export default function UserManagement({ currentUser, lang }) {
  const t    = TU[lang] || TU.en
  const font = lang === 'kn' ? KN_FONT : EN_FONT

  const inp = {
    background: '#1e2d3d', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 14,
    fontFamily: font, outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const sel = { ...inp, cursor: 'pointer' }
  const btnBase = {
    border: 'none', borderRadius: 8, cursor: 'pointer',
    fontFamily: font, fontWeight: 700, fontSize: 12, padding: '5px 10px',
  }

  const [users, setUsers]             = useState([])
  const [dbLoading, setDbLoading]     = useState(true)
  const [form, setForm]               = useState({ name: '', email: '', role: 'manager', password: '' })
  const [formErr, setFormErr]         = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [editingUid, setEditingUid]   = useState(null)
  const [notification, setNotification] = useState('')

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3500) }

  const fetchUsers = async () => {
    setDbLoading(true)
    const snap = await getDocs(collection(db, 'users'))
    setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
    setDbLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const createUser = async (e) => {
    e.preventDefault()
    setFormErr('')
    setFormLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: form.name, email: form.email, role: form.role,
        mfaEnabled: false, createdAt: new Date().toISOString(), createdBy: currentUser.uid,
      })
      setForm({ name: '', email: '', role: 'manager', password: '' })
      notify(t.userCreated)
      fetchUsers()
    } catch (err) {
      setFormErr(err.message.replace('Firebase: ', '').replace(/\(.*\)/, '').trim())
    }
    setFormLoading(false)
  }

  const updateRole = async (uid, role) => {
    await updateDoc(doc(db, 'users', uid), { role })
    setUsers(p => p.map(u => u.uid === uid ? { ...u, role } : u))
    setEditingUid(null)
    notify(t.roleUpdated)
  }

  const toggleMfa = async (uid, current) => {
    const next = !current
    await updateDoc(doc(db, 'users', uid), { mfaEnabled: next })
    setUsers(p => p.map(u => u.uid === uid ? { ...u, mfaEnabled: next } : u))
    notify(t.mfaToggled(next))
  }

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email)
    notify(t.resetSent(email))
  }

  const deleteUser = async (uid) => {
    if (!window.confirm(t.deleteConfirm)) return
    await deleteDoc(doc(db, 'users', uid))
    setUsers(p => p.filter(u => u.uid !== uid))
    notify(t.userDeleted)
  }

  const roleColor = { admin: '#fb923c', manager: '#38bdf8' }
  const roleLabel = { admin: t.adminRole, manager: t.managerRole }

  return (
    <div style={{ fontFamily: font }}>
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#1e2530', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600,
          color: '#f3f4f6', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>{notification}</div>
      )}

      <h2 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 20, color: '#f9fafb' }}>{t.title}</h2>
      <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 13 }}>{t.sub}</p>

      {/* Create user form */}
      <div style={card}>
        <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: '#fb923c' }}>{t.createTitle}</h3>
        <form onSubmit={createUser}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px 150px auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase' }}>{t.nameLabel}</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t.namePh} required style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase' }}>{t.emailLabel}</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com" required style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase' }}>{t.roleLabel}</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={sel}>
                <option value="manager" style={{ background: '#1e2d3d' }}>{t.managerRole}</option>
                <option value="admin"   style={{ background: '#1e2d3d' }}>{t.adminRole}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase' }}>{t.passLabel}</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="min 6 chars" required minLength={6} style={inp} />
            </div>
            <button type="submit" disabled={formLoading} style={{
              background: formLoading ? '#374151' : 'linear-gradient(135deg,#fb923c,#f59e0b)',
              border: 'none', borderRadius: 8, color: '#fff', padding: '9px 16px',
              cursor: formLoading ? 'not-allowed' : 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
            }}>
              {formLoading ? t.creating : t.createBtn}
            </button>
          </div>
          {formErr && (
            <div style={{ marginTop: 12, padding: '8px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>
              {formErr}
            </div>
          )}
        </form>
      </div>

      {/* Permissions reference */}
      <div style={{ ...card, borderLeft: '4px solid #6b7280' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#9ca3af' }}>{t.permTitle}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { roleKey: 'admin', label: `👑 ${t.adminRole}`, color: '#fb923c', perms: t.adminPerms, denied: [] },
            { roleKey: 'manager', label: `👤 ${t.managerRole}`, color: '#38bdf8', perms: t.managerPerms, denied: t.managerDenied },
          ].map(r => (
            <div key={r.roleKey} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px 16px', border: `1px solid ${r.color}22` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: r.color, marginBottom: 10 }}>{r.label}</div>
              {r.perms.map(p  => <div key={p}  style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 6, marginBottom: 5 }}><span style={{ color: '#34d399' }}>✓</span>{p}</div>)}
              {r.denied.map(p => <div key={p}  style={{ fontSize: 12, color: '#4b5563', display: 'flex', gap: 6, marginBottom: 5 }}><span style={{ color: '#f87171' }}>✗</span>{p}</div>)}
            </div>
          ))}
        </div>
      </div>

      {/* Users list */}
      <div style={card}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#f3f4f6' }}>
          {t.usersTitle} {!dbLoading && <span style={{ color: '#6b7280', fontWeight: 400, fontSize: 13 }}>({users.length})</span>}
        </h3>
        {dbLoading ? (
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading…</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px 70px 200px', padding: '8px 12px', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 4 }}>
              <span>{t.colName}</span><span>{t.colEmail}</span><span>{t.colRole}</span><span>{t.colMfa}</span><span>{t.colActions}</span>
            </div>
            {users.map(u => (
              <div key={u.uid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px 70px 200px', padding: '11px 12px', alignItems: 'center', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)', background: u.uid === currentUser.uid ? 'rgba(251,146,60,0.04)' : 'none', borderRadius: 8 }}>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                  {u.name || '—'}
                  {u.uid === currentUser.uid && <span style={{ fontSize: 10, color: '#fb923c', marginLeft: 6, fontWeight: 700 }}>{t.you}</span>}
                </span>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>{u.email}</span>
                <span>
                  {editingUid === u.uid ? (
                    <select defaultValue={u.role} onChange={e => updateRole(u.uid, e.target.value)}
                      style={{ ...sel, width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                      <option value="manager" style={{ background: '#1e2d3d' }}>{t.managerRole}</option>
                      <option value="admin"   style={{ background: '#1e2d3d' }}>{t.adminRole}</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${roleColor[u.role]}18`, color: roleColor[u.role], border: `1px solid ${roleColor[u.role]}40` }}>
                      {roleLabel[u.role] || u.role}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 12, color: u.mfaEnabled ? '#34d399' : '#4b5563' }}>
                  {u.mfaEnabled ? t.mfaOn : t.mfaOff}
                </span>
                {u.uid === currentUser.uid ? (
                  <span style={{ fontSize: 12, color: '#4b5563', fontStyle: 'italic' }}>{t.current}</span>
                ) : (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <button onClick={() => setEditingUid(editingUid === u.uid ? null : u.uid)}
                      style={{ ...btnBase, background: 'rgba(255,255,255,0.07)', color: '#e2e8f0' }}>
                      {editingUid === u.uid ? t.cancel : t.editRole}
                    </button>
                    <button onClick={() => toggleMfa(u.uid, u.mfaEnabled)}
                      style={{ ...btnBase, background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
                      2FA
                    </button>
                    <button onClick={() => resetPassword(u.email)}
                      style={{ ...btnBase, background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                      {t.resetPass}
                    </button>
                    <button onClick={() => deleteUser(u.uid)}
                      style={{ ...btnBase, background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
                      {t.deleteLbl}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
