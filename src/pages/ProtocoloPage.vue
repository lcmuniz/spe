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
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.assunto"
                :options="assuntoOptions"
                label="Assunto"
                use-input
                fill-input
                hide-dropdown-icon
                input-debounce="300"
                clearable
                :rules="[validaAssunto]"
                @filter="filtrarAssunto"
              />
            </div>
            <div class="col-12 col-md-3">
              <q-select v-model="form.tipo" :options="tipoOptions" label="Tipo" clearable />
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
            <div class="col-12" v-if="form.nivelAcesso !== 'Público'">
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

      <!-- Seção: Interessados/Partes -->
      <q-card>
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">Interessados/Partes</div>
          <q-btn
            color="primary"
            icon="person_add"
            label="Adicionar parte"
            @click="abrirParteDialog"
          />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-table
            flat
            :rows="partes"
            :columns="partesColumns"
            row-key="uid"
            :no-data-label="'Nenhuma parte adicionada'"
          >
            <template #body-cell-acoes="props">
              <q-td :props="props">
                <q-btn
                  size="sm"
                  flat
                  icon="delete"
                  color="negative"
                  @click="removerParte(props.row)"
                />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>

      <!-- Seção removida: Documentos Iniciais (documentos serão adicionados na visualização do processo) -->

      <!-- Ações -->
      <div class="row q-col-gutter-sm">
        <div class="col-auto">
          <q-btn type="submit" color="primary" label="Salvar e criar" />
        </div>
      </div>
    </q-form>

    <!-- Dialog: Parte -->
    <q-dialog v-model="parteDialog">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">Adicionar Parte</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="parteForm.tipo" :options="tipoParteOptions" label="Tipo" />
          <q-input v-model="parteForm.nome" label="Nome" />
          <q-input v-model="parteForm.documento" label="Documento (CPF/CNPJ)" />
          <q-select v-model="parteForm.papel" :options="papelOptions" label="Papel" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Adicionar" @click="confirmarParte" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog de Documento removido: documentos serão adicionados na visualização do processo -->
  </q-page>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useQuasar } from 'quasar'
import { listarAssuntos } from 'src/services/catalogService'
// import removido: documentos serão criados na visualização do processo
import { criarProcesso } from 'src/services/processosService'
// import removido: util de arquivo não é mais usado aqui
import { useRouter } from 'vue-router'

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

// Assuntos catálogo
const assuntoOptions = ref([])
function filtrarAssunto(val, update) {
  update(() => {
    const needle = String(val || '').toLowerCase()
    assuntoOptions.value = assuntoOptions.value.filter((o) =>
      String(o).toLowerCase().includes(needle),
    )
  })
}
function validaAssunto(val) {
  return !!val || 'Assunto é obrigatório'
}
function validaBaseLegal(val) {
  if (form.value.nivelAcesso !== 'Público') return !!val || 'Base legal é obrigatória'
  return true
}

const tipoOptions = ['Processo Administrativo', 'Requerimento', 'Denúncia']
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
const tipoParteOptions = ['Cidadão', 'Advogado', 'Empresa', 'Órgão']
const papelOptions = ['Requerente', 'Interessado', 'Representante']
const parteDialog = ref(false)
const parteForm = ref({ tipo: 'Cidadão', nome: '', documento: '', papel: 'Requerente' })
function abrirParteDialog() {
  parteForm.value = { tipo: 'Cidadão', nome: '', documento: '', papel: 'Requerente' }
  parteDialog.value = true
}
function confirmarParte() {
  if (!parteForm.value.nome) {
    $q.notify({ type: 'warning', message: 'Informe o nome da parte' })
    return
  }
  partes.value.push({ ...parteForm.value, uid: Date.now() })
  parteDialog.value = false
}
function removerParte(row) {
  partes.value = partes.value.filter((p) => p.uid !== row.uid)
}

// Seção de documentos removida: criação de documentos será feita na visualização do processo

// Ações principais
async function salvarCriar() {
  try {
    // Validações
    if (!form.value.assunto) {
      $q.notify({ type: 'warning', message: 'Assunto é obrigatório' })
      return
    }
    if (form.value.nivelAcesso !== 'Público' && !form.value.baseLegal) {
      $q.notify({
        type: 'warning',
        message: 'Base legal é obrigatória para acesso restrito/sigiloso',
      })
      return
    }

    const payload = {
      assunto: form.value.assunto,
      tipo: form.value.tipo,
      nivelAcesso: form.value.nivelAcesso,
      baseLegal: form.value.baseLegal,
      observacoes: form.value.observacoes,
      partes: partes.value,
      executadoPor: getUsuarioLogin() || undefined,
      // documentosIds removido: documentos serão adicionados posteriormente na visualização do processo
    }
    const proc = await criarProcesso(payload)
    $q.notify({ type: 'positive', message: `Processo criado: ${proc.numero}` })
    router.push(`/processo/${proc.id}`)
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Falha ao criar processo' })
  }
}
// Bootstrap
onMounted(async () => {
  try {
    assuntoOptions.value = await listarAssuntos()
  } catch (e) {
    console.error(e)
    assuntoOptions.value = ['Licitação', 'Contratos', 'Recursos Humanos']
  }
})
</script>

<style scoped></style>
