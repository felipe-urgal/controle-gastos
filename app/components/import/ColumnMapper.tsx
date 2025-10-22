// app/components/import/ColumnMapper.tsx
'use client';

import { useThemeColors } from '@/app/hook';

import { CSVImportConfig, CSVTransaction } from '@/app/types/import';

interface ColumnMapperProps {
  config: CSVImportConfig;
  onConfigChange: (config: Partial<CSVImportConfig>) => void;
  sampleData: CSVTransaction[];
}

export default function ColumnMapper({ config, onConfigChange, sampleData }: ColumnMapperProps) {
  const colors = useThemeColors();

  const fieldOptions = [
    { value: 'date', label: 'Data', description: 'Coluna com as datas das transações' },
    { value: 'description', label: 'Descrição', description: 'Coluna com a descrição/nome da transação' },
    { value: 'amount', label: 'Valor', description: 'Coluna com os valores (positivos ou negativos)' },
    { value: 'type', label: 'Tipo', description: 'Coluna que indica se é receita ou despesa (opcional)' },
    { value: 'category', label: 'Categoria', description: 'Coluna com categorias pré-definidas (opcional)' },
  ];

  // Obter cabeçalhos do sample data (usando primeira transação)
  const getAvailableHeaders = () => {
    if (sampleData.length === 0) return [];
    
    const firstRow = sampleData[0];
    if (firstRow.originalData) {
      return Object.keys(firstRow.originalData);
    }
    
    // Fallback: gerar colunas numéricas
    return Array.from({ length: 5 }, (_, i) => `Coluna ${i + 1}`);
  };

  const availableHeaders = getAvailableHeaders();

  const handleFieldMappingChange = (field: string, value: string) => {
    onConfigChange({
      fieldMapping: {
        ...config.fieldMapping,
        [field]: value
      }
    });
  };

  const handleDateFormatChange = (format: string) => {
    onConfigChange({ dateFormat: format });
  };

  const handleDecimalSeparatorChange = (separator: ',' | '.') => {
    onConfigChange({ decimalSeparator: separator });
  };

  const handleHasHeadersChange = (hasHeaders: boolean) => {
    onConfigChange({ hasHeaders });
  };

  return (
    <div className="space-y-6">
      {/* Configurações Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Formato de Data */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${colors.text.primary}`}>
            Formato de Data
          </label>
          <select
            value={config.dateFormat}
            onChange={(e) => handleDateFormatChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm ${colors.bg.primary} ${colors.border.primary} ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="DD/MM/YYYY">DD/MM/AAAA</option>
            <option value="MM/DD/YYYY">MM/DD/AAAA</option>
            <option value="YYYY-MM-DD">AAAA-MM-DD</option>
            <option value="DD/MM/YY">DD/MM/AA</option>
            <option value="MM/DD/YY">MM/DD/AA</option>
          </select>
        </div>

        {/* Separador Decimal */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${colors.text.primary}`}>
            Separador Decimal
          </label>
          <select
            value={config.decimalSeparator}
            onChange={(e) => handleDecimalSeparatorChange(e.target.value as ',' | '.')}
            className={`w-full px-3 py-2 border rounded-lg text-sm ${colors.bg.primary} ${colors.border.primary} ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value=",">Vírgula (R$ 1.000,00)</option>
            <option value=".">Ponto (1000.00)</option>
          </select>
        </div>

        {/* Cabeçalhos */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${colors.text.primary}`}>
            Primeira Linha
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasHeaders"
              checked={config.hasHeaders}
              onChange={(e) => handleHasHeadersChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="hasHeaders" className={`text-sm ${colors.text.primary}`}>
              Contém cabeçalhos
            </label>
          </div>
        </div>
      </div>

      {/* Mapeamento de Colunas */}
      <div>
        <h4 className={`text-sm font-medium mb-3 ${colors.text.primary}`}>
          Mapear Colunas do CSV
        </h4>
        
        <div className="space-y-3">
          {fieldOptions.map((field) => (
            <div key={field.value} className="flex items-center justify-between">
              <div className="flex-1">
                <label className={`block text-sm font-medium ${colors.text.primary}`}>
                  {field.label}
                </label>
                <p className={`text-xs ${colors.text.tertiary}`}>
                  {field.description}
                </p>
              </div>
              
              <div className="w-48">
                <select
                  value={config.fieldMapping[field.value as keyof typeof config.fieldMapping] || ''}
                  onChange={(e) => handleFieldMappingChange(field.value, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${colors.bg.primary} ${colors.border.primary} ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Selecionar coluna...</option>
                  {availableHeaders.map((header, index) => (
                    <option key={header} value={config.hasHeaders ? header : index.toString()}>
                      {config.hasHeaders ? header : `Coluna ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prévia do Mapeamento */}
      {sampleData.length > 0 && (
        <div className={`p-3 rounded-lg ${colors.bg.secondary} border ${colors.border.primary}`}>
          <h5 className={`text-xs font-medium mb-2 ${colors.text.primary}`}>
            Prévia do Mapeamento:
          </h5>
          <div className="space-y-1 text-xs">
            {sampleData.slice(0, 2).map((transaction, index) => (
              <div key={index} className={`flex items-center space-x-3 p-2 rounded ${colors.bg.primary}`}>
                <span className={`w-20 ${colors.text.secondary}`}>
                  {transaction.date}
                </span>
                <span className={`flex-1 truncate ${colors.text.primary}`}>
                  {transaction.description}
                </span>
                <span className={`w-20 text-right ${
                  transaction.type === 'INCOME' ? 'text-green-500' : 'text-red-500'
                }`}>
                  R$ {(transaction.amount / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}