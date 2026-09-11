# Revisão de dependência — qrcode.react 4.2.0

Issue: #288

## Objetivo

Renderizar localmente, em SVG, o URI `otpauth://` já recebido pelo wizard de enrollment. Nenhum segredo TOTP pode ser enviado a um serviço externo para gerar QR Code.

## Pacote avaliado

- pacote: `qrcode.react`
- versão proposta: `4.2.0`
- licença: ISC; encoder QR incluído sob MIT
- tipos TypeScript: incluídos no pacote
- dependências de runtime publicadas: zero
- React 19: suportado explicitamente pelos peer dependencies da versão 4.2.0
- uso pretendido: `QRCodeSVG` somente na etapa transitória de provisioning

## Decisão

Aprovado para este uso restrito.

Razões:

- evita serviço externo e mantém o `otpauth://` no navegador do próprio usuário;
- SVG dispensa canvas/imagem remota e permanece nítido em diferentes densidades de tela;
- não exige uma segunda biblioteca de tipos;
- escopo pequeno e específico, sem substituir primitives criptográficas do backend;
- o segredo já precisa existir temporariamente no frontend durante o enrollment para permitir chave manual, portanto o QR não amplia o contrato de dados.

## Restrições

- não persistir URI/segredo em `localStorage`, `sessionStorage` ou logs;
- não adicionar analytics/eventos contendo o valor codificado;
- desmontar o QR junto com o estado de enrollment;
- continuar oferecendo chave manual e primeiro TOTP como confirmação obrigatória;
- qualquer troca de biblioteca exige nova revisão de dependência.
