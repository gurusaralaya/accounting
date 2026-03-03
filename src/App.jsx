import { useState, useEffect, useMemo } from 'react'
import { signOut } from 'firebase/auth'
import {
  collection, doc, setDoc, deleteDoc, updateDoc,
  onSnapshot, query, orderBy,
} from 'firebase/firestore'
import { auth, db } from './firebase/config'
import { useAuth } from './hooks/useAuth'
import LoginPage from './components/LoginPage'
import UserManagement from './components/UserManagement'

// ─── FONTS ───────────────────────────────────────────────────
const EN_FONT = "'Nunito', sans-serif"
const KN_FONT = "'Noto Sans Kannada', 'Nunito', sans-serif"

// ─── TRANSLATIONS ────────────────────────────────────────────
const T = {
  en: {
    appName: 'Gajanan Accounting', appSub: 'Daily Accounting System',
    langLabel: 'Language', date: 'Date', signOut: 'Sign Out',
    tabSummary: '📊 Summary', tabDaily: '📅 Daily Dashboard',
    tabEntries: '✏️ Entries', tabPigmy: '🐷 Pigmy Savings',
    tabHistory: '📜 History', tabUsers: '👥 Users',
    today: 'Today', thisMonth: 'This Month', thisYear: 'This Year',
    revenue: 'Revenue', expenses: 'Expenses', pigmySaved: 'Pigmy Saved',
    netCash: 'Net Cash', cashMargin: 'Cash Margin',
    summaryTitle: 'Performance Summary', summarySubtitle: 'Daily · Monthly · Yearly at a glance',
    pigmyTotalDeposited: 'Pigmy — Total Deposited', pigmyTotalWithdrawn: 'Pigmy — Total Withdrawn',
    pigmyAvailableBalance: 'Pigmy — Available Balance',
    totalRevenueYear: 'Total Revenue (Year)', totalExpensesYear: 'Total Expenses (Year)', netCashYear: 'Net Cash (Year)',
    topExpensesMonth: 'Top Expenses — This Month', noExpenseData: 'No expense data this month yet.',
    dailyTitle: 'Daily Dashboard', entries: 'entries',
    netCashMargin: 'Net Cash Margin', incomeBreakdown: 'Income Breakdown', expenseBreakdown: 'Expense Breakdown',
    dailyEntries: 'Daily Entries', saveAllEntries: '💾 Save All Entries',
    income: 'INCOME', expense: 'EXPENSES',
    totalIncome: 'Total Income:', totalExpenses: 'Total Expenses:',
    pigmyDepositLabel: "PIGMY SAVINGS — Today's Deposit", pigmyBalance: 'Current Pigmy Balance:',
    previewNetCash: 'Preview Net Cash', previewFormula: 'Revenue − (Expenses + Pigmy Saved)',
    customEntryTitle: '+ Add Custom Entry',
    typeLabel: 'Type', categoryLabel: 'Category', descriptionLabel: 'Description', amountLabel: 'Amount (₹)',
    descriptionPlaceholder: 'Optional note...', incomeOption: 'Income', expenseOption: 'Expense',
    pigmyTitle: '🐷 Pigmy Savings', pigmySub: 'Separate savings pool — deposit daily, withdraw anytime',
    totalDeposited: 'Total Deposited', totalWithdrawn: 'Total Withdrawn', availableBalance: 'Available Balance',
    withdrawTitle: 'Withdraw — Apply Against Expense', withdrawAmountLabel: 'Amount (₹)',
    withdrawNoteLabel: 'Purpose / Note', withdrawNotePlaceholder: 'e.g. Used for Gas expense, Salary...',
    withdrawBtn: 'Withdraw ₹', pigmyAvailable: 'Available:', ledgerTitle: 'Transaction Ledger',
    deposit: 'DEPOSIT', withdrawal: 'WITHDRAWAL',
    noTransactions: 'No transactions yet. Add daily deposits via the Entries tab.', bal: 'bal:',
    historyTitle: 'History', historySubtitle: 'days recorded · Click any amount to edit inline',
    noHistoryEntries: 'No entries yet. Start with the Entries tab.',
    historyEditHint: '💡 Click any underlined amount to edit · Enter or ✓ to save',
    noEntries: 'No entries.', revenueLabel: 'Revenue:', expensesLabel: 'Expenses:',
    pigmyLabel: 'Pigmy:', netCashLabel: 'Net Cash:',
    entriesSaved: '✅ Entries saved for', entryRemoved: '🗑 Entry removed',
    entryUpdated: '✅ Entry updated', entryAdded: '✅ Entry added',
    transactionRemoved: '🗑 Transaction removed',
    withdrawSuccess: '✅ Withdrew from Pigmy savings', withdrawError: '❌ Insufficient Pigmy balance!',
    saving: 'Saving…', adminBadge: '👑 Admin', managerBadge: '👤 Manager',
    loading: 'Loading data…',
    'Cash Collection': 'Cash Collection', 'Paytm Collection': 'Paytm Collection',
    'Milk': 'Milk', 'Daily Market': 'Daily Market', 'Oil': 'Oil',
    'Khanda/Batata': 'Khanda/Batata', 'Gas': 'Gas', 'Khava': 'Khava',
    'Drinks': 'Drinks', 'Lassi': 'Lassi', 'Plastic': 'Plastic',
    'Daily Kirani': 'Daily Kirani', 'Bread': 'Bread', 'Salary': 'Salary',
    'Rent': 'Rent', 'Hotel Electricity': 'Hotel Electricity',
    'Internet': 'Internet', 'Home Electricity': 'Home Electricity',
  },
  kn: {
    appName: 'ಗಜಾನನ ರೆಸ್ಟೋರೆಂಟ್', appSub: 'ದೈನಂದಿನ ಲೆಕ್ಕಪತ್ರ ವ್ಯವಸ್ಥೆ',
    langLabel: 'ಭಾಷೆ', date: 'ದಿನಾಂಕ', signOut: 'ಸೈನ್ ಔಟ್',
    tabSummary: '📊 ಸಾರಾಂಶ', tabDaily: '📅 ದೈನಂದಿನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    tabEntries: '✏️ ನಮೂದುಗಳು', tabPigmy: '🐷 ಪಿಗ್ಮಿ ಉಳಿತಾಯ',
    tabHistory: '📜 ಇತಿಹಾಸ', tabUsers: '👥 ಬಳಕೆದಾರರು',
    today: 'ಇಂದು', thisMonth: 'ಈ ತಿಂಗಳು', thisYear: 'ಈ ವರ್ಷ',
    revenue: 'ಆದಾಯ', expenses: 'ವೆಚ್ಚ', pigmySaved: 'ಪಿಗ್ಮಿ ಉಳಿತಾಯ',
    netCash: 'ನಿವ್ವಳ ನಗದು', cashMargin: 'ನಗದು ಮಾರ್ಜಿನ್',
    summaryTitle: 'ಕಾರ್ಯಕ್ಷಮತೆ ಸಾರಾಂಶ', summarySubtitle: 'ದೈನಂದಿನ · ಮಾಸಿಕ · ವಾರ್ಷಿಕ ನೋಟ',
    pigmyTotalDeposited: 'ಪಿಗ್ಮಿ — ಒಟ್ಟು ಠೇವಣಿ', pigmyTotalWithdrawn: 'ಪಿಗ್ಮಿ — ಒಟ್ಟು ಹಿಂಪಡೆತ',
    pigmyAvailableBalance: 'ಪಿಗ್ಮಿ — ಲಭ್ಯ ಶಿಲ್ಕು',
    totalRevenueYear: 'ಒಟ್ಟು ಆದಾಯ (ವರ್ಷ)', totalExpensesYear: 'ಒಟ್ಟು ವೆಚ್ಚ (ವರ್ಷ)', netCashYear: 'ನಿವ್ವಳ ನಗದು (ವರ್ಷ)',
    topExpensesMonth: 'ಈ ತಿಂಗಳ ಪ್ರಮುಖ ವೆಚ್ಚಗಳು', noExpenseData: 'ಈ ತಿಂಗಳು ಇನ್ನೂ ವೆಚ್ಚದ ಮಾಹಿತಿ ಇಲ್ಲ.',
    dailyTitle: 'ದೈನಂದಿನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', entries: 'ನಮೂದುಗಳು',
    netCashMargin: 'ನಿವ್ವಳ ನಗದು ಮಾರ್ಜಿನ್', incomeBreakdown: 'ಆದಾಯ ವಿವರ', expenseBreakdown: 'ವೆಚ್ಚ ವಿವರ',
    dailyEntries: 'ದೈನಂದಿನ ನಮೂದುಗಳು', saveAllEntries: '💾 ಎಲ್ಲ ನಮೂದುಗಳನ್ನು ಉಳಿಸಿ',
    income: 'ಆದಾಯ', expense: 'ವೆಚ್ಚ',
    totalIncome: 'ಒಟ್ಟು ಆದಾಯ:', totalExpenses: 'ಒಟ್ಟು ವೆಚ್ಚ:',
    pigmyDepositLabel: 'ಪಿಗ್ಮಿ ಉಳಿತಾಯ — ಇಂದಿನ ಠೇವಣಿ', pigmyBalance: 'ಪ್ರಸ್ತುತ ಪಿಗ್ಮಿ ಶಿಲ್ಕು:',
    previewNetCash: 'ಅಂದಾಜು ನಿವ್ವಳ ನಗದು', previewFormula: 'ಆದಾಯ − (ವೆಚ್ಚ + ಪಿಗ್ಮಿ ಉಳಿತಾಯ)',
    customEntryTitle: '+ ಹೊಸ ನಮೂದು ಸೇರಿಸಿ',
    typeLabel: 'ವಿಧ', categoryLabel: 'ವರ್ಗ', descriptionLabel: 'ವಿವರಣೆ', amountLabel: 'ಮೊತ್ತ (₹)',
    descriptionPlaceholder: 'ಐಚ್ಛಿಕ ಟಿಪ್ಪಣಿ...', incomeOption: 'ಆದಾಯ', expenseOption: 'ವೆಚ್ಚ',
    pigmyTitle: '🐷 ಪಿಗ್ಮಿ ಉಳಿತಾಯ', pigmySub: 'ಪ್ರತ್ಯೇಕ ಉಳಿತಾಯ — ದಿನನಿತ್ಯ ಠೇವಣಿ ಮಾಡಿ, ಅಗತ್ಯವಿದ್ದಾಗ ತೆಗೆದುಕೊಳ್ಳಿ',
    totalDeposited: 'ಒಟ್ಟು ಠೇವಣಿ', totalWithdrawn: 'ಒಟ್ಟು ಹಿಂಪಡೆತ', availableBalance: 'ಲಭ್ಯ ಶಿಲ್ಕು',
    withdrawTitle: 'ಹಿಂಪಡೆತ — ವೆಚ್ಚಕ್ಕೆ ಬಳಸಿ', withdrawAmountLabel: 'ಮೊತ್ತ (₹)',
    withdrawNoteLabel: 'ಉದ್ದೇಶ / ಟಿಪ್ಪಣಿ', withdrawNotePlaceholder: 'ಉದಾ: ಗ್ಯಾಸ್ ವೆಚ್ಚಕ್ಕೆ, ಸಂಬಳಕ್ಕೆ...',
    withdrawBtn: 'ಹಿಂಪಡೆ ₹', pigmyAvailable: 'ಲಭ್ಯ:', ledgerTitle: 'ವಹಿವಾಟು ದಾಖಲೆ',
    deposit: 'ಠೇವಣಿ', withdrawal: 'ಹಿಂಪಡೆತ',
    noTransactions: 'ಇನ್ನೂ ವಹಿವಾಟುಗಳಿಲ್ಲ. ನಮೂದು ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಠೇವಣಿ ಸೇರಿಸಿ.', bal: 'ಶಿಲ್ಕು:',
    historyTitle: 'ಇತಿಹಾಸ', historySubtitle: 'ದಿನಗಳ ದಾಖಲೆ · ಯಾವುದೇ ಮೊತ್ತ ಕ್ಲಿಕ್ ಮಾಡಿ ಸಂಪಾದಿಸಿ',
    noHistoryEntries: 'ಇನ್ನೂ ನಮೂದುಗಳಿಲ್ಲ. ನಮೂದು ಟ್ಯಾಬ್‌ನಿಂದ ಪ್ರಾರಂಭಿಸಿ.',
    historyEditHint: '💡 ಮೊತ್ತದ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ ಸಂಪಾದಿಸಿ · Enter ಅಥವಾ ✓ ಒತ್ತಿ ಉಳಿಸಿ',
    noEntries: 'ನಮೂದುಗಳಿಲ್ಲ.', revenueLabel: 'ಆದಾಯ:', expensesLabel: 'ವೆಚ್ಚ:',
    pigmyLabel: 'ಪಿಗ್ಮಿ:', netCashLabel: 'ನಿವ್ವಳ ನಗದು:',
    entriesSaved: '✅ ನಮೂದುಗಳನ್ನು ಉಳಿಸಲಾಗಿದೆ', entryRemoved: '🗑 ನಮೂದು ತೆಗೆದುಹಾಕಲಾಗಿದೆ',
    entryUpdated: '✅ ನಮೂದು ನವೀಕರಿಸಲಾಗಿದೆ', entryAdded: '✅ ನಮೂದು ಸೇರಿಸಲಾಗಿದೆ',
    transactionRemoved: '🗑 ವಹಿವಾಟು ತೆಗೆದುಹಾಕಲಾಗಿದೆ',
    withdrawSuccess: '✅ ಪಿಗ್ಮಿ ಉಳಿತಾಯದಿಂದ ಹಿಂಪಡೆದಿದೆ', withdrawError: '❌ ಪಿಗ್ಮಿ ಶಿಲ್ಕು ಸಾಕಾಗುವುದಿಲ್ಲ!',
    saving: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ…', adminBadge: '👑 ಅಡ್ಮಿನ್', managerBadge: '👤 ಮ್ಯಾನೇಜರ್',
    loading: 'ಮಾಹಿತಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
    'Cash Collection': 'ನಗದು ಸಂಗ್ರಹ', 'Paytm Collection': 'ಪೇಟಿಎಂ ಸಂಗ್ರಹ',
    'Milk': 'ಹಾಲು', 'Daily Market': 'ದಿನದ ಮಾರುಕಟ್ಟೆ', 'Oil': 'ಎಣ್ಣೆ',
    'Khanda/Batata': 'ಖಂಡ/ಬಟಾಟ', 'Gas': 'ಗ್ಯಾಸ್', 'Khava': 'ಖಾವ',
    'Drinks': 'ಪಾನೀಯಗಳು', 'Lassi': 'ಲಸ್ಸಿ', 'Plastic': 'ಪ್ಲಾಸ್ಟಿಕ್',
    'Daily Kirani': 'ದಿನದ ಕಿರಾಣಿ', 'Bread': 'ಬ್ರೆಡ್', 'Salary': 'ಸಂಬಳ',
    'Rent': 'ಬಾಡಿಗೆ', 'Hotel Electricity': 'ಹೋಟೆಲ್ ವಿದ್ಯುತ್',
    'Internet': 'ಇಂಟರ್ನೆಟ್', 'Home Electricity': 'ಮನೆ ವಿದ್ಯುತ್',
  }
}

// ─── CATEGORIES ──────────────────────────────────────────────
const INCOME_CATS  = ['Cash Collection', 'Paytm Collection']
const EXPENSE_CATS = [
  'Milk', 'Daily Market', 'Oil', 'Khanda/Batata', 'Gas', 'Khava',
  'Drinks', 'Lassi', 'Plastic', 'Daily Kirani', 'Bread',
  'Salary', 'Rent', 'Hotel Electricity', 'Internet', 'Home Electricity',
]

// ─── HELPERS ────────────────────────────────────────────────
const fmt       = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
const todayStr  = ()  => new Date().toISOString().split('T')[0]
const monthKey  = (d) => d.slice(0, 7)
const yearKey   = (d) => d.slice(0, 4)
const safeId    = (s) => s.replace(/[^a-z0-9]/gi, '_')

// ─── SHARED STYLES ──────────────────────────────────────────
const card = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14, padding: '20px 24px', marginBottom: 20,
}

export default function App() {
  const { user, profile, role, isAdmin, loading: authLoading } = useAuth()

  const [lang, setLang]               = useState('en')
  const [tab, setTab]                 = useState('daily')
  const [date, setDate]               = useState(todayStr())
  const [entries, setEntries]         = useState([])
  const [pigmyEvents, setPigmyEvents] = useState([])
  const [dailyInputs, setDailyInputs] = useState({})
  const [pigmyInput, setPigmyInput]   = useState('')
  const [pigmyWdAmt, setPigmyWdAmt]   = useState('')
  const [pigmyWdNote, setPigmyWdNote] = useState('')
  const [historyOpen, setHistoryOpen] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [addForm, setAddForm]         = useState({ type: 'income', category: INCOME_CATS[0], description: '', amount: '' })
  const [notification, setNotification] = useState('')
  const [dbLoading, setDbLoading]     = useState(true)
  const [saving, setSaving]           = useState(false)

  const t    = T[lang]
  const font = lang === 'kn' ? KN_FONT : EN_FONT

  const baseInput = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 10px', color: '#f3f4f6', fontSize: 14,
    fontFamily: font, outline: 'none', width: '100%', boxSizing: 'border-box', textAlign: 'right',
  }
  const darkSel = {
    background: '#1e2d3d', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 14,
    fontFamily: font, outline: 'none', width: '100%', boxSizing: 'border-box', cursor: 'pointer',
  }
  const btnPrimary = {
    background: 'linear-gradient(135deg,#fb923c,#f59e0b)', border: 'none', borderRadius: 10,
    color: '#fff', padding: '10px 22px', cursor: 'pointer', fontFamily: font,
    fontWeight: 800, fontSize: 14, boxShadow: '0 4px 14px rgba(251,146,60,0.25)',
  }

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3000) }

  // ── Firestore realtime listeners ─────────────────────────
  useEffect(() => {
    if (!user) return
    const u1 = onSnapshot(
      query(collection(db, 'entries'), orderBy('date', 'desc')),
      snap => { setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setDbLoading(false) },
      () => setDbLoading(false)
    )
    const u2 = onSnapshot(
      query(collection(db, 'pigmy'), orderBy('date', 'asc')),
      snap => setPigmyEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return () => { u1(); u2() }
  }, [user])

  // ── Sync daily inputs when date/data changes ─────────────
  useEffect(() => {
    const de = entries.filter(e => e.date === date)
    const inputs = {}
    INCOME_CATS.forEach(cat => {
      const f = de.find(e => e.type === 'income' && e.category === cat)
      inputs[`income__${cat}`] = f ? String(f.amount) : ''
    })
    EXPENSE_CATS.forEach(cat => {
      const f = de.find(e => e.type === 'expense' && e.category === cat)
      inputs[`expense__${cat}`] = f ? String(f.amount) : ''
    })
    const pd = pigmyEvents.find(e => e.date === date && e.type === 'deposit')
    setPigmyInput(pd ? String(pd.amount) : '')
    setDailyInputs(inputs)
  }, [date, entries, pigmyEvents])

  // ── Derived values ───────────────────────────────────────
  const totalDeposited = pigmyEvents.filter(e => e.type === 'deposit').reduce((s, e) => s + e.amount, 0)
  const totalWithdrawn = pigmyEvents.filter(e => e.type === 'withdrawal').reduce((s, e) => s + e.amount, 0)
  const pigmyBalance   = totalDeposited - totalWithdrawn

  const td   = todayStr()
  const mKey = monthKey(td)
  const yKey = yearKey(td)

  const calcPeriod = (fn) => {
    const fe = entries.filter(e => fn(e.date))
    const fp = pigmyEvents.filter(e => fn(e.date))
    return {
      income:  fe.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      expense: fe.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
      savings: fp.filter(e => e.type === 'deposit').reduce((s, e) => s + e.amount, 0),
    }
  }

  const kpis = useMemo(() => ({
    daily:   calcPeriod(d => d === td),
    monthly: calcPeriod(d => monthKey(d) === mKey),
    yearly:  calcPeriod(d => yearKey(d) === yKey),
  }), [entries, pigmyEvents])

  const dayEntries = entries.filter(e => e.date === date)
  const dayIncome  = dayEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const dayExpense = dayEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const dayPigmy   = pigmyEvents.filter(e => e.date === date && e.type === 'deposit').reduce((s, e) => s + e.amount, 0)
  const dayNet     = dayIncome - (dayExpense + dayPigmy)

  // ── Save daily entries to Firestore ──────────────────────
  const saveDailyEntries = async () => {
    setSaving(true)
    try {
      // Delete existing entries for this date
      const toDelete = entries.filter(e => e.date === date)
      await Promise.all(toDelete.map(e => deleteDoc(doc(db, 'entries', e.id))))

      // Write fresh entries
      const writes = []
      INCOME_CATS.forEach(cat => {
        const v = parseFloat(dailyInputs[`income__${cat}`])
        if (v > 0) writes.push(setDoc(doc(db, 'entries', `${date}_i_${safeId(cat)}`),
          { type: 'income', category: cat, amount: v, date, by: user.uid }))
      })
      EXPENSE_CATS.forEach(cat => {
        const v = parseFloat(dailyInputs[`expense__${cat}`])
        if (v > 0) writes.push(setDoc(doc(db, 'entries', `${date}_e_${safeId(cat)}`),
          { type: 'expense', category: cat, amount: v, date, by: user.uid }))
      })
      await Promise.all(writes)

      // Pigmy deposit
      const existDep = pigmyEvents.find(e => e.date === date && e.type === 'deposit')
      if (existDep) await deleteDoc(doc(db, 'pigmy', existDep.id))
      const pa = parseFloat(pigmyInput)
      if (pa > 0) await setDoc(doc(db, 'pigmy', `${date}_dep`),
        { date, type: 'deposit', amount: pa, note: 'Daily deposit', by: user.uid })

      notify(`${t.entriesSaved} ${date}`)
    } catch (err) { notify('❌ ' + err.message) }
    setSaving(false)
  }

  // ── Pigmy withdrawal ─────────────────────────────────────
  const addWithdrawal = async () => {
    const amt = parseFloat(pigmyWdAmt)
    if (!amt || amt <= 0) return
    if (amt > pigmyBalance) { notify(t.withdrawError); return }
    await setDoc(doc(db, 'pigmy', `wd_${Date.now()}`),
      { date: td, type: 'withdrawal', amount: amt, note: pigmyWdNote || t.withdrawal, by: user.uid })
    setPigmyWdAmt(''); setPigmyWdNote('')
    notify(`${t.withdrawSuccess}: ${fmt(amt)}`)
  }

  const deleteEntry = async (id) => {
    await deleteDoc(doc(db, 'entries', id))
    notify(t.entryRemoved)
  }

  const commitEdit = async (id) => {
    const v = parseFloat(editingEntry?.value)
    if (!v || v <= 0) { setEditingEntry(null); return }
    await updateDoc(doc(db, 'entries', id), { amount: v, by: user.uid })
    setEditingEntry(null)
    notify(t.entryUpdated)
  }

  const addCustomEntry = async () => {
    const amt = parseFloat(addForm.amount)
    if (!amt || amt <= 0) return
    await setDoc(doc(db, 'entries', `custom_${Date.now()}`),
      { ...addForm, amount: amt, date, by: user.uid })
    setAddForm(f => ({ ...f, description: '', amount: '' }))
    notify(t.entryAdded)
  }

  const historyDates = [...new Set(entries.map(e => e.date))].sort((a, b) => b.localeCompare(a))

  const inp = (key) => ({
    value: dailyInputs[key] || '',
    onChange: e => setDailyInputs(p => ({ ...p, [key]: e.target.value })),
    style: baseInput, placeholder: '0', type: 'number',
  })

  // ── Sub-components (defined inside to access t, font) ────
  const AppTab = ({ label, active, onClick, hidden }) => hidden ? null : (
    <button onClick={onClick} style={{
      background: active ? 'rgba(251,146,60,0.15)' : 'none',
      border: 'none', borderBottom: active ? '2px solid #fb923c' : '2px solid transparent',
      color: active ? '#fb923c' : '#6b7280', padding: '12px 16px', cursor: 'pointer',
      fontSize: 13, fontFamily: font, fontWeight: 600,
      borderRadius: '6px 6px 0 0', transition: 'all 0.2s', whiteSpace: 'nowrap',
    }}>{label}</button>
  )

  const KPICard = ({ label, income, expense, savings = 0, color = '#fb923c' }) => {
    const nc = income - (expense + savings)
    return (
      <div style={{ ...card, marginBottom: 0, borderTop: `3px solid ${color}`, padding: '18px 20px' }}>
        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { lbl: t.revenue,    v: fmt(income),  c: '#34d399' },
            { lbl: t.expenses,   v: fmt(expense), c: '#f87171' },
            ...(savings > 0 ? [{ lbl: t.pigmySaved, v: fmt(savings), c: '#38bdf8' }] : []),
            { lbl: t.netCash, v: fmt(nc), c: nc >= 0 ? '#a78bfa' : '#f87171', bold: true },
          ].map(r => (
            <div key={r.lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: r.bold ? 700 : 400 }}>{r.lbl}</span>
              <span style={{ fontSize: r.bold ? 16 : 14, fontWeight: 700, color: r.c }}>{r.v}</span>
            </div>
          ))}
          {income > 0 && (() => {
            const pct = (nc / income) * 100
            return (
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{t.cashMargin}</span>
                  <span style={{ fontSize: 11, color: nc >= 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                  <div style={{ height: 4, borderRadius: 99, transition: 'width 0.6s', width: `${Math.max(0, Math.min(100, pct))}%`, background: nc >= 0 ? `linear-gradient(90deg,#34d399,${color})` : '#f87171' }} />
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  const SecHdr = ({ label, color, bg }) => (
    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ background: bg, borderRadius: 6, padding: '2px 10px' }}>{label}</span>
    </h3>
  )

  // ── Loading / Auth guards ────────────────────────────────
  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontFamily: EN_FONT, fontSize: 16 }}>
      Loading…
    </div>
  )
  if (!user) return <LoginPage />

  // Allowed tabs by role
  const allowedTabs = isAdmin
    ? ['summary', 'daily', 'entries', 'pigmy', 'history', 'users']
    : ['daily', 'entries']
  const activeTab = allowedTabs.includes(tab) ? tab : allowedTabs[0]

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e5e7eb', fontFamily: font, backgroundImage: 'radial-gradient(ellipse at 10% 0%, rgba(251,146,60,0.06) 0%, transparent 55%)' }}>

      {/* Toast */}
      {notification && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#1e2530', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, color: '#f3f4f6', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>{notification}</div>
      )}

      {/* ── HEADER ── */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 0', flexWrap: 'wrap', gap: 10 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#fb923c,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🍛</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#f9fafb' }}>{t.appName}</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{t.appSub}</p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Date picker */}
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 12px', color: '#f3f4f6', fontSize: 13, outline: 'none', fontFamily: font }} />

            {/* Language switcher */}
            <select value={lang} onChange={e => setLang(e.target.value)} style={{ ...darkSel, width: 'auto', padding: '7px 10px', fontSize: 13 }}>
              <option value="en" style={{ background: '#1e2d3d' }}>🇬🇧 English</option>
              <option value="kn" style={{ background: '#1e2d3d' }}>🇮🇳 ಕನ್ನಡ</option>
            </select>

            {/* Role badge */}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: isAdmin ? 'rgba(251,146,60,0.15)' : 'rgba(56,189,248,0.15)', color: isAdmin ? '#fb923c' : '#38bdf8', border: `1px solid ${isAdmin ? 'rgba(251,146,60,0.3)' : 'rgba(56,189,248,0.3)'}` }}>
              {isAdmin ? t.adminBadge : t.managerBadge}
            </span>

            {/* User + sign out */}
            <span style={{ fontSize: 12, color: '#6b7280' }}>{profile?.name || user.email}</span>
            <button onClick={() => signOut(auth)} style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, color: '#f87171', padding: '6px 12px', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 12 }}>{t.signOut}</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 12, overflowX: 'auto' }}>
          <AppTab label={t.tabSummary}  active={activeTab==='summary'}  onClick={() => setTab('summary')}  hidden={!isAdmin} />
          <AppTab label={t.tabDaily}    active={activeTab==='daily'}    onClick={() => setTab('daily')} />
          <AppTab label={t.tabEntries}  active={activeTab==='entries'}  onClick={() => setTab('entries')} />
          <AppTab label={t.tabPigmy}    active={activeTab==='pigmy'}    onClick={() => setTab('pigmy')}    hidden={!isAdmin} />
          <AppTab label={t.tabHistory}  active={activeTab==='history'}  onClick={() => setTab('history')}  hidden={!isAdmin} />
          <AppTab label={t.tabUsers}    active={activeTab==='users'}    onClick={() => setTab('users')}    hidden={!isAdmin} />
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>
        {dbLoading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0', fontSize: 15 }}>{t.loading}</div>
        ) : <>

          {/* ══ SUMMARY ══ */}
          {activeTab === 'summary' && isAdmin && (
            <div>
              <h2 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 20, color: '#f9fafb' }}>{t.summaryTitle}</h2>
              <p style={{ margin: '0 0 22px', color: '#6b7280', fontSize: 13 }}>{t.summarySubtitle}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
                <KPICard label={t.today}     income={kpis.daily.income}   expense={kpis.daily.expense}   savings={kpis.daily.savings}   color="#fb923c" />
                <KPICard label={t.thisMonth} income={kpis.monthly.income} expense={kpis.monthly.expense} savings={kpis.monthly.savings} color="#34d399" />
                <KPICard label={t.thisYear}  income={kpis.yearly.income}  expense={kpis.yearly.expense}  savings={kpis.yearly.savings}  color="#f59e0b" />
              </div>

              <div style={{ ...card, borderLeft: '4px solid #38bdf8', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                {[
                  { label: t.pigmyTotalDeposited,  val: totalDeposited, color: '#38bdf8' },
                  { label: t.pigmyTotalWithdrawn,   val: totalWithdrawn, color: '#f87171' },
                  { label: t.pigmyAvailableBalance, val: pigmyBalance,   color: pigmyBalance >= 0 ? '#34d399' : '#f87171' },
                ].map(c => (
                  <div key={c.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>{c.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{fmt(c.val)}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                {[
                  { label: t.totalRevenueYear,  val: kpis.yearly.income, color: '#34d399' },
                  { label: t.totalExpensesYear, val: kpis.yearly.expense, color: '#f87171' },
                  { label: t.netCashYear, val: kpis.yearly.income - (kpis.yearly.expense + kpis.yearly.savings), color: '#a78bfa' },
                ].map(c => (
                  <div key={c.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>{c.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{fmt(c.val)}</div>
                  </div>
                ))}
              </div>

              <div style={card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#f3f4f6' }}>{t.topExpensesMonth}</h3>
                {(() => {
                  const cats = {}
                  entries.filter(e => e.type === 'expense' && monthKey(e.date) === mKey)
                    .forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount })
                  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1])
                  const max = sorted[0]?.[1] || 1
                  return sorted.length ? sorted.map(([cat, amt]) => (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: '#d1d5db' }}>{t[cat] || cat}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>{fmt(amt)}</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                        <div style={{ height: 5, borderRadius: 99, width: `${(amt/max)*100}%`, background: 'linear-gradient(90deg,#fb923c,#f87171)' }} />
                      </div>
                    </div>
                  )) : <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>{t.noExpenseData}</p>
                })()}
              </div>
            </div>
          )}

          {/* ══ DAILY DASHBOARD ══ */}
          {activeTab === 'daily' && (
            <div>
              <h2 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 20, color: '#f9fafb' }}>{t.dailyTitle}</h2>
              <p style={{ margin: '0 0 22px', color: '#6b7280', fontSize: 13 }}>
                {new Date(date + 'T00:00:00').toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {' · '}{dayEntries.length} {t.entries}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
                {[
                  { label: t.revenue, val: dayIncome, color: '#34d399' },
                  { label: t.expenses, val: dayExpense, color: '#f87171' },
                  { label: t.netCash, val: dayNet, color: dayNet >= 0 ? '#a78bfa' : '#f87171' },
                  { label: t.pigmySaved, val: dayPigmy, color: '#38bdf8' },
                ].map(c => (
                  <div key={c.label} style={{ ...card, marginBottom: 0, borderLeft: `4px solid ${c.color}`, padding: '18px 18px' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 600 }}>{c.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{fmt(c.val)}</div>
                  </div>
                ))}
              </div>

              {dayIncome > 0 && (
                <div style={{ ...card, padding: '14px 20px', marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>{t.netCashMargin}</span>
                    <span style={{ fontWeight: 700, color: dayNet >= 0 ? '#34d399' : '#f87171' }}>{((dayNet/dayIncome)*100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                    <div style={{ height: 7, borderRadius: 99, transition: 'width 0.5s', width: `${Math.max(0,Math.min(100,(dayNet/dayIncome)*100))}%`, background: dayNet >= 0 ? 'linear-gradient(90deg,#34d399,#a78bfa)' : '#f87171' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div style={card}>
                  <SecHdr label={t.incomeBreakdown} color="#34d399" bg="rgba(52,211,153,0.12)" />
                  {INCOME_CATS.map(cat => {
                    const e = dayEntries.find(x => x.type === 'income' && x.category === cat)
                    return (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: 13, color: '#d1d5db' }}>{t[cat] || cat}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: e ? '#34d399' : '#374151' }}>{e ? fmt(e.amount) : '—'}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ ...card, maxHeight: 420, overflowY: 'auto' }}>
                  <SecHdr label={t.expenseBreakdown} color="#f87171" bg="rgba(248,113,113,0.12)" />
                  {EXPENSE_CATS.map(cat => {
                    const e = dayEntries.find(x => x.type === 'expense' && x.category === cat)
                    return (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: 13, color: '#d1d5db' }}>{t[cat] || cat}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: e ? '#f87171' : '#374151' }}>{e ? fmt(e.amount) : '—'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══ ENTRIES ══ */}
          {activeTab === 'entries' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                <div>
                  <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: '#f9fafb' }}>{t.dailyEntries}</h2>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
                    {new Date(date + 'T00:00:00').toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={saveDailyEntries} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? t.saving : t.saveAllEntries}
                </button>
              </div>

              {/* Income */}
              <div style={card}>
                <SecHdr label={t.income} color="#34d399" bg="rgba(52,211,153,0.12)" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                  {INCOME_CATS.map(cat => (
                    <div key={cat}>
                      <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 5, fontWeight: 600 }}>{t[cat] || cat}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: '#6b7280' }}>₹</span><input {...inp(`income__${cat}`)} /></div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>{t.totalIncome}</span>
                  <span style={{ fontWeight: 800, color: '#34d399', fontSize: 16 }}>{fmt(INCOME_CATS.reduce((s,c) => s+(parseFloat(dailyInputs[`income__${c}`])||0), 0))}</span>
                </div>
              </div>

              {/* Expenses */}
              <div style={card}>
                <SecHdr label={t.expense} color="#f87171" bg="rgba(248,113,113,0.12)" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 12 }}>
                  {EXPENSE_CATS.map(cat => (
                    <div key={cat}>
                      <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 5, fontWeight: 600 }}>{t[cat] || cat}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: '#6b7280' }}>₹</span><input {...inp(`expense__${cat}`)} /></div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>{t.totalExpenses}</span>
                  <span style={{ fontWeight: 800, color: '#f87171', fontSize: 16 }}>{fmt(EXPENSE_CATS.reduce((s,c) => s+(parseFloat(dailyInputs[`expense__${c}`])||0), 0))}</span>
                </div>
              </div>

              {/* Pigmy deposit — visible to all roles */}
              <div style={{ ...card, borderLeft: '4px solid #38bdf8' }}>
                <SecHdr label={t.pigmyDepositLabel} color="#38bdf8" bg="rgba(56,189,248,0.12)" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 280 }}>
                  <span style={{ color: '#6b7280' }}>₹</span>
                  <input type="number" value={pigmyInput} placeholder="0" onChange={e => setPigmyInput(e.target.value)} style={baseInput} />
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '10px 0 0' }}>
                  {t.pigmyBalance} <strong style={{ color: '#38bdf8' }}>{fmt(pigmyBalance)}</strong>
                </p>
              </div>

              {/* Preview */}
              {(() => {
                const pI = INCOME_CATS.reduce((s,c) => s+(parseFloat(dailyInputs[`income__${c}`])||0), 0)
                const pE = EXPENSE_CATS.reduce((s,c) => s+(parseFloat(dailyInputs[`expense__${c}`])||0), 0)
                const pP = parseFloat(pigmyInput)||0
                const pN = pI - (pE + pP)
                return (
                  <div style={{ background: pN >= 0 ? 'rgba(167,139,250,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${pN >= 0 ? 'rgba(167,139,250,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: 12, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#9ca3af', fontSize: 14 }}>{t.previewNetCash}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{t.previewFormula}</div>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: pN >= 0 ? '#a78bfa' : '#f87171' }}>{fmt(pN)}</span>
                  </div>
                )
              })()}

              {/* Custom entry */}
              <div style={{ ...card, marginTop: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{t.customEntryTitle}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 120px 44px', gap: 10, alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 5, textTransform: 'uppercase', fontWeight: 700 }}>{t.typeLabel}</label>
                    <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value, category: e.target.value === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[0] }))} style={darkSel}>
                      <option value="income"  style={{ background: '#1e2d3d' }}>{t.incomeOption}</option>
                      <option value="expense" style={{ background: '#1e2d3d' }}>{t.expenseOption}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 5, textTransform: 'uppercase', fontWeight: 700 }}>{t.categoryLabel}</label>
                    <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} style={darkSel}>
                      {(addForm.type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => (
                        <option key={c} value={c} style={{ background: '#1e2d3d' }}>{t[c] || c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 5, textTransform: 'uppercase', fontWeight: 700 }}>{t.descriptionLabel}</label>
                    <input value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder={t.descriptionPlaceholder} style={{ ...baseInput, textAlign: 'left', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 5, textTransform: 'uppercase', fontWeight: 700 }}>{t.amountLabel}</label>
                    <input type="number" value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addCustomEntry()} placeholder="0" style={{ ...baseInput, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }} />
                  </div>
                  <button onClick={addCustomEntry} style={{ background: 'linear-gradient(135deg,#fb923c,#f59e0b)', border: 'none', borderRadius: 8, color: '#fff', padding: '10px', cursor: 'pointer', fontWeight: 800, fontSize: 20, lineHeight: 1 }}>+</button>
                </div>
              </div>
            </div>
          )}

          {/* ══ PIGMY SAVINGS ══ */}
          {activeTab === 'pigmy' && isAdmin && (
            <div>
              <h2 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 20, color: '#f9fafb' }}>{t.pigmyTitle}</h2>
              <p style={{ margin: '0 0 22px', color: '#6b7280', fontSize: 13 }}>{t.pigmySub}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                  { label: t.totalDeposited,  val: totalDeposited, color: '#38bdf8' },
                  { label: t.totalWithdrawn,   val: totalWithdrawn, color: '#f87171' },
                  { label: t.availableBalance, val: pigmyBalance,   color: pigmyBalance >= 0 ? '#34d399' : '#f87171' },
                ].map(c => (
                  <div key={c.label} style={{ ...card, marginBottom: 0, borderTop: `3px solid ${c.color}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontWeight: 600 }}>{c.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{fmt(c.val)}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...card, borderLeft: '4px solid #f59e0b' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>{t.withdrawTitle}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 12, alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>{t.withdrawAmountLabel}</label>
                    <input type="number" value={pigmyWdAmt} onChange={e => setPigmyWdAmt(e.target.value)} placeholder="0" style={baseInput} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>{t.withdrawNoteLabel}</label>
                    <input value={pigmyWdNote} onChange={e => setPigmyWdNote(e.target.value)} placeholder={t.withdrawNotePlaceholder} style={{ ...baseInput, textAlign: 'left' }} />
                  </div>
                  <button onClick={addWithdrawal} style={{ ...btnPrimary, background: 'linear-gradient(135deg,#f59e0b,#fb923c)', whiteSpace: 'nowrap' }}>{t.withdrawBtn}</button>
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '10px 0 0' }}>{t.pigmyAvailable} <strong style={{ color: pigmyBalance >= 0 ? '#34d399' : '#f87171' }}>{fmt(pigmyBalance)}</strong></p>
              </div>

              <div style={card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#f3f4f6' }}>{t.ledgerTitle}</h3>
                {pigmyEvents.length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>{t.noTransactions}</p>
                ) : (() => {
                  let running = 0
                  const rows = [...pigmyEvents]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(ev => { running += ev.type === 'deposit' ? ev.amount : -ev.amount; return { ...ev, running } })
                    .reverse()
                  return rows.map(ev => (
                    <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: ev.type === 'deposit' ? 'rgba(56,189,248,0.15)' : 'rgba(248,113,113,0.15)', color: ev.type === 'deposit' ? '#38bdf8' : '#f87171' }}>
                          {ev.type === 'deposit' ? t.deposit : t.withdrawal}
                        </span>
                        <span style={{ color: '#9ca3af' }}>{ev.note}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <span style={{ color: '#6b7280', fontSize: 12 }}>{ev.date}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: ev.type === 'deposit' ? '#38bdf8' : '#f87171', minWidth: 80, textAlign: 'right' }}>{ev.type === 'deposit' ? '+' : '−'}{fmt(ev.amount)}</span>
                        <span style={{ fontSize: 12, color: ev.running >= 0 ? '#34d399' : '#f87171', minWidth: 90, textAlign: 'right' }}>{t.bal} {fmt(ev.running)}</span>
                        <button onClick={async () => { await deleteDoc(doc(db, 'pigmy', ev.id)); notify(t.transactionRemoved) }} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 15, padding: 0 }}>×</button>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          {/* ══ HISTORY ══ */}
          {activeTab === 'history' && isAdmin && (
            <div>
              <h2 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 20, color: '#f9fafb' }}>{t.historyTitle}</h2>
              <p style={{ margin: '0 0 22px', color: '#6b7280', fontSize: 13 }}>{historyDates.length} {t.historySubtitle}</p>
              {historyDates.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#4b5563', padding: '60px 0', fontSize: 15 }}>{t.noHistoryEntries}</div>
              ) : historyDates.map(d => {
                const de     = entries.filter(e => e.date === d)
                const inc    = de.filter(e => e.type === 'income').reduce((s,e) => s+e.amount, 0)
                const exp    = de.filter(e => e.type === 'expense').reduce((s,e) => s+e.amount, 0)
                const dp     = pigmyEvents.filter(e => e.date === d && e.type === 'deposit').reduce((s,e) => s+e.amount, 0)
                const net    = inc - (exp + dp)
                const isOpen = historyOpen === d
                return (
                  <div key={d} style={{ marginBottom: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                    <button onClick={() => setHistoryOpen(isOpen ? null : d)} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#e5e7eb', fontFamily: font }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        {new Date(d + 'T00:00:00').toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>{fmt(inc)}</span>
                        <span style={{ fontSize: 12, color: '#f87171', fontWeight: 700 }}>{fmt(exp)}</span>
                        {dp > 0 && <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700 }}>🐷 {fmt(dp)}</span>}
                        <span style={{ fontSize: 14, fontWeight: 800, color: net >= 0 ? '#a78bfa' : '#f87171' }}>{fmt(net)}</span>
                        <span style={{ color: '#4b5563', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div style={{ padding: '4px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '12px 0 14px', fontStyle: 'italic' }}>{t.historyEditHint}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                          {['income', 'expense'].map(type => {
                            const rows  = de.filter(e => e.type === type)
                            const total = rows.reduce((s,e) => s+e.amount, 0)
                            const lbl   = type === 'income' ? t.revenue : t.expenses
                            return (
                              <div key={type}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: type === 'income' ? '#34d399' : '#f87171', marginBottom: 10, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{lbl}</span><span>{fmt(total)}</span>
                                </div>
                                {rows.length === 0 && <p style={{ color: '#4b5563', fontSize: 13, margin: 0 }}>{t.noEntries}</p>}
                                {rows.map(e => (
                                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                                    <span style={{ color: '#9ca3af' }}>
                                      {t[e.category] || e.category}
                                      {e.description ? <span style={{ color: '#4b5563' }}> · {e.description}</span> : ''}
                                    </span>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                      {editingEntry?.id === e.id ? (
                                        <>
                                          <span style={{ color: '#6b7280', fontSize: 13 }}>₹</span>
                                          <input autoFocus type="number" value={editingEntry.value}
                                            onChange={ev => setEditingEntry(p => ({ ...p, value: ev.target.value }))}
                                            onKeyDown={ev => { if (ev.key === 'Enter') commitEdit(e.id); if (ev.key === 'Escape') setEditingEntry(null) }}
                                            style={{ ...baseInput, width: 100, fontSize: 13, padding: '5px 8px' }} />
                                          <button onClick={() => commitEdit(e.id)} style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✓</button>
                                          <button onClick={() => setEditingEntry(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 15 }}>✕</button>
                                        </>
                                      ) : (
                                        <>
                                          <span onClick={() => setEditingEntry({ id: e.id, value: String(e.amount) })} title="Click to edit"
                                            style={{ fontWeight: 700, fontSize: 13, color: type === 'income' ? '#34d399' : '#f87171', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
                                            {fmt(e.amount)}
                                          </span>
                                          <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 15, padding: 0 }} title="Delete">×</button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 28, justifyContent: 'flex-end', fontSize: 13, flexWrap: 'wrap' }}>
                          <span style={{ color: '#9ca3af' }}>{t.revenueLabel} <strong style={{ color: '#34d399' }}>{fmt(inc)}</strong></span>
                          <span style={{ color: '#9ca3af' }}>{t.expensesLabel} <strong style={{ color: '#f87171' }}>{fmt(exp)}</strong></span>
                          {dp > 0 && <span style={{ color: '#9ca3af' }}>{t.pigmyLabel} <strong style={{ color: '#38bdf8' }}>{fmt(dp)}</strong></span>}
                          <span style={{ color: '#9ca3af' }}>{t.netCashLabel} <strong style={{ color: net >= 0 ? '#a78bfa' : '#f87171' }}>{fmt(net)}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ══ USER MANAGEMENT ══ */}
          {activeTab === 'users' && isAdmin && (
            <UserManagement currentUser={user} lang={lang} />
          )}

        </>}
      </div>
    </div>
  )
}
