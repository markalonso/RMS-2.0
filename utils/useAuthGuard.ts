'use client'

import { useEffect, useState, useCallback } from 'react'
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

  const checkAuth = useCallback(async () => {
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
        .select('id, role, full_name, is_active, is_deleted')
        .eq('id', currentSession.user.id)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        // Check if it's a "not found" error (PGRST116)
        if (profileError.code === 'PGRST116') {
          setError('Profile not found in public.profiles for this user. Create it in Supabase SQL Editor.')
        } else {
          setError('Failed to load profile')
        }
        setLoading(false)
        return
      }

      if (!profileData) {
        setError('Profile not found in public.profiles for this user. Create it in Supabase SQL Editor.')
        setLoading(false)
        return
      }

      // Check role if required
      if (requiredRole) {
        // Owner can access everything
        if (profileData.role !== 'owner') {
          if (requiredRole === 'owner') {
            setError(`Access denied. Only owners can access this page.`)
            setLoading(false)
            return
          }
          if (requiredRole === 'cashier' && profileData.role !== 'cashier') {
            setError(`Access denied. Only cashiers and owners can access this page.`)
            setLoading(false)
            return
          }
        }
      }

      setProfile(profileData)
      setLoading(false)
    } catch (err) {
      console.error('Auth check error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }, [router, requiredRole])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return { session, profile, loading, error }
}
