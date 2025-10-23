import { api } from 'boot/axios'

export async function listarSetores () {
  const { data } = await api.get('/setores')
  return data
}

export async function listarTiposProcesso () {
  const { data } = await api.get('/catalog/tipos-processo')
  return data
}
