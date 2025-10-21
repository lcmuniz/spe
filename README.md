# SPE (com.eficaztech.spe)

Sistema de Processo Eletrônico

## Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

## API (mock) com Postgres

- Localização: `api/`
- Dependências: `pg`, `dotenv` já adicionadas no `api/package.json`.
- Execução:
  - `cd api`
  - `npm install`
  - `npm start` (sobe em `http://localhost:3001`)
- A aplicação frontend usa `baseURL` `http://localhost:3001/api` (ver `src/boot/axios.js`).

### Configuração do banco

Crie um arquivo `.env` dentro de `api/` com uma das opções abaixo:

- Opção 1 (conexão única):
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/spe
```

- Opção 2 (variáveis PG*):
```
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=spe
```

### Inicialização automática do schema

Ao iniciar o servidor, o schema é criado automaticamente (função `initDb()`):
- `processos`: metadados do processo (assunto, nível de acesso, setor atual, etc.)
- `documentos`: metadados e conteúdo (editor/upload)
- `processo_documentos`: relação N:N entre processos e documentos
- `processo_partes`: interessados/partes do processo
- `tramites`: histórico de tramitação (origem/destino)

Não há migrações manuais neste mock; o schema básico é criado caso não exista.
