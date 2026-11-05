-- Meta pode guardar um percentual da receita do mês (apenas sugestão de aporte; nada é gravado sozinho).
ALTER TABLE "financial_goals" ADD COLUMN "income_share_percent" INTEGER;
