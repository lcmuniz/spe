<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Consultar Processos</div>

    <!-- Barra de filtros -->
    <q-form @submit.prevent="pesquisar" class="q-gutter-sm q-mb-md">
      <div class="row items-center q-col-gutter-sm">
        <div class="col-12 col-md-2">
          <q-input v-model="filters.numero" dense label="Número" clearable />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="filters.assunto" dense label="Assunto" clearable />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="filters.interessado" dense label="Interessado" clearable />
        </div>
        <div class="col-12 col-md-2">
          <q-select
            v-model="filters.status"
            :options="statusOptions"
            dense
            label="Status"
            emit-value
            map-options
            clearable
            @keyup.enter="pesquisar"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-select
            v-model="filters.prioridade"
            :options="prioridadeOptions"
            dense
            label="Prioridade"
            emit-value
            map-options
            clearable
            @keyup.enter="pesquisar"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-select
            v-model="filters.nivelAcesso"
            :options="nivelOptions"
            dense
            label="Nível de Acesso"
            emit-value
            map-options
            clearable
            @keyup.enter="pesquisar"
          />
        </div>
      </div>
      <div class="row items-center q-col-gutter-sm q-mt-sm">
        <div class="col-12 col-md-3">
          <q-select
            v-model="filters.setor"
            :options="setorOptions"
            dense
            label="Setor"
            emit-value
            map-options
            clearable
            @keyup.enter="pesquisar"
          />
        </div>
        <div class="col-6 col-md-2">
          <q-toggle v-model="filters.somenteMeus" dense label="Somente meus" />
        </div>
        <div class="col-6 col-md-2">
          <q-toggle v-model="filters.pendente" dense label="Pendências" />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="filters.pendenteSetor"
            :options="setorOptions"
            dense
            label="Pendência (destino setor)"
            emit-value
            map-options
            clearable
            :disable="!filters.pendente"
            @keyup.enter="pesquisar"
          />
        </div>
        <div class="col-12 col-md-2 text-right">
          <q-btn color="primary" icon="search" label="Pesquisar" type="submit" />
        </div>
      </div>
    </q-form>

    <!-- Resultados -->
    <q-table
      title="Resultados"
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      v-model:pagination="pagination"
      :rows-per-page-options="[10, 20]"
      @update:pagination="updatePagination"
    >
      <template #body-cell-setor="props">
        <q-td :props="props">{{ labelSetor(props.row.setor) }}</q-td>
      </template>
      <template #body-cell-prazo="props">
        <q-td :props="props">
          <span>
            {{
              props.row.prazo
                ? new Date(props.row.prazo).toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                  })
                : '-'
            }}
          </span>
        </q-td>
      </template>
      <template #body-cell-ultimaMovimentacao="props">
        <q-td :props="props">
          <span>
            {{
              props.row.ultimaMovimentacao
                ? new Date(props.row.ultimaMovimentacao).toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                  })
                : '-'
            }}
          </span>
        </q-td>
      </template>
      <template #body-cell-acoes="props">
        <q-td :props="props">
          <q-btn dense flat icon="open_in_new" label="Abrir" @click="abrir(props.row)" />
        </q-td>
      </template>
      <template #no-data>
        <div class="full-width q-pa-lg text-center text-grey">
          <q-icon name="search" size="32px" class="q-mb-sm" />
          <div>
            {{
              hasActiveFilter()
                ? 'Nenhum processo encontrado para os filtros informados'
                : 'Preencha ao menos um filtro para buscar processos'
            }}
          </div>
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { listarProcessos } from 'src/services/processosService'
import { listarSetores } from 'src/services/catalogService'
import { getUsuarioLoginFromKeycloak } from 'src/services/authService'

const $q = useQuasar()
const router = useRouter()
const keycloak = inject('keycloak', null)

function normalizeSector(val) {
  return String(val || '')
    .toUpperCase()
    .replace(/^\/+/, '')
}
function labelSetor(sigla) {
  const s = normalizeSector(sigla)
  const opt = (setorOptions.value || []).find((o) => normalizeSector(o.value) === s)
  return opt?.label || s || ''
}
function getUsuario() {
  return getUsuarioLoginFromKeycloak(keycloak)
}

const statusOptions = ['Em instrução', 'Aguardando', 'Concluso']
const prioridadeOptions = ['Baixa', 'Normal', 'Alta', 'Urgente']
const nivelOptions = ['Público', 'Restrito', 'Sigiloso']
const setorOptions = ref([])

const filters = ref({
  numero: '',
  assunto: '',
  interessado: '',
  status: null,
  prioridade: null,
  nivelAcesso: null,
  setor: null,
  somenteMeus: false,
  pendente: false,
  pendenteSetor: null,
})

function hasActiveFilter() {
  const f = filters.value
  return Boolean(
    (f.numero && f.numero.trim() !== '') ||
      (f.assunto && f.assunto.trim() !== '') ||
      (f.interessado && f.interessado.trim() !== '') ||
      f.status ||
      f.prioridade ||
      f.nivelAcesso ||
      f.setor ||
      f.somenteMeus ||
      f.pendente ||
      (f.pendente && f.pendenteSetor),
  )
}

const rows = ref([])
const loading = ref(false)
const pagination = ref({ page: 1, rowsPerPage: 10 })

const columns = [
  { name: 'numero', label: 'Nº Processo', field: 'numero', align: 'left' },
  { name: 'assunto', label: 'Assunto', field: 'assunto', align: 'left' },
  { name: 'interessado', label: 'Interessado', field: 'interessado', align: 'left' },
  { name: 'setor', label: 'Setor Atual', field: 'setor', align: 'left' },
  { name: 'atribuidoA', label: 'Atribuído a', field: 'atribuidoA', align: 'left' },
  { name: 'prioridade', label: 'Prioridade', field: 'prioridade', align: 'left' },
  { name: 'prazo', label: 'Prazo', field: 'prazo', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'nivelAcesso', label: 'Nível Acesso', field: 'nivelAcesso', align: 'left' },
  {
    name: 'ultimaMovimentacao',
    label: 'Última Movimentação',
    field: 'ultimaMovimentacao',
    align: 'left',
  },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' },
]

async function loadSetoresOptions() {
  try {
    const data = await listarSetores()
    setorOptions.value = (data || []).map((s) => ({ label: s.nome, value: s.sigla }))
  } catch (e) {
    console.error('Falha ao carregar setores', e)
    setorOptions.value = []
  }
}

async function fetchData() {
  if (!hasActiveFilter()) {
    rows.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    const somenteMeusOn = filters.value.somenteMeus === true
    const params = {
      numero: filters.value.numero || undefined,
      assunto: filters.value.assunto || undefined,
      interessado: filters.value.interessado || undefined,
      status: filters.value.status || undefined,
      prioridade: filters.value.prioridade || undefined,
      nivelAcesso: filters.value.nivelAcesso || undefined,
      setor: filters.value.setor || undefined,
      pendente: filters.value.pendente ? 'true' : undefined,
      pendenteSetor:
        filters.value.pendente && filters.value.pendenteSetor
          ? filters.value.pendenteSetor
          : undefined,
      somenteMeus: somenteMeusOn ? 'true' : undefined,
      usuario: somenteMeusOn ? getUsuario() : undefined,
      page: pagination.value.page,
      pageSize: pagination.value.rowsPerPage,
    }
    const data = await listarProcessos(params)
    rows.value = Array.isArray(data) ? data : data?.items || data || []
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Falha ao carregar processos' })
  } finally {
    loading.value = false
  }
}

function resetAndFetch() {
  pagination.value.page = 1
  if (hasActiveFilter()) {
    fetchData()
  } else {
    rows.value = []
    loading.value = false
  }
}
function pesquisar() {
  resetAndFetch()
}
function updatePagination(p) {
  pagination.value = p
  if (hasActiveFilter()) {
    fetchData()
  }
}
function abrir(row) {
  router.push(`/processo/${row.id}`)
}

onMounted(async () => {
  await loadSetoresOptions()
})
</script>

<style scoped></style>
