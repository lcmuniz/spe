import { api } from 'boot/axios'

export async function listarPartesCadastro({ q, limit = 50, offset = 0 } = {}) {
  const params = { q, limit, offset }
  const { data } = await api.get('/partes-cadastro', { params })
  return Array.isArray(data) ? data : data?.items || data || []
}

export async function getParteCadastro(id) {
  const { data } = await api.get(`/partes-cadastro/${id}`)
  return data
}

export async function criarParteCadastro(payload) {
  const { data } = await api.post('/partes-cadastro', payload)
  return data
}

export async function atualizarParteCadastro(id, payload) {
  const { data } = await api.put(`/partes-cadastro/${id}`, payload)
  return data
}

export async function removerParteCadastro(id, body = {}) {
  const { data } = await api.delete(`/partes-cadastro/${id}`, { data: body })
  return data
}