import { defineBoot } from '#q-app/wrappers'
import Keycloak from 'keycloak-js'

// Configuração mínima para redirecionar ao login automaticamente
const keycloak = new Keycloak({
  url: 'https://keycloak.tcema.tc.br', // sem ponto final para evitar problemas de TLS
  realm: 'TCE',
  clientId: 'spe',
})

export default defineBoot(async ({ app }) => {
  // Disponibiliza o Keycloak globalmente
  app.config.globalProperties.$keycloak = keycloak
  app.provide('keycloak', keycloak)

  try {
    await keycloak.init({
      onLoad: 'login-required', // força redirecionamento para login ao acessar a aplicação
      pkceMethod: 'S256',
      responseMode: 'query', // evita conflito com router em modo 'hash'
      checkLoginIframe: false,
    })
    console.log('Keycloak inicializado')
  } catch (error) {
    console.error('Falha ao inicializar Keycloak:', error)
  }
})

export { keycloak }
