# SPE — Sistema de Processos Eletrônicos (Orientado a Documentos)

**Versão:** 1.0  
**Data:** 18/10/2025  
**Autor:** Analista de Software Sênior  

---

## 1. Visão Geral
O SPE é um sistema orientado a documentos para gestão de processos administrativos/eletrônicos em órgãos públicos. Seu objetivo é permitir **protocolo eletrônico**, **produção/gestão de documentos**, **tramitação entre setores**, **comunicação com as partes**, **controle de sigilo** e **acesso externo do cidadão** com **rastreabilidade** e **conformidade legal**.

### 1.1 Objetivos
- Padronizar o ciclo de vida de processos e documentos eletrônicos.  
- Eliminar papel e filas, garantindo autenticidade, integridade e tempestividade.  
- Prover caixa de trabalho por setor/usuário para tramitações e tarefas.  
- Permitir assinatura eletrônica e controle de versões.  
- Garantir publicidade/segredo conforme nível de acesso e LGPD.  
- Disponibilizar **consulta externa** para acompanhamento por cidadãos e advogados.

### 1.2 Escopo (MVP + Extensões)
- **MVP:** Protocolo eletrônico; criação de processo; inclusão/edição/assinatura de documentos; tramitação entre setores; comunicação com partes; consulta externa; histórico completo; controle de sigilo; perfis de acesso; notificação.  
- **Extensões (roadmap):** Integração com barramento de serviços; carimbo de tempo ICP; classificação e tabela de temporalidade; automações de workflow; API pública; integração com peticionamento eletrônico e OTRS/SCGE/Ouvidoria.

### 1.3 Stakeholders
- **Administradores do Sistema** (configuração, segurança).  
- **Gestores de Protocolo** (protocolo, recebimentos, numeração, distribuição).  
- **Servidores de Setor** (instrução processual, trâmite, produção documental).  
- **Gestores de Unidade/Setor** (atribuição e supervisão).  
- **Partes Externas**: Cidadãos, Advogados, Empresas, Órgãos parceiros.  
- **Auditoria/Corregedoria** (trilhas, relatórios).  
- **TI** (operação, integração, backup, monitoração).

### 1.4 Definições/Termos
- **Processo**: conjunto ordenado de documentos e metadados.  
- **Documento**: registro eletrônico (nato-digital ou digitalizado) com metadados.  
- **Tramitação**: movimento entre setores/unidades.  
- **Parte**: interessado vinculado ao processo (Cidadão, Advogado, Órgão etc.).  
- **Nível de Acesso**: Público, Restrito, Sigiloso (com subníveis).  
- **Setor/Unidade**: agrupamento organizacional com caixa de trabalho.

---

## 2. Requisitos Funcionais

### 2.1 Autenticação & Autorização
- **RF-001** Autenticação via **Keycloak** (OIDC): usuários internos (SSO corporativo via *Identity Brokering*/LDAP) e público externo (cadastro próprio ou IdPs federados).  
- **RF-002** Papéis e perfis definidos como **Realm Roles** e **Client Roles** do Keycloak: *Administrador, Protocolo, Servidor, Gestor de Setor, Auditor, Cidadão, Advogado*. Grupos de lotação (Unidade/Setor) como **Groups** com *attributes* (sigla, idSetor).  
- **RF-003** Autorização mista **RBAC + ABAC**: RBAC por *roles* do token; ABAC por *claims* (ex.: `setorId`, `nivelAcessoMax`, `cargo`) emitidos por **Protocol Mappers**.  
- **RF-004** Políticas de **Nível de Acesso** (Público/Restrito/Sigiloso) aplicadas no backend com base em *claims*; perfis de **quebra de sigilo** exigem *role* dedicada e justificativa registrada.  
- **RF-005** **Keycloak Authorization Services (UMA 2.0)** opcional para proteger **recursos** (processo/documento) com **policies** (função, setor, hierarquia, motivo).  
- **RF-006** Suporte a **MFA** e **step‑up** via Keycloak; **PKCE** obrigatório para *public clients* (SPA/portal externo).  
- **RF-007** Padrões de sessão e tokens: `access_token` (5–15 min), `refresh_token` (até 8h), *offline token* (administradores) — valores parametrizáveis no Realm.  

### 2.2 Protocolo Eletrônico
- **RF-010** Criar **Processo**: número único (NUP ou padrão institucional), assunto, classificação, interessado(s), nível de acesso, setor inicial, observações.  
- **RF-011** **Protocolo de Petição** (externo): recebimento de requerimentos e peças iniciais; emissão de **comprovante** com hash e data/hora.  
- **RF-012** Anexar documentos digitais (PDF preferencial, suportar outros formatos configuráveis).  
- **RF-013** Validação de integridade (hash SHA-256) e antivírus.  
- **RF-014** Regras de tamanho/quantidade configuráveis.  
- **RF-015** Comprovante/recibo com QR Code para consulta pública.

### 2.3 Gestão de Processos (Caixas, Pesquisas, Árvores)
- **RF-020** **Caixa do Setor**: listar processos do setor com filtros (status, prazo, prioridade, interessado, assunto, nível de acesso).  
- **RF-021** **Caixa do Usuário**: meus processos/tarefas atribuídas.  
- **RF-022** Visualização do processo (painel): metadados, **árvore de documentos**, partes, andamentos, prazos, marcações.  
- **RF-023** **Histórico de Tramitação** completo (quem, quando, de/para, motivo, despacho).  
- **RF-024** Pesquisa avançada por metadados e full-text (se habilitado).  
- **RF-025** Exportação de capa, relação de documentos e histórico (PDF/CSV).

### 2.4 Documentos (Criação, Edição, Assinaturas)
- **RF-030** Modelos/templatização de documentos (ofícios, despachos, relatórios).  
- **RF-031** Edição no navegador (rich text) e upload de **nato-digital**.  
- **RF-032** **Assinatura eletrônica** (tipos configuráveis: ICP-Brasil, assinatura avançada, assinatura simples autenticada).  
- **RF-033** Controle de versões e **trava de edição** (checkout).  
- **RF-034** Vinculação entre documentos (principal/anexo, juntada) e ordem na árvore.  
- **RF-035** Metadados essenciais: tipo, autor, data, hash, nível de acesso, classificação.

### 2.5 Tramitação entre Setores e Atribuição a Servidores
- **RF-040** **Tramitar** processo para outro setor com motivo, prioridade e prazo.  
- **RF-041** **Distribuição/Atribuição** a servidor(es) do setor recebedor.  
- **RF-042** Aceite/recusa de recebimento (com justificativa).  
- **RF-043** Reencaminhamento, devolução ao setor anterior e tramitação paralela (cópia para ciência).  
- **RF-044** Flag de **urgência** e SLA configurável por assunto/tipo.  
- **RF-045** Diplanar tarefas: *Analisar, Emitir Despacho, Juntar Documento, Notificar Parte*.

### 2.6 Partes e Representantes
- **RF-050** Cadastro de **Partes**: *Cidadão, Advogado, Empresa, Órgão/Unidade, Servidor, Procurador, Defensor*.  
- **RF-051** Vínculo processo–parte (papel: Requerente, Interessado, Representante, Autoridade, Testemunha etc.).  
- **RF-052** Validação de OAB (advogado) e CPF/CNPJ (módulo de validação).  
- **RF-053** Procuradores/representantes com **procuração** digital anexada e validade.

### 2.7 Comunicação com as Partes
- **RF-060** **Intimações/Notificações** eletrônicas com comprovação de envio/ciência.  
- **RF-061** Painel do cidadão/advogado: visualizar processos em que é parte; enviar petições e documentos.  
- **RF-062** Configurar canais: e-mail, portal, *push*, SMS (opcional).  
- **RF-063** Registro de tentativas e prazos legais (contagem de prazo).  
- **RF-064** Mensageria interna (comentários, menções) com controle de sigilo.

### 2.8 Controle de Sigilo e Acesso
- **RF-070** Marcação de nível de acesso no **processo** e no **documento** (pode herdar do processo ou ser mais restritivo).  
- **RF-071** Justificativa e base legal obrigatória para sigilo/restrição.  
- **RF-072** Trilhas de auditoria de **toda visualização** de item sigiloso.  
- **RF-073** Perfis com **quebra de sigilo** (sob registro, motivo e dupla confirmação).  
- **RF-074** Máscara de dados pessoais (campos sensíveis conforme LGPD) na visão pública.

### 2.9 Consulta Externa (Público)
- **RF-080** Página de consulta com número do processo, protocolo, QR Code ou chave de acompanhamento.  
- **RF-081** Exibir somente o que for **público** ou ao **interessado** autenticado.  
- **RF-082** Possibilidade de anexar documentos/petições quando habilitado.  
- **RF-083** Acessibilidade (WCAG 2.1 AA), linguagem simples, responsividade.

### 2.10 Relatórios e Painéis
- **RF-090** Painel gerencial por setor: volumes, tempos médios, SLAs, gargalos.  
- **RF-091** Relatórios de produtividade por servidor e por tipo de processo.  
- **RF-092** Exportações (CSV/XLSX/PDF) com filtros e agregações.  
- **RF-093** Relatórios de auditoria (acessos, alterações, quebras de sigilo, assinaturas).

### 2.11 Administração & Configurações
- **RF-100** Estrutura organizacional (órgão → unidade → setor), lotações e substituições.  
- **RF-101** Tabelas: tipos de processo, tipos de documento, assuntos, modelos.  
- **RF-102** **Workflows** configuráveis por tipo de processo (etapas, regras, SLAs).  
- **RF-103** Parâmetros: tamanhos de arquivos, formatos, políticas de assinatura.  
- **RF-104** Gestão de perfis, papéis e políticas de acesso.  
- **RF-105** Importação/migração (CSV/JSON) e *bulk* de documentos (digitalização).

---

## 3. Requisitos Não Funcionais

### 3.1 Segurança & Conformidades
- **RNF-001** Autenticação/SSO exclusivamente via **Keycloak** (TLS 1.2+), *well-known OIDC* e **JWKS** para validação offline dos tokens.  
- **RNF-002** Criptografia em trânsito (TLS) e em repouso; segredos via cofre.  
- **RNF-003** LGPD: minimização de dados no token (somente *claims* necessários); mascaramento no frontend; auditoria de acesso a dados pessoais.  
- **RNF-004** Auditoria encadeada e registro de **motivo** para acesso a itens sigilosos; correlação com `sub`/`sid` do token.  
- **RNF-005** Conformidade com políticas de **Assinatura Eletrônica**; integração com provedores ICP quando exigido.  

### 3.2 Desempenho & Escalabilidade
- **RNF-010** Tempo de resposta p95 ≤ 1,5s nas operações comuns de consulta e listagem.  
- **RNF-011** Suportar **concorrência**: 3 mil usuários internos; 20 mil acessos/dia externos (parâmetros).  
- **RNF-012** Escalabilidade horizontal dos serviços (stateless) e do armazenamento de documentos (S3/Blob).  

### 3.3 Disponibilidade & Operação
- **RNF-020** Disponibilidade alvo: 99,5% (MVP); 99,9% (futuro).  
- **RNF-021** Backups automáticos (RPO ≤ 24h; RTO ≤ 4h).  
- **RNF-022** Observabilidade: logs estruturados, métricas (APM), *tracing* distribuído.  

### 3.4 Usabilidade & Acessibilidade
- **RNF-030** WCAG 2.1 AA; i18n/pt-BR; *responsive first*.  
- **RNF-031** Padrões de UI consistentes, ajuda contextual, mensagens claras.

### 3.5 Interoperabilidade & Padrões
- **RNF-040** APIs REST/JSON (OpenAPI 3.0); *webhooks* para eventos.  
- **RNF-041** Metadados compatíveis com e-ARQ Brasil/TTD (quando aplicável).  
- **RNF-042** Padrões de numeração (NUP) e *naming* configuráveis.

---

## 4. Modelo de Domínio (alto nível)
**Entidades principais:**
- **Processo** (id, número, assunto, classificação, nível de acesso, setor atual, status, data de criação, origem, hash da capa).  
- **Documento** (id, tipo, título, versão, autor, hash, nível de acesso, data, situação: rascunho/assinado).  
- **Tramite** (id, processoId, deSetor, paraSetor, responsável, dataEnvio, dataRecebimento, status, motivo, prazo, prioridade).  
- **Parte** (id, tipo: cidadão/advogado/empresa/órgão, identificação, contatos).  
- **Vínculo Processo–Parte** (papel, início/fim, procuração, escopo).  
- **Tarefa** (id, processoId, tipo, atribuídaA, status, SLA, datas).  
- **Setor/Unidade** (id, nome, sigla, hierarquia).  
- **Usuário/Lotação** (id, dados pessoais, vínculos, papéis).  
- **Assinatura** (id, documentoId, signatário, tipo, certificado, carimboTempo, hashAssinado).  
- **Anexo/Arquivo** (id, documentoId, nome, mimeType, tamanho, uriArmazenamento).  
- **Auditoria** (id, ator, ação, alvo, data, ip, detalhes, hashEncadeado).

**Estados de Processo (exemplo):** *Em instrução, Em análise, Aguardando manifestação, Em diligência, Concluso, Arquivado.*  
**Estados de Documento:** *Rascunho, Em revisão, Assinado, Cancelado.*

---

## 5. Fluxos Principais

### 5.1 Criação e Protocolo de Processo
1) Usuário (interno ou externo) preenche dados mínimos e anexa documentos.  
2) Sistema valida metadados, gera **número** e recibo (hash + QR).  
3) Processo é direcionado ao **setor inicial** e entra na **caixa** do setor.

### 5.2 Produção e Assinatura de Documento
1) Criar documento (modelo) → editar → salvar.  
2) Submeter à assinatura (um ou múltiplos signatários).  
3) Registrar assinaturas e travar versão; publicar conforme nível de acesso.

### 5.3 Tramitação entre Setores
1) Solicitar tramitação com motivo, prioridade e prazo; opcionalmente atribuir servidor.  
2) Setor destino recebe; **aceita** (entra na caixa) ou **recusa** (retorna com justificativa).  
3) Histórico e SLA atualizados; notificações enviadas; tarefas criadas.

### 5.4 Comunicação com Partes
1) Selecionar parte(s) e tipo de comunicação (notificação, intimação, pedido de complementação).  
2) Enviar; registrar comprovação e prazo de resposta.  
3) Parte externa responde pelo portal; peça é juntada ao processo.

### 5.5 Consulta Externa
1) Cidadão/advogado acessa portal de consulta.  
2) Informa número/chave/QR; visualiza **andamentos e documentos públicos**.  
3) Se autenticado e parte, acessa conteúdo restrito permitido.

---

## 6. Telas (MVP)

### 6.1 Login/SSO
- Interno (SSO/OIDC). Externo (cadastro simples + confirmação por e-mail).  

### 6.2 Caixa do Setor
- Filtros: status, prazo, prioridade, assunto, interessado, nível de acesso.  
- Ações em lote: atribuir, tramitar, marcar prioridade.  

### 6.3 Visualização de Processo
- **Capa** (metadados, partes, responsáveis, prazos).  
- **Árvore de Documentos** com ordenação, versão, tipo e situação.  
- **Histórico de Tramitações** (linha do tempo).  
- **Tarefas/SLA** e **Comunicações**.  
- Botões: *Criar documento*, *Anexar*, *Assinar*, *Tramitar*, *Notificar Parte*.

### 6.4 Edição/Assinatura de Documento
- Editor rich text, junção de anexos, visualização de hash e metadados.  
- Fluxo de coleta de assinatura (ordem, múltiplos).  

### 6.5 Gestão de Partes
- CRUD de partes e representantes; verificação de CPF/CNPJ/OAB.  

### 6.6 Consulta Externa
- Campo de busca; exibição de andamentos; download de documentos **públicos**.  
- Peticionamento/Complementação (quando habilitado).  

### 6.7 Administração
- Estrutura organizacional, usuários/lotação, perfis, níveis de acesso.  
- Catálogos: tipos de processo/documento, assuntos, modelos.  
- Workflows, SLAs, notificações, integrações.

---

## 7. Regras de Negócio (exemplos)
- **RN-01** Documento **assinado** torna-se **imutável** (somente nova versão).  
- **RN-02** Documento mais restrito **sobrepõe** nível de acesso do processo.  
- **RN-03** Tramitação só é possível se não houver **assinaturas pendentes** obrigatórias.  
- **RN-04** Toda visualização de item **sigiloso** gera evento de auditoria com motivo.  
- **RN-05** Distribuição **automática** pode seguir regra: round-robin, carga, prioridade, habilidade.  
- **RN-06** Prazo processual: contagem útil (configurável) e alertas antes do vencimento.  
- **RN-07** Partes externas enxergam somente conteúdo **público** ou autorizado por **vínculo**.

---

## 8. Integrações (opcionais / roadmap)
- **Keycloak** (IdP/IAM) — já adotado como serviço central de identidade e autorização.  
- **Assinatura ICP-Brasil** via provedor/carimbo de tempo.  
- **NUP** (serviço interno).  
- **Antivírus** (ICAP/ClamAV).  
- **E-mail/SMS** transacional.  
- **Barramento** (webhooks) para eventos: *processo_criado, documento_assinado, tramite_realizado*.

---

## 9. API (esboço OpenAPI — rotas principais)
```
POST   /api/processos                      # cria processo
GET    /api/processos?filtros              # lista/caixa
GET    /api/processos/{id}                 # detalhes + árvore
POST   /api/processos/{id}/tramites        # tramitar
POST   /api/processos/{id}/atribuir        # atribuição a servidor
POST   /api/processos/{id}/partes          # vincular parte
POST   /api/processos/{id}/comunicacoes    # notificar/intimar
POST   /api/documentos                     # criar
PUT    /api/documentos/{id}                # editar (rascunho)
POST   /api/documentos/{id}/assinar        # coletar assinatura
POST   /api/documentos/{id}/anexos         # anexar arquivo
GET    /api/public/consultas/{chave}       # consulta externa
```
**Segurança (Keycloak/OIDC):**
- `Authorization: Bearer <access_token>` em todas as rotas internas; *scopes* e *roles* verificados por **token claims** (`realm_access`, `resource_access`, `roles`, `setorId`).  
- *Error model* para authz: `401` (token inválido/expirado), `403` (sem *role* ou *policy*), com `correlationId` e `authzReason` (quando possível).  
- *Idempotency-Key* em POST críticos; ETag/If-Match; *rate limiting* por *clientId/subject*.  

---

## 10. Modelo de Dados (tabelas principais — sugestão)
- **processo**(id, numero, assunto_id, classificacao_id, nivel_acesso, setor_atual_id, status, criado_em, criado_por_id, origem, hash_capa).  
- **documento**(id, processo_id, tipo_id, titulo, versao, autor_id, nivel_acesso, situacao, criado_em, hash, arquivo_uri).  
- **tramite**(id, processo_id, de_setor_id, para_setor_id, enviado_por_id, enviado_em, recebido_por_id, recebido_em, status, motivo, prazo_em, prioridade).  
- **parte**(id, tipo, nome, cpf_cnpj, oab, contato_email, contato_tel).  
- **processo_parte**(id, processo_id, parte_id, papel, inicio, fim, procuração_uri).  
- **tarefa**(id, processo_id, tipo, atribuida_a_id, status, sla_em, criada_em, concluida_em).  
- **assinatura**(id, documento_id, signatario_id, tipo, certificado_dn, carimbo_tempo, hash_assinado, assinado_em).  
- **auditoria**(id, ator_id, acao, alvo_tipo, alvo_id, data, ip, detalhes, hash_encadeado, prev_hash).

Índices por número, setor, status, prazo, full-text (opcional) em título/assunto.

---

## 11. Papéis & Matriz de Permissões (exemplo)
> **Origem dos papéis:** mantidos no **Keycloak** (Realm/Client Roles) e sincronizados no token. A autorização no backend combina **roles** + **claims** (setor/lotação, nível de acesso).  

| Papel | Processos | Documentos | Tramitar | Partes | Administração |
|---|---|---|---|---|---|
| Administrador | R/W | R/W | R/W | R/W | Total (realm role `admin`) |
| Protocolo | Criar, Distribuir | Juntar iniciais | Enviar a setores | Cadastrar interessados | Catálogos básicos |
| Gestor de Setor | Ler do setor, Atribuir | Aprovar/Assinar | Autorizar | Vincular | Gerir equipe/lotação |
| Servidor | Ler/Editar do setor | Criar/Editar/Assinar | Solicitar | Consultar | — |
| Auditor | Ler (incl. restrito c/ autorização) | Ler | Ler | Ler | Relatórios |
| Cidadão/Advogado | Ler (público ou seus processos) | Anexar quando permitido | — | Manter seus dados | — |

**Notas:**  
- Grupos do Keycloak representam **Unidade/Setor**; *attributes* de grupo alimentam **claims** (`setorId`, `siglaSetor`).  
- Policies avançadas (opcional UMA) podem exigir *role* + vínculo de setor + motivo logado para acesso sigiloso.

---|---|---|---|---|---|
| Administrador | R/W | R/W | R/W | R/W | Total |
| Protocolo | Criar, Distribuir | Juntar iniciais | Enviar a setores | Cadastrar interessados | Catálogos básicos |
| Gestor de Setor | Ler do setor, Atribuir | Aprovar/Assinar | Autorizar | Vincular | Gerir equipe/lotação |
| Servidor | Ler/Editar do setor | Criar/Editar/Assinar | Solicitar | Consultar | — |
| Auditor | Ler (inclusive restrito c/ autorização) | Ler | Ler | Ler | Relatórios |
| Cidadão/Advogado | Ler (público ou seus processos) | Anexar quando permitido | — | Manter seus dados | — |

Obs.: Acesso condicionado por **nível de acesso** e **vínculo**.

---

## 12. Critérios de Aceite (BDD — exemplos)

```gherkin
# language: pt
Funcionalidade: Tramitação entre setores
  Cenário: Tramitar processo com prazo e prioridade
    Dado que existe um processo no Setor A
    E eu sou gestor do Setor A
    Quando eu tramito o processo para o Setor B com prioridade "Alta" e prazo de 5 dias
    Então o processo deve aparecer na caixa do Setor B como "Pendente de recebimento"
    E o histórico deve registrar o envio com data/hora e usuário

Funcionalidade: Controle de sigilo
  Cenário: Documento sigiloso herda restrição sobre processo público
    Dado um processo com nível de acesso "Público"
    E um documento do processo marcado como "Sigiloso" com base legal
    Quando um usuário sem permissão tenta visualizar o documento
    Então o sistema deve negar acesso e registrar evento de auditoria

Funcionalidade: Consulta externa
  Cenário: Cidadão consulta processo com chave
    Dado um processo público com chave de acompanhamento "ABC-123"
    Quando o cidadão acessa a consulta externa e informa a chave
    Então o sistema exibe os andamentos e documentos públicos do processo
```

---

## 13. Arquitetura de Alto Nível (sugestão)
- **Frontend** SPA (Vue/React/Quasar) + Portal Externo (público) — *public client* OIDC com **PKCE** integrado ao Keycloak.  
- **Keycloak (IAM/IdP)**: Realm SPE; *clients* `spe-api` (confidential), `spe-portal` (public), `spe-admin` (confidential); *brokers* (LDAP/AD, eGov, etc.); **Authorization Services** (opcional).  
- **API Gateway**: validação de JWT (JWKS), *introspection* (quando necessário), *rate limit* por `clientId`/`sub`, *audit headers*.  
- **Serviços**: *processos*, *documentos*, *tramites*, *partes*, *notificacoes*, *assinaturas*, *pesquisa* — todos validam **roles/claims** do token.  
- **Armazenamento**: PostgreSQL; documentos em S3/Blob cifrado.  
- **Mensageria**: fila para notificações/webhooks.  
- **Observabilidade**: logs (correlacionar `sub`, `session_state`), métricas e *tracing*.

---

## 14. Requisitos de Implantação
- **Keycloak**: provisionar **Realm SPE**, *clients* (`spe-api` confidential com *client secret*; `spe-portal` public com **PKCE**), **roles** (realm/client), **groups** (estrutura org.), *protocol mappers* (claims: `setorId`, `nivelAcessoMax`, `cargo`), políticas de senha/MFA, *themes* (opcional).  
- **Ambientes**: Dev/Homolog/Prod com *realms* separados ou *environments*; *secrets* armazenados no cofre.  
- **API**: bibliotecas padrão OIDC para validação de JWT (caching de JWKS), *auditor* de *claims* e extração de `sub`, `preferred_username`, `setorId`.  
- Pipeline CI/CD com testes, SAST/DAST; Infra as Code.  
- Políticas de retenção; migração de usuários (LDAP/CSV) via *User Federation*.

---

## 15. Riscos & Assunções
- Assinatura ICP pode exigir *HSM* ou provedor externo.  
- Carga de anexos grandes requer *chunk upload* e *virus scan* assíncrono.  
- Migração de acervo legado depende de mapeamento e saneamento de metadados.

---

## 16. Roadmap (12 meses — exemplo)
1. **Q1**: MVP (protocolo, documentos, tramitação, consulta externa, sigilo, caixas).  
2. **Q2**: Assinatura avançada/ICP, relatórios gerenciais, workflows configuráveis.  
3. **Q3**: Full-text search, webhooks, integrações externas (barramento), carimbo de tempo.  
4. **Q4**: Classificação/TTD, automações, analytics avançado, escalabilidade elástica.

---

## 17. Anexos
- Glossário ampliado (opcional).  
- Tabelas de códigos (tipos de processos/documentos).  
- Exemplos de modelos de documentos (ofício, despacho, relatório).  

> **Observação:** Este documento é um ponto de partida. Durante a descoberta com usuários finais, detalhes de regras, telas e fluxos serão refinados, priorizados e validados por meio de protótipos e cenários BDD adicionais.

