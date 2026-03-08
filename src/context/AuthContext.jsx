import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabaseClient'

const SUPER_ADMIN_EMAIL = 'koen.kerkvliet@designpixels.nl'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [organizationId, setOrganizationId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  const fetchUserRole = async (userId, email) => {
    if (email === SUPER_ADMIN_EMAIL) {
      setUserRole('super_admin')
      setOrganizationId(null)
      return { role: 'super_admin', organizationId: null }
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const { data, error } = await supabase
        .from('user_organization_roles')
        .select('roles (name), organization_id')
        .eq('user_id', userId)
        .limit(1)
        .abortSignal(controller.signal)

      clearTimeout(timeout)

      if (error) {
        console.error('Fout bij ophalen gebruikersrol:', error)
        setUserRole(null)
        setOrganizationId(null)
        return { role: null, organizationId: null }
      }

      const first = data?.[0]
      const role = first?.roles?.name || null
      const orgId = first?.organization_id || null
      setUserRole(role)
      setOrganizationId(orgId)
      return { role, organizationId: orgId }
    } catch (err) {
      console.error('Fout bij ophalen rol (timeout of netwerk):', err)
      setUserRole(null)
      setOrganizationId(null)
      return { role: null, organizationId: null }
    }
  }

  useEffect(() => {
    mountedRef.current = true

    // Process a session (user + role) and set loading false
    const processSession = async (session) => {
      if (!mountedRef.current) return

      const sessionUser = session?.user || null
      setUser(sessionUser)

      if (sessionUser) {
        await fetchUserRole(sessionUser.id, sessionUser.email)
      } else {
        setUserRole(null)
        setOrganizationId(null)
      }

      if (mountedRef.current) setLoading(false)
    }

    // Single source of truth: onAuthStateChange
    // Fires INITIAL_SESSION immediately with stored session from localStorage.
    // IMPORTANT: defer async work with setTimeout(0) to avoid
    // potential deadlocks with Supabase's internal auth state machine.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return
        setTimeout(() => processSession(session), 0)
      }
    )

    // Safety: force loading off after 4 seconds no matter what
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('Auth safety timer triggered after 4s')
        setLoading(false)
      }
    }, 4000)

    return () => {
      mountedRef.current = false
      clearTimeout(safetyTimer)
      subscription?.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setUser(data.user)
      const result = await fetchUserRole(data.user.id, data.user.email)
      return { success: true, role: result.role }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const signup = async (email, password, fullName) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const logout = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setUserRole(null)
      setOrganizationId(null)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const isViewer = userRole === 'viewer'
  const isAdmin = userRole === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        organizationId,
        loading,
        error,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        isViewer,
        isAdmin,
        isSuperAdmin: user?.email === SUPER_ADMIN_EMAIL,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
