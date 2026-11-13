import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { billingApi } from "@/lib/api";
import { AMOUNT_PATTERN, formatMoney, normalizeAmountInput } from "@/lib/money";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Feedback, fetchJson, FilterSelect, PAYMENT_METHODS, PaymentMethod, paymentMethodLabel, todayIso } from "./shared";

interface RecordedPayment { id: string; receipt_number: string; amount: string }

/** Compares two decimal strings exactly (no float rounding). Returns -1, 0 or 1. */
function compareDecimal(a: string, b: string): number {
  const norm = (v: string) => {
    const [i, f = ""] = v.split(".");
    return (i.replace(/^0+(?=\d)/, "") || "0").padStart(15, "0") + (f + "00").slice(0, 2);
  };
  const x = norm(a);
  const y = norm(b);
  return x === y ? 0 : x > y ? 1 : -1;
}

export function RecordPaymentDialog({
  schoolId, invoice, onClose, onRecorded,
}: {
  schoolId: string;
  invoice: { id: string; invoice_number: string | null; balance: string; currency: string };
  onClose: () => void;
  onRecorded: () => void;
}) {
  // One key per dialog: double-clicks and retries of the same submission are recorded once.
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const [amount, setAmount] = useState(invoice.balance.replace(/\.00$/, ""));
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [receivedAt, setReceivedAt] = useState(todayIso());
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<RecordedPayment | null>(null);

  const a = normalizeAmountInput(amount);
  const formatOk = AMOUNT_PATTERN.test(a) && compareDecimal(a, "0") > 0;
  const exceeds = formatOk && compareDecimal(a, invoice.balance) > 0;
  const futureDate = receivedAt > todayIso();
  const needsReference = method !== "CASH";
  const canSave = formatOk && !exceeds && !futureDate && !!receivedAt && (!needsReference || reference.trim().length > 0);

  const save = useMutation({
    mutationFn: () =>
      fetchJson<RecordedPayment>(
        billingApi.recordPayment(
          schoolId,
          invoice.id,
          {
            amount: a,
            payment_method: method,
            reference: reference.trim() || undefined,
            received_at: receivedAt,
            payer_name: payerName.trim() || undefined,
            payer_phone: payerPhone.trim() || undefined,
          },
          idempotencyKey,
        ),
        "Could not record payment",
      ),
    onSuccess: (p) => { setRecorded(p); onRecorded(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent>
        {recorded ? (
          <>
            <DialogHeader>
              <DialogTitle>Payment recorded</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <p className="text-lg font-semibold">{formatMoney(recorded.amount, invoice.currency)}</p>
              <p className="text-sm text-slate-600">Receipt <strong>{recorded.receipt_number}</strong></p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button asChild>
                <Link href={`/billing/receipts/${recorded.id}`}><Printer className="mr-2 h-4 w-4" />View receipt</Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>
                {invoice.invoice_number} · outstanding {formatMoney(invoice.balance, invoice.currency)}.
                Overpayments are not accepted.
              </DialogDescription>
            </DialogHeader>
            {error && <Feedback kind="error" message={error} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount" className="text-xs text-slate-500">Amount ({invoice.currency})</Label>
                <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
                {amount && !formatOk && <p className="text-xs text-red-600">Enter a positive amount (max 2 decimals).</p>}
                {exceeds && <p className="text-xs text-red-600">More than the outstanding balance.</p>}
              </div>
              <FilterSelect label="Method" value={method} onChange={(v) => setMethod(v as PaymentMethod)}
                items={PAYMENT_METHODS.map((m) => ({ value: m, label: paymentMethodLabel(m) }))} />
              <div className="space-y-1.5">
                <Label htmlFor="pay-ref" className="text-xs text-slate-500">
                  Reference {needsReference ? "(slip / transaction id)" : "(optional)"}
                </Label>
                <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-date" className="text-xs text-slate-500">Date received</Label>
                <Input id="pay-date" type="date" max={todayIso()} value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
                {futureDate && <p className="text-xs text-red-600">Cannot be in the future.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-payer" className="text-xs text-slate-500">Paid by (optional)</Label>
                <Input id="pay-payer" value={payerName} onChange={(e) => setPayerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-phone" className="text-xs text-slate-500">Payer phone (optional)</Label>
                <Input id="pay-phone" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record payment
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ReversePaymentDialog({
  schoolId, payment, currency, onClose, onDone,
}: {
  schoolId: string;
  payment: { id: string; amount: string; receipt_number: string | null };
  currency: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reverse = useMutation({
    mutationFn: () => fetchJson(billingApi.reversePayment(schoolId, payment.id, reason.trim()), "Could not reverse payment"),
    onSuccess: onDone,
    onError: (e: Error) => setError(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !reverse.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse {payment.receipt_number ?? "payment"}?</DialogTitle>
          <DialogDescription>
            {formatMoney(payment.amount, currency)} will be removed from the invoice's paid amount. The payment stays on record
            as reversed; this cannot be undone (record a new payment instead).
          </DialogDescription>
        </DialogHeader>
        {error && <Feedback kind="error" message={error} />}
        <div className="space-y-2">
          <Label htmlFor="rev-reason">Reason</Label>
          <Textarea id="rev-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Cheque bounced, entered on wrong invoice" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={reverse.isPending}>Keep payment</Button>
          <Button variant="destructive" disabled={!reason.trim() || reverse.isPending} onClick={() => reverse.mutate()}>
            {reverse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reverse payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
