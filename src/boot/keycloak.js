import { defineBoot } from '#q-app/wrappers'
import Keycloak from 'keycloak-js'

// Configuração mínima para redirecionar ao login automaticamente
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'https://keycloak.tcema.tc.br'
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'TCE'
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'spe'

const keycloak = new Keycloak({
  url: KEYCLOAK_URL,
  realm: KEYCLOAK_REALM,
  clientId: KEYCLOAK_CLIENT_ID,
})

export default defineBoot(async ({ app }) => {
  // Disponibiliza o Keycloak globalmente
  app.config.globalProperties.$keycloak = keycloak
  app.provide('keycloak', keycloak)

  try {
    // Permitir acesso anônimo nas rotas públicas/externas
    const hash = typeof window !== 'undefined' ? String(window.location.hash || '') : ''
    const href = typeof window !== 'undefined' ? String(window.location.href || '') : ''
    const isPublicRoute =
      hash.startsWith('#/publico') ||
      href.includes('/#/publico') ||
      hash.startsWith('#/externo') ||
      href.includes('/#/externo')

    await keycloak.init({
      onLoad: isPublicRoute ? 'check-sso' : 'login-required',
      pkceMethod: 'S256',
      responseMode: 'query', // evita conflito com router em modo 'hash'
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    })
    console.log('Keycloak inicializado', { isPublicRoute })
  } catch (error) {
    console.error('Falha ao inicializar Keycloak:', error)
  }
})

export { keycloak }
