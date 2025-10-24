<template>
  <q-form ref="formRef" @submit.prevent="onSubmit" @reset="onReset">
    <div class="row q-col-gutter-sm">
      <div class="col-12 col-md-3">
        <q-select
          v-model="localForm.tipo"
          :options="tipoOptionsResolved"
          label="Tipo"
          dense
          emit-value
          map-options
          :rules="[(v) => !!v || 'Informe o tipo']"
        />
      </div>
      <div class="col-12 col-md-9">
        <q-input
          v-model="localForm.nome"
          label="Nome"
          dense
          :rules="[(v) => !!String(v).trim() || 'Informe o nome']"
        />
      </div>

      <div class="col-12 col-md-4">
        <q-input
          v-model="localForm.documento"
          label="CPF/CNPJ"
          dense
          :rules="[(v) => !!String(v).trim() || 'Informe o documento']"
        />
      </div>
      <div class="col-12 col-md-4">
        <q-input
          v-model="localForm.email"
          label="Email"
          type="email"
          dense
          :rules="[
            (v) => !!String(v).trim() || 'Informe o email',
            (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v).trim()) || 'Email inválido',
          ]"
        />
      </div>
      <div class="col-12 col-md-4">
        <q-input v-model="localForm.telefone" label="Telefone" dense />
      </div>

      <div class="col-12 col-md-6">
        <q-input v-model="localForm.endereco_logradouro" label="Logradouro" dense />
      </div>
      <div class="col-6 col-md-2">
        <q-input v-model="localForm.endereco_numero" label="Número" dense />
      </div>
      <div class="col-6 col-md-4">
        <q-input v-model="localForm.endereco_complemento" label="Complemento" dense />
      </div>

      <div class="col-12 col-md-4">
        <q-input v-model="localForm.endereco_bairro" label="Bairro" dense />
      </div>
      <div class="col-12 col-md-4">
        <q-input v-model="localForm.endereco_cidade" label="Cidade" dense />
      </div>
      <div class="col-6 col-md-2">
        <q-select
          v-model="localForm.endereco_estado"
          :options="ufOptionsResolved"
          label="UF"
          dense
          emit-value
          map-options
        />
      </div>
      <div class="col-6 col-md-2">
        <q-input v-model="localForm.endereco_cep" label="CEP" dense />
      </div>
    </div>

    <div class="row q-mt-md">
      <div class="col-auto">
        <q-btn color="primary" :label="submitLabelResolved" type="submit" :loading="saving" />
      </div>
      <div class="col-auto">
        <q-btn flat label="Cancelar" color="grey" v-close-popup />
      </div>
    </div>
  </q-form>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
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
    }),
  },
  tipoOptions: {
    type: Array,
    default: () => [
      { label: 'Pessoa Física', value: 'FISICA' },
      { label: 'Pessoa Jurídica', value: 'JURIDICA' },
    ],
  },
  ufOptions: {
    type: Array,
    default: () =>
      [
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
      ].map((uf) => ({ label: uf, value: uf })),
  },
  saving: { type: Boolean, default: false },
  submitLabel: { type: String, default: 'Salvar' },
})

const emit = defineEmits(['update:modelValue', 'submit', 'reset'])

const localForm = ref({ ...props.modelValue })
const formRef = ref(null)

watch(
  () => props.modelValue,
  (val) => {
    // Atualiza o objeto local sem substituir a referência
    if (val && typeof val === 'object') {
      Object.keys({
        tipo: '',
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
      }).forEach((k) => {
        localForm.value[k] = val[k] ?? localForm.value[k] ?? null
      })
    }
  },
  { deep: false },
)

watch(
  localForm,
  (val) => {
    // Emite atualização pós-render para evitar piscar de valores
    emit('update:modelValue', { ...val })
  },
  { deep: true, flush: 'post' },
)

const tipoOptionsResolved = computed(() => props.tipoOptions || [])
const ufOptionsResolved = computed(() => props.ufOptions || [])
const submitLabelResolved = computed(() => props.submitLabel || 'Salvar')

async function onSubmit() {
  // Valida campos obrigatórios via QForm
  const ok = await formRef.value?.validate?.()
  if (!ok) return
  emit('submit', { ...localForm.value })
}

function onReset(e) {
  try {
    e?.preventDefault?.()
  } catch (e) {
    console.error(e)
  }
  localForm.value = {
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
  emit('reset')
}
</script>
