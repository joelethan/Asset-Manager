import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenant } from "@/context/TenantContext";
import { billingApi } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ReversePaymentDialog } from "./PaymentDialogs";
import { Feedback, fetchJson, FilterSelect, PAYMENT_METHODS, paymentMethodLabel, StudentRef, studentName } from "./shared";

const ALL = "__all__";
const PAGE_SIZE = 25;

interface PaymentRow {
  id: string;
  amount: string;
  currency: string;
  status: string;
  payment_method: string;
  reference: string;
  receipt_number: string | null;
  received_at: string | null;
  payer_name: string | null;
  reversal_reason: string | null;
  student: StudentRef | null;
  invoice: { id: string; invoice_number: string | null } | null;
}
interface PaymentPage {
  items: PaymentRow[];
  total: number;
  sums: { collected: string; completed_count: number };
}

const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export default function Payments() {
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string | undefined;
  const qc = useQueryClient();

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState("");
  const [method, setMethod] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reversing, setReversing] = useState<PaymentRow | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const payments = useQuery<PaymentPage>({
    queryKey: ["billing", schoolId, "payments", { from, to, method, status, search, page }],
    enabled: !!schoolId,
    placeholderData: (prev) => prev,
    queryFn: () =>
      fetchJson(
        billingApi.listPayments(schoolId!, {
          from: from || undefined,
          to: to || undefined,
          method: method !== ALL ? method : undefined,
          status: status !== ALL ? status : undefined,
          search: search || undefined,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        }),
        "Failed to load payments",
      ),
  });

  const data = payments.data;
  const currency = data?.items[0]?.currency ?? "UGX";
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  return (
    <AppLayout
      title="Payments"
      description="All payments received, with receipts and reversals."
      breadcrumbs={[{ label: "Fees & Billing" }, { label: "Payments" }]}
    >
      {!schoolId ? (
        <Alert><AlertDescription>Select a school to view payments.</AlertDescription></Alert>
      ) : (
        <Card className="border-slate-200">
          <CardHeader className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-from" className="text-xs text-slate-500">From</Label>
                <Input id="p-from" type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-to" className="text-xs text-slate-500">To</Label>
                <Input id="p-to" type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} />
              </div>
              <FilterSelect label="Method" value={method} onChange={reset(setMethod)}
                items={[{ value: ALL, label: "All methods" }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: paymentMethodLabel(m) }))]} />
              <FilterSelect label="Status" value={status} onChange={reset(setStatus)}
                items={[{ value: ALL, label: "All" }, { value: "COMPLETED", label: "Completed" }, { value: "REVERSED", label: "Reversed" }]} />
            </div>
            <Input placeholder="Search receipt, reference, payer, student or invoice no." value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)} className="max-w-md" />
          </CardHeader>
          <CardContent>
            {notice && <Feedback {...notice} />}
            {payments.isError && <Feedback kind="error" message={(payments.error as Error).message} />}
            {data && (
              <div className="mb-4 inline-flex gap-6 rounded-md border bg-slate-50/60 px-4 py-3">
                <div>
                  <div className="text-xs text-slate-500">Collected (completed)</div>
                  <div className="text-lg font-semibold tabular-nums">{formatMoney(data.sums.collected, currency)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Payments</div>
                  <div className="text-lg font-semibold tabular-nums">{data.sums.completed_count}</div>
                </div>
              </div>
            )}
            {payments.isLoading ? (
              <div className="py-10 text-center text-slate-500">Loading payments…</div>
            ) : !data?.items.length ? (
              <div className="py-10 text-center text-slate-500">No payments in this range. Record payments from an invoice.</div>
            ) : (
              <>
                <div className={`overflow-x-auto ${payments.isFetching ? "opacity-70" : ""}`}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="hidden md:table-cell">Invoice</TableHead>
                        <TableHead className="hidden md:table-cell">Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((p) => {
                        const reversed = p.status === "REVERSED";
                        return (
                          <TableRow key={p.id} className={reversed ? "text-slate-400" : ""}>
                            <TableCell>{p.received_at ? new Date(p.received_at).toLocaleDateString() : "—"}</TableCell>
                            <TableCell>
                              <Link href={`/billing/receipts/${p.id}`} className="text-primary hover:underline">{p.receipt_number ?? p.reference}</Link>
                              {reversed && <div className="text-xs text-red-500" title={p.reversal_reason ?? ""}>Reversed</div>}
                            </TableCell>
                            <TableCell>
                              {p.student ? studentName(p.student) : "—"}
                              {p.payer_name && <div className="text-xs text-slate-500">Paid by {p.payer_name}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {p.invoice && <Link href={`/billing/invoices/${p.invoice.id}`} className="hover:underline">{p.invoice.invoice_number}</Link>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{paymentMethodLabel(p.payment_method)}</TableCell>
                            <TableCell className={`text-right tabular-nums ${reversed ? "line-through" : ""}`}>{formatMoney(p.amount, p.currency)}</TableCell>
                            <TableCell className="text-right">
                              {p.status === "COMPLETED" && (
                                <Button variant="ghost" size="sm" onClick={() => setReversing(p)}><Undo2 className="mr-1 h-4 w-4" />Reverse</Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>{data.total} payment{data.total === 1 ? "" : "s"}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Previous</Button>
                    <span>Page {page} of {pageCount}</span>
                    <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((x) => x + 1)}>Next</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {reversing && schoolId && (
        <ReversePaymentDialog
          schoolId={schoolId}
          payment={reversing}
          currency={reversing.currency}
          onClose={() => setReversing(null)}
          onDone={() => {
            setReversing(null);
            setNotice({ kind: "success", message: "Payment reversed." });
            qc.invalidateQueries({ queryKey: ["billing", schoolId] });
          }}
        />
      )}
    </AppLayout>
  );
}
