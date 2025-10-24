const routes = [
  // Rotas principais usando layout com menu lateral
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: 'protocolo', component: () => import('pages/ProtocoloPage.vue') },
      { path: 'consultar', component: () => import('pages/ConsultarPage.vue') },
      { path: 'processo/:id', component: () => import('pages/ProcessoViewPage.vue') },
      { path: 'cadastro-partes', component: () => import('pages/CadastroPartesPage.vue') },
    ],
  },

  // Rota pública (sem autenticação obrigatória)
  {
    path: '/publico',
    component: () => import('layouts/BlankLayout.vue'),
    children: [
      { path: 'consulta', component: () => import('pages/ConsultaExternaPage.vue') },
    ],
  },

  // Área do usuário externo
  {
    path: '/externo',
    component: () => import('layouts/BlankLayout.vue'),
    children: [
      { path: '', redirect: '/externo/login' },
      { path: 'login', component: () => import('pages/ExternoLoginPage.vue') },
      { path: 'processos', component: () => import('pages/ExternoProcessosPage.vue') },
      { path: 'processo/:numero/documentos', component: () => import('pages/ExternoDocumentosPage.vue') },
    ],
  },

  // 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
