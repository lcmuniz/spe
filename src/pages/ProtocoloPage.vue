<template>
  <q-page class="q-pa-md">
    <q-form @submit.prevent="salvarCriar" class="q-gutter-md">
      <!-- Seção: Dados do Processo -->
      <q-card>
        <q-card-section>
          <div class="text-h6">Dados do Processo</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-3">
              <q-select
                v-model="form.tipo"
                :options="tipoOptions"
                label="Tipo"
                clearable
                emit-value
                map-options
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input v-model="form.assunto" label="Assunto" :rules="[validaAssunto]" clearable />
            </div>
            <div class="col-12 col-md-3">
              <q-option-group
                v-model="form.nivelAcesso"
                :options="nivelOptions"
                type="radio"
                label="Nível de Acesso"
              />
            </div>
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-12" v-if="normalizaNivelAcesso(form.nivelAcesso) !== 'Público'">
              <q-input
                v-model="form.baseLegal"
                type="textarea"
                label="Base legal"
                :rules="[validaBaseLegal]"
              />
            </div>
            <div class="col-12">
              <q-input v-model="form.observacoes" type="textarea" label="Observações" />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Seção: Partes -->
      <q-card>
        <q-card-section>
          <div class="text-h6">Partes</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-table :rows="partes" :columns="partesColumns" row-key="nome">
            <template #body-cell-acoes="{ row }">
              <q-btn flat round dense icon="delete" color="negative" @click="removerParte(row)" />
            </template>
            <template #top>
              <q-btn color="primary" label="Adicionar Parte" @click="abrirParteDialog" />
            </template>
          </q-table>
        </q-card-section>
      </q-card>

      <!-- Ações -->
      <div class="row justify-end q-gutter-sm">
        <q-btn label="Cancelar" flat @click="cancelarCriar" />
        <q-btn label="Salvar" color="primary" type="submit" />
      </div>

      <!-- Dialog de Parte (vincular do cadastro) -->
      <q-dialog v-model="parteDialog">
        <q-card style="min-width: 700px">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">Vincular Parte do Cadastro</div>
            <q-space />
            <q-btn
              color="primary"
              unelevated
              icon="person_add"
              label="Cadastrar Parte"
              @click="abrirCadastroCreateDialog"
            />
          </q-card-section>
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="cadastroSearch"
              label="Buscar parte (nome, documento)"
              dense
              @update:model-value="(val) => loadCadastroPartes(val)"
            />
            <q-table
              flat
              bordered
              :rows="cadastroPartes"
              :columns="cadastroColumns"
              row-key="id"
              hide-bottom
              selection="single"
              v-model:selected="cadastroSelecionada"
              :pagination="{ rowsPerPage: 5 }"
            >
              <template #body-cell-documento="props">
                <q-td :props="props">
                  <span v-if="props.value">{{ props.value }}</span>
                  <span v-else class="text-grey">—</span>
                </q-td>
              </template>
            </q-table>
            <q-select v-model="parteForm.papel" :options="papelOptions" label="Papel" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn color="primary" label="Adicionar" @click="confirmarParte" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Dialog: Cadastro rápido de parte -->
      <q-dialog v-model="cadastroCreateDialogOpen">
        <q-card style="min-width: 600px">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">Cadastrar Parte</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>
          <q-card-section>
            <ParteCadastroForm
              v-model="cadastroCreateForm"
              @submit="confirmarCadastroCreate"
              @reset="onCadastroCreateReset"
            />
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- Dialog de Documento removido: documentos serão adicionados na visualização do processo -->
    </q-form>
  </q-page>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import { useQuasar } from 'quasar'
// import removido: documentos serão criados na visualização do processo
import { criarProcesso } from 'src/services/processosService'
// import removido: util de arquivo não é mais usado aqui
import { useRouter } from 'vue-router'
import { listarTiposProcesso } from 'src/services/catalogService'
import { listarPartesCadastro, criarParteCadastro } from 'src/services/partesCadastroService'
import ParteCadastroForm from 'src/components/ParteCadastroForm.vue'

const $q = useQuasar()
const router = useRouter()
const keycloak = inject('keycloak', null)
function getUsuarioLogin() {
  return keycloak?.tokenParsed?.preferred_username || null
}

// Form principal
const form = ref({
  assunto: null,
  tipo: 'Processo Administrativo',
  nivelAcesso: 'Público',
  baseLegal: '',
  observacoes: '',
})

function validaAssunto(val) {
  return !!val || 'Assunto é obrigatório'
}
function normalizaNivelAcesso(nivel) {
  if (!nivel) return 'Público'
  if (typeof nivel === 'string') return nivel
  if (typeof nivel === 'object') return nivel.value || nivel.label || 'Público'
  return 'Público'
}
function validaBaseLegal(val) {
  if (normalizaNivelAcesso(form.value.nivelAcesso) !== 'Público')
    return !!val || 'Base legal é obrigatória'
  return true
}

const tipoOptions = ref([])
async function loadTipoOptions() {
  try {
    const data = await listarTiposProcesso()
    tipoOptions.value = (Array.isArray(data) ? data : []).map((n) => ({ label: n, value: n }))
  } catch (e) {
    console.error('Falha ao carregar tipos de processo', e)
    tipoOptions.value = []
  }
}
onMounted(loadTipoOptions)

const nivelOptions = [
  { label: 'Público', value: 'Público' },
  { label: 'Restrito', value: 'Restrito' },
  { label: 'Sigiloso', value: 'Sigiloso' },
]

// Partes
const partes = ref([])
const partesColumns = [
  { name: 'tipo', label: 'Tipo', field: 'tipo' },
  { name: 'nome', label: 'Nome', field: 'nome' },
  { name: 'documento', label: 'Documento', field: 'documento' },
  { name: 'papel', label: 'Papel', field: 'papel' },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' },
]
const papelOptions = ['Requerente', 'Interessado', 'Representante']
const parteDialog = ref(false)
// Seleção de partes do cadastro
const cadastroSearch = ref('')
const cadastroPartes = ref([])
const cadastroSelecionada = ref([])
const cadastroColumns = [
  { name: 'tipo', label: 'Tipo', field: 'tipo' },
  { name: 'nome', label: 'Nome', field: 'nome' },
  { name: 'documento', label: 'Documento', field: 'documento' },
]
const cadastroCreateDialogOpen = ref(false)
const cadastroCreateForm = ref({
  tipo: 'FISICA',
  nome: '',
  documento: '',
  email: '',
  telefone: '',
  endereco_logradouro: '',
  endereco_numero: '',
  endereco_complemento: '',
  endereco_bairro: '',
  endereco_cidade: '',
  endereco_estado: '',
  endereco_cep: '',
})
const parteForm = ref({ papel: 'Requerente' })
function abrirParteDialog() {
  cadastroSearch.value = ''
  cadastroSelecionada.value = []
  parteForm.value = { papel: 'Requerente' }
  loadCadastroPartes()
  parteDialog.value = true
}
function abrirCadastroCreateDialog() {
  cadastroCreateForm.value = {
    tipo: 'FISICA',
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    endereco_logradouro: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
    endereco_cep: '',
  }
  cadastroCreateDialogOpen.value = true
}
async function loadCadastroPartes(q) {
  try {
    const rows = await listarPartesCadastro({ q: (q || '').trim() || undefined, limit: 50 })
    cadastroPartes.value = rows || []
  } catch (e) {
    console.error('Falha ao carregar cadastro de partes', e)
    cadastroPartes.value = []
  }
}
function onCadastroCreateReset() {
  cadastroCreateForm.value = {
    tipo: 'FISICA',
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    endereco_logradouro: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
    endereco_cep: '',
  }
}
async function confirmarCadastroCreate() {
  try {
    if (!cadastroCreateForm.value.nome) {
      $q.notify({ type: 'warning', message: 'Informe o nome da parte' })
      return
    }
    const created = await criarParteCadastro({
      ...cadastroCreateForm.value,
      executadoPor: getUsuarioLogin(),
    })
    cadastroPartes.value = [created, ...(cadastroPartes.value || [])]
    cadastroSelecionada.value = [created]
    $q.notify({ type: 'positive', message: 'Parte cadastrada' })
    cadastroCreateDialogOpen.value = false
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: e?.response?.data?.error || 'Falha ao cadastrar parte' })
  }
}
function confirmarParte() {
  const selected = Array.isArray(cadastroSelecionada.value) ? cadastroSelecionada.value[0] : null
  if (!selected) {
    $q.notify({ type: 'warning', message: 'Selecione uma parte do cadastro' })
    return
  }
  partes.value = [
    ...partes.value,
    {
      parteId: selected.id,
      nome: selected.nome,
      documento: selected.documento,
      tipo: selected.tipo,
      papel: parteForm.value.papel,
    },
  ]
  parteDialog.value = false
}
function removerParte(row) {
  $q.dialog({
    title: 'Remover Parte',
    message: `Confirma remover a parte "${row.nome}"?`,
    cancel: true,
    ok: { label: 'Remover', color: 'negative' },
  }).onOk(() => {
    partes.value = partes.value.filter((p) => p !== row)
    $q.notify({ type: 'positive', message: 'Parte removida' })
  })
}

async function salvarCriar() {
  try {
    if (!form.value.assunto) {
      $q.notify({ type: 'warning', message: 'Informe o assunto do processo' })
      return
    }
    if (normalizaNivelAcesso(form.value.nivelAcesso) !== 'Público' && !form.value.baseLegal) {
      $q.notify({ type: 'warning', message: 'Informe a base legal para acesso restrito/sigiloso' })
      return
    }

    const usuarioLogin = getUsuarioLogin() || undefined
    const partesPayload = (partes.value || []).map((p) => (
      p.parteId
        ? { parteId: p.parteId, papel: p.papel }
        : { tipo: p.tipo, nome: p.nome, documento: p.documento, papel: p.papel }
    ))

    const proc = await criarProcesso({
      assunto: form.value.assunto,
      tipo: form.value.tipo,
      nivelAcesso: normalizaNivelAcesso(form.value.nivelAcesso),
      observacoes: form.value.observacoes || '',
      baseLegal: form.value.baseLegal || '',
      partes: partesPayload,
      usuario: usuarioLogin,
    })
    $q.notify({ type: 'positive', message: `Processo criado: ${proc.numero}` })
    router.push(`/processo/${proc.id}`)
  } catch (e) {
    console.error(e)
    const msg = e?.response?.data?.error || e?.message || 'Falha ao criar processo'
    $q.notify({ type: 'negative', message: msg })
  }
}

function cancelarCriar() {
  router.push('/consultar')
}
</script>

<style scoped></style>
