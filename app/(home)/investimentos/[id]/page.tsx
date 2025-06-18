"use client";

// Hooks
import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useEditData } from "@/app/hook/useEditData";

// Components
import { ProtectedRoute, Breadcrumb, InvestmentForm } from "@/app/components";

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
    transformData: investmentTransformData, // sempre a mesma referência!
  });

  return (
    <ProtectedRoute>
      <div className="">
        <Breadcrumb />

        {isLoading ? (
          <div className="pt-20 max-w-5xl mx-auto p-4 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
           {investment && (
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
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default UpdateInvestment;