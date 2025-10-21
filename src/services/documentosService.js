import { api } from 'boot/axios'

export async function listByProcessoId(processoId, { viewerSetor } = {}) {
  const params = {}
  if (viewerSetor) params.viewerSetor = viewerSetor
  const { data } = await api.get(`/processos/${processoId}/documentos`, { params })
  return Array.isArray(data) ? data : data?.items || data || []
}

export async function seedByProcessoId(processoId, { viewerSetor } = {}) {
  await api.post(`/processos/${processoId}/documentos/seed`)
  const params = {}
  if (viewerSetor) params.viewerSetor = viewerSetor
  const { data } = await api.get(`/processos/${processoId}/documentos`, { params })
  return Array.isArray(data) ? data : data?.items || data || []
}

export async function getDocumento(id) {
  const { data } = await api.get(`/documentos/${id}`)
  return data
}

export async function updateEditorConteudo(id, conteudo, autorLogin) {
  const payload = { conteudo, autorLogin }
  const { data } = await api.post(`/documentos/${id}/editor/conteudo`, payload)
  return data
}

export async function uploadConteudo(id, fileName, contentBase64, autorLogin) {
  const payload = { fileName, contentBase64, autorLogin }
  const { data } = await api.post(`/documentos/${id}/upload`, payload)
  return data
}

export async function createDocumento({ titulo, tipo, modo, autorLogin, autorNome }) {
  const { data } = await api.post('/documentos', { titulo, tipo, modo, autorLogin, autorNome })
  return data
}

export async function linkDocumentoToProcesso(processoId, documentoId) {
  const { data } = await api.post(`/processos/${processoId}/documentos/link`, { documentoId })
  return data
}

export async function assinarDocumento(id, usuarioLogin) {
  const payload = { usuarioLogin }
  const { data } = await api.post(`/documentos/${id}/assinar`, payload)
  return data
}

export async function deletarDocumento(id, usuarioLogin) {
  const payload = { usuarioLogin }
  const { data } = await api.post(`/documentos/${id}/deletar`, payload)
  return data
}
