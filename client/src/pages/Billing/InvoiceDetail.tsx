import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/context/TenantContext";
import { billingApi } from "@/lib/api";
import { AMOUNT_PATTERN, formatMoney, normalizeAmountInput } from "@/lib/money";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Banknote, Loader2, Pencil, Plus, Printer, Send, Trash2, Undo2, X } from "lucide-react";
import { RecordPaymentDialog, ReversePaymentDialog } from "./PaymentDialogs";
import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  BillingOptions,
  Feedback,
  fetchJson,
  FilterSelect,
  InvoiceStatus,
  InvoiceStatusBadge,
  paymentMethodLabel,
  StudentRef,
  studentName,
} from "./shared";

interface Line {
  id: string;
  fee_structure_id: string | null;
  fee_category_id: string;
  fee_category: { id: string; name: string };
  description: string;
  quantity: number;
  unit_amount: string;
  waived_amount: string;
  line_total: string;
}
interface PaymentRow {
  id: string;
  amount: string;
  status: string;
  payment_method: string;
  reference: string;
  receipt_number: string | null;
  received_at: string | null;
  payer_name: string | null;
  reversal_reason: string | null;
}
interface InvoiceDetailData {
  id: string;
  invoice_number: string | null;
  status: InvoiceStatus;
  is_overdue: boolean;
  kind: "TERM" | "ADHOC";
  currency: string;
  issue_date: string | null;
  due_date: string;
  subtotal: string;
  waived_total: string;
  total_amount: string;
  amount_paid: string;
  balance: string;
  notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  student: StudentRef;
  classroom: { name: string } | null;
  academic_year: { name: string };
  term_template_item: { name: string } | null;
  line_items: Line[];
  payments: PaymentRow[];
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string | undefined;
  const qc = useQueryClient();
  const [notice, setNotice] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [reversing, setReversing] = useState<PaymentRow | null>(null);

  const queryKey = ["billing", schoolId, "invoice", id];
  const invoice = useQuery<InvoiceDetailData>({
    queryKey,
    enabled: !!schoolId && !!id,
    queryFn: () => fetchJson(billingApi.getInvoice(schoolId!, id), "Failed to load invoice"),
  });
  const options = useQuery<BillingOptions>({
    queryKey: ["billing", schoolId, "options"],
    enabled: !!schoolId,
    staleTime: 60_000,
    queryFn: () => fetchJson(billingApi.options(schoolId!), "Failed to load billing options"),
  });

  const afterChange = (msg: string) => {
    setNotice({ kind: "success", message: msg });
    qc.invalidateQueries({ queryKey: ["billing", schoolId, "invoices"] });
  };
  const onError = (e: Error) => setNotice({ kind: "error", message: e.message });

  const issue = useMutation({
    mutationFn: () => fetchJson<InvoiceDetailData>(billingApi.issueInvoice(schoolId!, id), "Could not issue invoice"),
    onSuccess: (inv) => { qc.setQueryData(queryKey, inv); afterChange(`Issued as ${inv.invoice_number}.`); },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => fetchJson(billingApi.deleteInvoice(schoolId!, id), "Could not delete draft"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing", schoolId, "invoices"] }); navigate("/billing/invoices"); },
    onError,
  });

  const inv = invoice.data;
  const title = inv ? inv.invoice_number ?? "Draft invoice" : "Invoice";

  return (
    <AppLayout
      title={title}
      description={inv ? `${studentName(inv.student)} · ${inv.academic_year.name}${inv.term_template_item ? ` · ${inv.term_template_item.name}` : ""}` : ""}
      breadcrumbs={[{ label: "Fees & Billing" }, { label: "Invoices", href: "/billing/invoices" }, { label: title }]}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" asChild><Link href="/billing/invoices"><ArrowLeft className="mr-2 h-4 w-4" />All invoices</Link></Button>
        {inv && (
          <div className="flex flex-wrap gap-2">
            {inv.status === "DRAFT" && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
                <Button variant="outline" className="text-red-600" disabled={remove.isPending}
                  onClick={() => window.confirm("Delete this draft invoice?") && remove.mutate()}>
                  <Trash2 className="mr-2 h-4 w-4" />Delete draft
                </Button>
                <Button disabled={issue.isPending || Number(inv.total_amount) <= 0}
                  onClick={() => window.confirm("Issue this invoice? It will be numbered and can no longer be edited.") && issue.mutate()}>
                  {issue.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Issue
                </Button>
              </>
            )}
            {(inv.status === "ISSUED" || inv.status === "PARTIALLY_PAID") && (
              <Button onClick={() => setPayOpen(true)}><Banknote className="mr-2 h-4 w-4" />Record payment</Button>
            )}
            {inv.status === "ISSUED" && (
              <Button variant="outline" className="text-red-600" onClick={() => setCancelOpen(true)}>
                <Ban className="mr-2 h-4 w-4" />Cancel invoice
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
          </div>
        )}
      </div>

      {notice && <div className="print:hidden"><Feedback {...notice} /></div>}

      {!schoolId ? null : invoice.isLoading ? (
        <div className="py-10 text-center text-slate-500">Loading invoice…</div>
      ) : invoice.isError ? (
        <Feedback kind="error" message={(invoice.error as Error).message} />
      ) : inv ? (
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-xl">{inv.invoice_number ?? "Draft (not yet numbered)"}</CardTitle>
                <div className="mt-1"><InvoiceStatusBadge status={inv.status} overdue={inv.is_overdue} /></div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Balance due</div>
                <div className="text-2xl font-semibold tabular-nums">{formatMoney(inv.balance, inv.currency)}</div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Student" value={<>{studentName(inv.student)}<div className="text-xs text-slate-500">{inv.student.student_no}</div></>} />
              <Info label="Class" value={inv.classroom?.name ?? "—"} />
              <Info label="Issued" value={fmtDate(inv.issue_date)} />
              <Info label="Due" value={<span className={inv.is_overdue ? "text-red-600 font-medium" : ""}>{fmtDate(inv.due_date)}</span>} />
              {inv.status === "CANCELLED" && (
                <div className="sm:col-span-2 lg:col-span-4 rounded-md bg-slate-50 p-3 text-slate-600">
                  Cancelled {fmtDate(inv.cancelled_at)}: {inv.cancellation_reason}
                </div>
              )}
              {inv.notes && <div className="sm:col-span-2 lg:col-span-4 text-slate-600">Notes: {inv.notes}</div>}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-base">Fees</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Waived</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inv.line_items.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.description}</TableCell>
                      <TableCell className="hidden sm:table-cell">{l.fee_category.name}</TableCell>
                      <TableCell className="text-right">{l.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(l.unit_amount, inv.currency)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(l.waived_amount) > 0 ? formatMoney(l.waived_amount, inv.currency) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(l.line_total, inv.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  {Number(inv.waived_total) > 0 && (
                    <TotalRow label="Waived" value={`− ${formatMoney(inv.waived_total, inv.currency)}`} />
                  )}
                  <TotalRow label="Total" value={formatMoney(inv.total_amount, inv.currency)} bold />
                  <TotalRow label="Paid" value={formatMoney(inv.amount_paid, inv.currency)} />
                  <TotalRow label="Balance" value={formatMoney(inv.balance, inv.currency)} bold />
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
            <CardContent>
              {!inv.payments.length ? (
                <p className="text-sm text-slate-500">No payments recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-24 print:hidden" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inv.payments.map((p) => (
                      <TableRow key={p.id} className={p.status === "REVERSED" ? "text-slate-400" : ""}>
                        <TableCell>{fmtDate(p.received_at)}</TableCell>
                        <TableCell>
                          <Link href={`/billing/receipts/${p.id}`} className="text-primary hover:underline">{p.receipt_number ?? p.reference}</Link>
                          {p.reference !== p.receipt_number && <div className="text-xs text-slate-500">Ref {p.reference}</div>}
                        </TableCell>
                        <TableCell>{paymentMethodLabel(p.payment_method)}</TableCell>
                        <TableCell>
                          {p.status === "REVERSED" ? <span title={p.reversal_reason ?? ""}>Reversed</span> : p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums ${p.status === "REVERSED" ? "line-through" : ""}`}>{formatMoney(p.amount, inv.currency)}</TableCell>
                        <TableCell className="text-right print:hidden">
                          {p.status === "COMPLETED" && (
                            <Button variant="ghost" size="sm" onClick={() => setReversing(p)}><Undo2 className="mr-1 h-4 w-4" />Reverse</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {editing && inv && options.data && schoolId && (
        <EditDraftDialog
          schoolId={schoolId}
          invoice={inv}
          options={options.data}
          onClose={() => setEditing(false)}
          onSaved={(updated) => { qc.setQueryData(queryKey, updated); setEditing(false); afterChange("Draft updated."); }}
        />
      )}
      {payOpen && inv && schoolId && (
        <RecordPaymentDialog
          schoolId={schoolId}
          invoice={inv}
          onClose={() => setPayOpen(false)}
          onRecorded={() => { qc.invalidateQueries({ queryKey }); afterChange("Payment recorded."); }}
        />
      )}
      {reversing && inv && schoolId && (
        <ReversePaymentDialog
          schoolId={schoolId}
          payment={reversing}
          currency={inv.currency}
          onClose={() => setReversing(null)}
          onDone={() => { setReversing(null); qc.invalidateQueries({ queryKey }); afterChange("Payment reversed."); }}
        />
      )}
      {cancelOpen && inv && schoolId && (
        <CancelDialog
          schoolId={schoolId}
          invoice={inv}
          onClose={() => setCancelOpen(false)}
          onDone={(updated) => { qc.setQueryData(queryKey, updated); setCancelOpen(false); afterChange("Invoice cancelled."); }}
        />
      )}
    </AppLayout>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={5} className={`text-right ${bold ? "font-semibold" : "text-slate-600"}`}>{label}</TableCell>
      <TableCell className={`text-right tabular-nums ${bold ? "font-semibold" : ""}`}>{value}</TableCell>
    </TableRow>
  );
}

interface EditableLine {
  key: string;
  fee_structure_id: string | null;
  fee_category_id: string;
  description: string;
  quantity: string;
  unit_amount: string;
  waived_amount: string;
}

function EditDraftDialog({
  schoolId, invoice, options, onClose, onSaved,
}: {
  schoolId: string;
  invoice: InvoiceDetailData;
  options: BillingOptions;
  onClose: () => void;
  onSaved: (inv: InvoiceDetailData) => void;
}) {
  const [dueDate, setDueDate] = useState(invoice.due_date.slice(0, 10));
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [lines, setLines] = useState<EditableLine[]>(
    invoice.line_items.map((l) => ({
      key: l.id,
      fee_structure_id: l.fee_structure_id,
      fee_category_id: l.fee_category_id,
      description: l.description,
      quantity: String(l.quantity),
      unit_amount: l.unit_amount,
      waived_amount: l.waived_amount,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const categories = options.categories.filter((c) => c.is_active || lines.some((l) => l.fee_category_id === c.id));

  const update = (key: string, patch: Partial<EditableLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const lineValid = (l: EditableLine) => {
    const u = normalizeAmountInput(l.unit_amount);
    const w = normalizeAmountInput(l.waived_amount || "0");
    const q = Number(l.quantity);
    return !!l.description.trim() && !!l.fee_category_id && Number.isInteger(q) && q >= 1 &&
      AMOUNT_PATTERN.test(u) && Number(u) > 0 && AMOUNT_PATTERN.test(w) && Number(w) <= Number(u) * q;
  };
  const canSave = lines.length > 0 && lines.every(lineValid) && !!dueDate;

  const save = useMutation({
    mutationFn: () =>
      fetchJson<InvoiceDetailData>(
        billingApi.updateInvoice(schoolId, invoice.id, {
          due_date: dueDate,
          notes: notes.trim() || null,
          lines: lines.map((l) => ({
            fee_structure_id: l.fee_structure_id,
            fee_category_id: l.fee_category_id,
            description: l.description.trim(),
            quantity: Number(l.quantity),
            unit_amount: normalizeAmountInput(l.unit_amount),
            waived_amount: normalizeAmountInput(l.waived_amount || "0"),
          })),
        }),
        "Could not save draft",
      ),
    onSuccess: onSaved,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit draft invoice</DialogTitle>
          <DialogDescription>Add manual lines (for example an opening balance or a one-off charge), adjust amounts, or remove fees.</DialogDescription>
        </DialogHeader>
        {error && <Feedback kind="error" message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ed-due" className="text-xs text-slate-500">Due date</Label>
            <Input id="ed-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-notes" className="text-xs text-slate-500">Notes</Label>
            <Textarea id="ed-notes" rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="max-h-[45vh] space-y-3 overflow-auto">
          {lines.map((l) => (
            <div key={l.key} className={`grid gap-2 rounded-md border p-3 sm:grid-cols-12 ${lineValid(l) ? "" : "border-red-300"}`}>
              <div className="sm:col-span-4">
                <Label className="text-xs text-slate-500">Description</Label>
                <Input value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} />
              </div>
              <div className="sm:col-span-3">
                <FilterSelect label="Category" value={l.fee_category_id} onChange={(v) => update(l.key, { fee_category_id: v })}
                  items={categories.map((c) => ({ value: c.id, label: c.name }))} />
              </div>
              <div className="sm:col-span-1">
                <Label className="text-xs text-slate-500">Qty</Label>
                <Input inputMode="numeric" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-slate-500">Amount</Label>
                <Input inputMode="decimal" value={l.unit_amount} onChange={(e) => update(l.key, { unit_amount: e.target.value })} />
              </div>
              <div className="sm:col-span-1">
                <Label className="text-xs text-slate-500">Waived</Label>
                <Input inputMode="decimal" value={l.waived_amount} onChange={(e) => update(l.key, { waived_amount: e.target.value })} />
              </div>
              <div className="flex items-end sm:col-span-1">
                <Button variant="ghost" size="icon" aria-label="Remove line" onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm"
            onClick={() => setLines((p) => [...p, {
              key: `new-${Date.now()}`, fee_structure_id: null, fee_category_id: categories[0]?.id ?? "",
              description: "", quantity: "1", unit_amount: "", waived_amount: "0",
            }])}>
            <Plus className="mr-2 h-4 w-4" />Add line
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  schoolId, invoice, onClose, onDone,
}: { schoolId: string; invoice: InvoiceDetailData; onClose: () => void; onDone: (inv: InvoiceDetailData) => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cancel = useMutation({
    mutationFn: () => fetchJson<InvoiceDetailData>(billingApi.cancelInvoice(schoolId, invoice.id, reason.trim()), "Could not cancel invoice"),
    onSuccess: onDone,
    onError: (e: Error) => setError(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {invoice.invoice_number}?</DialogTitle>
          <DialogDescription>
            The invoice stays on record as cancelled and its number is not reused. You can then generate or create a replacement.
          </DialogDescription>
        </DialogHeader>
        {error && <Feedback kind="error" message={error} />}
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Reason</Label>
          <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong class billed" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Keep invoice</Button>
          <Button variant="destructive" disabled={!reason.trim() || cancel.isPending} onClick={() => cancel.mutate()}>
            {cancel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cancel invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
