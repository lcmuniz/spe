require('dotenv').config()
const { Pool } = require('pg')

// Permite usar DATABASE_URL ou variáveis PG* padrão
const connectionString = process.env.DATABASE_URL
const schema = process.env.PGSCHEMA || 'spe'

const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'password',
      database: process.env.PGDATABASE || 'spe',
    })

// Define o search_path para o schema desejado em cada conexão do pool
pool.on('connect', async (client) => {
  try {
    await client.query(`SET search_path TO ${schema}, public`)
  } catch (e) {
    console.error('Failed to set search_path', e)
  }
})

async function initDb() {
  // Garante existência do schema e fixa search_path
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`)
  await pool.query(`SET search_path TO ${schema}, public`)

  // Cria tabelas necessárias se não existirem
  await pool.query(`
    CREATE TABLE IF NOT EXISTS processos (
      id UUID PRIMARY KEY,
      numero VARCHAR(50) UNIQUE NOT NULL,
      assunto VARCHAR(255) NOT NULL,
      tipo VARCHAR(100),
      nivel_acesso VARCHAR(50) NOT NULL,
      base_legal TEXT,
      observacoes TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'Em instrução',
      prioridade VARCHAR(50) NOT NULL DEFAULT 'Normal',
      setor_atual VARCHAR(100) NOT NULL DEFAULT 'PROTOCOLO',
      atribuido_usuario VARCHAR(100),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documentos (
      id UUID PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      tipo VARCHAR(100),
      modo VARCHAR(50) NOT NULL DEFAULT 'Editor',
      status VARCHAR(50) NOT NULL DEFAULT 'rascunho',
      file_name VARCHAR(255),
      content_base64 TEXT,
      conteudo TEXT,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  // Coluna de autor (apenas login); remover coluna obsoleta de nome
  await pool.query(`
    ALTER TABLE documentos
      ADD COLUMN IF NOT EXISTS autor VARCHAR(100);
  `)
  // Backfill autor a partir de autor_login (quando existir)
  try {
    await pool.query(`
      UPDATE documentos SET autor = autor_login WHERE autor IS NULL;
    `)
  } catch (_e) {
    // ignora se coluna não existir
  }
  await pool.query(`
    ALTER TABLE documentos
      DROP COLUMN IF EXISTS autor_login;
  `)

  // Assinatura de documentos: renomear assinado_por_login -> assinado_por
  await pool.query(`ALTER TABLE documentos ADD COLUMN IF NOT EXISTS assinado_por VARCHAR(100);`)
  try {
    await pool.query(`
      UPDATE documentos SET assinado_por = assinado_por_login WHERE assinado_por IS NULL;
    `)
  } catch (_e) {
    // ignora se coluna não existir
  }
  await pool.query(`ALTER TABLE documentos DROP COLUMN IF EXISTS assinado_por_login;`)
  await pool.query(`ALTER TABLE documentos ADD COLUMN IF NOT EXISTS assinado_em TIMESTAMPTZ;`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processo_documentos (
      processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
      documento_id UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
      PRIMARY KEY (processo_id, documento_id)
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS externo_documentos_temp (
      id UUID PRIMARY KEY,
      processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
      parte_id UUID NOT NULL REFERENCES cadastro_partes(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      content_base64 TEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'aguardando_analise',
      titulo VARCHAR(255),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ext_docs_temp_proc ON externo_documentos_temp(processo_id);`)
  // Campos adicionais para rejeição de anexos externos
  await pool.query(`ALTER TABLE externo_documentos_temp ADD COLUMN IF NOT EXISTS rejeicao_motivo TEXT;`)
  await pool.query(`ALTER TABLE externo_documentos_temp ADD COLUMN IF NOT EXISTS rejeitado_em TIMESTAMPTZ;`)

  // Migração suave: adicionar coluna parte_id em bases antigas, popular e remover coluna antiga
  await pool.query(`
    ALTER TABLE externo_documentos_temp
      ADD COLUMN IF NOT EXISTS parte_id UUID;
  `)
  await pool.query(`DROP INDEX IF EXISTS idx_ext_docs_temp_parte;`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ext_docs_temp_parte_id ON externo_documentos_temp(parte_id);`)
  // Backfill parte_id a partir de parte_documento apenas se coluna existir
  try {
    const { rows: colExists } = await pool.query(
      `SELECT 1 FROM information_schema.columns
         WHERE table_schema = $1
           AND table_name = 'externo_documentos_temp'
           AND column_name = 'parte_documento'
         LIMIT 1`,
      [schema],
    )
    if (colExists.length > 0) {
      await pool.query(`
        UPDATE externo_documentos_temp edt
           SET parte_id = cp.id
          FROM cadastro_partes cp
         WHERE edt.parte_id IS NULL
           AND cp.documento = edt.parte_documento;
      `)
    }
  } catch (e) {
    console.warn('Aviso: backfill de parte_id não aplicado', e.message)
  }
  await pool.query(`
    ALTER TABLE externo_documentos_temp
      DROP COLUMN IF EXISTS parte_documento;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processo_partes (
      id UUID PRIMARY KEY,
      processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
      tipo VARCHAR(50),
      nome VARCHAR(255) NOT NULL,
      documento VARCHAR(50),
      papel VARCHAR(100)
    );
  `)
  // Novo vínculo opcional com cadastro_partes
  await pool.query(`
    ALTER TABLE processo_partes
      ADD COLUMN IF NOT EXISTS cadastro_parte_id UUID REFERENCES cadastro_partes(id) ON DELETE SET NULL;
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_proc_partes_cadastro ON processo_partes(cadastro_parte_id);`)

  // Migração: para registros antigos em processo_partes sem cadastro_parte_id, criar entradas em cadastro_partes
  try {
    const { rows: cols } = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'processo_partes'`,
      [schema],
    )
    const hasNome = cols.some((c) => c.column_name === 'nome')
    const hasTipo = cols.some((c) => c.column_name === 'tipo')
    const hasDocumento = cols.some((c) => c.column_name === 'documento')
    if (hasNome || hasDocumento || hasTipo) {
      const { rows: antigos } = await pool.query(
        `SELECT id, tipo, nome, documento FROM processo_partes WHERE cadastro_parte_id IS NULL`,
      )
      for (const pp of antigos) {
        const cadId = require('crypto').randomUUID()
        await pool.query(
          `INSERT INTO cadastro_partes (id, tipo, nome, documento) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
          [cadId, pp.tipo || null, pp.nome || null, pp.documento || null],
        )
        await pool.query(
          `UPDATE processo_partes SET cadastro_parte_id = $1 WHERE id = $2 AND cadastro_parte_id IS NULL`,
          [cadId, pp.id],
        )
      }
    }
  } catch (e) {
    console.warn('Aviso: migração de processo_partes->cadastro_partes falhou ou não necessária', e.message)
  }

  // Remover colunas duplicadas que agora residem em cadastro_partes
  await pool.query(`ALTER TABLE processo_partes DROP COLUMN IF EXISTS tipo;`)
  await pool.query(`ALTER TABLE processo_partes DROP COLUMN IF EXISTS nome;`)
  await pool.query(`ALTER TABLE processo_partes DROP COLUMN IF EXISTS documento;`)

  // ACL de processos: setores, usuários e partes vinculadas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS processo_acessos (
      id UUID PRIMARY KEY,
      processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
      tipo VARCHAR(20) NOT NULL, -- SETOR | USUARIO | PARTE
      valor VARCHAR(255),        -- SETOR sigla, USUARIO login ou PARTE id
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  // Remover coluna obsoleta caso exista, para alinhar com novo modelo
  await pool.query(`ALTER TABLE processo_acessos DROP COLUMN IF EXISTS parte_id;`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_proc_acessos_proc ON processo_acessos(processo_id);`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_proc_acessos_tipo ON processo_acessos(tipo);`)

  // Removido: chaves de acesso externas
  await pool.query(`DROP TABLE IF EXISTS processo_acesso_chaves;`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tramites (
      id UUID PRIMARY KEY,
      processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
      origem_setor VARCHAR(100),
      destino_setor VARCHAR(100),
      data TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  // Adições de colunas para tramites
  await pool.query(`
    ALTER TABLE tramites
      ADD COLUMN IF NOT EXISTS motivo TEXT,
      ADD COLUMN IF NOT EXISTS prioridade VARCHAR(50),
      ADD COLUMN IF NOT EXISTS prazo DATE,
      ADD COLUMN IF NOT EXISTS origem_usuario VARCHAR(100);
  `)

  // Remover coluna obsoleta destino_usuario
  await pool.query(`
    ALTER TABLE tramites
      DROP COLUMN IF EXISTS destino_usuario;
  `)

  // Adição de prazo em processos
  await pool.query(`
    ALTER TABLE processos
      ADD COLUMN IF NOT EXISTS prazo DATE;
  `)

  // Novas colunas para fluxo de Pendências
  await pool.query(`
    ALTER TABLE processos
      ADD COLUMN IF NOT EXISTS pendente BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS pendente_destino_setor VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pendente_origem_setor VARCHAR(100);
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_processos_assunto ON processos(assunto);
  `)

  // Index on processo_partes(nome) removed due to column drop

  // Nova tabela de setores
  await pool.query(`
    CREATE TABLE IF NOT EXISTS setores (
      sigla VARCHAR(100) PRIMARY KEY,
      nome VARCHAR(255) NOT NULL
    );
  `)

  // Seed de setores (idempotente)
  await pool.query(`
    INSERT INTO setores (sigla, nome) VALUES
      ('PROTOCOLO','Protocolo'),
      ('GABINETE','Gabinete'),
      ('JURÍDICO','Jurídico'),
      ('TI','Tecnologia da Informação'),
      ('FINANCEIRO','Financeiro')
    ON CONFLICT (sigla) DO NOTHING;
  `)

  // Tabela de assuntos (catálogo)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assuntos (
      id VARCHAR(20) PRIMARY KEY,
      nome VARCHAR(255) NOT NULL
    );
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_assuntos_nome ON assuntos(nome);`)

  // Seed de assuntos (idempotente)
  await pool.query(`
    INSERT INTO assuntos (id, nome) VALUES
      ('ASS-0001','Despacho'),
      ('ASS-0002','Memorando'),
      ('ASS-0003','Ofício'),
      ('ASS-0004','Ata'),
      ('ASS-0005','Requerimento')
    ON CONFLICT (id) DO NOTHING;
  `)

  // Tipos de processo (catálogo)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tipos_processo (
      id VARCHAR(50) PRIMARY KEY,
      nome VARCHAR(255) NOT NULL
    );
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tipos_processo_nome ON tipos_processo(nome);`)

  // Seed de tipos de processo (idempotente)
  await pool.query(`
    INSERT INTO tipos_processo (id, nome) VALUES
      ('TP-0001','Processo Administrativo'),
      ('TP-0002','Requerimento'),
      ('TP-0003','Denúncia')
    ON CONFLICT (id) DO NOTHING;
  `)

  // Tabela de usuários (login -> setor + nome)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      login VARCHAR(100) PRIMARY KEY,
      setor VARCHAR(100) NOT NULL REFERENCES setores(sigla),
      nome VARCHAR(255)
    );
  `)
  // Garantir coluna nome em bases já existentes
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome VARCHAR(255);`)
  // Nova coluna: cargo do usuário
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(255);`)

  // Garante FK (migração leve para bancos já existentes)
  try {
    await pool.query(`
      ALTER TABLE usuarios
        DROP CONSTRAINT IF EXISTS usuarios_setor_fkey,
        ADD CONSTRAINT usuarios_setor_fkey FOREIGN KEY (setor) REFERENCES setores(sigla);
    `)
  } catch (_e) {
    // ignora se não aplicável
  }

  // Cadastro de Partes (tabela separada)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cadastro_partes (
      id UUID PRIMARY KEY,
      tipo VARCHAR(20) NOT NULL, -- FISICA | JURIDICA
      nome VARCHAR(255) NOT NULL,
      documento VARCHAR(50),
      email VARCHAR(255),
      telefone VARCHAR(50),
      endereco_logradouro VARCHAR(255),
      endereco_numero VARCHAR(50),
      endereco_complemento VARCHAR(255),
      endereco_bairro VARCHAR(255),
      endereco_cidade VARCHAR(255),
      endereco_estado VARCHAR(2),
      endereco_cep VARCHAR(20)
    );
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cad_partes_nome ON cadastro_partes(nome);`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cad_partes_doc ON cadastro_partes(documento);`)

  // Novas colunas de chave de acesso por parte (única e reutilizável)
  await pool.query(`ALTER TABLE cadastro_partes ADD COLUMN IF NOT EXISTS chave VARCHAR(100);`)
  await pool.query(
    `ALTER TABLE cadastro_partes ADD COLUMN IF NOT EXISTS chave_ativo BOOLEAN NOT NULL DEFAULT TRUE;`
  )
  await pool.query(
    `ALTER TABLE cadastro_partes ADD COLUMN IF NOT EXISTS chave_criado_em TIMESTAMPTZ NOT NULL DEFAULT now();`
  )
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_cad_partes_chave ON cadastro_partes(chave);`
  )

  // Migração leve: gerar chave para registros existentes sem chave
  try {
    const { rows: semChave } = await pool.query(
      `SELECT id FROM cadastro_partes WHERE chave IS NULL`
    )
    for (const row of semChave) {
      const novo = require('crypto').randomUUID()
      await pool.query(
        `UPDATE cadastro_partes SET chave = $2, chave_ativo = TRUE WHERE id = $1`,
        [row.id, novo]
      )
    }
  } catch (e) {
    console.warn('Aviso: geração de chaves para cadastro_partes não aplicada', e.message)
  }
  // Tabela de auditoria (logs de ações)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id UUID PRIMARY KEY,
      data TIMESTAMPTZ NOT NULL DEFAULT now(),
      acao VARCHAR(100) NOT NULL,
      usuario_login VARCHAR(100),
      entidade VARCHAR(100),
      entidade_id VARCHAR(100),
      detalhes JSONB,
      ip VARCHAR(100),
      user_agent VARCHAR(255),
      rota VARCHAR(255)
    );
  `)

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria(data);`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_auditoria_acao ON auditoria(acao);`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_login);`)
  await pool.query(`ALTER TABLE auditoria DROP COLUMN IF EXISTS usuario_nome;`)

  // Seed inicial se tabela estiver vazia
  const { rows: ucount } = await pool.query(`SELECT COUNT(*)::int AS count FROM usuarios`)
  if ((ucount[0]?.count || 0) === 0) {
    await pool.query(`
      INSERT INTO usuarios (login, setor, nome, cargo) VALUES
        ('usuario1', 'PROTOCOLO', 'Usuário 1', 'Agente Administrativo'),
        ('usuario2', 'PROTOCOLO', 'Usuário 2', 'Agente Administrativo'),
        ('usuario3', 'PROTOCOLO', 'Usuário 3', 'Agente Administrativo'),
        ('gabinete1', 'GABINETE', 'Gabinete 1', 'Chefe de Gabinete'),
        ('gabinete2', 'GABINETE', 'Gabinete 2', 'Chefe de Gabinete'),
        ('juridico1', 'JURÍDICO', 'Jurídico 1', 'Analista Jurídico'),
        ('juridico2', 'JURÍDICO', 'Jurídico 2', 'Analista Jurídico'),
        ('ti1', 'TI', 'TI 1', 'Analista de TI'),
        ('ti2', 'TI', 'Analista de TI'),
        ('financeiro1', 'FINANCEIRO', 'Financeiro 1', 'Analista Financeiro'),
        ('financeiro2', 'FINANCEIRO', 'Financeiro 2', 'Analista Financeiro'),
        ('system', 'PROTOCOLO', 'Sistema', 'Sistema')
    `)
  }
}

function query(text, params) {
  return pool.query(text, params)
}

module.exports = { pool, query, initDb }
