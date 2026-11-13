import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/context/TenantContext";
import { billingApi } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { Link, useParams } from "wouter";
import { Feedback, fetchJson, paymentMethodLabel, StudentRef, studentName } from "./shared";

interface ReceiptData {
  school: { name: string; address: string | null; phone: string; email: string; logo_url: string | null; motto: string | null } | null;
  recorded_by: string | null;
  invoice_balance: string | null;
  payment: {
    id: string;
    amount: string;
    currency: string;
    status: string;
    payment_method: string;
    reference: string;
    receipt_number: string | null;
    received_at: string | null;
    payer_name: string | null;
    reversed_at: string | null;
    reversal_reason: string | null;
    student: StudentRef | null;
    invoice: {
      id: string;
      invoice_number: string | null;
      total_amount: string;
      academic_year: { name: string };
      term_template_item: { name: string } | null;
    } | null;
  };
}

export default function Receipt() {
  const { id } = useParams<{ id: string }>();
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string | undefined;

  const receipt = useQuery<ReceiptData>({
    queryKey: ["billing", schoolId, "receipt", id],
    enabled: !!schoolId && !!id,
    queryFn: () => fetchJson(billingApi.getReceipt(schoolId!, id), "Failed to load receipt"),
  });
  const r = receipt.data;
  const p = r?.payment;

  return (
    <AppLayout
      title={p?.receipt_number ?? "Receipt"}
      description="Payment receipt"
      breadcrumbs={[{ label: "Fees & Billing" }, { label: "Payments", href: "/billing/payments" }, { label: p?.receipt_number ?? "Receipt" }]}
    >
      <div className="mb-4 flex justify-between print:hidden">
        <Button variant="ghost" asChild>
          <Link href={p?.invoice ? `/billing/invoices/${p.invoice.id}` : "/billing/payments"}>
            <ArrowLeft className="mr-2 h-4 w-4" />{p?.invoice ? "Back to invoice" : "Payments"}
          </Link>
        </Button>
        <Button onClick={() => window.print()} disabled={!p}><Printer className="mr-2 h-4 w-4" />Print</Button>
      </div>

      {receipt.isLoading ? (
        <div className="py-10 text-center text-slate-500">Loading receipt…</div>
      ) : receipt.isError ? (
        <Feedback kind="error" message={(receipt.error as Error).message} />
      ) : r && p ? (
        <div className="relative mx-auto max-w-xl rounded-lg border bg-white p-8 text-slate-900 shadow-sm print:max-w-none print:border-0 print:shadow-none">
          {p.status === "REVERSED" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="-rotate-12 rounded border-4 border-red-500 px-4 py-1 text-4xl font-bold uppercase tracking-widest text-red-500/70">Reversed</span>
            </div>
          )}
          <header className="flex items-start gap-4 border-b pb-4">
            {r.school?.logo_url && <img src={r.school.logo_url} alt="" className="h-14 w-14 object-contain" />}
            <div className="flex-1">
              <h2 className="text-lg font-bold">{r.school?.name}</h2>
              {r.school?.motto && <p className="text-xs italic text-slate-500">{r.school.motto}</p>}
              <p className="text-xs text-slate-600">{[r.school?.address, r.school?.phone, r.school?.email].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-slate-500">Receipt</div>
              <div className="font-mono text-sm font-semibold">{p.receipt_number}</div>
            </div>
          </header>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 py-6 text-sm">
            <Row label="Received from" value={p.payer_name || (p.student ? studentName(p.student) : "—")} />
            <Row label="Date" value={p.received_at ? new Date(p.received_at).toLocaleDateString() : "—"} />
            <Row label="Student" value={p.student ? `${studentName(p.student)} (${p.student.student_no})` : "—"} />
            <Row label="Invoice" value={p.invoice?.invoice_number ?? "—"} />
            <Row label="For" value={p.invoice ? `${p.invoice.academic_year.name}${p.invoice.term_template_item ? ` · ${p.invoice.term_template_item.name}` : ""}` : "—"} />
            <Row label="Method" value={`${paymentMethodLabel(p.payment_method)}${p.reference !== p.receipt_number ? ` · ${p.reference}` : ""}`} />
          </dl>

          <div className="rounded-md bg-slate-50 p-4 print:bg-transparent print:border">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-600">Amount received</span>
              <span className="text-2xl font-bold tabular-nums">{formatMoney(p.amount, p.currency)}</span>
            </div>
            {r.invoice_balance !== null && (
              <div className="mt-1 flex justify-between text-sm text-slate-600">
                <span>Invoice balance now</span>
                <span className="tabular-nums">{formatMoney(r.invoice_balance, p.currency)}</span>
              </div>
            )}
          </div>

          {p.status === "REVERSED" && (
            <p className="mt-4 text-sm text-red-600">
              Reversed on {p.reversed_at ? new Date(p.reversed_at).toLocaleDateString() : "—"}: {p.reversal_reason}
            </p>
          )}

          <footer className="mt-10 flex items-end justify-between text-xs text-slate-500">
            <span>Recorded by {r.recorded_by ?? "—"}</span>
            <span className="w-40 border-t border-slate-400 pt-1 text-center">Signature</span>
          </footer>
        </div>
      ) : null}
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
