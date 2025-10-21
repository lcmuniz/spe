import { api } from 'boot/axios'

export async function listarUsuarios({ setor, login } = {}) {
  const params = {}
  if (setor) params.setor = setor
  if (login) params.login = login
  const { data } = await api.get('/usuarios', { params })
  return Array.isArray(data) ? data : data?.items || data || []
}