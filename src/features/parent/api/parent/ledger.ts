import { apiFetch } from "../../../../shared/api/client";
import { LedgerData, LedgerFeeItem, LedgerPayment } from "../../types";

type LedgerResponse = {
  success: boolean;
  message?: string;
  data?: {
    student_id: number | string;
    student_name: string;
    grade_level: string;
    total_billed: number;
    total_paid: number;
    balance: number;
    fee_items: Array<{
      name: string;
      amount: number;
      due_date: string | null;
    }>;
    last_payment: {
      amount: number;
      method: string;
      date: string | null;
      receipt_number: string | null;
      reference_number: string | null;
    } | null;
    payments: Array<{
      id: number | string;
      amount: number;
      method: string;
      reference_number: string | null;
      receipt_number: string | null;
      date: string | null;
      school_year: string | null;
      semester: string | null;
    }>;
  };
};

const mapFeeItems = (items: LedgerResponse["data"] extends infer T ? T extends { fee_items: any } ? T["fee_items"] : never : never): LedgerFeeItem[] => {
  return (items || []).map((item) => ({
    name: item.name,
    amount: Number(item.amount ?? 0),
    dueDate: item.due_date ?? null,
  }));
};

const mapPayment = (payment: NonNullable<LedgerResponse["data"]>["payments"][number]): LedgerPayment => ({
  id: Number(payment.id ?? 0),
  amount: Number(payment.amount ?? 0),
  method: payment.method ?? "",
  referenceNumber: payment.reference_number ?? null,
  receiptNumber: payment.receipt_number ?? null,
  date: payment.date ?? null,
  schoolYear: payment.school_year ?? null,
  semester: payment.semester ?? null,
});

export const fetchStudentLedger = async (studentId: string): Promise<LedgerData> => {
  if (!studentId || studentId === "all") {
    throw new Error("Please select a specific child to view the ledger.");
  }

  const response = await apiFetch<LedgerResponse>(`/parent_student_ledger/${studentId}`, {
    method: "GET",
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to load ledger.");
  }

  const data = response.data;
  const payments = (data.payments || []).map(mapPayment);

  return {
    studentId: String(data.student_id),
    studentName: data.student_name,
    gradeLevel: data.grade_level,
    totalBilled: Number(data.total_billed ?? 0),
    totalPaid: Number(data.total_paid ?? 0),
    balance: Number(data.balance ?? 0),
    feeItems: mapFeeItems(data.fee_items),
    lastPayment: data.last_payment
      ? {
          amount: Number(data.last_payment.amount ?? 0),
          method: data.last_payment.method ?? "",
          date: data.last_payment.date ?? null,
          receiptNumber: data.last_payment.receipt_number ?? null,
          referenceNumber: data.last_payment.reference_number ?? null,
        }
      : null,
    payments,
  };
};

