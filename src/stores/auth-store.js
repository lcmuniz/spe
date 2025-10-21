import { defineStore } from 'pinia'
import { keycloak } from 'src/boot/keycloak'
import { api } from 'boot/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    authenticated: false,
    token: null,
    roles: [],
  }),

  getters: {
    isAuthenticated: (state) => state.authenticated,
    userName: (state) => state.user?.name || state.user?.preferred_username || 'Usuário',
    userEmail: (state) => state.user?.email || '',
    hasRole: (state) => (role) => state.roles.includes(role),
    isAdmin: (state) => state.roles.includes('admin') || state.roles.includes('administrador'),
    isServidor: (state) => state.roles.includes('servidor'),
    isGestor: (state) => state.roles.includes('gestor'),
    isProtocolo: (state) => state.roles.includes('protocolo'),
  },

  actions: {
    async initialize() {
      try {
        if (keycloak?.authenticated) {
          this.authenticated = true
          this.token = keycloak.token

          // Carregar informações do usuário
          try {
            const userProfile = await keycloak.loadUserProfile()
            this.user = userProfile

            // Extrair roles do token
            if (keycloak.tokenParsed) {
              this.roles = keycloak.tokenParsed.realm_access?.roles || []
              // Também pegar roles do cliente se houver
              const clientRoles =
                keycloak.tokenParsed.resource_access?.['spe-frontend']?.roles || []
              this.roles = [...this.roles, ...clientRoles]
            }

            // Upsert do usuário no backend para garantir nome por login
            try {
              const login =
                keycloak?.tokenParsed?.preferred_username ||
                userProfile?.preferred_username ||
                userProfile?.username ||
                null
              const nome =
                [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ').trim() ||
                userProfile?.name ||
                userProfile?.preferred_username ||
                null
              if (login) {
                await api.post('/usuarios/upsert', { login, nome })
                try {
          await api.post('/auditoria', {
            acao: 'auth.login',
            usuarioLogin: login,
            entidade: 'auth',
            entidadeId: login,
            detalhes: { origem: 'initialize' },
          })
        } catch (_e) {
          console.log('Erro ao registrar login no backend:', _e)
        }
              }
            } catch (err) {
              console.warn('Falha ao sincronizar usuário com backend:', err?.message || err)
            }
          } catch (error) {
            console.error('Erro ao carregar perfil do usuário:', error)
          }
        } else {
          this.clearAuth()
        }
      } catch (error) {
        console.warn('Erro ao inicializar auth store:', error)
        this.clearAuth()
      }
    },

    async login() {
      try {
        if (keycloak?.login) {
          await keycloak.login()
        } else {
          console.warn('Keycloak não disponível para login')
        }
      } catch (error) {
        console.error('Erro no login:', error)
      }
    },

    async logout() {
      try {
        const login = keycloak?.tokenParsed?.preferred_username || null
        try {
          await api.post('/auditoria', {
            acao: 'auth.logout',
            usuarioLogin: login,
            entidade: 'auth',
            entidadeId: login || undefined,
          })
        } catch (_e) {
          console.log('Erro ao registrar logout no backend:', _e)
        }

        if (keycloak?.logout) {
          await keycloak.logout()
        }
        this.clearAuth()
      } catch (error) {
        console.error('Erro no logout:', error)
        this.clearAuth()
      }
    },

    clearAuth() {
      this.user = null
      this.authenticated = false
      this.token = null
      this.roles = []
    },

    updateToken() {
      if (keycloak?.authenticated) {
        this.token = keycloak.token
      }
    },
  },
})
