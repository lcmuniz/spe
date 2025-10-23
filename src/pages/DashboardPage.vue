<template>
  <q-page class="q-pa-md">
    <!-- Top Bar de Filtros -->
    <div class="q-gutter-sm q-mb-md">
      <div class="row items-center q-col-gutter-sm">
        <div class="col-12 col-md-2">
          <q-input
            v-model="filters.numero"
            dense
            label="Número"
            clearable
            @update:model-value="refresh"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-input
            v-model="filters.assunto"
            dense
            label="Assunto"
            clearable
            @update:model-value="refresh"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-input
            v-model="filters.interessado"
            dense
            label="Interessado"
            clearable
            @update:model-value="refresh"
          />
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
            @update:model-value="refresh"
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
            @update:model-value="refresh"
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
            @update:model-value="refresh"
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
            @update:model-value="refresh"
          />
        </div>
        <div class="col-12 col-md-6 text-right">
          <q-btn flat icon="refresh" label="Atualizar" @click="resetAndFetch" />
        </div>
      </div>
    </div>

    <!-- Abas com contadores -->
    <q-tabs v-model="tab" class="text-primary q-mb-md" dense>
      <q-tab name="setor" :label="`Setor (${counts.setor})`" />
      <q-tab name="meus" :label="`Meus (${counts.meus})`" />
      <q-tab name="pendencias" :label="`Pendências (${counts.pendencias})`" />
    </q-tabs>

    <!-- Tabela -->
    <q-table
      title="Processos"
      :rows="displayRows"
      :columns="columns"
      row-key="id"
      selection="multiple"
      v-model:selected="selected"
      :loading="loading"
      :pagination="pagination"
      :rows-per-page-options="[10, 20]"
    >
      <template #body-cell-acoes="props">
        <q-td :props="props">
          <q-btn dense flat icon="more_vert">
            <q-menu>
              <q-list style="min-width: 200px">
                <q-item clickable v-ripple @click="abrir(props.row)"
                  ><q-item-section> Abrir </q-item-section></q-item
                >
                <q-item
                  v-if="isPendenteParaMim(props.row)"
                  clickable
                  v-ripple
                  @click="aceitarPendencia(props.row)"
                  ><q-item-section> Aceitar </q-item-section></q-item
                >
                <q-item
                  v-if="isPendenteParaMim(props.row)"
                  clickable
                  v-ripple
                  @click="recusarPendencia(props.row)"
                  ><q-item-section> Recusar pendência </q-item-section></q-item
                >
                <q-item
                  v-if="props.row.pendente !== true"
                  clickable
                  v-ripple
                  @click="tramitar(props.row)"
                  ><q-item-section> Tramitar </q-item-section></q-item
                >
                <q-item
                  v-if="props.row.pendente !== true"
                  clickable
                  v-ripple
                  @click="atribuir(props.row)"
                  ><q-item-section> Atribuir </q-item-section></q-item
                >
                <q-item
                  v-if="props.row.pendente !== true"
                  clickable
                  v-ripple
                  @click="marcarPrioridade(props.row)"
                  ><q-item-section> Marcar prioridade </q-item-section></q-item
                >
                <q-item clickable v-ripple @click="historico(props.row)"
                  ><q-item-section> Histórico </q-item-section></q-item
                >
              </q-list>
            </q-menu>
          </q-btn>
        </q-td>
      </template>

      <template #body-cell-nivelAcesso="props">
        <q-td :props="props">
          <q-badge v-if="props.row.nivelAcesso === 'Restrito'" color="orange" label="Restrito" />
          <q-badge v-else-if="props.row.nivelAcesso === 'Sigiloso'" color="red" label="Sigiloso" />
          <span v-else>{{ props.row.nivelAcesso }}</span>
        </q-td>
      </template>

      <template #body-cell-prazo="props">
        <q-td :props="props">
          <span>{{
            props.row.prazo
              ? new Date(props.row.prazo).toLocaleDateString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                })
              : '-'
          }}</span>
        </q-td>
      </template>

      <template #body-cell-ultimaMovimentacao="props">
        <q-td :props="props">
          <span>{{
            props.row.ultimaMovimentacao
              ? new Date(props.row.ultimaMovimentacao).toLocaleDateString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                })
              : '-'
          }}</span>
        </q-td>
      </template>

      <template #bottom>
        <div class="row items-center q-gutter-sm q-pa-sm full-width">
          <q-btn
            dense
            color="primary"
            :disable="selected.length === 0"
            label="Tramitar seleção"
            @click="tramitarSelecao"
          />
          <q-btn
            dense
            color="primary"
            :disable="selected.length === 0"
            label="Atribuir seleção"
            @click="atribuirSelecao"
          />
          <q-space />
          <q-btn dense flat icon="refresh" label="Recarregar" @click="resetAndFetch" />
        </div>
      </template>

      <template #no-data>
        <div class="full-width q-pa-lg text-center text-grey">
          <q-icon name="inbox" size="32px" class="q-mb-sm" />
          <div>Sem dados para os filtros selecionados</div>
        </div>
      </template>
    </q-table>

    <q-dialog v-model="tramitarDialogOpen">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">Tramitar processo</div>
          <div class="text-caption">Selecionados: {{ tramitarTargets.length }}</div>
        </q-card-section>
        <q-card-section>
          <div class="q-gutter-md">
            <q-select
              v-model="tramitarForm.destinoSetor"
              :options="setorOptions"
              label="Para o Setor"
              emit-value
              map-options
            />
            <q-input v-model="tramitarForm.motivo" type="textarea" label="Motivo" autogrow />
            <q-select
              v-model="tramitarForm.prioridade"
              :options="prioridadeOptions"
              label="Prioridade"
              emit-value
              map-options
            />
            <q-input v-model="tramitarForm.prazo" label="Prazo (YYYY-MM-DD)" mask="####-##-##" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn unelevated label="Tramitar" color="primary" @click="tramitarSubmit" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog v-model="atribuirDialogOpen">
      <q-card style="min-width: 460px">
        <q-card-section>
          <div class="text-h6">Atribuir processo</div>
          <div class="text-caption">Selecionados: {{ atribuirTargets.length }}</div>
        </q-card-section>
        <q-card-section>
          <div class="q-gutter-md">
            <q-select
              v-model="atribuirForm.usuario"
              :options="usuariosOptions"
              label="Atribuir a (usuário do mesmo setor)"
              emit-value
              map-options
              :loading="usuariosLoading"
              clearable
            />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn unelevated label="Atribuir" color="primary" @click="atribuirSubmit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="prioridadeDialogOpen">
      <q-card style="min-width: 420px">
        <q-card-section>
          <div class="text-h6">Marcar prioridade</div>
        </q-card-section>
        <q-card-section>
          <div class="q-gutter-md">
            <q-select
              v-model="prioridadeForm.prioridade"
              :options="prioridadeOptions"
              label="Prioridade"
              outlined
              emit-value
              map-options
            />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn label="Salvar" color="primary" @click="prioridadeSubmit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="historicoDialogOpen">
      <q-card style="min-width: 840px">
        <q-card-section>
          <div class="text-h6">Histórico - {{ historicoTarget?.numero || '' }}</div>
          <div class="text-caption">Total: {{ historicoItems.length }}</div>
        </q-card-section>
        <q-card-section class="q-pa-none">
          <q-table
            dense
            flat
            :rows="historicoItems"
            :columns="historicoColumns"
            row-key="id"
            :loading="historicoLoading"
            hide-pagination
          >
            <template #body-cell-data="props">
              <q-td :props="props">{{ formatDateTime(props.row.data) }}</q-td>
            </template>
            <template #body-cell-movimento="props">
              <q-td :props="props">{{ props.row.origemSetor }} → {{ props.row.destinoSetor }}</q-td>
            </template>
            <template #body-cell-prioridade="props">
              <q-td :props="props">{{ props.row.prioridade || '-' }}</q-td>
            </template>
            <template #body-cell-prazo="props">
              <q-td :props="props">{{
                props.row.prazo
                  ? new Date(props.row.prazo).toLocaleDateString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                    })
                  : '-'
              }}</q-td>
            </template>
            <template #body-cell-usuario="props">
              <q-td :props="props">{{ props.row.usuario || '-' }}</q-td>
            </template>
            <template #body-cell-motivo="props">
              <q-td :props="props">{{ props.row.motivo || '-' }}</q-td>
            </template>
          </q-table>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fechar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { listarSetores } from 'src/services/catalogService'
import { listarUsuarios } from 'src/services/usuariosService'
import {
  listarProcessos,
  tramitarProcesso,
  atualizarPrioridade,
  listarTramites,
  atribuirProcesso,
  aceitarPendencia as aceitarPendenciaService,
  recusarPendencia as recusarPendenciaService,
} from 'src/services/processosService'
import { getUsuarioLoginFromKeycloak } from 'src/services/authService'

const $q = useQuasar()
const keycloak = inject('keycloak', null)
const router = useRouter()

// Helper: normalizar nome de setor
function normalizeSector(val) {
  return String(val || '')
    .toUpperCase()
    .replace(/^\/+/, '')
}

function friendlyApiError(e, action) {
  const status = e?.response?.status
  const apiMsg = e?.response?.data?.error || e?.message
  if (status === 403) {
    if (action === 'tramitar') {
      return 'Você só pode tramitar processos atribuídos a você.'
    }
    return 'Ação não permitida para o seu usuário.'
  }
  if (status === 400) {
    return `Validação falhou: ${apiMsg || 'verifique os campos informados'}`
  }
  return apiMsg || 'Ocorreu um erro. Tente novamente.'
}

function labelSetor(sigla) {
  const s = normalizeSector(sigla)
  const opt = (setorOptions.value || []).find((o) => normalizeSector(o.value) === s)
  return opt?.label || s || ''
}

// Setor do usuário (claim do token)
const userSector = ref(null)

async function loadUserSectorFromApi() {
  try {
    const login = getUsuario()
    if (!login) return
    const users = await listarUsuarios({ login })
    const setor = Array.isArray(users) ? users[0]?.setor : users?.setor
    userSector.value = normalizeSector(setor)
  } catch (err) {
    console.error('Falha ao obter setor do usuário via API', err)
  }
}

const filters = ref({
  numero: '',
  assunto: '',
  interessado: '',
  status: null,
  prioridade: null,
  nivelAcesso: null,
  setor: null,
})

const tab = ref('setor')

const statusOptions = ['Em instrução', 'Aguardando', 'Concluso', 'Arquivado']
const prioridadeOptions = ['Baixa', 'Normal', 'Alta', 'Urgente']
const nivelOptions = ['Público', 'Restrito', 'Sigiloso']
const setorOptions = ref([])

async function loadSetoresOptions() {
  try {
    const data = await listarSetores()
    setorOptions.value = (data || []).map((s) => ({ label: s.nome, value: s.sigla }))
  } catch (e) {
    console.error('Falha ao carregar setores', e)
    // fallback em caso de erro
    setorOptions.value = [
      { label: 'Protocolo', value: 'PROTOCOLO' },
      { label: 'Gabinete', value: 'GABINETE' },
      { label: 'Jurídico', value: 'JURÍDICO' },
      { label: 'Tecnologia da Informação', value: 'TI' },
      { label: 'Financeiro', value: 'FINANCEIRO' },
    ]
  }
}
const rows = ref([])
const selected = ref([])
const loading = ref(false)

const columns = [
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' },
  { name: 'numero', label: 'Nº Processo', field: 'numero', align: 'left' },
  { name: 'assunto', label: 'Assunto', field: 'assunto', align: 'left' },
  { name: 'interessado', label: 'Interessado', field: 'interessado', align: 'left' },
  {
    name: 'setor',
    label: 'Setor Atual',
    field: 'setor',
    align: 'left',
    format: (val) => labelSetor(val),
  },
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
]

const pagination = ref({ page: 1, rowsPerPage: 10 })

// Linhas exibidas na tabela, filtradas pela aba ativa
const displayRows = computed(() => {
  if (tab.value === 'setor') {
    const setor = userSector.value
    if (!setor) return rows.value
    return rows.value.filter(
      (r) =>
        normalizeSector(r.setor || r.setorAtual) === normalizeSector(setor) &&
        r.pendente !== true &&
        r.status !== 'Arquivado',
    )
  }
  if (tab.value === 'meus') {
    const usuario = getUsuario()
    if (!usuario) return rows.value
    return rows.value.filter(
      (r) => r.atribuidoA === usuario && r.pendente !== true && r.status !== 'Arquivado',
    )
  }
  if (tab.value === 'pendencias') {
    const setor = userSector.value
    if (!setor) return rows.value
    return rows.value.filter(
      (r) =>
        r.pendente === true &&
        normalizeSector(r.pendenteDestinoSetor) === normalizeSector(setor) &&
        r.status !== 'Arquivado',
    )
  }
  return rows.value
})

const counts = ref({ setor: 0, meus: 0, pendencias: 0 })

async function updateCounts() {
  try {
    const common = {
      numero: filters.value.numero || undefined,
      assunto: filters.value.assunto || undefined,
      interessado: filters.value.interessado || undefined,
      status: filters.value.status || undefined,
      prioridade: filters.value.prioridade || undefined,
      nivelAcesso: filters.value.nivelAcesso || undefined,
    }
    const setorName = userSector.value || undefined
    const [dataSetor, dataMeus, dataPendDest, dataPendSetor, dataMeusPend, dataSetorArquivado] = await Promise.all([
      listarProcessos({ ...common, setor: setorName, page: 1, pageSize: 1 }),
      listarProcessos({
        ...common,
        somenteMeus: 'true',
        usuario: getUsuario(),
        page: 1,
        pageSize: 1,
      }),
      listarProcessos({
        ...common,
        pendente: 'true',
        pendenteSetor: setorName,
        page: 1,
        pageSize: 1,
      }),
      listarProcessos({ ...common, pendente: 'true', setor: setorName, page: 1, pageSize: 1 }),
      listarProcessos({
        ...common,
        pendente: 'true',
        somenteMeus: 'true',
        usuario: getUsuario(),
        page: 1,
        pageSize: 1,
      }),
      listarProcessos({ ...common, setor: setorName, status: 'Arquivado', page: 1, pageSize: 1 }),
    ])
    const getTotal = (data) =>
      (data && typeof data.total === 'number' && data.total) ||
      (Array.isArray(data?.items) ? data.items.length : Array.isArray(data) ? data.length : 0)

    const totalSetor = getTotal(dataSetor)
    const totalMeus = getTotal(dataMeus)
    const totalPendDest = getTotal(dataPendDest) // pendências destinadas ao meu setor
    const totalPendSetor = getTotal(dataPendSetor) // pendências que estão no meu setor
    const totalMeusPend = getTotal(dataMeusPend) // pendências atribuídas a mim (se houver)
    const totalSetorArquivado = getTotal(dataSetorArquivado) // arquivados no meu setor

    counts.value = {
      setor: Math.max(totalSetor - totalPendSetor - totalSetorArquivado, 0),
      meus: Math.max(totalMeus - totalMeusPend, 0),
      pendencias: totalPendDest,
    }
  } catch (err) {
    console.error('Falha ao atualizar contadores', err)
  }
}

function getUsuario() {
  return getUsuarioLoginFromKeycloak(keycloak) || 'usuario1'
}

async function fetchData() {
  loading.value = true
  try {
    const somenteMeusOn = tab.value === 'meus'
    const pendenciasOn = tab.value === 'pendencias'
    const params = {
      numero: filters.value.numero || undefined,
      assunto: filters.value.assunto || undefined,
      interessado: filters.value.interessado || undefined,
      status: filters.value.status || undefined,
      prioridade: filters.value.prioridade || undefined,
      nivelAcesso: filters.value.nivelAcesso || undefined,
      setor: !pendenciasOn
        ? (tab.value === 'setor' ? userSector.value : filters.value.setor) || undefined
        : undefined,
      pendente: pendenciasOn ? 'true' : undefined,
      pendenteSetor: pendenciasOn ? userSector.value || undefined : undefined,
      somenteMeus: somenteMeusOn ? 'true' : 'false',
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
  fetchData()
}

function refresh() {
  resetAndFetch()
}

function abrir(row) {
  router.push(`/processo/${row.id}`)
}

function setorDe(row) {
  return normalizeSector(row.setor || row.setorAtual)
}

function atribuir(row) {
  if (row?.pendente === true) {
    $q.notify({ type: 'warning', message: 'Processo pendente não permite atribuir' })
    return
  }
  openAtribuirDialog([row])
}

const tramitarDialogOpen = ref(false)
const tramitarTargets = ref([])
const tramitarForm = ref({
  destinoSetor: null,
  motivo: '',
  prioridade: 'Normal',
  prazo: '',
})

function openTramitarDialog(targets) {
  tramitarTargets.value = targets
  tramitarForm.value.destinoSetor = null
  tramitarForm.value.motivo = ''
  tramitarForm.value.prioridade = 'Normal'
  tramitarForm.value.prazo = ''
  tramitarDialogOpen.value = true
}

function tramitar(row) {
  if (row?.pendente === true) {
    $q.notify({ type: 'warning', message: 'Processo pendente não permite tramitar' })
    return
  }
  openTramitarDialog([row])
}

async function tramitarSubmit() {
  if (!tramitarForm.value.destinoSetor) {
    $q.notify({ type: 'warning', message: 'Selecione o setor de destino' })
    return
  }
  const destino = tramitarForm.value.destinoSetor
  const motivo = tramitarForm.value.motivo || undefined
  const prioridade = tramitarForm.value.prioridade || undefined
  const prazo = tramitarForm.value.prazo || undefined
  try {
    await Promise.all(
      tramitarTargets.value.map(async (r) => {
        const currentSetor = r.setor || r.setorAtual
        if (currentSetor === destino) {
          throw new Error(`Processo ${r.numero}: já está no setor ${destino}`)
        }
        await tramitarProcesso(r.id, {
          destinoSetor: destino,
          motivo,
          prioridade,
          prazo,
          usuario: getUsuario(),
        })
      }),
    )
    $q.notify({
      type: 'positive',
      message: `Tramitação realizada (${tramitarTargets.value.length})`,
    })
    tramitarDialogOpen.value = false
    fetchData()
    updateCounts()
  } catch (e) {
    console.error(e)
    const status = e?.response?.status
    $q.notify({
      type: 'warning',
      message: friendlyApiError(e, 'tramitar'),
      caption: status ? `Código ${status}` : undefined,
    })
  }
}

function tramitarSelecao() {
  if (!selected.value.length) {
    $q.notify({ type: 'warning', message: 'Selecione ao menos um processo' })
    return
  }
  if (selected.value.some((r) => r?.pendente === true)) {
    $q.notify({
      type: 'warning',
      message: 'Seleção contém processos pendentes; tramitação bloqueada',
    })
    return
  }
  openTramitarDialog(selected.value)
}

const atribuirDialogOpen = ref(false)
const atribuirTargets = ref([])
const usuariosOptions = ref([])
const usuariosLoading = ref(false)
const atribuirForm = ref({ usuario: null })

// Prioridade (dialog)
const prioridadeDialogOpen = ref(false)
const prioridadeTargets = ref([])
const prioridadeForm = ref({ prioridade: 'Normal' })

function openPrioridadeDialog(targets) {
  prioridadeTargets.value = targets
  const current = targets[0]?.prioridade
  prioridadeForm.value.prioridade = current || 'Normal'
  prioridadeDialogOpen.value = true
}

function marcarPrioridade(row) {
  if (row?.pendente === true) {
    $q.notify({ type: 'warning', message: 'Processo pendente não permite marcar prioridade' })
    return
  }
  openPrioridadeDialog([row])
}

async function prioridadeSubmit() {
  const prio = prioridadeForm.value.prioridade
  if (!prio) {
    $q.notify({ type: 'warning', message: 'Selecione a prioridade' })
    return
  }
  if (prioridadeTargets.value.some((r) => r?.pendente === true)) {
    $q.notify({ type: 'warning', message: 'Processo pendente não permite marcar prioridade' })
    return
  }
  try {
    await Promise.all(
      prioridadeTargets.value.map((r) =>
        atualizarPrioridade(r.id, { prioridade: prio, executadoPor: getUsuario() }),
      ),
    )
    $q.notify({
      type: 'positive',
      message: `Prioridade atualizada (${prioridadeTargets.value.length})`,
    })
    prioridadeDialogOpen.value = false
    fetchData()
    updateCounts()
  } catch (e) {
    console.error(e)
    const status = e?.response?.status
    $q.notify({
      type: 'warning',
      message: friendlyApiError(e, 'prioridade'),
      caption: status ? `Código ${status}` : undefined,
    })
  }
}

// Histórico (dialog)
const historicoDialogOpen = ref(false)
const historicoLoading = ref(false)
const historicoItems = ref([])
const historicoTarget = ref(null)

const historicoColumns = [
  { name: 'data', label: 'Data', field: 'data', align: 'left' },
  { name: 'movimento', label: 'Movimento', field: 'movimento', align: 'left' },
  { name: 'prioridade', label: 'Prioridade', field: 'prioridade', align: 'left' },
  { name: 'prazo', label: 'Prazo', field: 'prazo', align: 'left' },
  { name: 'usuario', label: 'Usuário Origem', field: 'usuario', align: 'left' },
  { name: 'motivo', label: 'Motivo', field: 'motivo', align: 'left' },
]

function formatDateTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  } catch {
    return String(value)
  }
}

async function historico(row) {
  historicoTarget.value = row
  historicoDialogOpen.value = true
  historicoLoading.value = true
  try {
    const data = await listarTramites(row.id)
    const items = Array.isArray(data) ? data : data?.items || data || []
    historicoItems.value = items
  } catch (e) {
    console.error(e)
    const status = e?.response?.status
    $q.notify({
      type: 'warning',
      message: friendlyApiError(e, 'histórico'),
      caption: status ? `Código ${status}` : undefined,
    })
  } finally {
    historicoLoading.value = false
  }
}

async function openAtribuirDialog(targets) {
  if (!targets || targets.length === 0) {
    $q.notify({ type: 'warning', message: 'Selecione ao menos um processo' })
    return
  }
  const setores = new Set(targets.map(setorDe))
  if (setores.size > 1) {
    $q.notify({
      type: 'warning',
      message: 'Selecione apenas processos do mesmo setor para atribuir',
    })
    return
  }
  if (targets.some((r) => r?.pendente === true)) {
    $q.notify({ type: 'warning', message: 'Processo pendente não permite atribuir' })
    return
  }
  const setor = [...setores][0]
  atribuirTargets.value = targets
  usuariosLoading.value = true
  try {
    const data = await listarUsuarios({ setor })
    usuariosOptions.value = (Array.isArray(data) ? data : data?.items || data || []).map((it) => ({
      label: it?.username || it?.login || it,
      value: it?.username || it?.login || it,
    }))
    atribuirForm.value.usuario = getUsuario()
    atribuirDialogOpen.value = true
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Falha ao carregar usuários do setor' })
  } finally {
    usuariosLoading.value = false
  }
}

async function atribuirSubmit() {
  const usuario = atribuirForm.value.usuario
  if (!usuario) {
    $q.notify({ type: 'warning', message: 'Selecione o usuário' })
    return
  }
  if (atribuirTargets.value.some((r) => r?.pendente === true)) {
    $q.notify({ type: 'warning', message: 'Processo pendente não permite atribuir' })
    return
  }
  try {
    await Promise.all(
      atribuirTargets.value.map((r) =>
        atribuirProcesso(r.id, { usuario, executadoPor: getUsuario() }),
      ),
    )
    $q.notify({
      type: 'positive',
      message: `Atribuição realizada (${atribuirTargets.value.length})`,
    })
    atribuirDialogOpen.value = false
    fetchData()
    updateCounts()
  } catch (e) {
    console.error(e)
    const status = e?.response?.status
    $q.notify({
      type: 'warning',
      message: friendlyApiError(e, 'atribuir'),
      caption: status ? `Código ${status}` : undefined,
    })
  }
}

function atribuirSelecao() {
  if (!selected.value.length) {
    $q.notify({ type: 'warning', message: 'Selecione ao menos um processo' })
    return
  }
  openAtribuirDialog(selected.value)
}

onMounted(async () => {
  await loadUserSectorFromApi()
  await loadSetoresOptions()
  await fetchData()
  await updateCounts()
})

watch(tab, () => {
  resetAndFetch()
  updateCounts()
})

watch(userSector, (val) => {
  if (tab.value === 'setor' && val) {
    resetAndFetch()
  }
  updateCounts()
})

// Funções de pendência movidas para dentro do <script setup>
function isPendenteParaMim(row) {
  const setor = normalizeSector(userSector.value)
  const destino = normalizeSector(row?.pendenteDestinoSetor)
  return row?.pendente === true && !!setor && destino === setor
}
async function aceitarPendencia(row) {
  try {
    await aceitarPendenciaService(row.id, { usuario: getUsuario() })
    $q.notify({ type: 'positive', message: `Pendência aceita (${row.numero})` })
    fetchData()
    updateCounts()
  } catch (e) {
    console.error(e)
    const status = e?.response?.status
    $q.notify({
      type: 'warning',
      message: friendlyApiError(e, 'aceitar'),
      caption: status ? `Código ${status}` : undefined,
    })
  }
}
async function recusarPendencia(row) {
  $q.dialog({
    title: 'Recusar pendência',
    message: 'Informe o motivo da recusa',
    cancel: true,
    persistent: true,
    prompt: {
      model: '',
      type: 'textarea',
    },
  }).onOk(async (motivo) => {
    if (!motivo) {
      $q.notify({ type: 'warning', message: 'Motivo é obrigatório para recusa' })
      return
    }
    try {
      await recusarPendenciaService(row.id, { usuario: getUsuario(), motivo })
      $q.notify({ type: 'positive', message: `Pendência recusada (${row.numero})` })
      fetchData()
      updateCounts()
    } catch (e) {
      console.error(e)
      const status = e?.response?.status
      $q.notify({
        type: 'warning',
        message: friendlyApiError(e, 'recusar'),
        caption: status ? `Código ${status}` : undefined,
      })
    }
  })
}
</script>
