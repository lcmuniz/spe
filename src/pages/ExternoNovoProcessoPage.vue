<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6">Iniciar novo processo</div>
        <div class="text-subtitle2 q-mb-sm">Preencha os dados básicos.</div>
      </div>
    </div>

    <q-form @submit="onSubmit" @reset="onReset" class="q-gutter-md">
      <q-input
        v-model="form.assunto"
        label="Assunto"
        :rules="[(val) => !!val || 'Assunto é obrigatório']"
        filled
      />
      <!-- Troca de input por select com opções do catálogo -->
      <q-select
        v-model="form.tipo"
        :options="tipoOptions"
        label="Tipo"
        filled
        emit-value
        map-options
        :rules="[(val) => !!val || 'Tipo é obrigatório']"
      />
      <q-input v-model="form.observacoes" label="Observações" type="textarea" filled />

      <div class="row justify-end q-gutter-sm">
        <q-btn type="reset" label="Limpar" color="grey-7" flat />
        <q-btn :loading="loading" type="submit" label="Salvar e voltar" color="primary" />
      </div>
    </q-form>
  </q-page>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { criarProcessoExterno } from 'src/services/processosService'
import { useExternoStore } from 'src/stores/externo-store'
import { listarTiposProcesso } from 'src/services/catalogService'

const $q = useQuasar()
const router = useRouter()
const externo = useExternoStore()

const tipoOptions = ref([])

const form = reactive({
  tipo: 'Processo',
  assunto: '',
  observacoes: '',
})
const loading = ref(false)

onMounted(async () => {
  externo.initialize()
  if (!externo.loggedIn) {
    router.push('/externo')
    return
  }
  await loadTipoOptions()
})

async function loadTipoOptions() {
  try {
    const data = await listarTiposProcesso()
    const arr = Array.isArray(data) ? data : []
    tipoOptions.value = arr.map((n) => ({ label: n, value: n }))
    // Ajusta valor inicial se não estiver na lista
    const valores = new Set(arr)
    if (!valores.has(form.tipo)) {
      form.tipo = arr[0] || 'Processo'
    }
  } catch (e) {
    console.error('Falha ao carregar tipos de processo', e)
    tipoOptions.value = [{ label: 'Processo', value: 'Processo' }]
    form.tipo = 'Processo'
  }
}

function onReset() {
  form.tipo = 'Processo'
  form.assunto = ''
  form.observacoes = ''
}

async function onSubmit() {
  if (!form.assunto) {
    $q.notify({ type: 'negative', message: 'Assunto é obrigatório' })
    return
  }
  if (!form.tipo) {
    $q.notify({ type: 'negative', message: 'Tipo é obrigatório' })
    return
  }
  loading.value = true
  try {
    const created = await criarProcessoExterno(
      { assunto: form.assunto, tipo: form.tipo, observacoes: form.observacoes },
      { cpf: externo.cpf, chave: externo.chave },
    )
    $q.notify({
      type: 'positive',
      message: `Processo ${created.numero} criado e pendente no PROTOCOLO.`,
    })
    router.push('/externo/processos')
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e?.response?.data?.error || e.message || 'Falha ao criar processo',
    })
  } finally {
    loading.value = false
  }
}
</script>
