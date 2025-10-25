export function getUsuarioLoginFromKeycloak(keycloak) {
  return keycloak?.tokenParsed?.preferred_username || null
}

export function logout(keycloak) {
  if (keycloak?.logout) {
    keycloak.logout({ redirectUri: window.location.origin })
  } else {
    const base = import.meta.env.VITE_KEYCLOAK_URL || 'https://keycloak.tcema.tc.br'
    const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'TCE'
    const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'spe'
    const url = `${base}/realms/${realm}/protocol/openid-connect/logout?client_id=${encodeURIComponent(clientId)}&post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`
    window.location.href = url
  }
}