"use client";

// hook
import { useState, useMemo } from "react";
import { saveAs } from "file-saver";

// context
import { useAuth } from "@/app/context/AuthContext";

// service
import { reportsService } from "@/app/services/reportsService";

// icon
import { 
  FaClock, 
  FaCalendarAlt, 
  FaFileAlt, 
  FaSpinner,
  FaInfoCircle,
} from "react-icons/fa";

// components
import { ProtectedRoute, Breadcrumb, Select, DownloadButton } from "@/app/components";

// utils
import { generateCSV } from "@/app/utils/csvGenerators";
import { generatePDF } from "@/app/utils/pdfGenerators";
import { REPORT_TYPES, MONTHS, getYears } from "@/app/utils/constants";

// types
import { ReportType } from "@/app/types/reports";

export default function ReportsPage() {
  const { user } = useAuth();
  const [state, setState] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    reportType: "summary" as ReportType,
    isLoading: false,
    error: null as string | null
  });

  const { year, month, reportType, isLoading, error } = state;

  const updateState = (updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const years = useMemo(getYears, []);
  
  const withErrorHandling = async (fn: () => Promise<void>) => {
    try {
      updateState({ isLoading: true, error: null });
      await fn();
    } catch (err) {
      console.error("Error in report generation:", err);
      updateState({ error: "Erro ao gerar relatório. Tente novamente." });
    } finally {
      updateState({ isLoading: false });
    }
  };

  const validateBeforeGenerate = () => {
    if (!year || !month || !reportType) {
      updateState({ error: "Por favor, selecione ano, mês e tipo de relatório" });
      return false;
    }
    return true;
  };

  const getReportTitle = () => {
    const typeLabel = REPORT_TYPES.find(t => t.value === reportType)?.label || "Relatório";
    
    if (reportType.includes("annual")) {
      return `${typeLabel} - ${year}`;
    }
    return `${typeLabel} - ${month}/${year}`;
  };

  const handleGenerateCSV = () => withErrorHandling(async () => {
    if (!user?.id || !validateBeforeGenerate()) return;
    
    const { data } = await getReportData();
    if (!data) return;

    const csvContent = generateCSV(data, reportType);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${reportType}-${year}-${month}.csv`);
  });

  const handleGeneratePDF = () => withErrorHandling(async () => {
    if (!user?.id || !validateBeforeGenerate()) return;
    
    const { data } = await getReportData();
    if (!data) return;

    const title = getReportTitle();
    const doc = await generatePDF(data, reportType, title);
    doc.save(`${title.toLowerCase().replace(/ /g, "-")}.pdf`);
  });

  const getReportData = async () => {
    if (!user?.id) return { data: null };
    
    switch (reportType) {
      case "summary":
        return await reportsService.getSummaryReport(user.id, year, month);
      case "by-account":
        return await reportsService.getAccountReport(user.id, year, month);
      case "by-account-category":
        return await reportsService.getAccountCategoryReport(user.id, year, month);
      case "by-account-type-category":
        return await reportsService.getAccountTypeCategoryReport(user.id, year, month);
      case "investment":
        return await reportsService.getInvestmentReport(user.id, year, month);
      case "annual-by-account":
        return await reportsService.getAnnualByAccount(user.id, year, month);
      case "annual-by-account-type-category":
        return await reportsService.getAnnualAccountTypeCategoryReport(user.id, year, month);
      default:
        return { data: null };
    }
  };

  return (
    <ProtectedRoute>
      <div className="">
        <div className="">
          <Breadcrumb />
          
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 mt-6">
            <div className="mb-6">
              <p className="text-gray-600 mt-2">
                Gere relatórios detalhados do seu controle financeiro
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="md:col-span-2">
                <Select
                  value={year}
                  onChange={(e) => updateState({ year: Number(e.target.value) })}
                  placeholder="Selecione um ano"
                  label="Ano"
                  options={years}
                  disabled={isLoading}
                  loading={isLoading}
                  name="year"
                  icon={<FaClock className="text-indigo-500" />}
                  required
                />
              </div>
              
              <div>
                <Select
                  value={month}
                  onChange={(e) => updateState({ month: Number(e.target.value) })}
                  placeholder="Selecione um mês"
                  label="Mês"
                  options={MONTHS}
                  disabled={isLoading}
                  loading={isLoading}
                  name="month"
                  icon={<FaCalendarAlt className="text-indigo-500" />}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <Select
                  value={reportType}
                  onChange={(e) => updateState({ reportType: e.target.value as ReportType })}
                  placeholder="Selecione o tipo"
                  label="Tipo de Relatório"
                  options={REPORT_TYPES}
                  disabled={isLoading}
                  loading={isLoading}
                  name="reportType"
                  icon={<FaFileAlt className="text-indigo-500" />}
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 rounded-lg border border-red-100 flex items-center">
                <FaInfoCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-gray-100">
              <DownloadButton
                onClick={handleGeneratePDF}
                isLoading={isLoading}
                disabled={!reportType || !month || !year}
                label="Baixar PDF"
                variant="primary"
              />
              
              <DownloadButton
                onClick={handleGenerateCSV}
                isLoading={isLoading}
                disabled={!reportType || !month || !year}
                label="Baixar CSV"
                variant="secondary"
              />
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FaInfoCircle className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-600">
                    Selecione o período e o tipo de relatório desejado, depois clique em um dos botões para baixar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-100">
              <div className="flex items-center justify-center">
                <FaSpinner className="animate-spin mr-3 text-indigo-600" size={24} />
                <span className="text-lg font-medium text-gray-800">Gerando relatório...</span>
              </div>
              <p className="mt-2 text-center text-gray-600">Isso pode levar alguns segundos</p>
              
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}