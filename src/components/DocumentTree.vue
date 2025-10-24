<template>
  <div class="q-pa-sm">
    <div v-if="processo" class="text-subtitle1 q-mb-sm text-bold">
      {{ processo.numero }}
      <div class="text-caption">Setor atual: {{ setorAtualLabel || '' }}</div>
    </div>
    <div v-else class="text-subtitle1 q-mb-sm">Documentos</div>
    <q-tree
      :nodes="docNodes"
      dense
      node-key="id"
      default-expand-all
      :selected="selected"
      @update:selected="handleSelect"
    >
      <template v-slot:default-header="prop">
        <div
          class="row items-center no-wrap q-px-sm q-py-xs"
          :class="prop.selected || selected === prop.node.id ? 'bg-primary text-white rounded' : ''"
          style="width: 100%"
        >
          <q-icon
            :name="prop.node.icon || 'description'"
            :color="prop.selected || selected === prop.node.id ? 'white' : 'grey-7'"
          />
          <div class="q-ml-sm column">
            <div
              class="ellipsis"
              :class="prop.selected || selected === prop.node.id ? 'text-white' : ''"
            >
              {{ prop.node.label }}
              <q-badge
                v-if="prop.node.status === 'rascunho'"
                color="warning"
                class="q-ml-xs"
                align="middle"
                >Rascunho</q-badge
              >
            </div>
            <div
              v-if="prop.node.tipo"
              class="text-caption"
              :class="prop.selected || selected === prop.node.id ? 'text-white' : 'text-grey-7'"
            >
              {{ prop.node.tipo }}
              <span v-if="prop.node.criadoEm"> — {{ formatDateTime(prop.node.criadoEm) }}</span>
            </div>
          </div>
        </div>
      </template>
    </q-tree>

    <div v-if="externosAguardando && externosAguardando.length" class="q-mt-md">
      <div class="text-subtitle1 q-mb-xs">Documentos Aguardando Análise</div>
      <q-list bordered dense separator class="bg-grey-1">
        <q-item v-for="ex in externosAguardando" :key="ex.id">
          <q-item-section>
            <q-item-label>{{ ex.titulo || ex.fileName }}</q-item-label>
            <q-item-label caption>
              {{ ex.parteNome || ex.parteDocumento }}
              <span v-if="ex.criadoEm">— {{ formatDateTime(ex.criadoEm) }}</span>
            </q-item-label>
          </q-item-section>
          <q-item-section side class="row items-center q-gutter-xs">
            <q-btn dense round icon="visibility" color="primary" @click="onViewExterno(ex)" />
            <!-- Removidos botões de aceitar/rejeitar da lista -->
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <q-dialog v-model="externoDialogOpen">
      <q-card
        style="
          min-width: 800px;
          max-width: 90vw;
          height: 90vh;
          display: flex;
          flex-direction: column;
        "
      >
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Documento Externo</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div class="text-subtitle2">
            {{ externoSelecionado?.titulo || externoSelecionado?.fileName }}
          </div>
          <div class="text-caption">
            {{ externoSelecionado?.parteNome }}
            <span v-if="externoSelecionado?.parteDocumento">
              ({{ externoSelecionado?.parteDocumento }})</span
            >
          </div>
        </q-card-section>
        <q-card-section class="col q-pa-none" style="min-height: 0">
          <div v-if="carregandoExterno" class="q-pa-md">Carregando...</div>
          <template v-else-if="externoPreviewSrc">
            <embed
              v-if="isPdf"
              :src="externoPreviewSrc"
              type="application/pdf"
              class="doc-viewer"
            />
            <img v-else-if="isImage" :src="externoPreviewSrc" class="doc-viewer-image" />
            <iframe v-else :src="externoPreviewSrc" class="doc-viewer" />
          </template>
          <div v-else class="text-grey q-pa-md">Conteúdo indisponível</div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-sm">
          <q-btn
            label="Aceitar"
            color="positive"
            dense
            @click="onAceitarExterno(externoSelecionado)"
          />
          <q-btn
            label="Rejeitar"
            color="negative"
            dense
            class="q-ml-xs"
            @click="onRejeitarExterno(externoSelecionado)"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import {
  getTemporario,
  aceitarTemporario,
  rejeitarTemporario,
} from 'src/services/externoDocsService'

const props = defineProps({
  processo: { type: Object, default: null },
  setorAtualLabel: { type: String, default: '' },
  documentos: { type: Array, default: () => [] },
  selected: { type: [String, Number], default: 'processo' },
  externosAguardando: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:selected', 'externo:refresh'])
const $q = useQuasar()

const docNodes = computed(() => {
  const items = (props.documentos || []).map((doc) => ({
    id: doc.id,
    label: doc.titulo,
    tipo: doc.tipo,
    criadoEm: doc.criadoEm,
    icon: 'description',
    status: doc.status,
  }))
  return [{ id: 'processo', label: 'Dados do Processo', icon: 'assignment' }, ...items]
})

function handleSelect(key) {
  emit('update:selected', key)
}

function formatDateTime(val) {
  try {
    const dt = new Date(val)
    return dt.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    })
  } catch (_e) {
    return String(val || '')
  }
}

const externoDialogOpen = ref(false)
const externoSelecionado = ref(null)
const carregandoExterno = ref(false)
const externoTempId = ref(null)

function mimeFromFileName(name) {
  const n = String(name || '').toLowerCase()
  if (n.endsWith('.pdf')) return 'application/pdf'
  if (n.endsWith('.png')) return 'image/png'
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg'
  if (n.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

const externoPreviewSrc = computed(() => {
  const b64 = externoSelecionado.value?.contentBase64
  if (!b64) return ''
  const mime = mimeFromFileName(externoSelecionado.value?.fileName || '')
  return `data:${mime};base64,${b64}`
})

const externoMime = computed(() => mimeFromFileName(externoSelecionado.value?.fileName || ''))
const isPdf = computed(() => externoMime.value === 'application/pdf')
const isImage = computed(() => externoMime.value.startsWith('image/'))

async function onViewExterno(ex) {
  carregandoExterno.value = true
  try {
    const procId = props.processo?.id
    if (!procId) {
      throw new Error('processoId ausente')
    }
    externoTempId.value = ex?.id || null
    const doc = await getTemporario({ processoId: procId, tempId: ex.id })
    externoSelecionado.value = doc
    externoDialogOpen.value = true
  } catch (e) {
    console.error(e)
    $q.notify({
      type: 'negative',
      message: e?.response?.data?.error || 'Falha ao carregar anexo externo',
    })
  } finally {
    carregandoExterno.value = false
  }
}

async function onAceitarExterno(ex) {
  try {
    const procId = props.processo?.id
    if (!procId) throw new Error('processoId ausente')
    const tempId = externoTempId.value || ex?.id
    await aceitarTemporario({ processoId: procId, tempId })
    $q.notify({ type: 'positive', message: 'Documento externo juntado ao processo' })
    // Fecha a janela de visualização após aceitar
    externoDialogOpen.value = false
    externoSelecionado.value = null
    externoTempId.value = null
    emit('externo:refresh')
  } catch (e) {
    console.error(e)
    $q.notify({
      type: 'negative',
      message: e?.response?.data?.error || 'Falha ao aceitar documento',
    })
  }
}

function onRejeitarExterno(ex) {
  $q.dialog({
    title: 'Rejeitar documento',
    message: 'Informe o motivo da rejeição',
    prompt: { model: '', type: 'text' },
    cancel: true,
    ok: { label: 'Rejeitar', color: 'negative' },
  }).onOk(async (motivo) => {
    try {
      const procId = props.processo?.id
      if (!procId) throw new Error('processoId ausente')
      const tempId = externoTempId.value || ex?.id
      await rejeitarTemporario({ processoId: procId, tempId, motivo })
      $q.notify({ type: 'positive', message: 'Documento rejeitado' })
      externoDialogOpen.value = false
      externoSelecionado.value = null
      externoTempId.value = null
      emit('externo:refresh')
    } catch (e) {
      console.error(e)
      $q.notify({
        type: 'negative',
        message: e?.response?.data?.error || 'Falha ao rejeitar documento',
      })
    }
  })
}
</script>

<style scoped>
.doc-viewer {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
.doc-viewer-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}
</style>
