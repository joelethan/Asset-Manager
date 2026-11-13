import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStructure } from "@/context/StructureContext";
import { readApiError } from "@/lib/money";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

export interface Term { id: string; name: string; ordinal: number; start_date?: string | null }
export interface Year { id: string; name: string; status: string; start_date?: string; end_date?: string; terms: Term[] }
export interface Classroom { id: string; name: string }
export interface CategoryOption { id: string; name: string; code: string; is_active: boolean }
export interface BillingOptions { currency: string; years: Year[]; classrooms: Classroom[]; categories: CategoryOption[] }

export interface AcademicYearOptionData {
  id: string;
  name?: string | null;
  status?: string | null;
}

const EMPTY_ACADEMIC_YEARS: AcademicYearOptionData[] = [];

export function useAcademicYears(schoolId?: string): AcademicYearOptionData[] {
  const { structure, structureSchoolId, fetchStructure } = useStructure();

  useEffect(() => {
    if (schoolId && structureSchoolId !== schoolId) {
      void fetchStructure(schoolId);
    }
  }, [fetchStructure, schoolId, structureSchoolId]);

  return structureSchoolId === schoolId
    ? structure?.years ?? EMPTY_ACADEMIC_YEARS
    : EMPTY_ACADEMIC_YEARS;
}

export const academicYearOption = (year: AcademicYearOptionData) => ({
  value: year.id,
  label: (
    <>
      {year.name || `Year ${year.id}`}
      {year.status?.trim().toLowerCase() === "active" && (
        <span className="ml-2 text-green-600 font-semibold">(Active)</span>
      )}
    </>
  ),
});

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";

export interface StudentRef { id: string; first_name: string; last_name: string; student_no: string }

export const studentName = (s: Pick<StudentRef, "first_name" | "last_name">) => `${s.first_name} ${s.last_name}`.trim();

export async function fetchJson<T>(promise: Promise<Response>, fallback: string): Promise<T> {
  const res = await promise;
  if (!res.ok) throw new Error(await readApiError(res, fallback));
  return res.json() as Promise<T>;
}

export function Feedback({ kind, message }: { kind: "error" | "success"; message: string }) {
  return (
    <Alert variant={kind === "error" ? "destructive" : "default"} className="mb-4">
      {kind === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function FilterSelect({
  label, value, onChange, items, disabled,
}: { label: string; value: string; onChange: (v: string) => void; items: { value: string; label: ReactNode }[]; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
        <SelectContent>
          {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

const STATUS_STYLE: Record<InvoiceStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-700 border-slate-200" },
  ISSUED: { label: "Issued", className: "bg-sky-50 text-sky-700 border-sky-200" },
  PARTIALLY_PAID: { label: "Partially paid", className: "bg-amber-50 text-amber-800 border-amber-200" },
  PAID: { label: "Paid", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-50 text-slate-500 border-slate-200 line-through" },
};

export function InvoiceStatusBadge({ status, overdue }: { status: InvoiceStatus; overdue?: boolean }) {
  const s = STATUS_STYLE[status];
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge variant="outline" className={s.className}>{s.label}</Badge>
      {overdue && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>}
    </span>
  );
}

export const INVOICE_STATUSES = Object.keys(STATUS_STYLE) as InvoiceStatus[];
export const invoiceStatusLabel = (s: InvoiceStatus) => STATUS_STYLE[s].label;

export const PAYMENT_METHODS = ["CASH", "BANK_DEPOSIT", "MOBILE_MONEY", "CHEQUE", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_DEPOSIT: "Bank deposit",
  MOBILE_MONEY: "Mobile money",
  CHEQUE: "Cheque",
  OTHER: "Other",
};
export const paymentMethodLabel = (m: string) => METHOD_LABEL[m as PaymentMethod] ?? m;

/** Local date as YYYY-MM-DD (for <input type="date"> defaults). */
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Downloads a CSV (or any file) response through the authenticated API client. */
export async function downloadResponse(promise: Promise<Response>, fallbackName: string): Promise<void> {
  const res = await promise;
  if (!res.ok) throw new Error(await readApiError(res, "Export failed"));
  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
