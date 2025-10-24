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
            <div class="col-auto">
              <q-btn
                color="primary"
                icon="add_circle"
                label="Iniciar novo processo"
                @click="iniciarNovoProcesso"
              />
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

    <!-- Diálogo: Iniciar novo processo -->
    <q-dialog v-model="novoDialogOpen">
      <q-card style="min-width: 600px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Iniciar novo processo</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="novoForm.tipo"
            :options="tipoOptions"
            label="Tipo do processo"
            emit-value
            map-options
          />
          <q-input v-model="novoForm.assunto" label="Assunto" />
          <q-input v-model="novoForm.observacoes" type="textarea" autogrow label="Observações" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Criar" :loading="novoLoading" @click="novoSubmit" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useExternoStore } from 'src/stores/externo-store'
import { listarMeusProcessosPorCpfChave, criarProcessoExterno } from 'src/services/processosService'
import { listarTiposProcesso } from 'src/services/catalogService'

const externo = useExternoStore()
const router = useRouter()
const $q = useQuasar()

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

const novoDialogOpen = ref(false)
const novoLoading = ref(false)
const tipoOptions = ref([])
const novoForm = reactive({ tipo: 'Processo', assunto: '', observacoes: '' })

onMounted(async () => {
  externo.initialize()
  if (!externo.loggedIn) {
    router.replace('/externo/login')
    return
  }
  await carregar()
  await loadTipoOptions()
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

async function loadTipoOptions() {
  try {
    const data = await listarTiposProcesso()
    const arr = Array.isArray(data) ? data : []
    tipoOptions.value = arr.map((n) => ({ label: n, value: n }))
    const valores = new Set(arr)
    if (!valores.has(novoForm.tipo)) {
      novoForm.tipo = arr[0] || 'Processo'
    }
  } catch (e) {
    console.error('Falha ao carregar tipos de processo', e)
    tipoOptions.value = [{ label: 'Processo', value: 'Processo' }]
    novoForm.tipo = 'Processo'
  }
}

function novoOnReset() {
  novoForm.tipo = 'Processo'
  novoForm.assunto = ''
  novoForm.observacoes = ''
}

async function novoSubmit() {
  if (!novoForm.assunto) {
    $q.notify({ type: 'negative', message: 'Assunto é obrigatório' })
    return
  }
  if (!novoForm.tipo) {
    $q.notify({ type: 'negative', message: 'Tipo é obrigatório' })
    return
  }
  novoLoading.value = true
  try {
    const created = await criarProcessoExterno(
      { assunto: novoForm.assunto, tipo: novoForm.tipo, observacoes: novoForm.observacoes },
      { cpf: externo.cpf, chave: externo.chave },
    )
    $q.notify({
      type: 'positive',
      message: `Processo ${created.numero} criado e pendente no PROTOCOLO.`,
    })
    novoDialogOpen.value = false
    novoOnReset()
    await carregar()
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e?.response?.data?.error || e.message || 'Falha ao criar processo',
    })
  } finally {
    novoLoading.value = false
  }
}

async function iniciarNovoProcesso() {
  novoOnReset()
  await loadTipoOptions()
  novoDialogOpen.value = true
}
</script>
