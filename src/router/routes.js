const routes = [
  // Rotas principais usando layout com menu lateral
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: 'protocolo', component: () => import('pages/ProtocoloPage.vue') },
      { path: 'processo/:id', component: () => import('pages/ProcessoViewPage.vue') },
    ],
  },

  // 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
