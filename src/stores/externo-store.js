import { defineStore } from 'pinia'

const STORAGE_KEY = 'spe_externo_sessao'

export const useExternoStore = defineStore('externo', {
  state: () => ({
    cpf: '',
    chave: '',
    loggedIn: false,
  }),
  getters: {
    hasCredenciais: (state) => !!state.cpf && !!state.chave,
  },
  actions: {
    initialize() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          this.cpf = parsed?.cpf || ''
          this.chave = parsed?.chave || ''
          this.loggedIn = !!(this.cpf && this.chave)
        }
      } catch (_e) {
        // ignore
      }
    },
    setCredenciais(cpf, chave) {
      this.cpf = String(cpf || '').trim()
      this.chave = String(chave || '').trim()
      this.loggedIn = !!(this.cpf && this.chave)
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ cpf: this.cpf, chave: this.chave }))
      } catch (_e) {
        // ignore
      }
    },
    clear() {
      this.cpf = ''
      this.chave = ''
      this.loggedIn = false
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch (_e) {
        // ignore
      }
    },
  },
})