import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const { data, error } = await authService.getSession()
        if (error) throw error
        setUser(data?.session?.user || null)
      } catch (err) {
        console.error('Auth check error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Subscribe to auth state changes
    const { data } = authService.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => {
      data?.subscription?.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    try {
      setError(null)
      const { data, error } = await authService.login(email, password)
      if (error) throw error
      setUser(data.user)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const signup = async (email, password, fullName) => {
    try {
      setError(null)
      const { data, error } = await authService.signup(email, password, fullName)
      if (error) throw error
      // Don't set user immediately for email confirmation flows
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const logout = async () => {
    try {
      setError(null)
      const { error } = await authService.logout()
      if (error) throw error
      setUser(null)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
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
