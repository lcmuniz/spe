import { api } from 'boot/axios'

export async function getProcesso(id) {
  const { data } = await api.get(`/processos/${id}`)
  return data
}

export async function atualizarDados(id, payload) {
  const { data } = await api.post(`/processos/${id}/dados`, payload)
  // Normaliza o formato: alguns endpoints retornam { ok, processo }
  return data?.processo ?? data
}

export async function tramitarProcesso(id, { destinoSetor, usuario, motivo, prioridade, prazo }) {
  const payload = { destinoSetor, usuario, motivo, prioridade, prazo }
  const { data } = await api.post(`/processos/${id}/tramites`, payload)
  return data
}

export async function atribuirProcesso(id, { usuario, executadoPor }) {
  const { data } = await api.post(`/processos/${id}/atribuir`, { usuario, executadoPor })
  return data
}

export async function atualizarPrioridade(id, { prioridade, executadoPor }) {
  const { data } = await api.post(`/processos/${id}/prioridade`, { prioridade, executadoPor })
  return data
}

export async function listarTramites(id) {
  const { data } = await api.get(`/processos/${id}/tramites`)
  return Array.isArray(data) ? data : data?.items || data || []
}

export async function listarProcessos(params) {
  const { data } = await api.get('/processos', { params })
  return data
}

export async function aceitarPendencia(id, { usuario }) {
  const { data } = await api.post(`/processos/${id}/pendencia/aceitar`, { usuario })
  return data
}

export async function recusarPendencia(id, { usuario, motivo }) {
  const { data } = await api.post(`/processos/${id}/pendencia/recusar`, { usuario, motivo })
  return data
}

export async function arquivarProcesso(id, { usuario }) {
  const { data } = await api.post(`/processos/${id}/arquivar`, { usuario })
  return data
}

export async function criarProcesso(payload) {
  const { data } = await api.post('/processos', payload)
  return data
}

export async function adicionarParte(id, { tipo, nome, documento, papel, executadoPor }) {
  const payload = { tipo, nome, documento, papel, executadoPor }
  const { data } = await api.post(`/processos/${id}/partes`, payload)
  return data
}

export async function removerParte(id, parteId, { executadoPor } = {}) {
  const { data } = await api.delete(`/processos/${id}/partes/${parteId}`, {
    data: { executadoPor },
  })
  return data
}

export async function listarAcessos(id) {
  const { data } = await api.get(`/processos/${id}/acessos`)
  return Array.isArray(data) ? data : data?.items || data || []
}

export async function adicionarAcesso(id, { tipo, valor, parteId, executadoPor }) {
  const payload = { tipo, valor, parteId, executadoPor }
  const { data } = await api.post(`/processos/${id}/acessos`, payload)
  return data
}

export async function removerAcesso(id, acessoId, { executadoPor } = {}) {
  const { data } = await api.delete(`/processos/${id}/acessos/${acessoId}`, {
    data: { executadoPor },
  })
  return data
}

export async function listarChaves(id) {
  const { data } = await api.get(`/processos/${id}/chaves`)
  return Array.isArray(data) ? data : data?.items || data || []
}

export async function criarChave(id, { parteId, executadoPor }) {
  const payload = { parteId, executadoPor }
  const { data } = await api.post(`/processos/${id}/chaves`, payload)
  return data
}

export async function revogarChave(id, chaveId, { executadoPor } = {}) {
  const { data } = await api.delete(`/processos/${id}/chaves/${chaveId}`, {
    data: { executadoPor },
  })
  return data
}