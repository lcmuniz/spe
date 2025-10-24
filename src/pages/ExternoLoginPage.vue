<template>
  <q-page class="q-pa-md flex flex-center">
    <div class="col-12 col-md-6" style="max-width: 560px; width: 100%">
      <q-card>
        <q-card-section>
          <div class="text-h6">Acesso do Usuário Externo</div>
          <div class="text-subtitle2">Informe seu CPF e chave para acessar seus processos</div>
        </q-card-section>
        <q-card-section>
          <div class="row q-col-gutter-sm">
            <div class="col-12">
              <q-input v-model="cpf" label="CPF" mask="###.###.###-##" fill-input />
            </div>
            <div class="col-12">
              <q-input v-model="chave" label="Chave de acesso" />
            </div>
          </div>
          <div v-if="erro" class="text-negative q-mt-sm">{{ erro }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="primary" :disable="botaoDesabilitado" @click="entrar">
            Entrar
          </q-btn>
        </q-card-actions>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useExternoStore } from 'src/stores/externo-store'

const router = useRouter()
const externo = useExternoStore()

const cpf = ref('')
const chave = ref('')
const erro = ref('')

onMounted(() => {
  externo.initialize()
  if (externo.loggedIn) {
    router.replace('/externo/processos')
  }
})

const botaoDesabilitado = computed(() => !cpf.value || !chave.value)

function entrar() {
  erro.value = ''
  const c = (cpf.value || '').replace(/[^0-9]/g, '')
  externo.setCredenciais(c, chave.value)
  if (!externo.loggedIn) {
    erro.value = 'CPF e chave são obrigatórios'
    return
  }
  router.push('/externo/processos')
}
</script>