import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'

interface Profile {
  id: string
  org_id: string
  role_id: string
  full_name: string
  organization: {
    name: string
    slug: string
  }
  role: {
    name: string
    permissions: any
  }
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName: string, orgSlug: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    console.log('--- fetchProfile START ---', userId)
    
    // Always try to get a fresh token if the state one isn't there yet
    let token = session?.access_token
    if (!token) {
      console.log('Token missing from state, fetching fresh session...')
      const { data } = await supabase.auth.getSession()
      token = data.session?.access_token
    }
    
    const headers = {
      'apikey': supabaseAnonKey,
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }

    try {
      // Step 1: Fetch basic profile
      console.log('Fetching basic profile via direct API...')
      const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id,org_id,role_id,full_name`, { 
        headers,
        signal: AbortSignal.timeout(8000) 
      })
      
      if (!profileRes.ok) {
        console.error('Profile fetch failed:', profileRes.status)
        return null
      }
      
      const profileDataArray = await profileRes.json()
      const profileData = profileDataArray[0]

      if (!profileData) {
        console.warn('Profile not found for:', userId)
        return null
      }

      console.log('Basic profile found:', profileData.full_name)

      // Step 2 & 3: Fetch Organization and Role in parallel
      console.log('Fetching organization and role via direct API...')
      const [orgRes, roleRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${profileData.org_id}&select=id,name,slug`, { 
          headers,
          signal: AbortSignal.timeout(8000)
        }),
        fetch(`${supabaseUrl}/rest/v1/org_roles?id=eq.${profileData.role_id}&select=id,name,permissions`, { 
          headers,
          signal: AbortSignal.timeout(8000)
        })
      ])
      
      let orgData = null
      let roleData = null

      if (orgRes.ok) {
        const orgs = await orgRes.json()
        orgData = orgs[0]
      }
      
      if (roleRes.ok) {
        const roles = await roleRes.json()
        roleData = roles[0]
      }

      const profileObj: Profile = {
        id: profileData.id,
        org_id: profileData.org_id,
        role_id: profileData.role_id,
        full_name: profileData.full_name,
        organization: orgData || { id: '', name: 'Unknown', slug: 'unknown' },
        role: roleData || { id: '', name: 'Unknown', permissions: {} }
      }
      
      console.log('Profile assembly complete. Org:', profileObj.organization.name)
      return profileObj
    } catch (err) {
      console.error('Critical fetchProfile error:', err)
      return null
    } finally {
      console.log('--- fetchProfile FINISH ---')
    }
  }

  useEffect(() => {
    let mounted = true
    console.log('AuthProvider mounted')

    // Failsafe timeout: if we are still loading after 5 seconds, force it to false
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization taking too long. Forcing loading to false.')
        setLoading(false)
      }
    }, 5000)

    async function handleAuthStateUpdate(event: string, session: Session | null) {
      console.log('--- handleAuthStateUpdate START ---', event)
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setSession(null)
        setUser(null)
        try {
          const keys = Object.keys(localStorage)
          keys.forEach(key => {
            if (key.includes('sb-') || key.includes('supabase.auth.token')) {
              localStorage.removeItem(key)
            }
          })
          // Also clear specific session storage cache
          sessionStorage.removeItem('user_profile_cache')
        } catch (e) {
          console.warn('Cleanup failed on SIGNED_OUT:', e)
        }
        setLoading(false)
        clearTimeout(timeoutId)
        return
      }

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        setLoading(true)
        
        // 1. Check Session Storage first
        let profileData: Profile | null = null
        try {
          const cached = sessionStorage.getItem('user_profile_cache')
          if (cached) {
            const parsed = JSON.parse(cached)
            if (parsed.id === session.user.id) {
              console.log('Using cached profile from sessionStorage')
              profileData = parsed
            }
          }
        } catch (e) {
          console.warn('Failed to read profile cache:', e)
        }

        // 2. Fetch if not cached
        if (!profileData) {
          profileData = await fetchProfile(session.user.id)
          if (profileData) {
            try {
              sessionStorage.setItem('user_profile_cache', JSON.stringify(profileData))
            } catch (e) {
              console.warn('Failed to write profile cache:', e)
            }
          }
        }

        if (mounted) {
          setProfile(profileData)
          setLoading(false)
        }
      } else {
        if (mounted) {
          setProfile(null)
          setLoading(false)
        }
      }
      if (mounted) {
        setLoading(false)
        clearTimeout(timeoutId)
      }
      console.log('--- handleAuthStateUpdate FINISH ---')
    }

    // Initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateUpdate('INITIAL', session)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        handleAuthStateUpdate(event, session)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName: string, orgSlug: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          org_slug: orgSlug,
        },
      },
    })
    
    return { error }
  }

  const signOut = async () => {
    try {
      console.log('--- signOut START ---')
      // Clear states immediately for instant UI feedback
      setProfile(null)
      setUser(null)
      setSession(null)
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Supabase signOut error:', error)
      }
    } catch (err) {
      console.error('Unexpected signOut error:', err)
    } finally {
      console.log('--- signOut FINISH ---')
      
      // Explicitly clear any Supabase related items from local storage 
      // as a fallback for the client library
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.includes('sb-') || key.includes('supabase.auth.token')) {
            localStorage.removeItem(key)
          }
        })
      } catch (e) {
        console.warn('LocalStorage cleanup failed:', e)
      }

      // Ensure everything is truly cleared in state
      setProfile(null)
      setUser(null)
      setSession(null)
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
