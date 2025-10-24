const { query } = require('../db')
const { v4: uuidv4 } = require('uuid')

async function listProcessosPorParteCredencial(cpf, chave) {
  const doc = String(cpf || '').trim()
  const key = String(chave || '').trim()
  if (!doc || !key) {
    const err = new Error('CPF e chave são obrigatórios')
    err.code = 400
    throw err
  }

  const { rows } = await query(
    `SELECT p.id,
            p.numero,
            p.assunto,
            p.status,
            p.tipo,
            p.nivel_acesso AS "nivelAcesso",
            p.setor_atual AS setor,
            p.atribuido_usuario AS "atribuidoA",
            p.criado_em AS "criadoEm",
            COALESCE((SELECT MAX(t.data) FROM tramites t WHERE t.processo_id = p.id), p.criado_em) AS "ultimaMovimentacao",
            pp.papel AS "meuPapel",
            cp.nome AS "meuNome"
       FROM processos p
       JOIN processo_partes pp ON pp.processo_id = p.id
       JOIN cadastro_partes cp ON cp.id = pp.cadastro_parte_id
      WHERE cp.documento = $1
        AND cp.chave = $2
        AND cp.chave_ativo = TRUE
      ORDER BY p.criado_em DESC`,
    [doc, key],
  )

  return rows
}

async function _validarParteProcesso(numero, cpf, chave) {
  const num = String(numero || '').trim()
  const doc = String(cpf || '').trim()
  const key = String(chave || '').trim()
  if (!num || !doc || !key) {
    const err = new Error('Número, CPF e chave são obrigatórios')
    err.code = 400
    throw err
  }
  const { rows: prows } = await query(`SELECT id FROM processos WHERE numero = $1 LIMIT 1`, [num])
  if (prows.length === 0) {
    const err = new Error('Processo não encontrado')
    err.code = 404
    throw err
  }
  const processoId = prows[0].id
  const { rows: vrows } = await query(
    `SELECT 1
       FROM processo_partes pp
       JOIN cadastro_partes cp ON cp.id = pp.cadastro_parte_id
      WHERE pp.processo_id = $1
        AND cp.documento = $2
        AND cp.chave = $3
        AND cp.chave_ativo = TRUE
      LIMIT 1`,
    [processoId, doc, key],
  )
  if (vrows.length === 0) {
    const err = new Error('Credenciais não conferem para este processo')
    err.code = 403
    throw err
  }
  return { processoId, parteDocumento: doc }
}

async function listarDocumentosExternosTemporarios(numero, cpf, chave) {
  const { processoId, parteDocumento } = await _validarParteProcesso(numero, cpf, chave)
  const { rows } = await query(
    `SELECT id,
            file_name AS "fileName",
            status,
            titulo,
            criado_em AS "criadoEm"
       FROM externo_documentos_temp
      WHERE processo_id = $1
        AND parte_documento = $2
      ORDER BY criado_em DESC`,
    [processoId, parteDocumento],
  )
  return rows
}

async function anexarDocumentoExternoTemporario(numero, cpf, chave, fileName, contentBase64, titulo) {
  const { processoId, parteDocumento } = await _validarParteProcesso(numero, cpf, chave)
  const name = String(fileName || '').trim()
  const content = String(contentBase64 || '').trim()
  if (!name || !content) {
    const err = new Error('Arquivo inválido')
    err.code = 400
    throw err
  }
  const id = uuidv4()
  await query(
    `INSERT INTO externo_documentos_temp (id, processo_id, parte_documento, file_name, content_base64, status, titulo)
     VALUES ($1, $2, $3, $4, $5, 'aguardando_analise', $6)`,
    [id, processoId, parteDocumento, name, content, titulo || null],
  )
  const { rows } = await query(
    `SELECT id,
            file_name AS "fileName",
            status,
            titulo,
            criado_em AS "criadoEm"
       FROM externo_documentos_temp
      WHERE id = $1`,
    [id],
  )
  return rows[0]
}

module.exports = {
  listProcessosPorParteCredencial,
  listarDocumentosExternosTemporarios,
  anexarDocumentoExternoTemporario,
}