<template>
  <q-page padding>
    <div style="max-width: 1080px; margin: 0 auto">
      <div class="text-h5 q-mb-md">Cadastro de Partes</div>

      <!-- Formulário movido para diálogo acionado pelo botão Adicionar -->

      <q-card flat bordered>
        <q-card-section>
          <div class="row items-center q-col-gutter-sm">
            <q-input
              class="col"
              v-model="filtro"
              label="Pesquisar por nome ou documento"
              dense
              clearable
              @update:model-value="fetchList"
            />
            <q-btn color="primary" icon="add" label="Adicionar" @click="novo" />
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-table
            flat
            bordered
            :rows="rows"
            :columns="columns"
            row-key="id"
            :loading="loading"
            v-model:pagination="pagination"
          >
            <template #body-cell-acoes="props">
              <q-td :props="props" class="text-right">
                <q-btn dense flat icon="edit" color="primary" @click="editar(props.row)" />
                <q-btn dense flat icon="delete" color="negative" @click="remover(props.row)" />
              </q-td>
            </template>

            <template #no-data>
              <div class="text-grey">Nenhum registro encontrado</div>
            </template>
          </q-table>
        </q-card-section>
      </q-card>

      <!-- Diálogo de Nova Parte -->
      <q-dialog v-model="dialogNovo" @hide="onDialogHide">
        <q-card style="min-width: 720px">
          <q-card-section>
            <div class="text-h6">{{ editTarget ? 'Editar Parte' : 'Nova Parte' }}</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <ParteCadastroForm
              v-model="form"
              :tipoOptions="tipoOptions"
              :ufOptions="ufOptions"
              :saving="saving"
              @submit="salvarParte"
              @reset="onReset"
            />
          </q-card-section>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import {
  listarPartesCadastro,
  criarParteCadastro,
  removerParteCadastro,
  atualizarParteCadastro,
} from 'src/services/partesCadastroService'
import ParteCadastroForm from 'src/components/ParteCadastroForm.vue'

const $q = useQuasar()
const router = useRouter()

const tipoOptions = [
  { label: 'Pessoa Física', value: 'FISICA' },
  { label: 'Pessoa Jurídica', value: 'JURIDICA' },
]

const ufOptions = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RO',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
].map((uf) => ({ label: uf, value: uf }))

const saving = ref(false)
const dialogNovo = ref(false)
const editTarget = ref(null)
const form = ref({
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

function limparForm() {
  form.value = {
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

async function salvarParte() {
  try {
    saving.value = true
    const payload = { ...form.value }
    let result
    if (editTarget.value?.id) {
      result = await atualizarParteCadastro(editTarget.value.id, payload)
    } else {
      result = await criarParteCadastro(payload)
    }
    $q.notify({
      type: 'positive',
      message: `${editTarget.value ? 'Parte atualizada' : 'Parte cadastrada'}: ${result?.nome || ''}`,
    })
    limparForm()
    dialogNovo.value = false
    fetchList()
  } catch (e) {
    console.error(e)
    const status = e?.response?.status
    const apiMsg = e?.response?.data?.error || e?.message
    const baseMsg = editTarget.value
      ? 'Erro ao atualizar cadastro de parte'
      : 'Erro ao salvar cadastro de parte'
    const msg =
      status === 400
        ? `Validação falhou: ${apiMsg || 'verifique os campos informados'}`
        : apiMsg || baseMsg
    $q.notify({
      type: 'negative',
      message: msg,
      caption: status ? `Código ${status}` : undefined,
    })
  } finally {
    saving.value = false
  }
}

const filtro = ref('')
const loading = ref(false)
const rows = ref([])
const pagination = ref({ page: 1, rowsPerPage: 10 })

const columns = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left', sortable: true },
  { name: 'documento', label: 'Documento', field: 'documento', align: 'left' },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  {
    name: 'cidade',
    label: 'Cidade/UF',
    field: (row) =>
      `${row.endereco_cidade || ''} ${row.endereco_estado ? '/' + row.endereco_estado : ''}`,
    align: 'left',
  },
  { name: 'chave', label: 'Chave', field: 'chave', align: 'left' },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' },
]

async function fetchList() {
  try {
    loading.value = true
    const limit = pagination.value.rowsPerPage
    const offset = (pagination.value.page - 1) * pagination.value.rowsPerPage
    const data = await listarPartesCadastro({ q: filtro.value || undefined, limit, offset })
    rows.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error(e)
    const status = e?.response?.status
    const apiMsg = e?.response?.data?.error || e?.message
    $q.notify({
      type: 'warning',
      message: apiMsg || 'Falha ao carregar cadastro de partes',
      caption: status ? `Código ${status}` : undefined,
    })
  } finally {
    loading.value = false
  }
}

async function remover(row) {
  $q.dialog({
    title: 'Confirmação',
    message: `Remover "${row?.nome}"?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await removerParteCadastro(row.id)
      $q.notify({ type: 'positive', message: 'Registro removido' })
      fetchList()
    } catch (e) {
      console.error(e)
      const status = e?.response?.status
      const apiMsg = e?.response?.data?.error || e?.message
      const isVinculada = status === 400 && /vinculada a processos/i.test(String(apiMsg || ''))
      const actions = isVinculada
        ? [
            {
              label: 'Ver processos vinculados',
              color: 'primary',
              handler: () => {
                const interessado = row?.nome || ''
                router.push({ path: '/consultar', query: { interessado } })
              },
            },
          ]
        : []
      $q.notify({
        type: 'negative',
        message: apiMsg || 'Erro ao remover',
        caption: status ? `Código ${status}` : undefined,
        actions,
      })
    }
  })
}

function novo() {
  editTarget.value = null
  limparForm()
  dialogNovo.value = true
}

function onDialogHide() {
  editTarget.value = null
  limparForm()
}

function editar(row) {
  editTarget.value = { ...row }
  form.value = {
    tipo: row.tipo || 'FISICA',
    nome: row.nome || '',
    documento: row.documento || '',
    email: row.email || '',
    telefone: row.telefone || '',
    endereco_logradouro: row.endereco_logradouro || '',
    endereco_numero: row.endereco_numero || '',
    endereco_complemento: row.endereco_complemento || '',
    endereco_bairro: row.endereco_bairro || '',
    endereco_cidade: row.endereco_cidade || '',
    endereco_estado: row.endereco_estado || '',
    endereco_cep: row.endereco_cep || '',
  }
  dialogNovo.value = true
}

onMounted(async () => {
  await fetchList()
})

function onReset(e) {
  try {
    e?.preventDefault?.()
  } catch (e) {
    console.err(e)
  }
  limparForm()
}
</script>
