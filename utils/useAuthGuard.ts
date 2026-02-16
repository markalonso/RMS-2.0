'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Profile } from '@/types'
import { Session } from '@supabase/supabase-js'

interface AuthGuardResult {
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

export function useAuthGuard(requiredRole?: 'owner' | 'cashier'): AuthGuardResult {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Get current session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        setError('Failed to get session')
        router.replace('/login')
        return
      }

      if (!currentSession) {
        router.replace('/login')
        return
      }

      setSession(currentSession)

      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (profileError) {
        console.error('Profile error:', profileError)
        setError('Failed to load profile')
        setLoading(false)
        return
      }

      if (!profileData) {
        setError('Profile not found. Please create a profile row in Supabase with your user ID.')
        setLoading(false)
        return
      }

      // Check role if required
      if (requiredRole && profileData.role !== requiredRole && profileData.role !== 'owner') {
        // Owner can access everything; otherwise check specific role
        if (requiredRole === 'owner' && profileData.role !== 'owner') {
          setError(`Access denied. Only owners can access this page.`)
          setLoading(false)
          return
        }
        if (requiredRole === 'cashier' && profileData.role !== 'cashier' && profileData.role !== 'owner') {
          setError(`Access denied. Only cashiers and owners can access this page.`)
          setLoading(false)
          return
        }
      }

      setProfile(profileData)
      setLoading(false)
    } catch (err) {
      console.error('Auth check error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return { session, profile, loading, error }
}
