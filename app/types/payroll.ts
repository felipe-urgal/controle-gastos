export type PayrollPaymentType =
  | 'ADVANCE'
  | 'REGULAR'
  | 'THIRTEENTH'
  | 'VACATION'
  | 'PLR'
  | 'OTHER';

export type PayrollDocumentType = 'PAYROLL_ADVANCE' | 'MONTHLY_PAYSLIP';
export type ImportedDocumentStatus = 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';

export type PayrollRubric = {
  code: string | null;
  description: string;
  reference: string | null;
  earningsCents: number | null;
  deductionsCents: number | null;
};

export type PayrollDocumentDraft = {
  documentType: PayrollDocumentType;
  paymentType: PayrollPaymentType;
  employerName: string;
  employerCnpj: string;
  employeeName: string | null;
  year: number;
  month: number;
  salaryBaseCents: number | null;
  grossIncomeCents: number | null;
  totalEarningsCents: number | null;
  totalDeductionsCents: number | null;
  netPaidCents: number | null;
  inssCents: number | null;
  irrfCents: number | null;
  irrfBaseCents: number | null;
  fgtsBaseCents: number | null;
  fgtsAmountCents: number | null;
  earnings: PayrollRubric[];
  deductions: PayrollRubric[];
  bankMetadata: Record<string, string> | null;
  warnings: string[];
  errors: string[];
  fingerprint: string;
  duplicate: boolean;
};

export type PayrollReplacementCandidate = {
  id: string;
  paymentType: PayrollPaymentType;
  createdAt: string;
  netPaidCents: number | null;
};

export type PayrollImportPreview = {
  fileName: string;
  requiresOcr: boolean;
  pageCount?: number;
  detectedType: PayrollDocumentType | null;
  previewToken: string | null;
  document: PayrollDocumentDraft | null;
  replacementCandidates: PayrollReplacementCandidate[];
  warnings: string[];
};

export type StoredPayrollDocument = {
  id: string;
  documentType: PayrollDocumentType;
  paymentType: PayrollPaymentType;
  employerName: string;
  employerCnpj: string;
  employeeName: string | null;
  year: number;
  month: number;
  grossIncomeCents: number | null;
  totalEarningsCents: number | null;
  totalDeductionsCents: number | null;
  netPaidCents: number | null;
  inssCents: number | null;
  irrfCents: number | null;
  earnings: unknown;
  deductions: unknown;
  warnings: unknown;
  lifecycleStatus: ImportedDocumentStatus;
  supersedesId: string | null;
  supersededAt: string | null;
  archivedAt: string | null;
  supersededBy: { id: string } | null;
  createdAt: string;
};

export type PayrollSummary = {
  employerName: string;
  employerCnpj: string;
  year: number;
  month: number;
  grossIncomeCents: number | null;
  grossIncomeComplete: boolean;
  netPaidCents: number | null;
  netPaidComplete: boolean;
  irrfCents: number | null;
  irrfComplete: boolean;
  advanceNetPaidCents: number | null;
  advanceNetPaidComplete: boolean;
  regularNetPaidCents: number | null;
  regularNetPaidComplete: boolean;
  matchedAdvances: number;
  pendingAdvances: number;
  regularDocumentCount: number;
  reviewRequired: boolean;
  reviewReason: string | null;
  documentCount: number;
};

export type PayrollPageInfo = {
  page: number;
  limit: number;
  hasMore: boolean;
};

export type PayrollPage<T> = {
  items: T[];
  pageInfo: PayrollPageInfo;
};

export type AnnualStatementItem = {
  description: string;
  amountCents: number | null;
};

export type AnnualStatementDraft = {
  calendarYear: number;
  taxExercise: number;
  payerName: string;
  payerTaxId: string;
  beneficiaryName: string | null;
  beneficiaryTaxId: string | null;
  incomeNature: string | null;
  taxableIncomeCents: number | null;
  officialPensionCents: number | null;
  complementaryPensionCents: number | null;
  alimonyCents: number | null;
  irrfCents: number | null;
  thirteenthSalaryCents: number | null;
  thirteenthIrrfCents: number | null;
  exemptIncome: AnnualStatementItem[];
  exclusiveTaxation: AnnualStatementItem[];
  accumulatedIncome: AnnualStatementItem[];
  notes: string[];
  warnings: string[];
  errors: string[];
  fingerprint: string;
  duplicate: boolean;
};

export type AnnualStatementReplacementCandidate = {
  id: string;
  createdAt: string;
  taxableIncomeCents: number | null;
};

export type AnnualStatementPreview = {
  fileName: string;
  requiresOcr: boolean;
  previewToken: string | null;
  statement: AnnualStatementDraft | null;
  replacementCandidates: AnnualStatementReplacementCandidate[];
  warnings: string[];
};

export type StoredAnnualStatement = Omit<
  AnnualStatementDraft,
  'errors' | 'fingerprint' | 'duplicate'
> & {
  id: string;
  lifecycleStatus: ImportedDocumentStatus;
  supersedesId: string | null;
  supersededAt: string | null;
  archivedAt: string | null;
  supersededBy: { id: string } | null;
  createdAt: string;
};

export type PayrollReconciliationStatus =
  | 'MATCHED'
  | 'SUGGESTED'
  | 'UNMATCHED'
  | 'REVIEW_REQUIRED';

export type CandidateTransaction = {
  id: string;
  amountCents: number;
  type: string;
  status: string;
  description: string;
  date: string;
  reconciliationStatus: string;
  evidence: {
    bankNameMatch: boolean | null;
    agencyMatch: boolean | null;
    accountMatch: boolean | null;
    score: number;
    explanation: string | null;
  } | null;
  account: {
    id: string;
    name: string;
    currency: string;
  };
};

export type PayrollTransactionReconciliationItem = {
  documentId: string;
  documentType: PayrollDocumentType;
  paymentType: PayrollPaymentType;
  employerName: string;
  employerCnpj: string;
  year: number;
  month: number;
  netPaidCents: number | null;
  status: PayrollReconciliationStatus;
  reason: string | null;
  matchedTransaction: CandidateTransaction | null;
  candidates: CandidateTransaction[];
};

export type PayrollAdvanceCandidate = {
  regularDocumentId: string;
  rubricIndex: number;
  description: string;
  compensationCents: number;
  differenceCents: number | null;
  exactAmount: boolean;
  importedAt: string;
};

export type PayrollAdvanceResolutionItem = {
  linkId: string;
  advanceDocumentId: string;
  employerName: string;
  employerCnpj: string;
  year: number;
  month: number;
  expectedAdvanceCents: number | null;
  netPaidCents: number | null;
  status: 'PENDING' | 'MATCHED';
  reason: string | null;
  decisionSource: 'MANUAL' | 'AUTOMATIC';
  selectedRegularDocumentId: string | null;
  selectedRubricIndex: number | null;
  compensationCents: number | null;
  resolvedAt: string | null;
  candidates: PayrollAdvanceCandidate[];
};

export type PayrollAnnualStatus =
  | 'MATCHED'
  | 'MISMATCH'
  | 'INCOMPLETE'
  | 'UNSUPPORTED_COMPONENT';

export type PayrollAnnualSource = {
  documentId: string;
  month: number;
  paymentType: string;
  amountCents: number | null;
  rubrics: Array<{
    code: string | null;
    description: string;
    earningsCents: number | null;
    deductionsCents: number | null;
  }>;
};

export type PayrollAnnualComponent = {
  key: string;
  label: string;
  status: PayrollAnnualStatus;
  payrollCents: number | null;
  statementCents: number | null;
  differenceCents: number | null;
  reason: string | null;
  sources: PayrollAnnualSource[];
};

export type PayrollAnnualGroup = {
  employerName: string;
  employerCnpj: string;
  year: number;
  status: PayrollAnnualStatus;
  statementIds: string[];
  documentCount: number;
  components: PayrollAnnualComponent[];
};

export type PayrollAnnualReport = {
  year: number;
  status: 'MATCHED' | 'REVIEW_REQUIRED';
  summary: {
    groups: number;
    matchedGroups: number;
    reviewGroups: number;
    matchedComponents: number;
    reviewComponents: number;
  };
  items: PayrollAnnualGroup[];
};
