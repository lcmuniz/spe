import { api } from 'boot/axios'

export async function listModelos(tipoId) {
  const params = {}
  if (tipoId) params.tipoId = tipoId
  const { data } = await api.get('/documentos/modelos', { params })
  return Array.isArray(data) ? data : data?.items || data || []
}

export async function getModeloById(id) {
  const { data } = await api.get(`/documentos/modelos/${id}`)
  return data
}
