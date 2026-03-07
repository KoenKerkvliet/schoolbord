import { supabase } from './supabaseClient'

export const authService = {
  async signup(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { data, error }
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser()
    return { data, error }
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    return { data, error }
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  },
}
