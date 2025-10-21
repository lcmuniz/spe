require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { v4: uuidv4 } = require('uuid')
const { query, initDb } = require('./db')

const app = express()
//const PORT = process.env.PORT || 3001
const PORT = 3001

// Ajusta CORS para permitir o frontend em 9000 e 9002
app.use(cors({ origin: ['http://localhost:9000'], credentials: false }))
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))

initDb()
  .then(() => console.log('Banco de dados inicializado'))
  .catch((e) => {
    console.error('Falha ao inicializar banco:', e)
    process.exit(1)
  })

const sampleAssuntos = [
  'Licitação',
  'Contratos',
  'Recursos Humanos',
  'Transparência',
  'Ouvidoria',
  'TI - Sistemas',
]

function genNumero() {
  const year = new Date().getFullYear()
  const seq = Math.floor(100000 + Math.random() * 900000)
  return `${seq}/${year}`
}

async function auditLog(req, { acao, usuarioLogin, entidade, entidadeId, detalhes }) {
  try {
    const id = uuidv4()
    const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').toString()
    const user_agent = (req.headers['user-agent'] || '').toString()
    const rota = req.originalUrl || req.url

    await query(
      `INSERT INTO auditoria (id, acao, usuario_login, entidade, entidade_id, detalhes, ip, user_agent, rota)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        acao,
        usuarioLogin || null,
        entidade || null,
        entidadeId || null,
        detalhes || null,
        ip,
        user_agent,
        rota,
      ],
    )
  } catch (e) {
    console.error('Falha ao registrar auditoria:', e)
  }
}

// Helpers de filtro
// GET /api/setores
app.get('/api/setores', async (req, res) => {
  try {
    const { rows } = await query(`SELECT sigla, nome FROM setores ORDER BY nome`)
    res.json(rows)
  } catch (e) {
    console.error('Erro em GET /api/setores', e)
    res.status(500).json({ error: 'Erro ao listar setores' })
  }
})

// GET /api/processos?filtros
app.get('/api/processos', async (req, res) => {
  try {
    const q = req.query
    const where = []
    const params = []

    if (q.numero) {
      params.push(`%${q.numero}%`)
      where.push(`p.numero ILIKE $${params.length}`)
    }
    if (q.assunto) {
      params.push(`%${q.assunto}%`)
      where.push(`p.assunto ILIKE $${params.length}`)
    }
    if (q.interessado) {
      params.push(`%${q.interessado}%`)
      where.push(
        `EXISTS (SELECT 1 FROM processo_partes pp WHERE pp.processo_id = p.id AND pp.nome ILIKE $${params.length})`,
      )
    }
    if (q.status) {
      params.push(q.status)
      where.push(`p.status = $${params.length}`)
    }
    if (q.prioridade) {
      params.push(q.prioridade)
      where.push(`p.prioridade = $${params.length}`)
    }
    if (q.nivelAcesso) {
      params.push(q.nivelAcesso)
      where.push(`p.nivel_acesso = $${params.length}`)
    }
    if (q.setor) {
      params.push(q.setor)
      where.push(`p.setor_atual = $${params.length}`)
    }
    if (q.pendente === 'true') {
      where.push(`p.pendente = TRUE`)
    }
    if (q.pendenteSetor) {
      params.push(q.pendenteSetor)
      where.push(`p.pendente_destino_setor = $${params.length}`)
    }
    if (q.somenteMeus === 'true' && q.usuario) {
      params.push(q.usuario)
      where.push(`p.atribuido_usuario = $${params.length}`)
    }

    const page = parseInt(q.page || '1', 10)
    const pageSize = parseInt(q.pageSize || '10', 10)
    const offset = (page - 1) * pageSize

    const countSql = `SELECT COUNT(*) FROM processos p ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`
    const { rows: countRows } = await query(countSql, params)
    const total = parseInt(countRows[0].count, 10)

    const itemsSql = `
      SELECT
        p.id,
        p.numero,
        p.assunto,
        p.status,
        p.prioridade,
        p.prazo AS "prazo",
        p.nivel_acesso AS "nivelAcesso",
        p.setor_atual AS setor,
        p.atribuido_usuario AS "atribuidoA",
        p.pendente AS pendente,
        p.pendente_origem_setor AS "pendenteOrigemSetor",
        p.pendente_destino_setor AS "pendenteDestinoSetor",
        p.criado_em AS "criadoEm",
        COALESCE(
          (SELECT MAX(t.data) FROM tramites t WHERE t.processo_id = p.id),
          p.criado_em
        ) AS "ultimaMovimentacao",
        (
          SELECT nome FROM processo_partes pp
          WHERE pp.processo_id = p.id
          ORDER BY pp.id LIMIT 1
        ) AS interessado
      FROM processos p
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY p.criado_em DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `
    const { rows } = await query(itemsSql, [...params, pageSize, offset])

    res.json({ total, page, pageSize, items: rows })
  } catch (e) {
    console.error('Erro em GET /api/processos', e)
    res.status(500).json({ error: 'Erro ao listar processos' })
  }
})

// GET /api/catalog/assuntos
app.get('/api/catalog/assuntos', (req, res) => {
  res.json(sampleAssuntos)
})

// GET /api/usuarios?setor=SETOR&login=LOGIN
app.get('/api/usuarios', async (req, res) => {
  try {
    const setor = String(req.query.setor || '').toUpperCase()
    const login = String(req.query.login || '')

    if (login) {
      const { rows } = await query(
        `SELECT login AS "username", setor, nome, cargo FROM usuarios WHERE login = $1`,
        [login],
      )
      if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' })
      return res.json(rows[0])
    }

    if (setor) {
      const { rows } = await query(
        `SELECT login AS "username", nome, cargo FROM usuarios WHERE setor = $1 ORDER BY login`,
        [setor],
      )
      return res.json(rows)
    }

    const { rows } = await query(
      `SELECT setor, login AS "username", nome, cargo FROM usuarios ORDER BY setor, login`,
    )
    res.json(rows)
  } catch (e) {
    console.error('Erro em GET /api/usuarios', e)
    res.status(500).json({ error: 'Erro ao listar usuários' })
  }
})

// POST /api/usuarios/upsert { login, nome, setor?, cargo? }
app.post('/api/usuarios/upsert', async (req, res) => {
  try {
    const { login, nome, setor, cargo } = req.body
    if (!login) {
      return res.status(400).json({ error: 'Login é obrigatório' })
    }

    // Verifica se já existe usuário para decidir regra de setor
    const { rows: existing } = await query(`SELECT login, setor FROM usuarios WHERE login = $1`, [
      login,
    ])

    const nomeVal = nome || null
    const cargoVal = cargo || null

    if (existing.length > 0) {
      // Atualiza preservando setor existente quando não informado
      const setorVal =
        setor !== undefined && setor !== null && setor !== '' ? setor : existing[0].setor

      const { rows } = await query(
        `UPDATE usuarios
           SET nome = COALESCE($2, nome),
               setor = COALESCE($3, setor),
               cargo = COALESCE($4, cargo)
         WHERE login = $1
         RETURNING login AS "username", nome, setor, cargo`,
        [login, nomeVal, setorVal, cargoVal],
      )

      const detalhes = { setor: setorVal, tipo: 'update' }
      if (rows && rows[0] && rows[0].cargo !== null && rows[0].cargo !== undefined) {
        detalhes.cargo = rows[0].cargo
      }
      await auditLog(req, {
        acao: 'usuario.upsert',
        usuarioLogin: login,
        entidade: 'usuario',
        entidadeId: login,
        detalhes,
      })

      return res.json({ ok: true, usuario: rows[0] })
    }

    // Novo usuário: setor é obrigatório para respeitar NOT NULL do schema
    if (!setor) {
      return res.status(400).json({ error: 'Setor é obrigatório para novo usuário' })
    }

    const { rows } = await query(
      `INSERT INTO usuarios (login, nome, setor, cargo)
       VALUES ($1, $2, $3, $4)
       RETURNING login AS "username", nome, setor, cargo`,
      [login, nomeVal, setor, cargoVal],
    )

    const detalhes = { setor, tipo: 'create' }
    if (rows && rows[0] && rows[0].cargo !== null && rows[0].cargo !== undefined) {
      detalhes.cargo = rows[0].cargo
    }
    await auditLog(req, {
      acao: 'usuario.criar',
      usuarioLogin: login,
      entidade: 'usuario',
      entidadeId: login,
      detalhes,
    })

    return res.json({ ok: true, usuario: rows[0] })
  } catch (e) {
    console.error('Erro em POST /api/usuarios/upsert', e)
    res.status(500).json({ error: 'Erro ao atualizar/cadastrar usuário' })
  }
})

// POST /api/processos/:id/atribuir { usuario, executadoPor }
app.post('/api/processos/:id/atribuir', async (req, res) => {
  try {
    const { id } = req.params
    const { usuario, executadoPor } = req.body

    if (!usuario) {
      return res.status(400).json({ error: 'Usuário de destino é obrigatório' })
    }
    if (!executadoPor) {
      return res.status(400).json({ error: 'Usuário executor é obrigatório' })
    }

    // Verifica setor atual do processo e responsável atual
    const proc = await query(`SELECT setor_atual, atribuido_usuario FROM processos WHERE id = $1`, [
      id,
    ])
    if (proc.rows.length === 0) return res.status(404).json({ error: 'Processo não encontrado' })
    const setorAtual = String(proc.rows[0].setor_atual || '').toUpperCase()
    const atualAtribuido = proc.rows[0].atribuido_usuario || null

    // Regra: só pode atribuir se o processo estiver atribuído ao executor ou sem responsável
    if (atualAtribuido && String(atualAtribuido) !== String(executadoPor)) {
      return res
        .status(403)
        .json({ error: 'Você só pode atribuir processos atribuídos a você ou sem responsável' })
    }

    // Valida se o usuário de destino pertence ao mesmo setor via banco
    const { rows: urows } = await query(`SELECT setor FROM usuarios WHERE login = $1`, [usuario])
    if (urows.length === 0) {
      return res.status(400).json({ error: 'Usuário não encontrado' })
    }
    const setorUsuario = String(urows[0].setor || '').toUpperCase()
    if (setorUsuario !== setorAtual.toUpperCase()) {
      return res.status(400).json({ error: 'Usuário não pertence ao setor atual do processo' })
    }

    const { rowCount } = await query(`UPDATE processos SET atribuido_usuario = $1 WHERE id = $2`, [
      usuario || null,
      id,
    ])
    if (rowCount === 0) return res.status(404).json({ error: 'Processo não encontrado' })

    const { rows } = await query(
      `SELECT id, numero, assunto, status, prioridade, prazo, nivel_acesso AS "nivelAcesso", setor_atual AS setor, atribuido_usuario AS "atribuidoA", criado_em AS "criadoEm", COALESCE((SELECT MAX(data) FROM tramites WHERE processo_id = $1), criado_em) AS "ultimaMovimentacao" FROM processos WHERE id = $1`,
      [id],
    )

    await auditLog(req, {
      acao: 'processo.atribuir',
      usuarioLogin: executadoPor,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { de: atualAtribuido || null, para: usuario },
    })

    res.json({ ok: true, processo: rows[0] })
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/atribuir', e)
    res.status(500).json({ error: 'Erro ao atribuir processo' })
  }
})

// POST /api/processos/:id/tramites { destinoSetor, usuario }
app.post('/api/processos/:id/tramites', async (req, res) => {
  try {
    const { id } = req.params
    const { destinoSetor, usuario, motivo, prioridade, prazo } = req.body

    if (!usuario) {
      return res.status(400).json({ error: 'Usuário executor é obrigatório' })
    }

    const { rows: procRows } = await query(
      `SELECT setor_atual, atribuido_usuario FROM processos WHERE id = $1`,
      [id],
    )
    if (procRows.length === 0) return res.status(404).json({ error: 'Processo não encontrado' })
    const origem = procRows[0].setor_atual
    const atribuidoAtual = procRows[0].atribuido_usuario

    if (String(atribuidoAtual || '') !== String(usuario)) {
      return res.status(403).json({ error: 'Você só pode tramitar processos atribuídos a você' })
    }

    const tramiteId = uuidv4()
    await query('BEGIN')
    await query(
      `INSERT INTO tramites (id, processo_id, origem_setor, destino_setor, motivo, prioridade, prazo, origem_usuario)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        tramiteId,
        id,
        origem,
        destinoSetor,
        motivo || null,
        prioridade || null,
        prazo || null,
        usuario,
      ],
    )
    await query(
      `UPDATE processos
         SET status = 'Aguardando',
             pendente = TRUE,
             pendente_origem_setor = $3,
             pendente_destino_setor = $1,
             atribuido_usuario = NULL,
             prioridade = COALESCE($4, prioridade),
             prazo = COALESCE($5, prazo)
       WHERE id = $2`,
      [destinoSetor, id, origem, prioridade || null, prazo || null],
    )
    await query('COMMIT')
    const { rows } = await query(
      `SELECT id, numero, assunto, status, prioridade, prazo, nivel_acesso AS "nivelAcesso", setor_atual AS setor, atribuido_usuario AS "atribuidoA", criado_em AS "criadoEm" FROM processos WHERE id = $1`,
      [id],
    )

    await auditLog(req, {
      acao: 'processo.tramitar',
      usuarioLogin: usuario,
      entidade: 'processo',
      entidadeId: id,
      detalhes: {
        origem,
        destino: destinoSetor,
        motivo: motivo || null,
        prioridade: prioridade || null,
        prazo: prazo || null,
        tramiteId,
      },
    })

    res.json({ ok: true, processo: rows[0] })
  } catch (e) {
    await query('ROLLBACK').catch(() => {})
    console.error('Erro em POST /api/processos/:id/tramites', e)
    res.status(500).json({ error: 'Erro ao tramitar processo' })
  }
})

// POST /api/processos
app.post('/api/processos', async (req, res) => {
  try {
    const {
      assunto,
      tipo,
      nivelAcesso,
      baseLegal,
      observacoes,
      partes = [],
      documentosIds = [],
    } = req.body

    if (!assunto) return res.status(400).json({ error: 'Assunto é obrigatório' })
    if (nivelAcesso && nivelAcesso !== 'Público' && !baseLegal) {
      return res
        .status(400)
        .json({ error: 'Base legal é obrigatória para acesso restrito/sigiloso' })
    }
    if (!documentosIds || documentosIds.length === 0) {
      return res.status(400).json({ error: 'Ao menos 1 documento é obrigatório' })
    }

    const numero = genNumero()
    const id = uuidv4()

    await query('BEGIN')
    await query(
      `INSERT INTO processos (id, numero, assunto, tipo, nivel_acesso, base_legal, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        numero,
        assunto,
        tipo || 'Processo',
        nivelAcesso || 'Público',
        baseLegal || null,
        observacoes || '',
      ],
    )

    for (const parte of partes) {
      await query(
        `INSERT INTO processo_partes (id, processo_id, tipo, nome, documento, papel)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          id,
          parte.tipo || null,
          parte.nome || '',
          parte.documento || null,
          parte.papel || null,
        ],
      )
    }

    for (const docId of documentosIds) {
      await query(
        `INSERT INTO processo_documentos (processo_id, documento_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, docId],
      )
    }

    await query('COMMIT')

    const interessadoRow = await query(
      `SELECT nome FROM processo_partes WHERE processo_id = $1 ORDER BY id LIMIT 1`,
      [id],
    )

    const processoView = {
      id,
      numero,
      assunto,
      tipo: tipo || 'Processo',
      nivelAcesso: nivelAcesso || 'Público',
      baseLegal: baseLegal || null,
      observacoes: observacoes || '',
      interessado: interessadoRow.rows[0]?.nome || null,
      setor: 'PROTOCOLO',
      status: 'Em instrução',
      prioridade: 'Normal',
      criadoEm: new Date().toISOString(),
    }

    await auditLog(req, {
      acao: 'processo.criar',
      usuarioLogin: req.body.executadoPor || req.body.usuario || null,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { numero, documentosIds, partesCount: partes.length },
    })

    res.status(201).json(processoView)
  } catch (e) {
    await query('ROLLBACK').catch(() => {})
    console.error('Erro em POST /api/processos', e)
    res.status(500).json({ error: 'Erro ao criar processo' })
  }
})

// GET /api/processos/:id
app.get('/api/processos/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await query(
      `SELECT id, numero, assunto, tipo, nivel_acesso AS "nivelAcesso", base_legal AS "baseLegal", observacoes, status, prioridade, prazo, setor_atual AS setor, atribuido_usuario AS "atribuidoA", criado_em AS "criadoEm", COALESCE((SELECT MAX(data) FROM tramites WHERE processo_id = $1), criado_em) AS "ultimaMovimentacao" FROM processos WHERE id = $1`,
      [id],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Processo não encontrado' })
    res.json(rows[0])
  } catch (e) {
    console.error('Erro em GET /api/processos/:id', e)
    res.status(500).json({ error: 'Erro ao carregar processo' })
  }
})

// POST /api/processos/:id/dados
app.post('/api/processos/:id/dados', async (req, res) => {
  try {
    const { id } = req.params
    const { assunto, nivelAcesso, observacoes, baseLegal } = req.body

    // Carrega dados atuais para validar base legal quando necessário
    const { rows: procRows } = await query(
      `SELECT nivel_acesso, base_legal FROM processos WHERE id = $1`,
      [id],
    )
    if (procRows.length === 0) return res.status(404).json({ error: 'Processo não encontrado' })

    const atualNivel = procRows[0].nivel_acesso
    const atualBaseLegal = procRows[0].base_legal
    const novoNivel = nivelAcesso || atualNivel
    const novaBaseLegal = baseLegal !== undefined ? baseLegal : atualBaseLegal

    if (novoNivel !== 'Público' && !novaBaseLegal) {
      return res
        .status(400)
        .json({ error: 'Base legal é obrigatória para acesso restrito/sigiloso' })
    }

    await query(
      `UPDATE processos
         SET assunto = COALESCE($2, assunto),
             nivel_acesso = COALESCE($3, nivel_acesso),
             observacoes = COALESCE($4, observacoes),
             base_legal = COALESCE($5, base_legal)
       WHERE id = $1`,
      [id, assunto || null, nivelAcesso || null, observacoes || null, novaBaseLegal || null],
    )

    const { rows } = await query(
      `SELECT id, numero, assunto, tipo, nivel_acesso AS "nivelAcesso", base_legal AS "baseLegal", observacoes, status, prioridade, prazo, setor_atual AS setor, atribuido_usuario AS "atribuidoA", criado_em AS "criadoEm", COALESCE((SELECT MAX(data) FROM tramites WHERE processo_id = $1), criado_em) AS "ultimaMovimentacao" FROM processos WHERE id = $1`,
      [id],
    )

    await auditLog(req, {
      acao: 'processo.atualizar_dados',
      usuarioLogin: req.body.executadoPor || req.body.usuario || null,
      entidade: 'processo',
      entidadeId: id,
      detalhes: {
        assunto,
        nivelAcesso,
        observacoes,
        baseLegal: novaBaseLegal,
        anterior: { nivelAcesso: atualNivel, baseLegal: atualBaseLegal },
      },
    })

    res.json({ ok: true, processo: rows[0] })
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/dados', e)
    res.status(500).json({ error: 'Erro ao atualizar dados do processo' })
  }
})

// GET /api/processos/:id/documentos
app.get('/api/processos/:id/documentos', async (req, res) => {
  try {
    const { id } = req.params
    const viewerSetorRaw = req.query.viewerSetor || req.query.setor || null
    const viewerSetor = String(viewerSetorRaw || '').toUpperCase()

    // Descobre o setor atual do processo
    const { rows: procRows } = await query(`SELECT setor_atual FROM processos WHERE id = $1`, [id])
    if (procRows.length === 0) return res.status(404).json({ error: 'Processo não encontrado' })

    // Nova regra: rascunhos visíveis APENAS para o setor do autor.
    // Se viewerSetor ausente, mostrar somente assinados.
    const filterByViewer = viewerSetor
      ? "AND (LOWER(d.status) = 'assinado' OR (LOWER(d.status) <> 'assinado' AND UPPER(u.setor) = $2))"
      : "AND LOWER(d.status) = 'assinado'"

    const params = viewerSetor ? [id, viewerSetor] : [id]

    const { rows } = await query(
      `SELECT d.id,
              d.titulo,
              d.tipo,
              d.modo,
              d.status,
              d.file_name AS "fileName",
              d.criado_em AS "criadoEm",
              d.autor_login AS "autorLogin",
              u.nome AS "autorNome",
              u.setor AS "autorSetor",
              d.assinado_por_login AS "assinadoPorLogin",
              a.setor AS "assinanteSetor"
       FROM processo_documentos pd
       JOIN documentos d ON d.id = pd.documento_id
       LEFT JOIN usuarios u ON u.login = d.autor_login
       LEFT JOIN usuarios a ON a.login = d.assinado_por_login
       WHERE pd.processo_id = $1 ${filterByViewer}
       ORDER BY d.criado_em ASC`,
      params,
    )
    res.json(rows)
  } catch (e) {
    console.error('Erro em GET /api/processos/:id/documentos', e)
    res.status(500).json({ error: 'Erro ao listar documentos do processo' })
  }
})

// POST /api/processos/:id/documentos/link
app.post('/api/processos/:id/documentos/link', async (req, res) => {
  try {
    const { id } = req.params
    const { documentoId } = req.body
    if (!documentoId) return res.status(400).json({ error: 'documentoId é obrigatório' })

    const proc = await query(`SELECT id FROM processos WHERE id = $1`, [id])
    if (proc.rows.length === 0) return res.status(404).json({ error: 'Processo não encontrado' })

    const doc = await query(`SELECT id FROM documentos WHERE id = $1`, [documentoId])
    if (doc.rows.length === 0) return res.status(404).json({ error: 'Documento não encontrado' })

    await query(
      `INSERT INTO processo_documentos (processo_id, documento_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, documentoId],
    )

    await auditLog(req, {
      acao: 'processo.link_documento',
      usuarioLogin: req.body.usuarioLogin || req.body.usuario || null,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { documentoId },
    })

    res.status(201).json({ ok: true })
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/documentos/link', e)
    res.status(500).json({ error: 'Erro ao vincular documento ao processo' })
  }
})

// POST /api/processos/:id/documentos/seed
app.post('/api/processos/:id/documentos/seed', async (req, res) => {
  try {
    const { id } = req.params

    const proc = await query(`SELECT id FROM processos WHERE id = $1`, [id])
    if (proc.rows.length === 0) return res.status(404).json({ error: 'Processo não encontrado' })

    await query('BEGIN')

    const docs = [
      {
        titulo: 'Requerimento Inicial',
        tipo: 'Documento',
        modo: 'Editor',
        status: 'assinado',
        conteudo:
          'Requerimento Inicial\n\nSolicito a abertura do processo para tratar do assunto acima.',
      },
      {
        titulo: 'Despacho',
        tipo: 'Documento',
        modo: 'Editor',
        status: 'rascunho',
        conteudo: 'Despacho\n\nVistos, etc. Providencie-se conforme instruções.',
      },
      {
        titulo: 'Ofício',
        tipo: 'Documento',
        modo: 'Upload',
        status: 'rascunho',
        fileName: 'oficio.pdf',
        contentBase64:
          'JVBERi0xLjQKMSAwIG9iago8PC9UeXBlIC9DYXRhbG9nL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoKMiAwIG9iago8PC9UeXBlIC9QYWdlcy9Db3VudCAxL0tpZHNbMyAwIFJdPj4KZW5kb2JqCgozIDAgb2JqCjw8L1R5cGUgL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94IFswIDAgNjEyIDc5Ml0vQ29udGVudHMgNCAwIFJfL1Jlc291cmNlcyA8PC9Gb250IDw8L0YxIDUgMCBSPj4+Pj4+CmVuZG9iagoKNC0tLSAwIG9iago8PC9MZW5ndGggNjM+PnN0cmVhbQoJQlQKL0YxIDEyIFRmCjEwIDcwMCBUZCAoRXhlbXBsbyBQRERcbi0gc2ltcGxlKSBUSi9FVAplbmRzdHJlYW0KZW5kb2JqCgo1IDAgb2JqCjw8L1R5cGUgL0ZvbnQvU3VidHlwZSAvVHlwZTEvQmFzZUZvbnQgL0hlbHZldGljYS9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nL05hbWUgL0YxPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDYzIDAwMDAwIG4gCjAwMDAwMDAxNjggMDAwMDAgbiAKMDAwMDAwMDI5MiAwMDAwMCBuIAowMDAwMDAwMzc1IDAwMDAwIG4gCnRyYWlsZXIKPDwvUm9vdCAxIDAgUi9TaXplIDc+PnN0YXJ0eHJlZgozNzcKJSVFT0YK',
      },
    ]

    const created = []

    for (const d of docs) {
      const docId = uuidv4()
      await query(
        `INSERT INTO documentos (id, titulo, tipo, modo, status, file_name, conteudo, content_base64, autor_login)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'system')`,
        [
          docId,
          d.titulo,
          d.tipo,
          d.modo,
          d.status || 'rascunho',
          d.fileName || null,
          d.conteudo || null,
          d.contentBase64 || null,
        ],
      )
      await query(
        `INSERT INTO processo_documentos (processo_id, documento_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, docId],
      )
      const { rows } = await query(
        `SELECT d.id, d.titulo, d.tipo, d.modo, d.status, d.file_name AS "fileName", d.criado_em AS "criadoEm", d.autor_login AS "autorLogin", u.nome AS "autorNome"
         FROM documentos d
         LEFT JOIN usuarios u ON u.login = d.autor_login
         WHERE d.id = $1`,
        [docId],
      )
      created.push(rows[0])
    }

    await query('COMMIT')

    await auditLog(req, {
      acao: 'processo.seed_documentos',
      usuarioLogin: 'system',
      entidade: 'processo',
      entidadeId: id,
      detalhes: { documentosCriados: created.map((d) => d.id) },
    })

    res.status(201).json({ ok: true, documentos: created })
  } catch (e) {
    await query('ROLLBACK').catch(() => {})
    console.error('Erro em POST /api/processos/:id/documentos/seed', e)
    res.status(500).json({ error: 'Erro ao criar documentos de exemplo' })
  }
})

// POST /api/processos/by-numero/:numero/documentos/sample-media
app.post('/api/processos/by-numero/:numero/documentos/sample-media', async (req, res) => {
  try {
    const { numero } = req.params
    const proc = await query(`SELECT id FROM processos WHERE numero = $1`, [numero])
    if (proc.rows.length === 0) return res.status(404).json({ error: 'Processo não encontrado' })
    const processoId = proc.rows[0].id

    // Base64 de PNG 1x1 transparente
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO4WbnUAAAAASUVORK5CYII='
    // Base64 de PDF simples
    const pdfBase64 =
      'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAxIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+PgovUHJvY1NldCAvUERGCj4+Ci9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovTGVuZ3RoIDYzCj4+CnN0cmVhbQpCVAovRjEgMTIgVGYKMTAgNzAwIFRkIChFeGVtcGxvIFBERikgVEovRVQKZW5kc3RyZWFtCmVuZG9iago0IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwovTmFtZSAvRjEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgMiAwIFIgXQovQ291bnQgMQo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDEgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMyAwIFIKPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDYzIDAwMDAwIG4gCjAwMDAwMDAxNjggMDAwMDAgbiAKMDAwMDAwMDI5MiAwMDAwMCBuIAowMDAwMDAwMzc1IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1Jvb3QgMSAwIFIKL1NpemUgNwo+PgpzdGFydHhyZWYKMzc3CiUlRU9G'

    await query('BEGIN')

    const docs = [
      {
        titulo: 'Exemplo Imagem (PNG)',
        tipo: 'Documento',
        modo: 'Upload',
        status: 'rascunho',
        fileName: 'exemplo-imagem.png',
        contentBase64: pngBase64,
      },
      {
        titulo: 'Exemplo PDF',
        tipo: 'Documento',
        modo: 'Upload',
        status: 'rascunho',
        fileName: 'exemplo.pdf',
        contentBase64: pdfBase64,
      },
    ]

    const created = []

    for (const d of docs) {
      const docId = uuidv4()
      await query(
        `INSERT INTO documentos (id, titulo, tipo, modo, status, file_name, conteudo, content_base64)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          docId,
          d.titulo,
          d.tipo,
          d.modo,
          d.status || 'rascunho',
          d.fileName || null,
          null,
          d.contentBase64 || null,
        ],
      )
      await query(
        `INSERT INTO processo_documentos (processo_id, documento_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [processoId, docId],
      )
      const { rows } = await query(
        `SELECT id, titulo, tipo, modo, status, file_name AS "fileName", criado_em AS "criadoEm" FROM documentos WHERE id = $1`,
        [docId],
      )
      created.push(rows[0])
    }

    await query('COMMIT')

    await auditLog(req, {
      acao: 'processo.seed_media',
      usuarioLogin: 'system',
      entidade: 'processo',
      entidadeId: processoId,
      detalhes: { documentosCriados: created.map((d) => d.id) },
    })

    res.status(201).json({ ok: true, documentos: created })
  } catch (e) {
    await query('ROLLBACK').catch(() => {})
    console.error('Erro em POST /api/processos/by-numero/:numero/documentos/sample-media', e)
    res.status(500).json({ error: 'Erro ao criar documentos de mídia de exemplo' })
  }
})

// POST /api/documentos
app.post('/api/documentos', async (req, res) => {
  try {
    const { titulo, tipo, modo, autorLogin } = req.body
    if (!titulo) return res.status(400).json({ error: 'Título é obrigatório' })
    const id = uuidv4()
    await query(
      `INSERT INTO documentos (id, titulo, tipo, modo, status, autor_login) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, titulo, tipo || 'Documento', modo || 'Editor', 'rascunho', autorLogin || null],
    )
    const { rows } = await query(
      `SELECT d.id, d.titulo, d.tipo, d.modo, d.status, d.criado_em AS "criadoEm", d.autor_login AS "autorLogin", u.nome AS "autorNome"
       FROM documentos d
       LEFT JOIN usuarios u ON u.login = d.autor_login
       WHERE d.id = $1`,
      [id],
    )

    await auditLog(req, {
      acao: 'documento.criar',
      usuarioLogin: autorLogin || null,
      entidade: 'documento',
      entidadeId: id,
      detalhes: { titulo, tipo: tipo || 'Documento', modo: modo || 'Editor' },
    })

    res.status(201).json(rows[0])
  } catch (e) {
    console.error('Erro em POST /api/documentos', e)
    res.status(500).json({ error: 'Erro ao criar documento' })
  }
})

// POST /api/documentos/:id/upload
app.post('/api/documentos/:id/upload', async (req, res) => {
  try {
    const { id } = req.params
    const { fileName, contentBase64, autorLogin } = req.body
    const usuarioLogin = req.body.usuarioLogin || autorLogin || null

    // Carrega status atual e assinante
    const { rows: drows } = await query(
      `SELECT status, assinado_por_login FROM documentos WHERE id = $1`,
      [id],
    )
    if (drows.length === 0) return res.status(404).json({ error: 'Documento não encontrado' })
    const statusAtual = String(drows[0].status || '').toLowerCase()
    const assinante = drows[0].assinado_por_login || null

    // Regras de edição conforme posição na árvore (fim da árvore)
    if (statusAtual === 'rascunho') {
      const { rows: prows } = await query(
        `SELECT p.id AS "processoId", p.atribuido_usuario AS "atribuidoUsuario"
           FROM processos p
           JOIN processo_documentos pd ON pd.processo_id = p.id
          WHERE pd.documento_id = $1
          LIMIT 1`,
        [id],
      )
      if (prows.length === 0) {
        return res.status(400).json({ error: 'Documento não está vinculado a um processo' })
      }
      const processoId = prows[0].processoId
      const { rows: vrows } = await query(`SELECT setor FROM usuarios WHERE login = $1`, [
        usuarioLogin || autorLogin || null,
      ])
      const viewerSetor = String(vrows[0]?.setor || '').toUpperCase()

      const { rows: docsRows } = await query(
        `SELECT d.id, d.status, d.criado_em AS "criadoEm", a.setor AS "assinanteSetor"
           FROM processo_documentos pd
           JOIN documentos d ON d.id = pd.documento_id
           LEFT JOIN usuarios a ON a.login = d.assinado_por_login
          WHERE pd.processo_id = $1
          ORDER BY d.criado_em ASC`,
        [processoId],
      )
      const indexDoc = docsRows.findIndex((r) => String(r.id) === String(id))
      let lastCrossIndex = -1
      for (let i = 0; i < docsRows.length; i++) {
        const r = docsRows[i]
        if (
          String(r.status || '').toLowerCase() === 'assinado' &&
          String(r.assinanteSetor || '').toUpperCase() !== viewerSetor
        ) {
          lastCrossIndex = i
        }
      }
      const endStart = lastCrossIndex + 1
      if (!(indexDoc >= endStart)) {
        return res
          .status(403)
          .json({ error: 'Rascunho só pode ser editado se estiver no fim da árvore' })
      }
    }

    if (statusAtual === 'assinado') {
      if (!usuarioLogin) {
        return res
          .status(400)
          .json({ error: 'Usuário executor é obrigatório para editar documento assinado' })
      }
      const { rows: prows } = await query(
        `SELECT p.id AS "processoId", p.atribuido_usuario AS "atribuidoUsuario"
           FROM processos p
           JOIN processo_documentos pd ON pd.processo_id = p.id
          WHERE pd.documento_id = $1
          LIMIT 1`,
        [id],
      )
      if (prows.length === 0) {
        return res.status(400).json({ error: 'Documento não está vinculado a um processo' })
      }
      const processoId = prows[0].processoId
      const atribuidoUsuario = String(prows[0].atribuidoUsuario || '')
      if (!atribuidoUsuario) {
        return res.status(400).json({ error: 'Processo não está atribuído a nenhum usuário' })
      }
      if (atribuidoUsuario !== usuarioLogin) {
        return res
          .status(403)
          .json({ error: 'Você só pode editar documentos do processo atribuído a você' })
      }

      const { rows: vrows } = await query(`SELECT setor FROM usuarios WHERE login = $1`, [
        usuarioLogin,
      ])
      const viewerSetor = String(vrows[0]?.setor || '').toUpperCase()

      const { rows: docsRows } = await query(
        `SELECT d.id, d.status, d.criado_em AS "criadoEm", a.setor AS "assinanteSetor"
           FROM processo_documentos pd
           JOIN documentos d ON d.id = pd.documento_id
           LEFT JOIN usuarios a ON a.login = d.assinado_por_login
          WHERE pd.processo_id = $1
          ORDER BY d.criado_em ASC`,
        [processoId],
      )
      const indexDoc = docsRows.findIndex((r) => String(r.id) === String(id))
      let lastCrossIndex = -1
      for (let i = 0; i < docsRows.length; i++) {
        const r = docsRows[i]
        if (
          String(r.status || '').toLowerCase() === 'assinado' &&
          String(r.assinanteSetor || '').toUpperCase() !== viewerSetor
        ) {
          lastCrossIndex = i
        }
      }
      const endStart = lastCrossIndex + 1
      if (!(indexDoc >= endStart)) {
        return res
          .status(403)
          .json({ error: 'Documento assinado só pode ser editado se estiver no fim da árvore' })
      }
    }

    const sql =
      statusAtual === 'assinado'
        ? `UPDATE documentos SET modo = 'Upload', file_name = $1, content_base64 = $2, autor_login = COALESCE($3, autor_login), status = 'rascunho', assinado_por_login = NULL, assinado_em = NULL WHERE id = $4`
        : `UPDATE documentos SET modo = 'Upload', file_name = $1, content_base64 = $2, autor_login = COALESCE($3, autor_login) WHERE id = $4`

    const { rowCount } = await query(sql, [
      fileName || 'arquivo.bin',
      contentBase64 || null,
      usuarioLogin || null,
      id,
    ])
    if (rowCount === 0) return res.status(404).json({ error: 'Documento não encontrado' })

    await auditLog(req, {
      acao: 'documento.upload_conteudo',
      usuarioLogin: usuarioLogin || null,
      entidade: 'documento',
      entidadeId: id,
      detalhes: { fileName: fileName || 'arquivo.bin', statusAnterior: statusAtual, assinante },
    })

    res.json({ ok: true })
  } catch (e) {
    console.error('Erro em POST /api/documentos/:id/upload', e)
    res.status(500).json({ error: 'Erro ao atualizar documento (upload)' })
  }
})

// POST /api/documentos/:id/editor/conteudo
app.post('/api/documentos/:id/editor/conteudo', async (req, res) => {
  try {
    const { id } = req.params
    const { conteudo, autorLogin } = req.body
    const usuarioLogin = req.body.usuarioLogin || autorLogin || null

    // Carrega status atual e assinante
    const { rows: drows } = await query(
      `SELECT status, assinado_por_login FROM documentos WHERE id = $1`,
      [id],
    )
    if (drows.length === 0) return res.status(404).json({ error: 'Documento não encontrado' })
    const statusAtual = String(drows[0].status || '').toLowerCase()
    const assinante = drows[0].assinado_por_login || null

    if (statusAtual === 'rascunho') {
      if (!usuarioLogin) {
        return res.status(400).json({ error: 'Usuário executor é obrigatório para editar rascunho' })
      }
      const { rows: prows } = await query(
        `SELECT p.id AS "processoId" 
           FROM processos p
           JOIN processo_documentos pd ON pd.processo_id = p.id
          WHERE pd.documento_id = $1
          LIMIT 1`,
        [id],
      )
      if (prows.length === 0) {
        return res.status(400).json({ error: 'Documento não está vinculado a um processo' })
      }
      const processoId = prows[0].processoId
      const { rows: vrows } = await query(`SELECT setor FROM usuarios WHERE login = $1`, [
        usuarioLogin,
      ])
      const viewerSetor = String(vrows[0]?.setor || '').toUpperCase()
      const { rows: docsRows } = await query(
        `SELECT d.id, d.status, d.criado_em AS "criadoEm", a.setor AS "assinanteSetor"
           FROM processo_documentos pd
           JOIN documentos d ON d.id = pd.documento_id
           LEFT JOIN usuarios a ON a.login = d.assinado_por_login
          WHERE pd.processo_id = $1
          ORDER BY d.criado_em ASC`,
        [processoId],
      )
      const indexDoc = docsRows.findIndex((r) => String(r.id) === String(id))
      let lastCrossIndex = -1
      for (let i = 0; i < docsRows.length; i++) {
        const r = docsRows[i]
        if (
          String(r.status || '').toLowerCase() === 'assinado' &&
          String(r.assinanteSetor || '').toUpperCase() !== viewerSetor
        ) {
          lastCrossIndex = i
        }
      }
      const endStart = lastCrossIndex + 1
      if (!(indexDoc >= endStart)) {
        return res
          .status(403)
          .json({ error: 'Rascunho só pode ser editado se estiver no fim da árvore' })
      }
    }

    if (statusAtual === 'assinado') {
      if (!usuarioLogin) {
        return res
          .status(400)
          .json({ error: 'Usuário executor é obrigatório para editar documento assinado' })
      }
      if (usuarioLogin !== assinante) {
        return res.status(403).json({ error: 'Você só pode editar documentos assinados por você' })
      }
      const { rows: prows } = await query(
        `SELECT p.id AS "processoId", p.atribuido_usuario AS "atribuidoUsuario"
           FROM processos p
           JOIN processo_documentos pd ON pd.processo_id = p.id
          WHERE pd.documento_id = $1
          LIMIT 1`,
        [id],
      )
      if (prows.length === 0) {
        return res.status(400).json({ error: 'Documento não está vinculado a um processo' })
      }
      const processoId = prows[0].processoId
      const atribuidoUsuario = String(prows[0].atribuidoUsuario || '')
      if (!atribuidoUsuario) {
        return res.status(400).json({ error: 'Processo não está atribuído a nenhum usuário' })
      }
      if (atribuidoUsuario !== usuarioLogin) {
        return res
          .status(403)
          .json({ error: 'Você só pode editar documentos do processo atribuído a você' })
      }
      const { rows: vrows } = await query(`SELECT setor FROM usuarios WHERE login = $1`, [
        usuarioLogin,
      ])
      const viewerSetor = String(vrows[0]?.setor || '').toUpperCase()
      const { rows: docsRows } = await query(
        `SELECT d.id, d.status, d.criado_em AS "criadoEm", a.setor AS "assinanteSetor"
           FROM processo_documentos pd
           JOIN documentos d ON d.id = pd.documento_id
           LEFT JOIN usuarios a ON a.login = d.assinado_por_login
          WHERE pd.processo_id = $1
          ORDER BY d.criado_em ASC`,
        [processoId],
      )
      const indexDoc = docsRows.findIndex((r) => String(r.id) === String(id))
      let lastCrossIndex = -1
      for (let i = 0; i < docsRows.length; i++) {
        const r = docsRows[i]
        if (
          String(r.status || '').toLowerCase() === 'assinado' &&
          String(r.assinanteSetor || '').toUpperCase() !== viewerSetor
        ) {
          lastCrossIndex = i
        }
      }
      const endStart = lastCrossIndex + 1
      if (!(indexDoc >= endStart)) {
        return res
          .status(403)
          .json({ error: 'Documento assinado só pode ser editado se estiver no fim da árvore' })
      }
    }

    const sql =
      statusAtual === 'assinado'
        ? `UPDATE documentos SET modo = 'Editor', conteudo = $1, autor_login = COALESCE($2, autor_login), status = 'rascunho', assinado_por_login = NULL, assinado_em = NULL WHERE id = $3`
        : `UPDATE documentos SET modo = 'Editor', conteudo = $1, autor_login = COALESCE($2, autor_login) WHERE id = $3`

    const { rowCount } = await query(sql, [conteudo || '', usuarioLogin || null, id])
    if (rowCount === 0) return res.status(404).json({ error: 'Documento não encontrado' })

    await auditLog(req, {
      acao: 'documento.editar_conteudo',
      usuarioLogin: usuarioLogin || null,
      entidade: 'documento',
      entidadeId: id,
      detalhes: { statusAnterior: statusAtual, assinante },
    })

    res.json({ ok: true })
  } catch (e) {
    console.error('Erro em POST /api/documentos/:id/editor/conteudo', e)
    res.status(500).json({ error: 'Erro ao atualizar documento (editor)' })
  }
})

// GET /api/documentos/:id
app.get('/api/documentos/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await query(
      `SELECT d.id,
              d.titulo,
              d.tipo,
              d.modo,
              d.status,
              d.file_name AS "fileName",
              d.content_base64 AS "contentBase64",
              d.conteudo,
              d.criado_em AS "criadoEm",
              d.autor_login AS "autorLogin",
              u.nome AS "autorNome",
              d.assinado_por_login AS "assinadoPorLogin",
              d.assinado_em AS "assinadoEm",
              a.nome AS "assinaturaNome",
              a.cargo AS "assinaturaCargo"
       FROM documentos d
       LEFT JOIN usuarios u ON u.login = d.autor_login
       LEFT JOIN usuarios a ON a.login = d.assinado_por_login
       WHERE d.id = $1`,
      [id],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Documento não encontrado' })
    res.json(rows[0])
  } catch (e) {
    console.error('Erro em GET /api/documentos/:id', e)
    res.status(500).json({ error: 'Erro ao carregar documento' })
  }
})

// POST /api/documentos/:id/assinar
app.post('/api/documentos/:id/assinar', async (req, res) => {
  try {
    const { id } = req.params
    const usuarioLogin = req.body.usuarioLogin || req.body.autorLogin || null
    if (!usuarioLogin) {
      return res.status(400).json({ error: 'Usuário executor é obrigatório para assinar' })
    }

    const { rows: drows } = await query(
      `SELECT status, modo, file_name, content_base64 FROM documentos WHERE id = $1`,
      [id],
    )
    if (drows.length === 0) return res.status(404).json({ error: 'Documento não encontrado' })
    const statusAtual = String(drows[0].status || '').toLowerCase()
    const modo = String(drows[0].modo || '')
    const fileName = String(drows[0].file_name || '')
    const contentBase64 = drows[0].content_base64 || null

    const isEditor = modo.toLowerCase() === 'editor'
    const isUpload = modo.toLowerCase() === 'upload'

    if (!isEditor && !isUpload) {
      return res
        .status(400)
        .json({ error: 'Apenas documentos do Editor ou Upload podem ser assinados' })
    }
    if (isUpload) {
      if (!fileName || !contentBase64) {
        return res
          .status(400)
          .json({ error: 'Documento de Upload sem conteúdo para assinatura' })
      }
      const ext = (fileName.split('.').pop() || '').toLowerCase()
      const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'gif']
      if (!allowed.includes(ext)) {
        return res.status(400).json({ error: 'Apenas PDFs e imagens podem ser assinados' })
      }
    }
    if (statusAtual !== 'rascunho') {
      return res.status(400).json({ error: 'Documento não está em rascunho' })
    }

    const { rows: prows } = await query(
      `SELECT p.id AS "processoId", p.atribuido_usuario AS "atribuidoUsuario"
         FROM processos p
         JOIN processo_documentos pd ON pd.processo_id = p.id
        WHERE pd.documento_id = $1
        LIMIT 1`,
      [id],
    )
    if (prows.length === 0) {
      return res.status(400).json({ error: 'Documento não está vinculado a um processo' })
    }
    const processoId = prows[0].processoId
    const atribuidoUsuario = String(prows[0].atribuidoUsuario || '')
    if (!atribuidoUsuario) {
      return res.status(400).json({ error: 'Processo não está atribuído a nenhum usuário' })
    }
    if (atribuidoUsuario !== usuarioLogin) {
      return res
        .status(403)
        .json({ error: 'Você só pode assinar documentos de processos atribuídos a você' })
    }

    // Regra: rascunhos só podem ser assinados se estiverem no fim da árvore
    const { rows: vrows } = await query(`SELECT setor FROM usuarios WHERE login = $1`, [
      usuarioLogin,
    ])
    const viewerSetor = String(vrows[0]?.setor || '').toUpperCase()
    const { rows: docsRows } = await query(
      `SELECT d.id, d.status, d.criado_em AS "criadoEm", a.setor AS "assinanteSetor"
         FROM processo_documentos pd
         JOIN documentos d ON d.id = pd.documento_id
         LEFT JOIN usuarios a ON a.login = d.assinado_por_login
        WHERE pd.processo_id = $1
        ORDER BY d.criado_em ASC`,
      [processoId],
    )
    const indexDoc = docsRows.findIndex((r) => String(r.id) === String(id))
    let lastCrossIndex = -1
    for (let i = 0; i < docsRows.length; i++) {
      const r = docsRows[i]
      if (
        String(r.status || '').toLowerCase() === 'assinado' &&
        String(r.assinanteSetor || '').toUpperCase() !== viewerSetor
      ) {
        lastCrossIndex = i
      }
    }
    const endStart = lastCrossIndex + 1
    if (!(indexDoc >= endStart)) {
      return res.status(403).json({
        error:
          'Rascunho não pode ser assinado: existe documento assinado de outro setor após ele no fluxo',
      })
    }

    const { rowCount } = await query(
      `UPDATE documentos
         SET status = 'assinado',
             assinado_por_login = $2,
             assinado_em = now()
       WHERE id = $1`,
      [id, usuarioLogin],
    )
    if (rowCount === 0) return res.status(404).json({ error: 'Documento não encontrado' })

    const { rows } = await query(
      `SELECT d.id,
              d.titulo,
              d.tipo,
              d.modo,
              d.status,
              d.file_name AS "fileName",
              d.content_base64 AS "contentBase64",
              d.conteudo,
              d.criado_em AS "criadoEm",
              d.autor_login AS "autorLogin",
              u.nome AS "autorNome",
              d.assinado_por_login AS "assinadoPorLogin",
              d.assinado_em AS "assinadoEm",
              a.nome AS "assinaturaNome",
              a.cargo AS "assinaturaCargo"
       FROM documentos d
       LEFT JOIN usuarios u ON u.login = d.autor_login
       LEFT JOIN usuarios a ON a.login = d.assinado_por_login
       WHERE d.id = $1`,
      [id],
    )

    await auditLog(req, {
      acao: 'documento.assinar',
      usuarioLogin,
      entidade: 'documento',
      entidadeId: id,
      detalhes: { status: 'assinado' },
    })

    res.json({ ok: true, documento: rows[0] })
  } catch (e) {
    console.error('Erro em POST /api/documentos/:id/assinar', e)
    res.status(500).json({ error: 'Erro ao assinar documento' })
  }
})

// Excluir rascunho de documento
app.post('/api/documentos/:id/deletar', async (req, res) => {
  try {
    const { id } = req.params
    const usuarioLogin = req.body.usuarioLogin || req.body.autorLogin || null
    if (!usuarioLogin) return res.status(400).json({ error: 'Usuário executor é obrigatório' })

    const { rows: drows } = await query(
      `SELECT status, autor_login FROM documentos WHERE id = $1`,
      [id],
    )
    if (drows.length === 0) return res.status(404).json({ error: 'Documento não encontrado' })
    const statusAtual = String(drows[0].status || '').toLowerCase()
    const autorLogin = drows[0].autor_login || null

    if (statusAtual === 'assinado') {
      return res.status(400).json({ error: 'Documento assinado não pode ser excluído' })
    }
    if (statusAtual !== 'rascunho') {
      return res.status(400).json({ error: 'Documento não está em rascunho' })
    }
    if (!autorLogin || autorLogin !== usuarioLogin) {
      return res.status(403).json({ error: 'Você só pode excluir documentos criados por você' })
    }

    // Regra: rascunho só pode ser excluído se estiver no fim da árvore
    const { rows: prows } = await query(
      `SELECT p.id AS "processoId"
         FROM processos p
         JOIN processo_documentos pd ON pd.processo_id = p.id
        WHERE pd.documento_id = $1
        LIMIT 1`,
      [id],
    )
    if (prows.length === 0) {
      return res.status(400).json({ error: 'Documento não está vinculado a um processo' })
    }
    const processoId = prows[0].processoId
    // Regra removida: permitir excluir rascunho em qualquer posição na árvore

    const { rowCount } = await query(`DELETE FROM documentos WHERE id = $1`, [id])
    if (rowCount === 0) return res.status(404).json({ error: 'Documento não encontrado' })

    await auditLog(req, {
      acao: 'documento.deletar',
      usuarioLogin,
      entidade: 'documento',
      entidadeId: id,
      detalhes: { statusAnterior: statusAtual, autorLogin },
    })

    res.json({ ok: true })
  } catch (e) {
    console.error('Erro em POST /api/documentos/:id/deletar', e)
    res.status(500).json({ error: 'Erro ao excluir documento' })
  }
})

// Auditoria (genérico)
app.post('/api/auditoria', async (req, res) => {
  try {
    const { acao, usuarioLogin, entidade, entidadeId, detalhes } = req.body
    if (!acao) return res.status(400).json({ error: 'acao obrigatória' })
    await auditLog(req, { acao, usuarioLogin, entidade, entidadeId, detalhes })
    res.json({ ok: true })
  } catch (e) {
    console.error('Falha ao registrar auditoria via endpoint:', e)
    res.status(500).json({ error: 'Falha ao registrar auditoria' })
  }
})

// Saúde
app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`SPE API mock rodando em http://localhost:${PORT}`)
})

app.get('/api/processos/:id/tramites', async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await query(
      `
      SELECT id,
             origem_setor AS "origemSetor",
             destino_setor AS "destinoSetor",
             motivo,
             prioridade,
             prazo,
             origem_usuario AS "usuario",
             data
      FROM tramites
      WHERE processo_id = $1
      ORDER BY data DESC
    `,
      [id],
    )
    res.json(rows)
  } catch (e) {
    console.error('Erro em GET /api/processos/:id/tramites', e)
    res.status(500).json({ error: 'Erro ao listar tramites' })
  }
})

app.post('/api/processos/:id/prioridade', async (req, res) => {
  try {
    const { id } = req.params
    const { prioridade, executadoPor } = req.body

    const allowed = ['Baixa', 'Normal', 'Alta', 'Urgente']
    if (!prioridade || !allowed.includes(prioridade)) {
      return res.status(400).json({ error: 'Prioridade inválida' })
    }
    if (!executadoPor) {
      return res.status(400).json({ error: 'Usuário executor é obrigatório' })
    }

    const { rows: procRows } = await query(
      `SELECT atribuido_usuario FROM processos WHERE id = $1`,
      [id],
    )
    if (procRows.length === 0) return res.status(404).json({ error: 'Processo não encontrado' })
    const atribuidoAtual = procRows[0].atribuido_usuario || null
    if (atribuidoAtual && String(atribuidoAtual) !== String(executadoPor)) {
      return res.status(403).json({
        error: 'Você só pode definir prioridade de processos atribuídos a você ou sem responsável',
      })
    }

    const { rowCount } = await query(`UPDATE processos SET prioridade = $2 WHERE id = $1`, [
      id,
      prioridade,
    ])
    if (rowCount === 0) return res.status(404).json({ error: 'Processo não encontrado' })

    const { rows } = await query(
      `SELECT id, numero, assunto, status, prioridade, prazo, nivel_acesso AS "nivelAcesso", setor_atual AS setor, atribuido_usuario AS "atribuidoA", criado_em AS "criadoEm", COALESCE((SELECT MAX(data) FROM tramites WHERE processo_id = $1), criado_em) AS "ultimaMovimentacao" FROM processos WHERE id = $1`,
      [id],
    )

    await auditLog(req, {
      acao: 'processo.prioridade',
      usuarioLogin: executadoPor,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { prioridade },
    })

    res.json({ ok: true, processo: rows[0] })
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/prioridade', e)
    res.status(500).json({ error: 'Erro ao marcar prioridade do processo' })
  }
})

// POST aceitar pendência
app.post('/api/processos/:id/pendencia/aceitar', async (req, res) => {
  try {
    const { id } = req.params
    const { usuario } = req.body
    if (!usuario) {
      return res.status(400).json({ error: 'Usuário executor é obrigatório' })
    }

    const proc = await query(
      `SELECT pendente, pendente_destino_setor, pendente_origem_setor, setor_atual FROM processos WHERE id = $1`,
      [id],
    )
    if (proc.rows.length === 0) return res.status(404).json({ error: 'Processo não encontrado' })
    const pendente = !!proc.rows[0].pendente
    const destino = proc.rows[0].pendente_destino_setor
    if (!pendente || !destino) {
      return res.status(400).json({ error: 'Processo não está pendente' })
    }

    const urows = await query(`SELECT setor FROM usuarios WHERE login = $1`, [usuario])
    if (urows.rows.length === 0) {
      return res.status(400).json({ error: 'Usuário não encontrado' })
    }
    const setorUsuario = String(urows.rows[0].setor || '').toUpperCase()
    if (String(setorUsuario) !== String(destino).toUpperCase()) {
      return res
        .status(403)
        .json({ error: 'Usuário não pertence ao setor de destino da pendência' })
    }

    await query('BEGIN')
    await query(
      `UPDATE processos
         SET pendente = FALSE,
             pendente_destino_setor = NULL,
             pendente_origem_setor = NULL,
             setor_atual = $2,
             status = 'Em instrução'
       WHERE id = $1`,
      [id, destino],
    )
    await query('COMMIT')

    const { rows } = await query(
      `SELECT id, numero, assunto, status, prioridade, prazo, nivel_acesso AS "nivelAcesso", setor_atual AS setor, atribuido_usuario AS "atribuidoA", pendente, pendente_origem_setor AS "pendenteOrigemSetor", pendente_destino_setor AS "pendenteDestinoSetor", criado_em AS "criadoEm" FROM processos WHERE id = $1`,
      [id],
    )

    await auditLog(req, {
      acao: 'processo.pendencia_aceitar',
      usuarioLogin: usuario,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { destino },
    })

    res.json({ ok: true, processo: rows[0] })
  } catch (e) {
    await query('ROLLBACK').catch(() => {})
    console.error('Erro em POST /api/processos/:id/pendencia/aceitar', e)
    res.status(500).json({ error: 'Erro ao aceitar pendência' })
  }
})

// POST recusar pendência
app.post('/api/processos/:id/pendencia/recusar', async (req, res) => {
  try {
    const { id } = req.params
    const { usuario, motivo } = req.body
    if (!usuario) {
      return res.status(400).json({ error: 'Usuário executor é obrigatório' })
    }
    if (!motivo) {
      return res.status(400).json({ error: 'Motivo é obrigatório para recusa' })
    }

    const proc = await query(
      `SELECT pendente, pendente_destino_setor, pendente_origem_setor FROM processos WHERE id = $1`,
      [id],
    )
    if (proc.rows.length === 0) return res.status(404).json({ error: 'Processo não encontrado' })
    const pendente = !!proc.rows[0].pendente
    const destino = proc.rows[0].pendente_destino_setor
    const origem = proc.rows[0].pendente_origem_setor
    if (!pendente || !destino || !origem) {
      return res.status(400).json({ error: 'Processo não está pendente' })
    }

    const urows = await query(`SELECT setor FROM usuarios WHERE login = $1`, [usuario])
    if (urows.rows.length === 0) {
      return res.status(400).json({ error: 'Usuário não encontrado' })
    }
    const setorUsuario = String(urows.rows[0].setor || '').toUpperCase()
    if (String(setorUsuario) !== String(destino).toUpperCase()) {
      return res
        .status(403)
        .json({ error: 'Usuário não pertence ao setor de destino da pendência' })
    }

    const tramiteId = uuidv4()
    await query('BEGIN')
    await query(
      `INSERT INTO tramites (id, processo_id, origem_setor, destino_setor, motivo, origem_usuario)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tramiteId, id, destino, origem, motivo, usuario],
    )
    await query(
      `UPDATE processos
         SET pendente = TRUE,
             pendente_destino_setor = $2,
             pendente_origem_setor = $3,
             atribuido_usuario = NULL,
             status = 'Aguardando'
       WHERE id = $1`,
      [id, origem, destino],
    )
    await query('COMMIT')

    const { rows } = await query(
      `SELECT id, numero, assunto, status, prioridade, prazo, nivel_acesso AS "nivelAcesso", setor_atual AS setor, atribuido_usuario AS "atribuidoA", pendente, pendente_origem_setor AS "pendenteOrigemSetor", pendente_destino_setor AS "pendenteDestinoSetor", criado_em AS "criadoEm" FROM processos WHERE id = $1`,
      [id],
    )

    await auditLog(req, {
      acao: 'processo.pendencia_recusar',
      usuarioLogin: usuario,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { origem, destino, motivo, tramiteId },
    })

    res.json({ ok: true, processo: rows[0] })
  } catch (e) {
    await query('ROLLBACK').catch(() => {})
    console.error('Erro em POST /api/processos/:id/pendencia/recusar', e)
    res.status(500).json({ error: 'Erro ao recusar pendência' })
  }
})
