"use client";

// Hooks
import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useEditData } from "@/app/hook/useEditData";

// Components
import { ProtectedRoute, Breadcrumb, InvestmentForm, Loading } from "@/app/components";

// Types
import { InvestmentModel, InvestmentFormData } from '@/app/types/investment'

// Services
import { investmentService } from "@/app/services/investmentService";

const UpdateInvestment = () => {
  const params = useParams();
  const investmentId = params.id as string;

  const investmentTransformData = useCallback((data: InvestmentModel): InvestmentFormData => ({
    ...data,
    amount: typeof data.amount === "object" && "toNumber" in data.amount ? data.amount.toNumber() : Number(data.amount),
    unitPrice: data.unitPrice && typeof data.unitPrice === "object" && "toNumber" in data.unitPrice ? data.unitPrice.toNumber() : Number(data.unitPrice),
    quantity: Number(data.quantity),
    investmentDate: typeof data.investmentDate === "string" ? new Date(data.investmentDate) : data.investmentDate,
    accountId: data.accountId ?? null,
    type: data.type,
  }), []);

  // Use the custom hook
  const { isLoading, data: investment } = useEditData<InvestmentModel, InvestmentFormData>({
    fetchFunction: investmentService.getInvestmentById,
    id: investmentId,
    transformData: investmentTransformData,
  });

  return (
    <ProtectedRoute>
      <div className="">
        <div className="">
          <Breadcrumb />
          
          <div className="">
            <div className="">
              {isLoading ? (
                <Loading />
              ) : (
                <>
                  {investment && (
                    <div className="p-1">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-t-xl">
                        <div className="flex items-center mb-4">
                          <div className="w-2 h-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mr-3"></div>
                          <h2 className="text-lg font-semibold text-gray-900">Informações do Investimento</h2>
                        </div>
                        <p className="text-sm text-gray-600">
                          Atualize as informações abaixo para modificar seu investimento. 
                          Todos os campos marcados com * são obrigatórios.
                        </p>
                      </div>
                      
                      <div className="p-6">
                        <InvestmentForm
                          investment={{
                            ...investment,
                            amount: typeof investment.amount === "object" && "toNumber" in investment.amount 
                              ? investment.amount.toNumber() 
                              : Number(investment.amount),
                            unitPrice: investment.unitPrice,
                            quantity: investment.quantity,
                            accountId: investment.accountId,
                            investmentDate: investment.investmentDate
                              ? (typeof investment.investmentDate === "string"
                                ? new Date(investment.investmentDate).toISOString()
                                : investment.investmentDate.toISOString())
                              : "",
                          }}
                          isEdit={true}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer Info */}
          {!isLoading && investment && (
            <div className="mt-4 bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-300">
                    Certifique-se de revisar todas as informações antes de salvar. 
                    Alterações em investimentos podem afetar seu portfólio e relatórios financeiros.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default UpdateInvestment;