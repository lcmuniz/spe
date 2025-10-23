const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { initDb } = require('./db')
const processosService = require('./services/processosService')
const chavesService = require('./services/chavesService')
const { auditLog } = require('./services/auditoriaService')
const acessosService = require('./services/acessosService')
const catalogService = require('./services/catalogService')
const documentosService = require('./services/documentosService')
const usuariosService = require('./services/usuariosService')
const { rollback } = require('./services/transacoesService')

const app = express()
//const PORT = process.env.PORT || 3001
const PORT = 3001

// Ajusta CORS para permitir o frontend em 9000 e 9002
app.use(cors({ origin: ['http://localhost:9000', 'http://localhost:9001'], credentials: false }))
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))

initDb()
  .then(() => console.log('Banco de dados inicializado'))
  .catch((e) => {
    console.error('Falha ao inicializar banco:', e)
    process.exit(1)
  })

// GET /api/processos/:id/acessos
app.get('/api/processos/:id/acessos', async (req, res) => {
  try {
    const { id } = req.params
    const rows = await acessosService.listAcessos(id)
    res.json(rows)
  } catch (e) {
    console.error('Erro em GET /api/processos/:id/acessos', e)
    const status =
      typeof e.statusCode === 'number'
        ? e.statusCode
        : typeof e.status === 'number'
          ? e.status
          : 500
    res.status(status).json({ error: e.message || 'Erro ao listar acessos do processo' })
  }
})

// POST /api/processos/:id/acessos
app.post('/api/processos/:id/acessos', async (req, res) => {
  try {
    const { id } = req.params
    const { tipo, valor, parteId, executadoPor } = req.body
    const { id: acessoId } = await acessosService.addAcesso(id, { tipo, valor, parteId })

    await auditLog(req, {
      acao: 'processo.acesso_add',
      usuarioLogin: executadoPor || req.body.usuario || null,
      entidade: 'processo',
      entidadeId: id,
      detalhes: {
        acessoId,
        tipo: String(tipo || '').toUpperCase(),
        valor: valor || null,
        parteId: parteId || null,
      },
    })

    res.status(201).json({ ok: true, id: acessoId })
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/acessos', e)
    const status =
      typeof e.statusCode === 'number'
        ? e.statusCode
        : typeof e.status === 'number'
          ? e.status
          : 500
    res.status(status).json({ error: e.message || 'Erro ao adicionar acesso ao processo' })
  }
})

// DELETE /api/processos/:id/acessos/:acessoId
app.delete('/api/processos/:id/acessos/:acessoId', async (req, res) => {
  try {
    const { id, acessoId } = req.params
    const { executadoPor } = req.body || {}

    await acessosService.removeAcesso(id, acessoId)

    await auditLog(req, {
      acao: 'processo.acesso_del',
      usuarioLogin: executadoPor || req.body?.usuario || null,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { acessoId },
    })

    res.json({ ok: true })
  } catch (e) {
    console.error('Erro em DELETE /api/processos/:id/acessos/:acessoId', e)
    const status =
      typeof e.statusCode === 'number'
        ? e.statusCode
        : typeof e.status === 'number'
          ? e.status
          : 500
    res.status(status).json({ error: e.message || 'Erro ao remover acesso do processo' })
  }
})

// GET /api/processos/:id/chaves
app.get('/api/processos/:id/chaves', async (req, res) => {
  try {
    const { id } = req.params
    const chaves = await chavesService.listChaves(id)
    res.json(chaves)
  } catch (e) {
    console.error('Erro em GET /api/processos/:id/chaves', e)
    res.status(500).json({ error: 'Erro ao listar chaves do processo' })
  }
})

// POST /api/processos/:id/chaves
app.post('/api/processos/:id/chaves', async (req, res) => {
  try {
    const { id } = req.params
    const { parteId, executadoPor } = req.body

    let created
    try {
      created = await chavesService.createChave({ processoId: id, parteId })
    } catch (err) {
      const status = err.code === 400 ? 400 : err.code === 404 ? 404 : 500
      return res.status(status).json({ error: err.message || 'Erro ao criar chave de acesso' })
    }

    await auditLog(req, {
      acao: 'processo.chave_create',
      usuarioLogin: executadoPor || req.body.usuario || null,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { chaveId: created.id, parteId },
    })

    res.status(201).json({ ok: true, id: created.id, chave: created.chave })
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/chaves', e)
    res.status(500).json({ error: 'Erro ao criar chave de acesso' })
  }
})

// DELETE /api/processos/:id/chaves/:chaveId
app.delete('/api/processos/:id/chaves/:chaveId', async (req, res) => {
  try {
    const { id, chaveId } = req.params
    const { executadoPor } = req.body || {}

    try {
      await chavesService.revokeChave({ processoId: id, chaveId })
    } catch (err) {
      const status = err.code === 404 ? 404 : 500
      return res.status(status).json({ error: err.message || 'Erro ao revogar chave de acesso' })
    }

    await auditLog(req, {
      acao: 'processo.chave_revoke',
      usuarioLogin: executadoPor || req.body?.usuario || null,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { chaveId },
    })

    res.json({ ok: true })
  } catch (e) {
    console.error('Erro em DELETE /api/processos/:id/chaves/:chaveId', e)
    res.status(500).json({ error: 'Erro ao revogar chave de acesso' })
  }
})

// Helpers de filtro
// GET /api/setores
app.get('/api/setores', async (req, res) => {
  try {
    const setores = await catalogService.listSetores()
    res.json(setores)
  } catch (e) {
    console.error('Erro em GET /api/setores', e)
    const status =
      typeof e.statusCode === 'number'
        ? e.statusCode
        : typeof e.status === 'number'
          ? e.status
          : 500
    res.status(status).json({ error: e.message || 'Erro ao listar setores' })
  }
})

// GET /api/processos?filtros
app.get('/api/processos', async (req, res) => {
  try {
    const result = await processosService.listProcessos(req.query)
    res.json(result)
  } catch (e) {
    console.error('Erro em GET /api/processos', e)
    res.status(500).json({ error: 'Erro ao listar processos' })
  }
})

// GET /api/catalog/assuntos
app.get('/api/catalog/assuntos', async (req, res) => {
  try {
    const assuntos = await catalogService.listAssuntos()
    // Mantém contrato atual da API: array de strings
    res.json(assuntos.map((a) => a.nome))
  } catch (e) {
    console.error('Erro em GET /api/catalog/assuntos', e)
    res.status(500).json({ error: 'Erro ao listar assuntos' })
  }
})

// GET /api/catalog/tipos-processo
app.get('/api/catalog/tipos-processo', async (req, res) => {
  try {
    const tipos = await catalogService.listTiposProcesso()
    // Mantém contrato atual da API: array de strings
    res.json(tipos.map((t) => t.nome))
  } catch (e) {
    console.error('Erro em GET /api/catalog/tipos-processo', e)
    res.status(500).json({ error: 'Erro ao listar tipos de processo' })
  }
})

// GET /api/usuarios?setor=SETOR&login=LOGIN
app.get('/api/usuarios', async (req, res) => {
  try {
    const setorSigla = String(req.query.setor || '').toUpperCase()
    const login = String(req.query.login || '')

    if (login) {
      const user = await usuariosService.getUsuarios({ login })
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
      const payload = {
        username: user.login,
        nome: user.nome,
        cargo: user.cargo,
        setor: user.setorSigla || null,
      }
      return res.json(payload)
    }

    if (setorSigla) {
      const rows = await usuariosService.getUsuariosPorSigla(setorSigla)
      const payload = rows.map((u) => ({
        username: u.login,
        nome: u.nome,
        cargo: u.cargo,
      }))
      return res.json(payload)
    }

    const rows = await usuariosService.getUsuarios({})
    const payload = rows.map((u) => ({
      setor: u.setorSigla || null,
      username: u.login,
      nome: u.nome,
      cargo: u.cargo,
    }))
    res.json(payload)
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

    // Usa o service para realizar a operação
    const result = await usuariosService.upsertUsuario({ login, nome, setor, cargo })

    // Auditoria com base na ação retornada pelo service
    await auditLog(req, {
      acao: result.acao,
      usuarioLogin: login,
      entidade: 'usuario',
      entidadeId: login,
      detalhes: {
        tipo: result.acao === 'usuario.criar' ? 'create' : 'update',
        setor: result.usuario?.setorSigla || null,
        cargo: result.usuario?.cargo ?? undefined,
      },
    })

    // Mantém contrato simplificado esperado pelo frontend
    const usuarioPayload = {
      username: result.usuario?.login || login,
      nome: result.usuario?.nome || nome || null,
      setor: result.usuario?.setorSigla || setor || null,
      cargo: result.usuario?.cargo || cargo || null,
    }
    return res.json({ ok: true, usuario: usuarioPayload })
  } catch (e) {
    console.error('Erro em POST /api/usuarios/upsert', e)
    let status = 500
    if (typeof e.statusCode === 'number') status = e.statusCode
    else if (typeof e.status === 'number') status = e.status
    else if (typeof e.code === 'number' && [400, 404].includes(e.code)) status = e.code
    else if (typeof e.code === 'string' && ['400', '404'].includes(e.code)) status = Number(e.code)
    const msg = status === 500 ? 'Erro ao atualizar/cadastrar usuário' : e.message
    res.status(status).json({ error: msg })
  }
})

// POST /api/processos/:id/atribuir { usuario, executadoPor }
app.post('/api/processos/:id/atribuir', async (req, res) => {
  try {
    const { id } = req.params
    const { usuario, executadoPor } = req.body

    const result = await processosService.atribuir(id, { usuario, executadoPor })

    await auditLog(req, {
      acao: 'processo.atribuir',
      usuarioLogin: executadoPor,
      entidade: 'processo',
      entidadeId: id,
      detalhes: result.details,
    })

    res.json({ ok: true, processo: result.processo })
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/atribuir', e)
    const status = e.code || 500
    const msg = status === 500 ? 'Erro ao atribuir processo' : e.message
    res.status(status).json({ error: msg })
  }
})

// POST /api/processos/:id/tramites { destinoSetor, usuario }
app.post('/api/processos/:id/tramites', async (req, res) => {
  try {
    const { id } = req.params
    const { destinoSetor, usuario, motivo, prioridade, prazo } = req.body

    const result = await processosService.tramitar(id, {
      destinoSetor,
      usuario,
      motivo,
      prioridade,
      prazo,
    })

    await auditLog(req, {
      acao: 'processo.tramitar',
      usuarioLogin: usuario,
      entidade: 'processo',
      entidadeId: id,
      detalhes: result.detalhes,
    })

    res.json({ ok: true, processo: result.processo })
  } catch (e) {
    await rollback()
    console.error('Erro em POST /api/processos/:id/tramites', e)
    const status = e.code || 500
    const msg = status === 500 ? 'Erro ao tramitar processo' : e.message
    res.status(status).json({ error: msg })
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

    const criadorLogin = req.body.executadoPor || req.body.usuario || null

    const processoView = await processosService.createProcesso({
      assunto,
      tipo,
      nivelAcesso,
      baseLegal,
      observacoes,
      partes,
      documentosIds,
      executadoPor: criadorLogin,
      usuario: req.body.usuario || null,
    })

    await auditLog(req, {
      acao: 'processo.criar',
      usuarioLogin: req.body.executadoPor || req.body.usuario || null,
      entidade: 'processo',
      entidadeId: processoView.id,
      detalhes: { numero: processoView.numero, documentosIds, partesCount: partes.length },
    })

    res.status(201).json(processoView)
  } catch (e) {
    await rollback()
    console.error('Erro em POST /api/processos', e)
    const status = e.code || 500
    const msg = status === 500 ? 'Erro ao criar processo' : e.message
    res.status(status).json({ error: msg })
  }
})

// GET /api/processos/:id
app.get('/api/processos/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await processosService.getProcessoById(id)
    if (!result) return res.status(404).json({ error: 'Processo não encontrado' })
    res.json(result)
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

    // Usa o service para obter o estado atual
    const atual = await processosService.getProcessoById(id)
    if (!atual) return res.status(404).json({ error: 'Processo não encontrado' })

    const atualNivel = atual.nivelAcesso
    const atualBaseLegal = atual.baseLegal
    const novaBaseLegal = baseLegal !== undefined ? baseLegal : atualBaseLegal

    // Atualiza via service
    const updated = await processosService.updateDados(id, {
      assunto,
      nivelAcesso,
      observacoes,
      baseLegal,
    })

    // Auditoria
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

    res.json({ ok: true, processo: updated })
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/dados', e)
    const status = e.code || 500
    const msg = status === 500 ? 'Erro ao atualizar dados do processo' : e.message
    res.status(status).json({ error: msg })
  }
})

// POST /api/processos/:id/partes
app.post('/api/processos/:id/partes', async (req, res) => {
  try {
    const { id } = req.params
    const { tipo, nome, documento, papel, executadoPor, usuario } = req.body || {}

    // Delegar criação ao service
    const parte = await processosService.addParte(id, { tipo, nome, documento, papel })

    await auditLog(req, {
      acao: 'processo.parte.criar',
      usuarioLogin: executadoPor || usuario || null,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { parteId: parte.id, tipo, nome, documento, papel },
    })

    res.status(201).json({ ok: true, parte })
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/partes', e)
    const status = e.code || 500
    const msg = status === 500 ? 'Erro ao adicionar parte' : e.message
    res.status(status).json({ error: msg })
  }
})

// DELETE /api/processos/:id/partes/:parteId
app.delete('/api/processos/:id/partes/:parteId', async (req, res) => {
  try {
    const { id, parteId } = req.params
    const { executadoPor, usuario } = req.body || {}

    let result
    try {
      result = await processosService.deleteParte(id, parteId)
    } catch (err) {
      const status = err.code === 404 ? 404 : err.code === 400 ? 400 : 500
      const msg = status === 500 ? 'Erro ao remover parte' : err.message
      return res.status(status).json({ error: msg })
    }

    await auditLog(req, {
      acao: 'processo.parte.deletar',
      usuarioLogin: executadoPor || usuario || null,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { parteId, nome: result?.nome || null },
    })

    res.json({ ok: true })
  } catch (e) {
    console.error('Erro em DELETE /api/processos/:id/partes/:parteId', e)
    res.status(500).json({ error: 'Erro ao remover parte' })
  }
})

// GET /api/processos/:id/documentos
app.get('/api/processos/:id/documentos', async (req, res) => {
  try {
    const { id } = req.params
    const viewerSetorRaw = req.query.viewerSetor || req.query.setor || null
    const rows = await documentosService.listByProcesso(id, viewerSetorRaw)
    res.json(rows)
  } catch (e) {
    console.error('Erro em GET /api/processos/:id/documentos', e)
    const status = e.code && Number(e.code) ? Number(e.code) : 500
    res.status(status).json({ error: e.message || 'Erro ao listar documentos do processo' })
  }
})

// POST /api/processos/:id/documentos/seed
app.post('/api/processos/:id/documentos/seed', async (req, res) => {
  try {
    const { id } = req.params
    const autorLogin = req.body.usuarioLogin || req.body.usuario || req.body.executadoPor || null
    const result = await documentosService.seedByProcesso(id, { autorLogin })

    await auditLog(req, {
      acao: 'processo.documentos_seed',
      usuarioLogin: autorLogin || null,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { seeded: result.seeded, documentoId: result.documentoId || null },
    })

    res.status(201).json(result)
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/documentos/seed', e)
    const status = e.code && Number(e.code) ? Number(e.code) : 500
    res
      .status(status)
      .json({ error: e.message || 'Erro ao criar documentos iniciais do processo' })
  }
})

// POST /api/processos/:id/documentos/link
app.post('/api/processos/:id/documentos/link', async (req, res) => {
  try {
    const { id } = req.params
    const { documentoId } = req.body
    const result = await documentosService.linkDocumento(id, documentoId)

    await auditLog(req, {
      acao: 'processo.link_documento',
      usuarioLogin: req.body.usuarioLogin || req.body.usuario || null,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { documentoId },
    })

    res.status(201).json(result)
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/documentos/link', e)
    const status = e.code && Number(e.code) ? Number(e.code) : 500
    res.status(status).json({ error: e.message || 'Erro ao vincular documento ao processo' })
  }
})

// POST /api/documentos
app.post('/api/documentos', async (req, res) => {
  try {
    const { titulo, tipo, modo, autorLogin } = req.body
    const created = await documentosService.createDocumento({ titulo, tipo, modo, autorLogin })

    await auditLog(req, {
      acao: 'documento.criar',
      usuarioLogin: autorLogin || null,
      entidade: 'documento',
      entidadeId: created.id,
      detalhes: { titulo, tipo: tipo || 'Documento', modo: modo || 'Editor' },
    })

    res.status(201).json(created)
  } catch (e) {
    console.error('Erro em POST /api/documentos', e)
    const status = e.code || 500
    res.status(status).json({ error: e.message || 'Erro ao criar documento' })
  }
})

// POST /api/documentos/:id/upload
app.post('/api/documentos/:id/upload', async (req, res) => {
  try {
    const { id } = req.params
    const { fileName, contentBase64, autorLogin } = req.body
    const usuarioLogin = req.body.usuarioLogin || autorLogin || null

    const result = await documentosService.uploadConteudo(id, {
      fileName,
      contentBase64,
      usuarioLogin,
      autorLogin,
    })

    await auditLog(req, {
      acao: 'documento.upload_conteudo',
      usuarioLogin: usuarioLogin || null,
      entidade: 'documento',
      entidadeId: id,
      detalhes: {
        fileName: fileName || 'arquivo.bin',
        statusAnterior: result.statusAnterior,
        assinante: result.assinante,
      },
    })

    res.json({ ok: true })
  } catch (e) {
    console.error('Erro em POST /api/documentos/:id/upload', e)
    const status = e.code || 500
    res.status(status).json({ error: e.message || 'Erro ao atualizar documento (upload)' })
  }
})

// POST /api/documentos/:id/editor/conteudo
app.post('/api/documentos/:id/editor/conteudo', async (req, res) => {
  try {
    const { id } = req.params
    const { conteudo, autorLogin } = req.body
    const usuarioLogin = req.body.usuarioLogin || autorLogin || null

    const result = await documentosService.editorConteudo(id, {
      conteudo,
      usuarioLogin,
      autorLogin,
    })

    await auditLog(req, {
      acao: 'documento.editar_conteudo',
      usuarioLogin: usuarioLogin || null,
      entidade: 'documento',
      entidadeId: id,
      detalhes: { statusAnterior: result.statusAnterior, assinante: result.assinante },
    })

    res.json({ ok: true })
  } catch (e) {
    console.error('Erro em POST /api/documentos/:id/editor/conteudo', e)
    const status = e.code || 500
    res.status(status).json({ error: e.message || 'Erro ao atualizar documento (editor)' })
  }
})

// GET /api/documentos/:id
app.get('/api/documentos/:id', async (req, res) => {
  try {
    const { id } = req.params
    const doc = await documentosService.getDocumentoById(id)
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' })
    res.json(doc)
  } catch (e) {
    console.error('Erro em GET /api/documentos/:id', e)
    const status = e.code || 500
    res.status(status).json({ error: e.message || 'Erro ao carregar documento' })
  }
})

// POST /api/documentos/:id/assinar
app.post('/api/documentos/:id/assinar', async (req, res) => {
  try {
    const { id } = req.params
    const usuarioLogin = req.body.usuarioLogin || req.body.autorLogin || null

    const result = await documentosService.assinar(id, { usuarioLogin })

    await auditLog(req, {
      acao: 'documento.assinar',
      usuarioLogin,
      entidade: 'documento',
      entidadeId: id,
      detalhes: { status: 'assinado' },
    })

    res.json(result)
  } catch (e) {
    const status = e.code || 500
    console.error('Erro em POST /api/documentos/:id/assinar', e)
    res.status(status).json({ error: e.message || 'Erro ao assinar documento' })
  }
})

// Excluir rascunho de documento
app.post('/api/documentos/:id/deletar', async (req, res) => {
  try {
    const { id } = req.params
    const usuarioLogin = req.body.usuarioLogin || req.body.autorLogin || null

    const result = await documentosService.deletarRascunho(id, { usuarioLogin })

    await auditLog(req, {
      acao: 'documento.deletar',
      usuarioLogin,
      entidade: 'documento',
      entidadeId: id,
      detalhes: { statusAnterior: result.statusAnterior, autorLogin: result.autorLogin },
    })

    res.json(result)
  } catch (e) {
    const status = e.code || 500
    console.error('Erro em POST /api/documentos/:id/deletar', e)
    res.status(status).json({ error: e.message || 'Erro ao excluir documento' })
  }
})

// Auditoria (genÃ©rico)
app.post('/api/auditoria', async (req, res) => {
  try {
    const { acao, usuarioLogin, entidade, entidadeId, detalhes } = req.body
    if (!acao) return res.status(400).json({ error: 'acao obrigatÃ³ria' })
    await auditLog(req, { acao, usuarioLogin, entidade, entidadeId, detalhes })
    res.json({ ok: true })
  } catch (e) {
    console.error('Falha ao registrar auditoria via endpoint:', e)
    res.status(500).json({ error: 'Falha ao registrar auditoria' })
  }
})

// Saúde
app.get('/health', (_, res) => res.json({ status: 'ok' }))

// Consulta pública agregada
app.get('/api/public/consultas/:valor', async (req, res) => {
  try {
    const raw = req.params.valor || ''
    const valor = decodeURIComponent(raw)
    const chave = String(req.query.chave || '')
    const result = await processosService.consultarPublico(valor, chave)
    res.json(result)
  } catch (e) {
    console.error('Erro em GET /api/public/consultas/:valor', e)
    const status = e.code || 500
    const msg = status === 500 ? 'Erro ao consultar processo público' : e.message
    res.status(status).json({ error: msg })
  }
})

// Download público de documento em PDF
app.get('/api/public/documentos/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params
    const chave = String(req.query.chave || '')
    const result = await documentosService.gerarPdfPublico(id, chave)
    res.json(result)
  } catch (e) {
    console.error('Erro em GET /api/public/documentos/:id/pdf', e)
    const status = e.code || 500
    const msg = status === 500 ? 'Falha ao gerar PDF do documento' : e.message
    res.status(status).json({ error: msg })
  }
})
app.listen(PORT, () => {
  console.log(`SPE API mock rodando em http://localhost:${PORT}`)
})

app.get('/api/processos/:id/tramites', async (req, res) => {
  try {
    const { id } = req.params
    const rows = await processosService.listTramites(id)
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

    const result = await processosService.priorizar(id, { prioridade, executadoPor })

    await auditLog(req, {
      acao: 'processo.prioridade',
      usuarioLogin: executadoPor,
      entidade: 'processo',
      entidadeId: id,
      detalhes: { prioridade },
    })

    res.json({ ok: true, processo: result.processo })
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/prioridade', e)
    const status = e.code || 500
    const msg = status === 500 ? 'Erro ao marcar prioridade do processo' : e.message
    res.status(status).json({ error: msg })
  }
})

// POST aceitar pendÃªncia
app.post('/api/processos/:id/pendencia/aceitar', async (req, res) => {
  try {
    const { id } = req.params
    const { usuario } = req.body

    const result = await processosService.aceitarPendencia(id, { usuario })

    await auditLog(req, {
      acao: 'processo.pendencia_aceitar',
      usuarioLogin: usuario,
      entidade: 'processo',
      entidadeId: id,
      detalhes: result.detalhes,
    })

    res.json({ ok: true, processo: result.processo })
  } catch (e) {
    await rollback()
    console.error('Erro em POST /api/processos/:id/pendencia/aceitar', e)
    const status = e.code || 500
    const msg = status === 500 ? 'Erro ao aceitar pendência' : e.message
    res.status(status).json({ error: msg })
  }
})

// POST recusar pendência
app.post('/api/processos/:id/pendencia/recusar', async (req, res) => {
  try {
    const { id } = req.params
    const { usuario, motivo } = req.body

    const result = await processosService.recusarPendencia(id, { usuario, motivo })

    await auditLog(req, {
      acao: 'processo.pendencia_recusar',
      usuarioLogin: usuario,
      entidade: 'processo',
      entidadeId: id,
      detalhes: result.detalhes,
    })

    res.json({ ok: true, processo: result.processo })
  } catch (e) {
    await rollback()
    console.error('Erro em POST /api/processos/:id/pendencia/recusar', e)
    const status = e.code || 500
    const msg = status === 500 ? 'Erro ao recusar pendência' : e.message
    res.status(status).json({ error: msg })
  }
})

// POST /api/processos/:id/arquivar
app.post('/api/processos/:id/arquivar', async (req, res) => {
  try {
    const { id } = req.params
    const { usuario } = req.body

    const result = await processosService.arquivar(id, { usuario })

    await auditLog(req, {
      acao: 'processo.arquivar',
      usuarioLogin: usuario,
      entidade: 'processo',
      entidadeId: id,
      detalhes: result.detalhes,
    })

    res.json({ ok: true, processo: result.processo })
  } catch (e) {
    console.error('Erro em POST /api/processos/:id/arquivar', e)
    const status = e.code || 500
    const msg = status === 500 ? 'Erro ao arquivar processo' : e.message
    res.status(status).json({ error: msg })
  }
})
