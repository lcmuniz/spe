<template>
  <q-page class="q-pa-md">
    <q-toolbar class="bg-primary text-white q-mb-md">
      <q-btn flat round dense icon="arrow_back" @click="voltar" />
      <q-toolbar-title class="flex items-center">
        <q-icon name="attach_file" class="q-mr-sm" />
        Anexar documentos ao processo {{ numero }}
      </q-toolbar-title>
      <div class="row items-center q-gutter-sm">
        <q-chip v-if="usuarioNome" icon="person" color="white" text-color="primary" :label="usuarioNome" />
      </div>
      <div class="col-auto flex items-center q-gutter-sm">
        <q-btn icon="logout" flat @click="logout" />
      </div>
    </q-toolbar>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-subtitle1">Adicionar novo documento</div>
            <div class="text-caption">O documento ficará em 'aguardando análise'</div>
          </q-card-section>
          <q-card-section>
            <q-form @submit.prevent="enviar" class="q-gutter-md">
              <q-input v-model="titulo" label="Título (opcional)" />
              <q-file v-model="arquivo" label="Selecionar arquivo" filled use-chips :disable="submetendo" />
              <div class="row justify-end">
                <q-btn color="primary" :loading="submetendo" type="submit" label="Enviar" :disable="!arquivo" />
              </div>
            </q-form>
            <div v-if="erroUpload" class="text-negative q-mt-sm">{{ erroUpload }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-subtitle1">Documentos anexados</div>
          </q-card-section>
          <q-card-section>
            <q-table
              flat
              bordered
              :rows="anexos"
              :columns="columns"
              row-key="id"
              :loading="carregando"
              :pagination="{ rowsPerPage: 10 }"
              no-data-label="Nenhum documento anexado"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge :color="statusColor(props.value)" :label="mapStatus(props.value)" />
                </q-td>
              </template>
              <template v-slot:body-cell-motivo="props">
                <q-td :props="props">
                  <span v-if="props.row.status === 'rejeitado' && props.value">{{ props.value }}</span>
                  <span v-else>—</span>
                </q-td>
              </template>
            </q-table>
            <div v-if="erroLista" class="text-negative q-mt-sm">{{ erroLista }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useExternoStore } from 'src/stores/externo-store'
import { fileToBase64 } from 'src/utils/file'
import {
  listarDocumentosExternosTemporarios,
  anexarDocumentoExternoTemporario,
} from 'src/services/externoDocsService'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const externo = useExternoStore()

const numero = computed(() => route.params.numero)
const anexos = ref([])
const carregando = ref(false)
const erroLista = ref('')
const arquivo = ref(null)
const titulo = ref('')
const submetendo = ref(false)
const erroUpload = ref('')

const usuarioNome = computed(() => externo?.nome || '')

const columns = [
  { name: 'fileName', label: 'Arquivo', field: 'fileName', align: 'left' },
  {
    name: 'criadoEm',
    label: 'Enviado em',
    field: 'criadoEm',
    align: 'left',
    format: (val) => (val ? new Date(val).toLocaleString() : ''),
  },
  {
    name: 'status',
    label: 'Status',
    field: 'status',
    align: 'left',
  },
  {
    name: 'motivo',
    label: 'Motivo',
    field: 'motivo',
    align: 'left',
  },
]

function mapStatus(s) {
  switch (String(s || '').toLowerCase()) {
    case 'aguardando_analise':
      return 'Aguardando análise'
    case 'juntado':
      return 'Juntado ao processo'
    case 'rejeitado':
      return 'Rejeitado'
    default:
      return s || ''
  }
}
function statusColor(s) {
  switch (String(s || '').toLowerCase()) {
    case 'aguardando_analise':
      return 'warning'
    case 'juntado':
      return 'positive'
    case 'rejeitado':
      return 'negative'
    default:
      return 'grey-6'
  }
}

onMounted(async () => {
  externo.initialize()
  if (!externo.loggedIn) {
    router.replace('/externo/login')
    return
  }
  await carregar()
})

async function carregar() {
  erroLista.value = ''
  carregando.value = true
  try {
    const lista = await listarDocumentosExternosTemporarios({
      numero: numero.value,
      cpf: externo.cpf,
      chave: externo.chave,
    })
    anexos.value = Array.isArray(lista) ? lista : []
  } catch (e) {
    erroLista.value = e?.response?.data?.error || e?.message || 'Falha ao listar anexos'
    anexos.value = []
  } finally {
    carregando.value = false
  }
}

async function enviar() {
  erroUpload.value = ''
  if (!arquivo.value) return
  submetendo.value = true
  try {
    const base64 = await fileToBase64(arquivo.value)
    await anexarDocumentoExternoTemporario({
      numero: numero.value,
      cpf: externo.cpf,
      chave: externo.chave,
      fileName: arquivo.value.name,
      contentBase64: base64,
      titulo: titulo.value?.trim() || undefined,
    })
    $q.notify({ type: 'positive', message: 'Documento anexado com sucesso' })
    arquivo.value = null
    titulo.value = ''
    await carregar()
  } catch (e) {
    erroUpload.value = e?.response?.data?.error || e?.message || 'Falha ao anexar documento'
    $q.notify({ type: 'negative', message: erroUpload.value })
  } finally {
    submetendo.value = false
  }
}

function voltar() {
  router.back()
}

function logout() {
  externo.clear()
  router.replace('/externo/login')
}
</script>