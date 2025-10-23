<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated v-if="authStore.isAuthenticated">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title class="flex items-center">
          <q-icon name="gavel" class="q-mr-sm" />
          SPE - Sistema de Processos Eletrônicos
        </q-toolbar-title>

        <div class="flex items-center q-gutter-sm">
          <q-chip
            :icon="getUserIcon()"
            color="white"
            text-color="primary"
            :label="authStore.userName"
            clickable
            @click="openUserInfo"
          />

          <q-btn flat round icon="logout" @click="handleLogout">
            <q-tooltip>Sair do Sistema</q-tooltip>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <!-- Dialogo de Informações do Usuário -->
    <q-dialog v-model="userInfoDialog">
      <q-card style="min-width: 360px">
        <q-card-section class="row items-center">
          <q-avatar icon="person" color="primary" text-color="white" />
          <div class="q-ml-sm">
            <div class="text-subtitle1">{{ authStore.userName }}</div>
            <div class="text-caption">{{ authStore.userEmail }}</div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="q-mb-sm"><span class="text-bold">Setor:</span> {{ userSector }}</div>
          <div>
            <span class="text-bold">Roles:</span>
            <div class="q-gutter-xs q-mt-xs">
              <q-badge v-for="r in authStore.roles" :key="r" color="primary" outline>{{
                r
              }}</q-badge>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fechar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered v-if="authStore.isAuthenticated">
      <q-list>
        <q-item-label header class="text-primary">
          <q-icon name="dashboard" class="q-mr-sm" />
          Menu Principal
        </q-item-label>

        <q-item
          clickable
          v-ripple
          @click="$router.push('/dashboard')"
          :class="$route.path === '/dashboard' ? 'bg-primary text-white' : ''"
        >
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Dashboard</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item
          clickable
          v-ripple
          @click="$router.push('/protocolo')"
          :class="$route.path === '/protocolo' ? 'bg-primary text-white' : ''"
        >
          <q-item-section avatar>
            <q-icon name="add_circle" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Novo Processo</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="$router.push('/cadastro-partes')"
          :class="$route.path === '/cadastro-partes' ? 'bg-primary text-white' : ''"
        >
          <q-item-section avatar>
            <q-icon name="person_add" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Cadastro de Partes</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="$router.push('/consultar')"
          :class="$route.path === '/consultar' ? 'bg-primary text-white' : ''"
        >
          <q-item-section avatar>
            <q-icon name="search" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Consultar</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item-label header class="text-grey-7" v-if="authStore.isAdmin">
          Administração
        </q-item-label>

        <q-item
          clickable
          v-ripple
          @click="$q.notify('Em desenvolvimento')"
          v-if="authStore.isAdmin"
        >
          <q-item-section avatar>
            <q-icon name="admin_panel_settings" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Configurações</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, inject, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth-store'
import { api } from 'boot/axios'
import { useRoute } from 'vue-router'

const $q = useQuasar()
const authStore = useAuthStore()
const leftDrawerOpen = ref(false)

const keycloak = inject('keycloak', null)
const userInfoDialog = ref(false)

const userSector = ref('Não disponível')
const route = useRoute()

function getUsuarioLogin() {
  // Preferir username do token, depois do perfil do authStore
  return (
    keycloak?.tokenParsed?.preferred_username ||
    authStore.user?.preferred_username ||
    authStore.user?.username ||
    null
  )
}

async function loadUserSectorFromApi() {
  try {
    const login = getUsuarioLogin()
    if (!login) {
      userSector.value = 'Não identificado'
      return
    }
    const resp = await api.get('/usuarios', { params: { login } })
    const setor = resp.data?.setor
    userSector.value = String(setor || 'Não identificado')
      .toUpperCase()
      .replace(/^\/+/, '')
  } catch (err) {
    console.error('Falha ao obter setor do usuário via API', err)
    userSector.value = 'Não identificado'
  }
}

onMounted(async () => {
  await authStore.initialize()
  await loadUserSectorFromApi()
})

// Fechar automaticamente o menu na visualização de processo
watch(
  () => route.path,
  (newPath) => {
    if (newPath?.startsWith('/processo/')) {
      leftDrawerOpen.value = false
    }
  },
  { immediate: true },
)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function getUserIcon() {
  if (authStore.isAdmin) return 'admin_panel_settings'
  if (authStore.isGestor) return 'supervisor_account'
  if (authStore.isProtocolo) return 'assignment'
  return 'person'
}

function openUserInfo() {
  userInfoDialog.value = true
}

async function handleLogout() {
  $q.dialog({
    title: 'Confirmar Saída',
    message: 'Deseja realmente sair do sistema?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await authStore.logout()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      $q.notify({
        type: 'negative',
        message: 'Erro ao sair do sistema',
      })
    }
  })
}
</script>
