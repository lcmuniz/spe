# SPE — Sistema de Processos Eletrônicos (MVP — Q1)

**Versão:** 1.0  
**Data:** 18/10/2025  
**Autor:** Analista de Software Sênior  
**Fase:** Q1 — MVP (Primeira Versão Funcional)

---

## 1. Objetivo do MVP
O **MVP (Minimum Viable Product)** do Sistema de Processos Eletrônicos (SPE) visa disponibilizar um conjunto mínimo de funcionalidades que permita:
- Protocolar processos e documentos eletrônicos.  
- Tramitar processos entre setores.  
- Atribuir processos a servidores.  
- Incluir e assinar documentos.  
- Consultar processos (internamente e externamente).  
- Controlar o sigilo de processos e documentos.  

A versão MVP deve ser funcional, segura e escalável, servindo de base para os módulos futuros (como workflows, relatórios avançados, automações e integrações externas).

---

## 2. Escopo do MVP

### 2.1 Funcionalidades Incluídas
| Módulo | Funcionalidades | Descrição |
|---|---|---|
| **Autenticação e Perfis** | Login via **Keycloak**, controle de papéis e níveis de acesso | Integração com Realm SPE, perfis internos (Protocolo, Servidor, Gestor) e externos (Cidadão, Advogado). |
| **Protocolo Eletrônico** | Criação de processo e anexação de documentos iniciais | Geração automática de número do processo (NUP), registro de metadados e emissão de comprovante. |
| **Documentos** | Criação, upload e assinatura eletrônica simples | Editor de texto e upload (PDF, DOCX, JPG); assinatura autenticada via Keycloak. |
| **Tramitação** | Envio de processo entre setores, aceite e histórico | Setores podem enviar, receber e visualizar o histórico completo de trâmites. |
| **Atribuição** | Designação de processo a servidor específico | Gestores podem atribuir tarefas a servidores da unidade. |
| **Consulta Interna** | Caixa de trabalho por setor e por usuário | Listagem com filtros (status, assunto, nível de acesso, prioridade). |
| **Consulta Externa** | Portal público e acompanhamento por chave | Cidadãos/advogados podem consultar processos públicos ou em que são partes. |
| **Sigilo** | Controle de visibilidade (Público, Restrito, Sigiloso) | Registra base legal, controla acesso e audita visualizações. |
| **Auditoria** | Registro de ações | Todas as ações sensíveis são registradas (criação, tramitação, visualização sigilosa). |

### 2.2 Funcionalidades Fora do Escopo (próximas fases)
- Assinatura ICP-Brasil.  
- Workflows configuráveis.  
- Relatórios gerenciais e painéis de produtividade.  
- Integrações externas (SEI, barramento, e-mail, SMS).  
- Classificação e tabela de temporalidade documental.

---

## 3. Arquitetura e Componentes

### 3.1 Visão Geral
- **Frontend:** Vue 3 + Quasar Framework (SPA) — interface administrativa e portal externo.  
- **Backend:** Spring Boot 3 (Java 21) — serviços RESTful.
- **Banco de Dados:** PostgreSQL 15 — persistência relacional.  
- **Armazenamento de Arquivos:** S3 (ou MinIO local).  
- **Autenticação:** Keycloak (OIDC).  
- **Infraestrutura:** Docker Compose (Dev/Homolog) — migração futura para EKS.  

### 3.2 Módulos de Backend
| Módulo | Responsabilidade |
|---|---|
| **processos-service** | CRUD de processos, tramitação e histórico |
| **documentos-service** | CRUD de documentos, anexos e assinaturas |
| **partes-service** | Cadastro e vínculo de partes |
| **auth-service (Keycloak)** | Integração, roles e claims |
| **notificacoes-service** | Envio de mensagens internas e logs |

---

## 4. Requisitos Funcionais Detalhados (MVP)

### 4.1 Protocolo de Processo
- Criar processo com: assunto, interessado, nível de acesso, tipo, observações.  
- Upload de documentos iniciais (PDF, DOCX).  
- Número do processo: NUP configurável.  
- Emissão de comprovante (com QR Code e hash SHA-256).  

### 4.2 Gestão de Documentos
- Criar documento com editor Rich Text.  
- Upload de anexos (tamanho máx. 20 MB por arquivo).  
- Assinatura eletrônica simples autenticada (usuário Keycloak).  
- Travar edição após assinatura.  
- Metadados: tipo, autor, data, hash, nível de acesso.  

### 4.3 Tramitação
- Enviar processo a outro setor.  
- Registrar motivo, prioridade e prazo.  
- Setor destinatário deve aceitar ou recusar com justificativa.  
- Histórico registra todas as movimentações.  
- Processo pode ser devolvido.  

### 4.4 Atribuição a Servidores
- Gestor atribui processo a servidor da unidade.  
- Servidor recebe notificação e passa a ter acesso.  

### 4.5 Consulta Interna
- Caixa de entrada por setor: processos recebidos, enviados, pendentes.  
- Caixa do usuário: processos atribuídos.  
- Filtros: assunto, interessado, status, prioridade, sigilo.  

### 4.6 Consulta Externa
- Cidadão consulta processo público via número, chave ou QR.  
- Exibição de: capa, andamentos e documentos públicos.  
- Autenticação opcional via Keycloak (para partes).  

### 4.7 Controle de Sigilo
- Nível de acesso: Público, Restrito, Sigiloso.  
- Base legal obrigatória para restrição.  
- Auditoria de acesso a conteúdo sigiloso.  
- Máscara de dados pessoais.  

---

## 5. Requisitos Não Funcionais (MVP)
- **Desempenho:** p95 ≤ 2s nas operações de consulta.  
- **Segurança:** validação de JWT (Keycloak JWKS).  
- **Escalabilidade:** serviços stateless.  
- **Disponibilidade:** 99,5%.  
- **Acessibilidade:** WCAG 2.1 nível AA.  
- **Logs/Auditoria:** registro estruturado (JSON) com correlação de usuário (sub, session_id).  

---

## 6. Modelagem de Dados (Simplificada)

### 6.1 Tabelas Principais
| Tabela | Campos principais |
|---|---|
| **processo** | id, numero, assunto, nivel_acesso, setor_atual_id, status, criado_em, criado_por_id |
| **documento** | id, processo_id, titulo, tipo, autor_id, nivel_acesso, hash, situacao, criado_em |
| **tramite** | id, processo_id, de_setor_id, para_setor_id, enviado_por_id, status, data_envio, data_recebimento |
| **parte** | id, tipo, nome, cpf_cnpj, contato_email |
| **processo_parte** | processo_id, parte_id, papel |
| **auditoria** | id, acao, ator_id, alvo_tipo, alvo_id, data, detalhes |

---

## 7. Papéis e Permissões (MVP)
| Papel | Ações Principais |
|---|---|
| **Administrador** | Configurar sistema, perfis, setores e parâmetros. |
| **Protocolo** | Criar processos, registrar documentos iniciais. |
| **Gestor de Setor** | Receber, distribuir e tramitar processos. |
| **Servidor** | Instruir, anexar e assinar documentos. |
| **Cidadão/Advogado** | Consultar e acompanhar processos públicos ou próprios. |

---

## 8. Fluxos Principais

### 8.1 Criação de Processo
1. Usuário acessa a tela de protocolo.  
2. Preenche dados obrigatórios.  
3. Anexa documentos.  
4. Salva → processo é criado e direcionado ao setor inicial.  

### 8.2 Tramitação
1. Gestor seleciona processo e escolhe setor destino.  
2. Define prioridade e prazo.  
3. Setor destino recebe para aceite.  
4. Histórico atualizado automaticamente.  

### 8.3 Assinatura de Documento
1. Usuário seleciona documento.  
2. Sistema solicita autenticação via Keycloak.  
3. Hash do documento é assinado e versão bloqueada.  

### 8.4 Consulta Externa
1. Cidadão acessa portal.  
2. Informa número/chave.  
3. Sistema exibe capa e andamentos públicos.  

---

## 9. Telas do MVP — Especificação Detalhada

> Padrões gerais de UI: layout responsivo (Quasar), WCAG 2.1 AA, foco visível, labels/exemplos claros, máscaras de dados sensíveis e mensagens de erro orientadas à ação.

---

### 9.1 Login (Keycloak)
**Objetivo:** Autenticar usuários internos e externos via OIDC (Keycloak) e iniciar sessão segura.

**Personas:** Servidor, Gestor, Protocolo, Administrador, Cidadão/Advogado.

**Layout/Componentes:**
- Botão **“Entrar”** → redireciona para **/auth/realms/SPE/protocol/openid-connect/auth** (PKCE no portal público).  
- Estado de carregamento (spinner) aguardando retorno do IdP.  
- Exibir nome do órgão, política de privacidade e link de **Acessar como Cidadão** (separado, client public).  

**Comportamentos:**
- Após login, validar *id_token* e *access_token*; armazenar em storage seguro (sessionStorage).  
- Renovação silenciosa de token (iframe/silent refresh ou rotate refresh tokens).  
- Logout → chamar *end_session_endpoint* e limpar storage.  

**Erros/Estados:** token expirado (401) → redirecionar para login; `forbidden (403)` → página de acesso negado com `requestId`.

**Acessibilidade:** foco inicial no botão “Entrar”, contraste AA, labels e títulos claros.

---

### 9.2 Dashboard (Caixa do Setor/Usuário)
**Objetivo:** Visualizar e agir sobre processos do setor e do usuário (atribuições).

**Filtros (top bar):** Número, Assunto, Interessado, Status (Em instrução, Aguardando, Concluso), Prioridade, Nível de Acesso, Período (criação/recebimento), Setor (quando papel permite), “Somente meus”.

**Tabela/Cartões:**
- Colunas: Nº Processo, Assunto, Interessado, Setor Atual, Atribuído a, Prioridade, Prazo/SLA, Status, Nível Acesso, Última Movimentação.  
- Ações por linha (menu): **Abrir**, **Tramitar**, **Atribuir**, **Marcar prioridade**, **Histórico**.  
- Seleção múltipla para ações em lote (Tramitar, Atribuir).  

**Indicadores:**
- Badges de **Sigilo** (Restrito/Sigiloso) e **Atraso** (SLA).  
- Contadores por aba: *Setor*, *Meus*, *Pendências de aceite*.

**Erros/Estados:** vazio (mensagem de boas-vindas), loading inicial, paginação infinita.  

**Chamadas API:** `GET /api/processos?filtros`, `POST /api/processos/{id}/atribuir`, `POST /api/processos/{id}/tramites`.

**Autorização:** Exibir/Ações condicionadas a `roles` e `claims` (`setorId`).

---

### 9.3 Protocolo de Processo
**Objetivo:** Criar/processo inicial com documentos e metadados mínimos.

**Seções e Campos:**
1. **Dados do Processo**: Assunto (auto-complete catálogo), Tipo, Nível de Acesso (radio: Público/Restrito/Sigiloso) + **Base legal** (textarea) quando ≠ Público; Observações.  
2. **Interessados/Partes**: adicionar parte (Cidadão/Advogado/Empresa/Órgão) via busca/cadastro rápido; papel (Requerente/Interessado/Representante).  
3. **Documentos Iniciais**: botão **Adicionar documento** → **Tela de Metadados do Documento** (ver 9.5) com escolha **Editor** ou **Upload**; lista dos documentos adicionados com status (rascunho/assinado).  

**Validações:** Assunto obrigatório; se Restrito/Sigiloso → Base legal obrigatória; ao menos 1 documento (configurável).  

**Ações:** **Salvar e criar** (gera número/NUP e redireciona para Visualização de Processo), **Rascunho** (opcional).  

**Chamadas API:** `POST /api/processos`, `POST /api/documentos` (metadados), `POST /api/documentos/{id}/upload|editor/conteudo`.

---

### 9.4 Visualização de Processo (Árvore + Histórico)
**Objetivo:** Exibir detalhes do processo, documentos (árvore), partes, tarefas e histórico.

**Layout:**
- **Cabeçalho/Capa**: Nº, Assunto, Nível de Acesso (badge), Setor atual, Status, Prioridade, Partes (chips), Atribuição atual.  
- **Ações principais**: **Adicionar Documento**, **Tramitar**, **Atribuir**, **Assinar pendentes**, **Exportar Capa/Histórico**.  
- **Árvore de Documentos** (coluna esquerda): ordem cronológica e hierarquia (principal/anexos); ícones de status (`rascunho`, `assinado`, `upload`, `editor`).  
- **Painel de Conteúdo** (direita): visualização do documento selecionado (PDF/preview), metadados, versões.  
- **Histórico/Andamentos** (aba): linha do tempo (criação, tramites, assinaturas, comunicações).  

**Regras:** Documento **sigiloso** visível só a quem tem permissão; tentativas negadas geram entrada de auditoria.  

**Chamadas API:** `GET /api/processos/{id}`, `GET /api/processos/{id}/historico`, `GET /api/documentos/{id}`, `GET /api/documentos/{id}/preview`.

---

### 9.5 Criação/Edição de Documento (Metadata‑First)
**Objetivo:** Adicionar documentos ao processo via **Editor** ou **Upload** após preencher metadados.

**Tela de Metadados (passo 1):**
- **Campos:** Tipo (catálogo), Título, Nível de Acesso (+ Base legal quando ≠ Público), Vínculo (principal/anexo de), Observações.  
- **Origem do Conteúdo:** **Editor** ou **Upload** (botões/cards).  
- **Ação:** **Continuar** → cria **rascunho** e abre passo 2 conforme origem.  

**Origem: Editor (passo 2A):**
- Editor WYSIWYG com **modelos** (placeholders: órgão, unidade, nº processo).  
- **Auto‑save** (10s e onBlur), **Pré‑visualizar** (gerar PDF).  
- **Assinar** (bloqueia edição e gera nova versão).  

**Origem: Upload (passo 2B):**
- *Dropzone* + seleção de arquivo; formatos permitidos; barra de progresso; hash SHA‑256.  
- Visualização (se PDF) e opção **Assinar**.  

**Estados:** `RASCUNHO` (editável), `ASSINADO` (imutável). Nova edição cria nova **versão**.

**Validações:** Título, Tipo, regras de tamanho/formatos; Base legal quando necessário.

**Chamadas API:** `POST /api/documentos` (metadados), `POST /api/documentos/{id}/editor/conteudo`, `POST /api/documentos/{id}/upload`, `POST /api/documentos/{id}/assinar`.

---

### 9.6 Tramitação
**Objetivo:** Enviar processo a outro setor, com prioridade, prazo e aceite.

**Campos/Ações:**
- **Para o Setor** (auto-complete), **Motivo**, **Prioridade** (Baixa/Média/Alta), **Prazo** (data).  
- **Atribuir a** (opcional, usuário do setor destino).  
- **Enviar** → status no destino: **Pendente de recebimento**.  
- **Receber**/**Recusar** no setor destino (com justificativa).  

**Regras:** Bloquear tramitação se houver assinaturas obrigatórias pendentes.  

**Chamadas API:** `POST /api/processos/{id}/tramites`, `PATCH /api/tramites/{id}/aceitar|recusar`.

---

### 9.7 Consulta Externa
**Objetivo:** Permitir a qualquer cidadão/advogado consultar processos públicos (ou próprios autenticado).

**Campos:** Número do processo **ou** Chave/QR.  

**Resultados:**
- **Capa pública**: Nº, Assunto, Situação, Andamentos públicos, Documentos públicos (download).  
- Se autenticado e parte: acesso a itens restritos permitidos.  

**Erros/Estados:** não encontrado; restrito; captcha (opcional).  

**Chamadas API:** `GET /api/public/consultas/{chave|numero}`.

---

### 9.8 Administração (Setores e Usuários)
**Objetivo:** Manter estrutura organizacional e vínculos de usuários a setores (fonte de verdade no Keycloak + atributos).

**Seções:**
- **Setores/Unidades**: CRUD (nome, sigla, parent), status (ativo), id externo; ordenação hierárquica.  
- **Usuários**: listagem (nome, e-mail, `username`), **vínculo ao Setor** (claim `setorId`) e **papéis** (realm/client roles) — operação preferencial via Keycloak; na UI, apenas **visualização** e atalhos para o console do IdP.  

**Regras:** Alteração de papéis deve ocorrer no Keycloak; a UI exibe e sincroniza *claims* consumidos pela API.

**Chamadas API:** `GET /api/admin/setores`, `POST/PUT /api/admin/setores`, `GET /api/admin/usuarios` (somente leitura de papéis/claims provenientes do token/IdP).

## 10. Critérios de Aceite (exemplos)
 Critérios de Aceite (exemplos)
```gherkin
Funcionalidade: Criação de Processo
  Cenário: Protocolo bem-sucedido
    Dado que o usuário do papel Protocolo está autenticado
    Quando ele cria um processo com assunto e documento anexo
    Então o sistema deve gerar um número de processo e registrar o histórico inicial

Funcionalidade: Tramitação
  Cenário: Envio de processo a outro setor
    Dado um processo ativo no setor A
    Quando o gestor tramita o processo para o setor B
    Então o processo deve aparecer na caixa do setor B como pendente de aceite

Funcionalidade: Consulta Externa
  Cenário: Acompanhamento público
    Dado um processo com nível de acesso público
    Quando o cidadão informa o número do processo
    Então o sistema deve exibir a capa e documentos públicos
```

---

## 11. Infraestrutura e Deploy (MVP)
- **Docker Compose** com serviços: api, db, keycloak, frontend, storage.  
- **Banco:** migrações via Flyway.  
- **Logs:** agregados via Loki ou ELK.  
- **Backups:** automáticos (diários).  
- **CI/CD:** GitHub Actions — build/test/deploy automático.

---

## 12. Roadmap Pós-MVP (Q2–Q3)
- Workflows configuráveis e automações.  
- Relatórios gerenciais.  
- Integração com SEI.  
- Assinatura ICP-Brasil.  
- Painéis de produtividade e SLA.

---

**Conclusão:** O MVP do SPE entrega a base essencial do sistema de processos eletrônicos, permitindo a tramitação e o gerenciamento seguro de processos digitais dentro do órgão público, com autenticação centralizada via Keycloak e arquitetura escalável pronta para futuras expansões.

