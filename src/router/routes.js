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

  // 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
