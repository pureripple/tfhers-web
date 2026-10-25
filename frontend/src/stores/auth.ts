import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Scaffold-only auth placeholder — JWT wiring comes later. */
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const isLoggedIn = () => Boolean(token.value)
  function setToken(value: string | null) {
    token.value = value
  }
  return { token, isLoggedIn, setToken }
})
