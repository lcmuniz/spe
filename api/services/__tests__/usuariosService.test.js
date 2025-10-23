jest.mock('../../db', () => ({
  query: jest.fn(),
}))

const { query } = require('../../db')

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'user-123'),
}))

const usuariosService = require('../usuariosService')

describe('usuariosService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUsuarios', () => {
    it('retorna usuário por login quando encontrado', async () => {
      const userRow = {
        id: 'u1',
        login: 'user1',
        nome: 'User Um',
        cargo: 'Analista',
        setorId: 's1',
        setorSigla: 'TI',
        setorNome: 'Tecnologia',
      }
      query.mockResolvedValueOnce({ rows: [userRow] })

      const result = await usuariosService.getUsuarios({ login: 'user1' })

      expect(query).toHaveBeenCalledTimes(1)
      const [sql, params] = query.mock.calls[0]
      expect(sql).toEqual(expect.stringContaining('FROM usuarios u'))
      expect(sql).toEqual(expect.stringContaining('WHERE u.login = $1'))
      expect(params).toEqual(['user1'])
      expect(result).toEqual(userRow)
    })

    it('retorna null por login quando não encontrado', async () => {
      query.mockResolvedValueOnce({ rows: [] })
      const result = await usuariosService.getUsuarios({ login: 'ghost' })
      expect(query).toHaveBeenCalledTimes(1)
      expect(result).toBeNull()
    })

    it('lista usuários filtrando por setor quando informado', async () => {
      const rows = [
        {
          id: 'u1',
          login: 'user1',
          nome: 'A',
          cargo: null,
          setorId: 's1',
          setorSigla: 'TI',
          setorNome: 'Tecnologia',
        },
      ]
      query.mockResolvedValueOnce({ rows })

      const result = await usuariosService.getUsuarios({ setor: 's1' })

      expect(query).toHaveBeenCalledTimes(1)
      const [sql, params] = query.mock.calls[0]
      expect(sql).toEqual(expect.stringContaining('LEFT JOIN setores s ON s.sigla = u.setor'))
      expect(sql).toEqual(expect.stringContaining('WHERE u.setor = $1'))
      expect(params).toEqual(['s1'])
      expect(result).toEqual(rows)
    })

    it('lista usuários filtrando por sigla de setor quando informado', async () => {
      const rows = [
        {
          id: 'u1',
          login: 'user1',
          nome: 'A',
          cargo: null,
          setorId: 's1',
          setorSigla: 'TI',
          setorNome: 'Tecnologia',
        },
        {
          id: 'u2',
          login: 'user2',
          nome: 'B',
          cargo: 'Dev',
          setorId: 's1',
          setorSigla: 'TI',
          setorNome: 'Tecnologia',
        },
      ]
      query.mockResolvedValueOnce({ rows })

      const result = await usuariosService.getUsuariosPorSigla('TI')

      expect(query).toHaveBeenCalledTimes(1)
      const [sql, params] = query.mock.calls[0]
      expect(sql).toEqual(expect.stringContaining('LEFT JOIN setores s ON s.sigla = u.setor'))
      expect(sql).toEqual(expect.stringContaining('WHERE UPPER(s.sigla) = $1'))
      expect(params).toEqual(['TI'])
      expect(result).toEqual(rows)
    })

    it('lista usuários sem filtro quando setor não informado', async () => {
      const rows = [
        {
          id: 'u1',
          login: 'user1',
          nome: 'A',
          cargo: null,
          setorId: 's1',
          setorSigla: 'TI',
          setorNome: 'Tecnologia',
        },
        {
          id: 'u2',
          login: 'user2',
          nome: 'B',
          cargo: 'Dev',
          setorId: 's2',
          setorSigla: 'ADM',
          setorNome: 'Administração',
        },
      ]
      query.mockResolvedValueOnce({ rows })

      const result = await usuariosService.getUsuarios({})

      expect(query).toHaveBeenCalledTimes(1)
      const [sql, params] = query.mock.calls[0]
      expect(sql).not.toEqual(expect.stringContaining('WHERE u.setor_id = $1'))
      expect(sql).toEqual(expect.stringContaining('ORDER BY u.nome ASC'))
      expect(params).toEqual([])
      expect(result).toEqual(rows)
    })
  })

  describe('upsertUsuario', () => {
    it('valida login e nome obrigatórios (400)', async () => {
      await expect(usuariosService.upsertUsuario({ login: '', nome: '' })).rejects.toMatchObject({
        code: 400,
      })
      expect(query).not.toHaveBeenCalled()
    })

    it('faz update quando usuário já existe e retorna usuario.upsert', async () => {
      // SELECT existente
      query.mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
      // UPDATE
      query.mockResolvedValueOnce({})
      // SELECT retorno
      const userRow = {
        id: 'u1',
        login: 'user1',
        nome: 'User Um',
        cargo: 'Analista',
        setorId: 's1',
        setorSigla: 'TI',
        setorNome: 'Tecnologia',
      }
      query.mockResolvedValueOnce({ rows: [userRow] })

      const result = await usuariosService.upsertUsuario({ login: 'user1', nome: 'User Um' })

      expect(query).toHaveBeenCalledTimes(3)
      expect(query.mock.calls[0]).toEqual([
        expect.stringContaining('SELECT login FROM usuarios WHERE login = $1'),
        ['user1'],
      ])
      expect(query.mock.calls[1]).toEqual([
        expect.stringContaining('UPDATE usuarios SET nome = $1 WHERE login = $2'),
        ['User Um', 'user1'],
      ])
      expect(result).toEqual({ acao: 'usuario.upsert', usuario: userRow })
    })

    it('faz insert quando usuário não existe e retorna usuario.criar', async () => {
      // SELECT existente
      query.mockResolvedValueOnce({ rows: [] })
      // INSERT
      query.mockResolvedValueOnce({})
      // SELECT retorno
      const userRow = {
        id: 'user-123',
        login: 'user2',
        nome: 'User Dois',
        cargo: 'Dev',
        setorId: 's2',
        setorSigla: 'ADM',
        setorNome: 'Administração',
      }
      query.mockResolvedValueOnce({ rows: [userRow] })

      const result = await usuariosService.upsertUsuario({
        login: 'user2',
        nome: 'User Dois',
        setor: 's2',
        cargo: 'Dev',
      })

      expect(query).toHaveBeenCalledTimes(3)
      expect(query.mock.calls[0]).toEqual([
        expect.stringContaining('SELECT login FROM usuarios WHERE login = $1'),
        ['user2'],
      ])
      expect(query.mock.calls[1]).toEqual([
        expect.stringContaining('INSERT INTO usuarios (login, setor, nome, cargo)'),
        ['user2', 's2', 'User Dois', 'Dev'],
      ])
      expect(result).toEqual({ acao: 'usuario.criar', usuario: userRow })
    })
  })
})
