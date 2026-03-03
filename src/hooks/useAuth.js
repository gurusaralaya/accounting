import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc }       from 'firebase/firestore'
import { auth, db }          from '../firebase/config'

export function useAuth() {
  const [user, setUser]       = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)      // { role, name, email, mfaEnabled }

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setProfile(snap.exists() ? snap.data() : { role: 'manager' })
        setUser(firebaseUser)
      } else {
        setUser(null)
        setProfile(null)
      }
    })
  }, [])

  const loading = user === undefined
  const role    = profile?.role ?? 'manager'
  const isAdmin = role === 'admin'

  return { user, profile, role, isAdmin, loading }
}
