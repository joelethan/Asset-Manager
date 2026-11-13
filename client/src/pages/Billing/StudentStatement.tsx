import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenant } from "@/context/TenantContext";
import { billingApi } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { academicYearOption, BillingOptions, Feedback, fetchJson, FilterSelect, useAcademicYears } from "./shared";

const ALL = "__all__";

interface StatementEntry {
  date: string;
  type: "INVOICE" | "PAYMENT" | "PAYMENT_REVERSAL" | "INVOICE_CANCELLATION";
  reference: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  invoice_id: string | null;
  payment_id: string | null;
}
interface Statement {
  currency: string;
  entries: StatementEntry[];
  totals: { charged: string; credited: string; balance: string };
  open_invoices: Array<{ id: string; invoice_number: string | null; due_date: string; balance: string; is_overdue: boolean }>;
}

/** Fee ledger for one student: invoices, payments, reversals and a running balance. */
export function StudentStatement({ studentId }: { studentId: string }) {
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string | undefined;
  const academicYears = useAcademicYears(schoolId);
  const [yearId, setYearId] = useState(ALL);

  const options = useQuery<BillingOptions>({
    queryKey: ["billing", schoolId, "options"],
    enabled: !!schoolId,
    staleTime: 60_000,
    queryFn: () => fetchJson(billingApi.options(schoolId!), "Failed to load billing options"),
  });
  const statement = useQuery<Statement>({
    queryKey: ["billing", schoolId, "statement", studentId, yearId],
    enabled: !!schoolId && !!studentId,
    placeholderData: (prev) => prev,
    queryFn: () => fetchJson(billingApi.statement(schoolId!, studentId, yearId !== ALL ? yearId : undefined), "Failed to load fee statement"),
  });

  const st = statement.data;
  const cur = st?.currency ?? "UGX";
  const balance = st ? Number(st.totals.balance) : 0;

  return (
    <section className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Fees</h3>
          {st && (
            <p className={`text-sm ${balance > 0 ? "text-red-600" : "text-emerald-700"}`}>
              {balance > 0 ? `Owes ${formatMoney(st.totals.balance, cur)}` : balance < 0 ? `In credit ${formatMoney(String(-balance), cur)}` : "No balance due"}
            </p>
          )}
        </div>
        <div className="sm:w-56">
          <FilterSelect label="Academic year" value={yearId} onChange={setYearId}
            items={[{ value: ALL, label: "All years" }, ...academicYears.map(academicYearOption)]} />
        </div>
      </div>

      {statement.isError ? (
        <Feedback kind="error" message={(statement.error as Error).message} />
      ) : statement.isLoading ? (
        <div className="py-6 text-center text-sm text-slate-500">Loading fee statement…</div>
      ) : !st?.entries.length ? (
        <div className="py-6 text-center text-sm text-slate-500">No issued invoices or payments for this student yet.</div>
      ) : (
        <>
          {st.open_invoices.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm">
              {st.open_invoices.map((i) => (
                <Link key={i.id} href={`/billing/invoices/${i.id}`}
                  className={`rounded-md border px-3 py-1.5 hover:bg-slate-50 ${i.is_overdue ? "border-red-200 text-red-700" : ""}`}>
                  {i.invoice_number}: {formatMoney(i.balance, cur)} due {new Date(i.due_date).toLocaleDateString()}
                  {i.is_overdue && " (overdue)"}
                </Link>
              ))}
            </div>
          )}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Charged</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {st.entries.map((e, i) => (
                  <TableRow key={`${e.type}-${e.payment_id ?? e.invoice_id}-${i}`}>
                    <TableCell className="whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {e.payment_id ? (
                        <Link href={`/billing/receipts/${e.payment_id}`} className="text-primary hover:underline">{e.reference}</Link>
                      ) : e.invoice_id ? (
                        <Link href={`/billing/invoices/${e.invoice_id}`} className="text-primary hover:underline">{e.reference}</Link>
                      ) : e.reference}
                    </TableCell>
                    <TableCell>
                      {e.description}
                      {(e.type === "PAYMENT_REVERSAL" || e.type === "INVOICE_CANCELLATION") && (
                        <Badge variant="outline" className="ml-2 text-xs">{e.type === "PAYMENT_REVERSAL" ? "Reversal" : "Cancellation"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{Number(e.debit) > 0 ? formatMoney(e.debit, cur) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(e.credit) > 0 ? formatMoney(e.credit, cur) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatMoney(e.balance, cur)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">Totals</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(st.totals.charged, cur)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(st.totals.credited, cur)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatMoney(st.totals.balance, cur)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
