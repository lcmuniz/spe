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
              <q-select v-model="form.tipo" :options="tipoOptions" label="Tipo" clearable emit-value map-options />
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

      <!-- Dialog de Parte -->
      <q-dialog v-model="parteDialog">
        <q-card style="min-width: 350px">
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
+     </q-form>
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
    partes.value = [
      ...partes.value,
      {
        tipo: parteForm.value.tipo,
        nome: parteForm.value.nome,
        documento: parteForm.value.documento,
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
      const partesPayload = (partes.value || []).map((p) => ({
        tipo: p.tipo,
        nome: p.nome,
        documento: p.documento,
        papel: p.papel,
      }))

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
