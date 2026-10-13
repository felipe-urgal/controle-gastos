# Preferências do usuário

Contrato das preferências e decisões condicionais registradas na #807/#843.

| Preferência | Escopo | Onde vive |
|---|---|---|
| `showValues` | conta (sincroniza entre dispositivos) | `User.showValues` |
| `periodicSummaryEnabled` | conta | `User.periodicSummaryEnabled` |
| Tema (claro/escuro) | **navegador/dispositivo** | armazenamento local; não é sincronizado |

## Decisões

- **Tema:** permanece local ao navegador. Se virar preferência da conta, a migração deve ser explícita: novo campo no usuário, migration forward-only, leitura inicial do valor local como semente e atualização da UI/descrição ("não é sincronizada com sua conta"). Não sobrescrever silenciosamente a escolha local.
- **`periodicSummaryFrequency`:** só aceita `WEEKLY`. O campo permanece no modelo como ponto de evolução do resumo periódico (ver `docs/DEVELOPMENT.md`, "Cron de resumo financeiro"), mas a UI não oferece seletor enquanto houver um único valor. Remover o campo só se o roadmap descartar outras frequências.
- **CSV de exportação:** ver `docs/USER_DATA_EXPORT.md`; novos CSVs são exports separados por domínio.
- **`showValues`:** preferência visual da conta. Não limita credenciais externas (MCP) nem exports explícitos.
