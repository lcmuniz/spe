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