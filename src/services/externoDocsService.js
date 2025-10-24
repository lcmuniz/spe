import { api } from 'src/boot/axios'

export async function listarDocumentosExternosTemporarios({ numero, cpf, chave }) {
  if (!numero || !cpf || !chave) throw new Error('Parâmetros insuficientes')
  const { data } = await api.get(`/public/externo/processos/${encodeURIComponent(numero)}/documentos`, {
    params: { cpf, chave },
  })
  return Array.isArray(data) ? data : []
}

export async function anexarDocumentoExternoTemporario({ numero, cpf, chave, fileName, contentBase64, titulo }) {
  if (!numero || !cpf || !chave || !fileName || !contentBase64) throw new Error('Parâmetros insuficientes')
  const payload = { fileName, contentBase64 }
  if (titulo) payload.titulo = titulo
  const { data } = await api.post(`/public/externo/processos/${encodeURIComponent(numero)}/documentos`, payload, {
    params: { cpf, chave },
  })
  return data
}

// Lista anexos externos vinculados a um processo específico (interno)
export async function listarDocumentosExternosPorProcesso({ processoId, status } = {}) {
  if (!processoId) throw new Error('processoId é obrigatório')
  const params = {}
  if (status) params.status = status
  const { data } = await api.get(`/processos/${processoId}/externo/documentos`, { params })
  return Array.isArray(data) ? data : []
}

// Obter detalhe/conteúdo de um anexo temporário (interno)
export async function getTemporario({ processoId, tempId }) {
  if (!processoId || !tempId) throw new Error('Parâmetros insuficientes')
  const { data } = await api.get(`/processos/${processoId}/externo/documentos/${tempId}`)
  return data
}

// Aceitar (juntar) anexo temporário ao processo (interno)
export async function aceitarTemporario({ processoId, tempId }) {
  if (!processoId || !tempId) throw new Error('Parâmetros insuficientes')
  const { data } = await api.post(`/processos/${processoId}/externo/documentos/${tempId}/aceitar`)
  return data
}

// Rejeitar anexo temporário com motivo (interno)
export async function rejeitarTemporario({ processoId, tempId, motivo }) {
  if (!processoId || !tempId) throw new Error('Parâmetros insuficientes')
  if (!motivo) throw new Error('Motivo é obrigatório')
  const { data } = await api.post(`/processos/${processoId}/externo/documentos/${tempId}/rejeitar`, { motivo })
  return data
}