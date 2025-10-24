<template>
  <q-page class="q-pa-md">
    <q-toolbar class="bg-primary text-white q-mb-md">
      <q-toolbar-title class="flex items-center">
        <q-icon name="gavel" class="q-mr-sm" />
        SPE - Sistema de Processos Eletrônicos
      </q-toolbar-title>
      <div class="row items-center q-gutter-sm">
        <q-chip
          v-if="usuarioNome"
          icon="person"
          color="white"
          text-color="primary"
          :label="usuarioNome"
        />
      </div>
      <div class="col-auto flex items-center q-gutter-sm">
        <q-btn icon="logout" flat @click="logout" />
      </div>
    </q-toolbar>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card>
          <q-card-section class="row items-center no-wrap">
            <div class="col">
              <div class="text-h6">Meus processos</div>
              <div class="text-caption">Sessão ativa</div>
            </div>
          </q-card-section>
          <q-card-section>
            <q-table
              flat
              bordered
              :rows="processos"
              :columns="columns"
              row-key="id"
              :loading="carregando"
              :pagination="{ rowsPerPage: 10 }"
              no-data-label="Nenhum processo encontrado"
            >
              <template v-slot:body-cell-acoes="props">
                <q-td :props="props">
                  <q-btn
                    round
                    dense
                    color="primary"
                    icon="visibility"
                    @click="visualizarProcesso(props.row)"
                  />
                  <q-btn
                    round
                    dense
                    color="secondary"
                    class="q-ml-xs"
                    icon="attach_file"
                    @click="abrirUploadDocumentos(props.row)"
                    :title="'Anexar documentos'"
                  />
                </q-td>
              </template>
            </q-table>
            <div v-if="erro" class="text-negative q-mt-sm">{{ erro }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExternoStore } from 'src/stores/externo-store'
import { listarMeusProcessosPorCpfChave } from 'src/services/processosService'

const externo = useExternoStore()
const router = useRouter()

const processos = ref([])
const carregando = ref(false)
const erro = ref('')

const usuarioNome = computed(() => {
  const nome =
    (processos.value || []).find((p) => !!(p?.meuNome && String(p.meuNome).trim()))?.meuNome || ''
  return String(nome || '').trim()
})

const columns = [
  { name: 'numero', label: 'Número', field: 'numero', align: 'left' },
  { name: 'assunto', label: 'Assunto', field: 'assunto', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'nivelAcesso', label: 'Acesso', field: 'nivelAcesso', align: 'left' },
  { name: 'meuPapel', label: 'Meu papel', field: 'meuPapel', align: 'left' },
  {
    name: 'ultimaMovimentacao',
    label: 'Última mov.',
    field: 'ultimaMovimentacao',
    align: 'left',
    format: (val) => (val ? new Date(val).toLocaleString() : ''),
  },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'center' },
]

onMounted(async () => {
  externo.initialize()
  if (!externo.loggedIn) {
    router.replace('/externo/login')
    return
  }
  await carregar()
})

async function carregar() {
  erro.value = ''
  carregando.value = true
  try {
    const lista = await listarMeusProcessosPorCpfChave({ cpf: externo.cpf, chave: externo.chave })
    processos.value = Array.isArray(lista) ? lista : []
  } catch (e) {
    erro.value = e?.response?.data?.error || e?.message || 'Falha ao listar processos'
    processos.value = []
  } finally {
    carregando.value = false
  }
}

function logout() {
  externo.clear()
  router.replace('/externo/login')
}

function visualizarProcesso(row) {
  const numero = row?.numero || ''
  const query = { modo: 'RESTRITO', numero }
  if (externo?.cpf) query.cpf = externo.cpf
  if (externo?.chave) query.chave = externo.chave
  const routeUrl = router.resolve({ path: '/publico/consulta', query }).href
  window.open(routeUrl, '_blank')
}

function abrirUploadDocumentos(row) {
  const numero = row?.numero
  if (!numero) return
  router.push(`/externo/processo/${encodeURIComponent(numero)}/documentos`)
}
</script>
