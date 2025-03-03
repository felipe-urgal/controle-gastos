// /app/utils/processarTransacoes.ts
import { Transacao } from "@/app/services/transacoesService";
import { MESES_NOME } from "@/app/utils/format";

export function processarTransacoes(
  transacoes: Transacao[],
  anoSelecionado: number
) {
  const mesesData = Array(12).fill(null).map((_, i) => ({
    mes: i + 1,
    saldo: 0,
    renda: 0,
    despesas: 0,
    investimentos: 0,
    name: MESES_NOME[i],
  }));

  let saldoAnual = 0;
  let investimentoAnual = 0;

  transacoes.forEach(({ valor, mes, ano, tipo }) => {
    if (ano === anoSelecionado) {
      if (tipo === "renda") {
        mesesData[mes - 1].renda += Number(valor);
        saldoAnual += Number(valor);
      } else if (tipo === "despesa") {
        mesesData[mes - 1].despesas += Number(valor);
        saldoAnual -= Number(valor);
      } else {
        mesesData[mes - 1].investimentos += Number(valor);
        investimentoAnual += Number(valor);
      }
      mesesData[mes - 1].saldo = mesesData[mes - 1].renda - mesesData[mes - 1].despesas;
    }
  });

  return { mesesData, saldoAnual, investimentoAnual };
}
