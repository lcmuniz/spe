<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Área do Usuário Externo</div>
            <div class="text-subtitle2">Entre com seu CPF e chave para listar seus processos</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-sm">
              <div class="col-12">
                <q-input v-model="cpf" label="CPF" mask="###.###.###-##" fill-input />
              </div>
              <div class="col-12">
                <q-input v-model="chave" label="Chave de acesso" />
              </div>
            </div>
            <div v-if="erro" class="text-negative q-mt-sm">{{ erro }}</div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn color="primary" :disable="botaoDesabilitado" :loading="carregando" @click="listar">
              Listar meus processos
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>

      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6">Meus processos</div>
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
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { listarMeusProcessosPorCpfChave } from 'src/services/processosService'

const cpf = ref('')
const chave = ref('')
const processos = ref([])
const carregando = ref(false)
const erro = ref('')

const botaoDesabilitado = computed(() => !cpf.value || !chave.value)

const columns = [
  { name: 'numero', label: 'Número', field: 'numero', align: 'left' },
  { name: 'assunto', label: 'Assunto', field: 'assunto', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'nivelAcesso', label: 'Acesso', field: 'nivelAcesso', align: 'left' },
  {
    name: 'ultimaMovimentacao',
    label: 'Última mov.',
    field: 'ultimaMovimentacao',
    align: 'left',
    format: (val) => (val ? new Date(val).toLocaleString() : ''),
  },
  { name: 'meuPapel', label: 'Meu papel', field: 'meuPapel', align: 'left' },
]

async function listar() {
  erro.value = ''
  carregando.value = true
  try {
    const semMascara = (cpf.value || '').replace(/[^0-9]/g, '')
    const lista = await listarMeusProcessosPorCpfChave({ cpf: semMascara, chave: chave.value })
    processos.value = Array.isArray(lista) ? lista : []
  } catch (e) {
    erro.value = e?.response?.data?.error || e?.message || 'Falha ao listar processos'
    processos.value = []
  } finally {
    carregando.value = false
  }
}
</script>