const { v4: uuidv4 } = require('uuid')
const { query } = require('../db')

async function listAcessos(processoId) {
  const { rows } = await query(
    `SELECT a.id,
            a.tipo,
            a.valor,
            a.criado_em AS "criadoEm"
      FROM processo_acessos a
      WHERE a.processo_id = $1
      ORDER BY a.criado_em ASC`,
    [processoId],
  )
  return rows
}

async function addAcesso(processoId, { tipo, valor }) {
  const t = String(tipo || '').toUpperCase()
  if (!['SETOR', 'USUARIO'].includes(t)) {
    const err = new Error('tipo inválido')
    err.code = 400
    throw err
  }
  if ((t === 'SETOR' || t === 'USUARIO') && !valor) {
    const err = new Error('valor é obrigatório')
    err.code = 400
    throw err
  }

  const proc = await query(`SELECT id FROM processos WHERE id = $1`, [processoId])
  if (proc.rows.length === 0) {
    const err = new Error('Processo não encontrado')
    err.code = 404
    throw err
  }

  const acessoId = uuidv4()
  await query(
    `INSERT INTO processo_acessos (id, processo_id, tipo, valor)
     VALUES ($1, $2, $3, $4)`,
    [acessoId, processoId, t, valor],
  )

  return { id: acessoId }
}

async function removeAcesso(processoId, acessoId) {
  const { rowCount } = await query(
    `DELETE FROM processo_acessos WHERE id = $1 AND processo_id = $2`,
    [acessoId, processoId],
  )
  if (rowCount === 0) {
    const err = new Error('Acesso não encontrado')
    err.code = 404
    throw err
  }
  return { ok: true }
}

module.exports = {
  listAcessos,
  addAcesso,
  removeAcesso,
}
