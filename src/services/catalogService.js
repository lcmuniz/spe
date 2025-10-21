import { api } from 'boot/axios'

export async function listarAssuntos() {
  const { data } = await api.get('/catalog/assuntos')
  return Array.isArray(data) ? data : data?.items || data || []
}

export async function listarSetores() {
  const { data } = await api.get('/setores')
  return Array.isArray(data) ? data : data?.items || data || []
}