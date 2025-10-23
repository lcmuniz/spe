jest.mock('../../db', () => ({
  query: jest.fn(),
}))

const { query } = require('../../db')

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-123'),
}))

const acessosService = require('../acessosService')

describe('acessosService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('listAcessos', () => {
    it('retorna linhas do banco para o processo informado', async () => {
      const fakeRows = [
        { id: 'a1', tipo: 'USUARIO', valor: 'user1', criadoEm: '2024-01-01' },
        { id: 'a2', tipo: 'SETOR', valor: 'TI', criadoEm: '2024-01-02' },
      ]
      query.mockResolvedValueOnce({ rows: fakeRows })

      const result = await acessosService.listAcessos('proc-1')

      expect(query).toHaveBeenCalledTimes(1)
      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM processo_acessos'), [
        'proc-1',
      ])
      expect(result).toEqual(fakeRows)
    })
  })

  describe('addAcesso', () => {
    it('valida tipo inválido e lança erro 400', async () => {
      await expect(
        acessosService.addAcesso('proc-1', { tipo: 'invalido', valor: 'x' }),
      ).rejects.toMatchObject({ code: 400 })
      expect(query).not.toHaveBeenCalled()
    })

    it('SETOR sem valor lança erro 400', async () => {
      await expect(acessosService.addAcesso('proc-1', { tipo: 'SETOR' })).rejects.toMatchObject({
        code: 400,
      })
      expect(query).not.toHaveBeenCalled()
    })

    it('USUARIO sem valor lança erro 400', async () => {
      await expect(acessosService.addAcesso('proc-1', { tipo: 'USUARIO' })).rejects.toMatchObject({
        code: 400,
      })
      expect(query).not.toHaveBeenCalled()
    })

    it('retorna id ao adicionar acesso USUARIO com processo existente', async () => {
      // 1ª chamada: SELECT processo
      query.mockResolvedValueOnce({ rows: [{ id: 'proc-1' }] })
      // 2ª chamada: INSERT acesso
      query.mockResolvedValueOnce({})

      const result = await acessosService.addAcesso('proc-1', {
        tipo: 'USUARIO',
        valor: 'john.doe',
      })

      expect(query).toHaveBeenCalledTimes(2)
      // Verifica INSERT
      const insertArgs = query.mock.calls[1]
      expect(insertArgs[0]).toEqual(expect.stringContaining('INSERT INTO processo_acessos'))
      expect(insertArgs[1]).toEqual(['uuid-123', 'proc-1', 'USUARIO', 'john.doe'])
      expect(result).toEqual({ id: 'uuid-123' })
    })

    it('lança 404 quando processo não existe', async () => {
      query.mockResolvedValueOnce({ rows: [] })

      await expect(
        acessosService.addAcesso('proc-404', { tipo: 'USUARIO', valor: 'x' }),
      ).rejects.toMatchObject({ code: 404 })
      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  describe('removeAcesso', () => {
    it('deleta e retorna ok: true quando encontrado', async () => {
      query.mockResolvedValueOnce({ rowCount: 1 })
      const result = await acessosService.removeAcesso('proc-1', 'acc-1')
      expect(query).toHaveBeenCalledTimes(1)
      expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM processo_acessos'), [
        'acc-1',
        'proc-1',
      ])
      expect(result).toEqual({ ok: true })
    })

    it('lança 404 quando não encontra o acesso', async () => {
      query.mockResolvedValueOnce({ rowCount: 0 })
      await expect(acessosService.removeAcesso('proc-1', 'acc-404')).rejects.toMatchObject({
        code: 404,
      })
      expect(query).toHaveBeenCalledTimes(1)
    })
  })
})
