"use client";

// hook
import { useState, useMemo } from "react";
import { saveAs } from "file-saver";

// context
import { useAuth } from "@/app/context/AuthContext";

// service
import { reportsService } from "@/app/services/reportsService";

// icon
import { FaClock, FaCalendarAlt, FaFileAlt, FaSpinner } from "react-icons/fa";

// components
import { ProtectedRoute, Breadcrumb, Select, DownloadButton } from "@/app/components";

// utils
import { generateCSV } from "@/app/utils/csvGenerators";
import { generatePDF } from "@/app/utils/pdfGenerators";
import { REPORT_TYPES, MONTHS, getYears } from "@/app/utils/constants";

// 
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
        <Breadcrumb />
      
        <div className="bg-gray-800 p-3 border-b border-gray-700">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <Select
              value={year}
              onChange={(e) => updateState({ year: Number(e.target.value) })}
              placeholder="Selecione um ano"
              label="Ano"
              options={years}
              disabled={isLoading}
              loading={isLoading}
              name="year"
              icon={<FaClock />}
              required
            />

            <Select
              value={month}
              onChange={(e) => updateState({ month: Number(e.target.value) })}
              placeholder="Selecione um mês"
              label="Mês"
              options={MONTHS}
              disabled={isLoading}
              loading={isLoading}
              name="month"
              icon={<FaCalendarAlt />}
              required
            />

            <Select
              value={reportType}
              onChange={(e) => updateState({ reportType: e.target.value as ReportType })}
              placeholder="Selecione o tipo"
              label="Tipo de Relatório"
              options={REPORT_TYPES}
              disabled={isLoading}
              loading={isLoading}
              name="reportType"
              icon={<FaFileAlt />}
              required
            />
            
            <div className="flex items-end space-x-2">
              <DownloadButton
                onClick={handleGeneratePDF}
                isLoading={isLoading}
                disabled={!reportType || !month || !year}
                label="PDF"
                variant="primary"
              />
              
              <DownloadButton
                onClick={handleGenerateCSV}
                isLoading={isLoading}
                disabled={!reportType || !month || !year}
                label="CSV"
                variant="secondary"
              />
            </div>
          </div>
          
          {error && (
            <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="">
            <p className="text-gray-400/70">
              Selecione o período e o tipo de relatório desejado, depois clique em um dos botões para baixar.
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="flex items-center">
                <FaSpinner className="animate-spin mr-3 text-emerald-600" size={24} />
                <span className="text-lg font-medium">Gerando relatório...</span>
              </div>
              <p className="mt-2 text-gray-600">Isso pode levar alguns segundos</p>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}