<template>
  <q-page class="flex flex-center">
    <div class="column items-center q-gutter-y-md">
      <div class="text-h5">Bem-vindo</div>
      <a href="#" @click.prevent="logout">Sair</a>
    </div>
  </q-page>
</template>

<script setup>
import { inject } from 'vue'
import { logout as logoutAuth } from 'src/services/authService'

const keycloak = inject('keycloak', null)

function logout() {
  logoutAuth(keycloak)
}
</script>
