# UI de segurança para 2FA

Issue: #288

## Escopo deste slice

A Central de configurações usa o estado real `totpEnabled` retornado por `/api/user` e conecta a área **Segurança** aos endpoints MFA existentes.

### Ativação

1. usuário autenticado informa a senha atual;
2. o frontend chama `POST /api/auth/mfa/enrollment/start`;
3. os dados temporários de provisioning ficam apenas no estado do componente;
4. usuário adiciona a conta ao autenticador pelo URI de provisioning ou chave manual;
5. usuário informa o primeiro TOTP;
6. `POST /api/auth/mfa/enrollment/confirm` ativa o 2FA;
7. recovery codes são exibidos uma única vez, com ações para copiar ou salvar em arquivo local;
8. ao confirmar que guardou os códigos, a tela passa a refletir 2FA ativo.

### Desativação

1. usuário autenticado escolhe desativar;
2. informa senha atual;
3. confirma com TOTP ou recovery code;
4. `DELETE /api/auth/mfa/settings` executa a desativação forte já implementada no backend;
5. a tela passa a refletir 2FA desativado somente após sucesso da API.

## Privacidade e segurança

- enrollment token, segredo de provisioning e recovery codes não são gravados em `localStorage` ou `sessionStorage`;
- nenhum valor MFA é enviado para serviço externo;
- campos de TOTP usam `autocomplete="one-time-code"`;
- erros são anunciados com `role="alert"` e não dependem apenas de cor;
- a API continua sendo a fonte de verdade para ativação/desativação.

## Pendente antes de concluir a #288

- QR Code local para o URI `otpauth://`, sem serviço externo;
- revisão final da experiência de foco/teclado;
- E2E cobrindo ativação, login com segundo fator, recovery code e desativação.
