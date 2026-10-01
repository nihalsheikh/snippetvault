/**
 * Session state for the whole app.
 *
 * Tokens live in `localStorage` (there is no cookie flow) and are re-hydrated into a
 * `Profile` on mount, so a reload doesn't bounce the user to the login screen. `api.ts`
 * owns the tokens; this owns the identity and the "am I still signed in" answer.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { ApiError, SESSION_LOST, authApi, tokens } from '@/lib/api'
import { toProfile } from '@/lib/mappers'
import type { Profile } from '@/lib/types'

export type AuthStatus = 'loading' | 'authed' | 'anon'

interface AuthContextValue {
  status: AuthStatus
  profile: Profile | null
  login: (email: string, password: string) => Promise<void>
  signup: (input: { name: string; email: string; password: string }) => Promise<string>
  logout: () => Promise<void>
  /** Re-reads the profile from the server — after an email change, or on demand. */
  refresh: () => Promise<void>
  /** Optimistic, for the profile form: server response replaces it on success. */
  patchProfile: (input: {
    name?: string
    username?: string
    bio?: string
    website?: string
  }) => Promise<void>
  changePassword: (input: {
    current_password: string
    new_password: string
    confirm_new_password: string
  }) => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokens.access ? 'loading' : 'anon',
  )
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async () => {
    if (!tokens.access) {
      setProfile(null)
      setStatus('anon')
      return
    }
    try {
      const res = await authApi.profile()
      setProfile(res.user ? toProfile(res.user) : null)
      setStatus('authed')
    } catch {
      // A rejected refresh inside `request` has already cleared the tokens, so this
      // is the real "not signed in" path.
      tokens.clear()
      setProfile(null)
      setStatus('anon')
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  // `api.ts` can't navigate on its own without importing the router, so it announces
  // a dead session and this decides what to do about it.
  useEffect(() => {
    const onLost = () => {
      setProfile(null)
      setStatus('anon')
    }
    window.addEventListener(SESSION_LOST, onLost)
    return () => window.removeEventListener(SESSION_LOST, onLost)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    tokens.set(res.access_token, res.refresh_token)
    await loadProfile()
  }, [loadProfile])

  const signup = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      // Signup deliberately returns no tokens — the account is unusable until the
      // verification link is opened, so this resolves with the message to show.
      const res = await authApi.signup(input)
      return res.message
    },
    [],
  )

  const logout = useCallback(async () => {
    const refreshToken = tokens.refresh
    // Clear locally first: a failed revoke call must not strand the user in a
    // signed-in shell with no working token.
    tokens.clear()
    setProfile(null)
    setStatus('anon')
    if (!refreshToken) return
    try {
      await authApi.logout(refreshToken)
    } catch {
      /* the local session is already gone, which is what the user asked for */
    }
  }, [])

  const patchProfile = useCallback(
    async (input: { name?: string; username?: string; bio?: string; website?: string }) => {
      const res = await authApi.updateProfile(input)
      if (res.user) setProfile(toProfile(res.user))
    },
    [],
  )

  const changePassword = useCallback(
    async (input: {
      current_password: string
      new_password: string
      confirm_new_password: string
    }) => {
      await authApi.changePassword(input)
    },
    [],
  )

  const deleteAccount = useCallback(async () => {
    await authApi.deleteAccount()
    tokens.clear()
    setProfile(null)
    setStatus('anon')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      profile,
      login,
      signup,
      logout,
      refresh: loadProfile,
      patchProfile,
      changePassword,
      deleteAccount,
    }),
    [status, profile, login, signup, logout, loadProfile, patchProfile, changePassword, deleteAccount],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  // Throwing beats returning a silently-useless object — a missing provider is a
  // wiring bug that should surface immediately, not as undefined state later.
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return context
}

export { ApiError }