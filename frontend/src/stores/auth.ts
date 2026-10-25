import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchAdminUserInfo, loginAdmin, loginUser, logoutAdminRemote, registerUser } from '@/api/auth'
import type { AdminUserInfo, UserInfo } from '@/api/types'

const USER_KEY = 'user'
const ADMIN_TOKEN_KEY = 'admin_token'

function readStoredUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UserInfo
  } catch {
    return null
  }
}

export const useUserAuthStore = defineStore('userAuth', () => {
  const user = ref<UserInfo | null>(readStoredUser())

  const token = computed(() => user.value?.token || null)
  /** Vue API calls need a token; shell chrome follows the same rule. */
  const isLoggedIn = computed(() => Boolean(token.value))

  function hydrate() {
    user.value = readStoredUser()
  }

  function persist(data: UserInfo) {
    user.value = data
    localStorage.setItem(USER_KEY, JSON.stringify(data))
  }

  async function login(username: string, password: string) {
    const data = await loginUser(username, password)
    persist(data)
    return data
  }

  /** Register then auto-login (legacy behavior). */
  async function register(payload: {
    username: string
    nickname: string
    password: string
    email?: string
  }) {
    await registerUser(payload)
    return login(payload.username, payload.password)
  }

  function logout() {
    user.value = null
    localStorage.removeItem(USER_KEY)
  }

  return { user, token, isLoggedIn, hydrate, login, register, logout }
})

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const token = ref<string | null>(localStorage.getItem(ADMIN_TOKEN_KEY))
  const userInfo = ref<AdminUserInfo | null>(null)

  const isLoggedIn = computed(() => Boolean(token.value))

  function hydrate() {
    token.value = localStorage.getItem(ADMIN_TOKEN_KEY)
  }

  async function login(username: string, password: string) {
    const data = await loginAdmin(username, password)
    token.value = data.token
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
    userInfo.value = data.userInfo || null
    if (!userInfo.value) {
      try {
        userInfo.value = await fetchAdminUserInfo()
      } catch {
        // token is enough for route guards; profile can load later
      }
    }
    return data
  }

  async function loadUserInfo() {
    if (!token.value) return null
    userInfo.value = await fetchAdminUserInfo()
    return userInfo.value
  }

  async function logout() {
    try {
      await logoutAdminRemote()
    } catch {
      // ignore remote logout failures
    }
    token.value = null
    userInfo.value = null
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  }

  return { token, userInfo, isLoggedIn, hydrate, login, logout, loadUserInfo }
})
