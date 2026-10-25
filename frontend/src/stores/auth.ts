import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchAdminUserInfo, loginAdmin, loginUser, logoutAdminRemote } from '@/api/auth'
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
  const isLoggedIn = computed(() => Boolean(token.value))

  function hydrate() {
    user.value = readStoredUser()
  }

  async function login(username: string, password: string) {
    const data = await loginUser(username, password)
    user.value = data
    localStorage.setItem(USER_KEY, JSON.stringify(data))
    return data
  }

  function logout() {
    user.value = null
    localStorage.removeItem(USER_KEY)
  }

  return { user, token, isLoggedIn, hydrate, login, logout }
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
