jest.mock('../../db', () => ({
  query: jest.fn(),
}))

const { query } = require('../../db')

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'doc-123'),
}))

const documentosService = require('../documentosService')

jest.mock('puppeteer', () => {
  const pdfBuffer = Buffer.from('pdf-binary')
  return {
    launch: jest.fn(() => Promise.resolve({
      newPage: jest.fn(() => Promise.resolve({
        setContent: jest.fn(() => Promise.resolve()),
        pdf: jest.fn(() => Promise.resolve(pdfBuffer)),
      })),
      close: jest.fn(() => Promise.resolve()),
    })),
  }
})

describe('documentosService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('listByProcesso', () => {
    it('erro 404 quando processo não existe', async () => {
      // 1ª chamada: valida processo
      query.mockResolvedValueOnce({ rows: [] })

      await expect(documentosService.listByProcesso('proc-404')).rejects.toMatchObject({ code: 404 })
      expect(query).toHaveBeenCalledTimes(1)
      expect(query.mock.calls[0][0]).toEqual(expect.stringContaining('SELECT setor_atual FROM processos'))
    })

    it('lista documentos assinados quando viewerSetor ausente', async () => {
      // 1: processo existe
      query.mockResolvedValueOnce({ rows: [{ setor_atual: 'PROTOCOLO' }] })
      // 2: query documentos com filtro de assinados
      const fakeRows = [
        { id: 'd1', status: 'assinado', criadoEm: '2024-01-01' },
      ]
      query.mockResolvedValueOnce({ rows: fakeRows })

      const result = await documentosService.listByProcesso('proc-1')

      expect(query).toHaveBeenCalledTimes(2)
      const [sqlDocs, paramsDocs] = query.mock.calls[1]
      expect(sqlDocs).toEqual(expect.stringContaining("FROM processo_documentos"))
      expect(sqlDocs).toEqual(expect.stringContaining("AND LOWER(d.status) = 'assinado'"))
      expect(paramsDocs).toEqual(['proc-1'])
      expect(result).toEqual(fakeRows)
    })

    it('lista documentos considerando setor do viewer quando informado', async () => {
      // 1: processo existe
      query.mockResolvedValueOnce({ rows: [{ setor_atual: 'PROTOCOLO' }] })
      // 2: query documentos com filtro por viewerSetor
      const fakeRows = [
        { id: 'd2', status: 'rascunho', criadoEm: '2024-01-02' },
      ]
      query.mockResolvedValueOnce({ rows: fakeRows })

      const result = await documentosService.listByProcesso('proc-1', 'TI')

      expect(query).toHaveBeenCalledTimes(2)
      const [sqlDocs, paramsDocs] = query.mock.calls[1]
      expect(sqlDocs).toEqual(expect.stringContaining("UPPER(u.setor) = $2"))
      expect(paramsDocs).toEqual(['proc-1', 'TI'])
      expect(result).toEqual(fakeRows)
    })
  })

  describe('linkDocumento', () => {
    it('valida documentoId obrigatório e lança erro 400', async () => {
      await expect(documentosService.linkDocumento('proc-1', undefined)).rejects.toMatchObject({ code: 400 })
      expect(query).not.toHaveBeenCalled()
    })

    it('lança 404 quando processo não existe', async () => {
      // 1: SELECT processo
      query.mockResolvedValueOnce({ rows: [] })

      await expect(documentosService.linkDocumento('proc-404', 'doc-1')).rejects.toMatchObject({ code: 404 })
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('lança 404 quando documento não existe', async () => {
      // 1: processo existe
      query.mockResolvedValueOnce({ rows: [{ id: 'proc-1' }] })
      // 2: documento não existe
      query.mockResolvedValueOnce({ rows: [] })

      await expect(documentosService.linkDocumento('proc-1', 'doc-404')).rejects.toMatchObject({ code: 404 })
      expect(query).toHaveBeenCalledTimes(2)
    })

    it('insere link e retorna ok: true', async () => {
      // 1: processo existe
      query.mockResolvedValueOnce({ rows: [{ id: 'proc-1' }] })
      // 2: documento existe
      query.mockResolvedValueOnce({ rows: [{ id: 'doc-1' }] })
      // 3: insert link
      query.mockResolvedValueOnce({})

      const result = await documentosService.linkDocumento('proc-1', 'doc-1')

      expect(query).toHaveBeenCalledTimes(3)
      const insertArgs = query.mock.calls[2]
      expect(insertArgs[0]).toEqual(expect.stringContaining('INSERT INTO processo_documentos'))
      expect(insertArgs[1]).toEqual(['proc-1', 'doc-1'])
      expect(result).toEqual({ ok: true })
    })
  })

  describe('createDocumento', () => {
    it('valida título obrigatório e lança erro 400', async () => {
      await expect(documentosService.createDocumento({ titulo: '' })).rejects.toMatchObject({ code: 400 })
      expect(query).not.toHaveBeenCalled()
    })

    it('cria documento rascunho e retorna dados do SELECT', async () => {
      // 1: insert
      query.mockResolvedValueOnce({})
      // 2: select documento
      const fakeRow = { id: 'doc-123', titulo: 'Doc', modo: 'Editor', status: 'rascunho', autorLogin: 'user1' }
      query.mockResolvedValueOnce({ rows: [fakeRow] })

      const result = await documentosService.createDocumento({ titulo: 'Doc', autorLogin: 'user1' })

      expect(query).toHaveBeenCalledTimes(2)
      const insertArgs = query.mock.calls[0]
      expect(insertArgs[0]).toEqual(expect.stringContaining('INSERT INTO documentos'))
      expect(insertArgs[1]).toEqual(['doc-123', 'Doc', 'Documento', 'Editor', 'rascunho', 'user1'])
      expect(result).toEqual(fakeRow)
    })
  })

  describe('getDocumentoById', () => {
    it('retorna null quando não encontra', async () => {
      query.mockResolvedValueOnce({ rows: [] })
      const result = await documentosService.getDocumentoById('doc-x')
      expect(query).toHaveBeenCalledTimes(1)
      expect(result).toBeNull()
    })

    it('retorna objeto com campos mapeados quando encontra', async () => {
      const fakeRow = { id: 'doc-1', titulo: 'A', fileName: 'f.pdf', autorLogin: 'u1' }
      query.mockResolvedValueOnce({ rows: [fakeRow] })
      const result = await documentosService.getDocumentoById('doc-1')
      expect(query).toHaveBeenCalledTimes(1)
      expect(query.mock.calls[0][0]).toEqual(expect.stringContaining('FROM documentos d'))
      expect(result).toEqual(fakeRow)
    })
  })

  describe('assinar', () => {
    it('valida usuário executor obrigatório', async () => {
      await expect(documentosService.assinar('doc-1', { usuarioLogin: '' })).rejects.toMatchObject({ code: 400 })
      expect(query).not.toHaveBeenCalled()
    })

    it('lança 404 quando documento não existe', async () => {
      // 1: select documento
      query.mockResolvedValueOnce({ rows: [] })
      await expect(documentosService.assinar('doc-404', { usuarioLogin: 'u1' })).rejects.toMatchObject({ code: 404 })
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('lança 400 quando modo não é Editor nem Upload', async () => {
      query.mockResolvedValueOnce({ rows: [{ status: 'rascunho', modo: 'Outro', file_name: null, content_base64: null }] })
      await expect(documentosService.assinar('doc-1', { usuarioLogin: 'u1' })).rejects.toMatchObject({ code: 400 })
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('assina documento de Upload válido e retorna documento', async () => {
      // 1: select documento (rascunho, upload, com conteúdo válido)
      query.mockResolvedValueOnce({ rows: [{ status: 'rascunho', modo: 'Upload', file_name: 'arquivo.pdf', content_base64: 'abc' }] })
      // 2: _validarPosicaoFimArvore -> SELECT processo vinculado
      query.mockResolvedValueOnce({ rows: [{ processoId: 'proc-1', atribuidoUsuario: 'u1' }] })
      // 3: _validarPosicaoFimArvore -> SELECT setor do usuário
      query.mockResolvedValueOnce({ rows: [{ setor: 'TI' }] })
      // 4: _validarPosicaoFimArvore -> SELECT documentos do processo (doc no fim da árvore)
      query.mockResolvedValueOnce({ rows: [{ id: 'doc-1', status: 'rascunho', criadoEm: '2024-01-01', assinanteSetor: null }] })
      // 5: UPDATE documentos para assinar
      query.mockResolvedValueOnce({ rowCount: 1 })
      // 6: getDocumentoById -> SELECT detalhes
      const docRow = { id: 'doc-1', titulo: 'Assinado', status: 'assinado' }
      query.mockResolvedValueOnce({ rows: [docRow] })

      const result = await documentosService.assinar('doc-1', { usuarioLogin: 'u1' })

      expect(query).toHaveBeenCalledTimes(6)
      const updateArgs = query.mock.calls[4]
      expect(updateArgs[0]).toEqual(expect.stringContaining('UPDATE documentos'))
      expect(updateArgs[1]).toEqual(['doc-1', 'u1'])
      expect(result).toEqual({ ok: true, documento: docRow })
    })
  })

  describe('deletarRascunho', () => {
    it('impede excluir documento assinado (erro 400)', async () => {
      // 1: select documento status assinado
      query.mockResolvedValueOnce({ rows: [{ status: 'assinado', autor_login: 'u1' }] })
      await expect(documentosService.deletarRascunho('doc-1', { usuarioLogin: 'u1' })).rejects.toMatchObject({ code: 400 })
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('exclui rascunho criado pelo usuário e retorna ok', async () => {
      // 1: select documento (rascunho, autor = u1)
      query.mockResolvedValueOnce({ rows: [{ status: 'rascunho', autor_login: 'u1' }] })
      // 2: select processo vinculado ao documento
      query.mockResolvedValueOnce({ rows: [{ processoId: 'proc-1' }] })
      // 3: delete documento
      query.mockResolvedValueOnce({ rowCount: 1 })

      const result = await documentosService.deletarRascunho('doc-1', { usuarioLogin: 'u1' })

      expect(query).toHaveBeenCalledTimes(3)
      const deleteArgs = query.mock.calls[2]
      expect(deleteArgs[0]).toEqual(expect.stringContaining('DELETE FROM documentos'))
      expect(deleteArgs[1]).toEqual(['doc-1'])
      expect(result).toEqual({ ok: true, statusAnterior: 'rascunho', autorLogin: 'u1' })
    })
  })
})

describe('gerarPdfPublico', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retorna 404 quando documento não existe', async () => {
    // 1: SELECT documento + processo
    query.mockResolvedValueOnce({ rows: [] })

    await expect(documentosService.gerarPdfPublico('doc-404')).rejects.toMatchObject({ code: 404 })
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][0]).toEqual(expect.stringContaining('FROM documentos d'))
  })

  it('retorna 403 quando documento não assinado', async () => {
    // 1: SELECT documento (rascunho)
    query.mockResolvedValueOnce({ rows: [{ id: 'doc-1', status: 'rascunho', modo: 'Upload', file_name: 'arquivo.pdf', content_base64: 'abc', processoId: 'proc-1', nivelAcesso: 'Público' }] })

    await expect(documentosService.gerarPdfPublico('doc-1')).rejects.toMatchObject({ code: 403 })
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('processo não público sem chave retorna 403', async () => {
    // 1: SELECT documento (assinado, processo restrito)
    query.mockResolvedValueOnce({ rows: [{ id: 'doc-1', status: 'assinado', modo: 'Upload', file_name: 'arquivo.pdf', content_base64: 'abc', processoId: 'proc-1', nivelAcesso: 'Restrito' }] })

    await expect(documentosService.gerarPdfPublico('doc-1', '')).rejects.toMatchObject({ code: 403 })
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('chave inválida retorna 403', async () => {
    // 1: SELECT documento (assinado, processo restrito)
    query.mockResolvedValueOnce({ rows: [{ id: 'doc-1', status: 'assinado', modo: 'Upload', file_name: 'arquivo.pdf', content_base64: 'abc', processoId: 'proc-1', nivelAcesso: 'Restrito' }] })
    // 2: SELECT chave inválida
    query.mockResolvedValueOnce({ rows: [] })

    await expect(documentosService.gerarPdfPublico('doc-1', 'chave-x')).rejects.toMatchObject({ code: 403 })
    expect(query).toHaveBeenCalledTimes(2)
    expect(query.mock.calls[1][0]).toEqual(expect.stringContaining('FROM processo_acesso_chaves'))
  })

  it('upload PDF retorna conteúdo base64 e fileName do arquivo', async () => {
    // 1: SELECT documento (assinado, público, upload pdf)
    query.mockResolvedValueOnce({ rows: [{ id: 'doc-1', status: 'assinado', modo: 'Upload', file_name: 'arquivo.pdf', content_base64: 'abc123', processoId: 'proc-1', nivelAcesso: 'Público', titulo: 'Titulo Legal' }] })

    const result = await documentosService.gerarPdfPublico('doc-1')

    expect(query).toHaveBeenCalledTimes(1)
    expect(result.fileName).toBe('arquivo.pdf')
    expect(result.contentBase64).toBe('abc123')
  })

  it('editor gera PDF via puppeteer e retorna base64', async () => {
    // 1: SELECT documento (assinado, público, editor)
    query.mockResolvedValueOnce({ rows: [{ id: 'doc-2', status: 'assinado', modo: 'Editor', conteudo: 'Olá mundo', processoId: 'proc-2', nivelAcesso: 'Público', titulo: 'Meu Doc' }] })

    const result = await documentosService.gerarPdfPublico('doc-2')

    expect(query).toHaveBeenCalledTimes(1)
    expect(result.fileName).toBe('Meu_Doc.pdf')
    expect(typeof result.contentBase64).toBe('string')
    expect(result.contentBase64.length).toBeGreaterThan(0)
  })
})