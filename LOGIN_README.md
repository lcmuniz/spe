# SPE - Sistema de Processos Eletrônicos

## Funcionalidade de Login Implementada

### Configuração do Keycloak

A aplicação está configurada para usar o Keycloak como provedor de autenticação. As configurações atuais são:

- **URL do Keycloak**: https://keycloak.eficaz.online
- **Realm**: eficaz
- **Client ID**: spe

### Configuração Necessária no Keycloak

Para que o login funcione corretamente, é necessário criar e configurar o cliente no Keycloak:

#### 1. Criar o Cliente

No admin console do Keycloak (realm), criar um cliente com as seguintes configurações:

```
Client ID: spe
Client Type: OpenID Connect
Standard Flow Enabled: ON
Direct Access Grants Enabled: OFF
```

#### 2. Configurar URLs

Nas configurações do cliente, definir:

```
Valid Redirect URIs:
- http://localhost:9000/*
- https://spe.eficaz.online/*

Valid Post Logout Redirect URIs:
- http://localhost:9000/*
- https://spe.eficaz.online/*

Web Origins:
- http://localhost:9000
- https://spe.eficaz.onlie
```

#### 3. Configurar Roles

Criar as seguintes roles no realm:

- `admin` ou `administrador`
- `servidor`
- `gestor`
- `protocolo`
- `cidadao`
- `advogado`

#### 4. Configurar Atributos do Usuário (Opcional)

Para funcionalidades avançadas, pode-se configurar:

- `setorId`: ID do setor do usuário
- `nivelAcessoMax`: Nível máximo de acesso
- `cargo`: Cargo do usuário

### Estrutura Implementada

#### Páginas

1. **LoginPage** (`/login`): Página de login que redireciona para o Keycloak
2. **IndexPage** (`/`): Página inicial com boas-vindas (protegida)

#### Funcionalidades

- ✅ Redirecionamento automático para login quando não autenticado
- ✅ Integração com Keycloak via OIDC
- ✅ Renovação automática de tokens
- ✅ Logout seguro
- ✅ Proteção de rotas
- ✅ Menu lateral com navegação
- ✅ Informações do usuário no cabeçalho
- ✅ Roles e permissões básicas

#### Stores

- **auth-store**: Gerencia estado de autenticação, usuário logado e permissões

#### Boot Files

- **keycloak**: Inicializa e configura a integração com Keycloak

### Como Testar

1. Acesse http://localhost:9000
2. Será redirecionado automaticamente para a página de login
3. Clique em "Entrar com Keycloak" para ser redirecionado ao Keycloak
4. Após login bem-sucedido, retornará à página inicial
5. Use o botão de logout no cabeçalho para sair

### Próximos Passos

- Implementar páginas de funcionalidades específicas
- Configurar perfis de usuário mais detalhados
- Implementar consulta externa pública
- Adicionar funcionalidades de protocolo e tramitação

### Observações Técnicas

- A aplicação usa PKCE para segurança adicional
- Tokens são renovados automaticamente a cada minuto
- Silent SSO está configurado para melhor UX
- O estado de autenticação é gerenciado via Pinia

### Configuração de Desenvolvimento

Para desenvolvimento local, certifique-se de que:

1. O Keycloak está acessível em https://keycloak.eficaz.onlie
2. O cliente `spe` está configurado
3. Os usuários têm as roles apropriadas
4. As URLs de callback estão permitidas
