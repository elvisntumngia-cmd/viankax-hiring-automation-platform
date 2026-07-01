import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

function useAuth() {
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      if (!isSupabaseConfigured) {
        setStatus('unconfigured')
        return
      }

      const { data } = await supabase.auth.getSession()
      if (isMounted) {
        setSession(data.session)
        setStatus('ready')
      }
    }

    loadSession()

    if (!isSupabaseConfigured) {
      return () => {
        isMounted = false
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setStatus('ready')
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return {
    isAuthenticated: Boolean(session),
    session,
    status,
  }
}

export default useAuth
