<template>
  <q-page padding>
    <div class="q-pa-md" style="max-width: 880px; margin: 0 auto">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">Consulta Externa</div>
          <div class="text-subtitle2">
            Informe o número do processo. Se for restrito, use CPF e chave.
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="q-mb-sm">
            <q-btn-toggle
              v-model="modo"
              toggle-color="primary"
              :options="[
                { label: 'Processos públicos', value: 'PUBLICO' },
                { label: 'Processos restritos', value: 'RESTRITO' },
              ]"
            />
          </div>
          <div class="row items-center q-col-gutter-sm">
            <div class="col-12 col-md-6" v-show="modo === 'PUBLICO'">
              <q-input
                v-model="termo"
                label="Número do processo"
                dense
                clearable
                @keyup.enter="consultar"
              />
            </div>
            <template v-if="modo === 'RESTRITO'">
              <div class="col-12 col-md-4">
                <q-input
                  v-model="termo"
                  label="Número do processo"
                  dense
                  clearable
                  @keyup.enter="consultar"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-input v-model="cpf" label="CPF" dense clearable @keyup.enter="consultar" />
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  v-model="chave"
                  label="Chave de acesso"
                  dense
                  clearable
                  @keyup.enter="consultar"
                />
              </div>
            </template>
            <div class="col-12">
              <q-btn
                color="primary"
                label="Consultar"
                :loading="loading"
                @click="consultar"
                :disable="botaoDesabilitado"
                class="full-width q-mt-sm"
              />
            </div>
          </div>
          <div v-if="estado === 'nao_encontrado'" class="q-mt-md">
            <q-banner class="bg-grey-3 text-grey-9">
              <template v-slot:avatar>
                <q-icon name="search_off" color="grey-9" />
              </template>
              Não encontrado.
            </q-banner>
          </div>
          <div v-if="estado === 'restrito'" class="q-mt-md">
            <q-banner class="bg-orange-2 text-orange-9">
              <template v-slot:avatar>
                <q-icon name="lock" color="orange-9" />
              </template>
              <div v-if="modo == 'PUBLICO'">Não encontrado.</div>
              <div v-if="modo == 'RESTRITO'">
                Informe CPF e chave válidos da parte para visualizar.
              </div>
            </q-banner>
          </div>
          <div v-if="estado === 'erro'" class="q-mt-md">
            <q-banner class="bg-red-2 text-red-9">
              <template v-slot:avatar>
                <q-icon name="error" color="red-9" />
              </template>
              Ocorreu um erro na consulta. Tente novamente.
            </q-banner>
          </div>
        </q-card-section>
      </q-card>

      <div v-if="resultado" class="q-mt-lg">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Capa do Processo</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <div class="text-caption text-grey-7">Número</div>
                <div class="text-body1">{{ resultado.capaPublica.numero }}</div>
              </div>
              <div class="col-12 col-md-4">
                <div class="text-caption text-grey-7">Assunto</div>
                <div class="text-body1">{{ resultado.capaPublica.assunto }}</div>
              </div>
              <div class="col-12 col-md-4">
                <div class="text-caption text-grey-7">Situação</div>
                <q-badge color="primary" outline>{{ resultado.capaPublica.status }}</q-badge>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="q-mt-md">
          <q-card-section>
            <div class="text-h6">Partes/Interessados</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div
              v-if="(resultado.partesPublicas || []).length === 0"
              class="text-caption text-grey-7"
            >
              Nenhuma parte pública vinculada.
            </div>
            <q-table
              v-else
              flat
              bordered
              dense
              row-key="id"
              :rows="resultado.partesPublicas"
              :columns="columnsPartesPublicas"
              :pagination="{ rowsPerPage: 10 }"
            />
          </q-card-section>
        </q-card>

        <q-card flat bordered class="q-mt-md">
          <q-card-section>
            <div class="text-h6">Andamentos</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div
              v-if="(resultado.andamentosPublicos || []).length === 0"
              class="text-caption text-grey-7"
            >
              Nenhum andamento público encontrado.
            </div>
            <q-table
              v-else
              flat
              bordered
              dense
              row-key="id"
              :rows="resultado.andamentosPublicos"
              :columns="columnsAndamentos"
              :pagination="{ rowsPerPage: 10 }"
            />
          </q-card-section>
        </q-card>

        <q-card flat bordered class="q-mt-md">
          <q-card-section>
            <div class="text-h6">Documentos Públicos</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div
              v-if="(resultado.documentosPublicos || []).length === 0"
              class="text-caption text-grey-7"
            >
              Nenhum documento público disponível.
            </div>
            <q-list bordered separator v-else>
              <q-item v-for="d in resultado.documentosPublicos" :key="d.id">
                <q-item-section>
                  <q-item-label>{{ d.titulo }}</q-item-label>
                  <q-item-label caption>Tipo: {{ d.tipo }} • Status: {{ d.status }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    dense
                    color="primary"
                    icon="download"
                    label="Baixar"
                    :loading="!!downloadingMap[d.id]"
                    :disable="!!downloadingMap[d.id]"
                    @click="baixarDocumento(d)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useExternoStore } from 'src/stores/externo-store'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()
const route = useRoute()
const externo = useExternoStore()
const modo = ref('PUBLICO')
const termo = ref('')
const cpf = ref('')
const chave = ref('')
const loading = ref(false)
const estado = ref('') // '', 'nao_encontrado', 'restrito', 'erro'
const resultado = ref(null)
const downloadingMap = ref({})
const columnsAndamentos = [
  {
    name: 'data',
    label: 'Data',
    field: 'data',
    align: 'left',
    sortable: true,
    format: (val) => formatDate(val),
  },
  { name: 'origemSetor', label: 'Origem', field: 'origemSetor', align: 'left', sortable: true },
  { name: 'destinoSetor', label: 'Destino', field: 'destinoSetor', align: 'left', sortable: true },
  { name: 'motivo', label: 'Motivo', field: 'motivo', align: 'left' },
  { name: 'prioridade', label: 'Prioridade', field: 'prioridade', align: 'left' },
  {
    name: 'prazo',
    label: 'Prazo',
    field: 'prazo',
    align: 'left',
    format: (val) => formatDate(val),
  },
]

const columnsPartesPublicas = [
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' },
  { name: 'papel', label: 'Papel', field: 'papel', align: 'left' },
]

const botaoDesabilitado = computed(() => {
  const tOk = String(termo.value || '').trim() !== ''
  if (modo.value === 'PUBLICO') return !tOk
  const cpfOk = String(cpf.value || '').trim() !== ''
  const chaveOk = String(chave.value || '').trim() !== ''
  return !(tOk && cpfOk && chaveOk)
})

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  return d.toLocaleString('pt-BR')
}

async function consultar() {
  estado.value = ''
  resultado.value = null
  if (botaoDesabilitado.value) return
  loading.value = true
  try {
    const t = String(termo.value || '').trim()

    let resp
    if (modo.value === 'PUBLICO') {
      // Consulta pública por número exato
      resp = await api.get(`/public/consultas/${encodeURIComponent(t)}`)
      resultado.value = resp.data
    } else {
      // Consulta restrita: requer número + CPF + chave
      const params = {
        cpf: String(cpf.value || '').trim(),
        chave: String(chave.value || '').trim(),
      }
      resp = await api.get(`/public/consultas/${encodeURIComponent(t)}`, { params })
      resultado.value = resp.data
    }
  } catch (err) {
    const status = err?.response?.status
    if (status === 404) estado.value = 'nao_encontrado'
    else if (status === 403) {
      estado.value = 'restrito'
    } else estado.value = 'erro'
  } finally {
    loading.value = false
  }
}

async function baixarDocumento(docResumo) {
  downloadingMap.value[docResumo.id] = true
  try {
    const resp = await api.get(`/documentos/${docResumo.id}`)
    const d = resp.data
    if (!d) return

    // Upload: usa contentBase64 e fileName
    if (String(d.modo || '').toLowerCase() === 'upload' && d.contentBase64) {
      const base64 = d.contentBase64
      const fileName = d.fileName || `${d.titulo || 'documento'}.bin`
      const href = `data:application/octet-stream;base64,${base64}`
      baixarViaLink(href, fileName)
      return
    }

    // Editor: baixar PDF via endpoint público
    const params = {
      cpf: String(cpf.value || '').trim(),
      chave: String(chave.value || '').trim(),
    }
    const pdf = await api.get(`/public/documentos/${docResumo.id}/pdf`, { params })
    const base64 = pdf.data?.contentBase64 || ''
    const fileName = pdf.data?.fileName || `${(d.titulo || 'documento').replace(/\s+/g, '_')}.pdf`
    if (!base64) throw new Error('PDF indisponível')
    const href = `data:application/pdf;base64,${base64}`
    baixarViaLink(href, fileName, true)
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Falha ao baixar documento' })
  } finally {
    downloadingMap.value[docResumo.id] = false
  }
}

function baixarViaLink(href, fileName, revokeUrl = false) {
  const a = document.createElement('a')
  a.href = href
  a.download = fileName || 'arquivo'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  if (revokeUrl) {
    setTimeout(() => URL.revokeObjectURL(href), 500)
  }
}
onMounted(() => {
  try {
    externo.initialize()
    if (externo?.cpf) cpf.value = externo.cpf
    if (externo?.chave) chave.value = externo.chave
  } catch (e) {
    console.error(e)
  }
  const q = route?.query || {}
  const m = String(q.modo || '').toUpperCase()
  if (m === 'PUBLICO' || m === 'RESTRITO') modo.value = m
  if (q.numero) termo.value = String(q.numero)
  const podeAuto =
    (modo.value === 'RESTRITO' && termo.value && cpf.value && chave.value) ||
    (modo.value === 'PUBLICO' && termo.value)
  if (podeAuto) consultar()
})
</script>
