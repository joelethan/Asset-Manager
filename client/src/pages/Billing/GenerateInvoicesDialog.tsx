import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { billingApi } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  academicYearOption,
  AcademicYearOptionData,
  BillingOptions,
  Feedback,
  fetchJson,
  FilterSelect,
  StudentRef,
  studentName,
} from "./shared";

const ALL = "__all__";

interface Preview {
  currency: string;
  will_create: Array<{ student: StudentRef; classroom: { name: string } | null; due_date: string; line_count: number; total_amount: string }>;
  will_skip: Array<{ student_id: string; name: string; student_no?: string; reason: string }>;
  summary: { create_count: number; skip_count: number; total_amount: string };
}
interface GenerateResult {
  batch: { id: string };
  created_count: number;
  skipped: Preview["will_skip"];
}

type Step = "select" | "preview" | "generated" | "issued";

/** Wizard: choose scope → preview (no writes) → generate drafts → issue all. */
export function GenerateInvoicesDialog({
  schoolId, options, academicYears, defaultYearId, defaultTermId, defaultClassId, onClose,
}: {
  schoolId: string;
  options: BillingOptions;
  academicYears: AcademicYearOptionData[];
  defaultYearId: string;
  defaultTermId?: string;
  defaultClassId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("select");
  const [yearId, setYearId] = useState(defaultYearId);
  const [termId, setTermId] = useState(defaultTermId ?? "");
  const [classId, setClassId] = useState(defaultClassId ?? ALL);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [issuedCount, setIssuedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const year = options.years.find((y) => y.id === yearId);
  const scope = () => ({
    academic_year_id: yearId,
    term_template_item_id: termId,
    classroom_definition_id: classId !== ALL ? classId : undefined,
  });
  const refreshInvoices = () => qc.invalidateQueries({ queryKey: ["billing", schoolId, "invoices"] });
  const onError = (e: Error) => setError(e.message);

  const previewM = useMutation({
    mutationFn: () => fetchJson<Preview>(billingApi.previewInvoices(schoolId, scope()), "Could not build preview"),
    onSuccess: (p) => { setPreview(p); setStep("preview"); setError(null); },
    onError,
  });
  const generateM = useMutation({
    mutationFn: () => fetchJson<GenerateResult>(billingApi.generateInvoices(schoolId, scope()), "Could not generate invoices"),
    onSuccess: (r) => { setResult(r); setStep("generated"); setError(null); refreshInvoices(); },
    onError,
  });
  const issueM = useMutation({
    mutationFn: () => fetchJson<{ issued_count: number }>(billingApi.issueBatch(schoolId, result!.batch.id), "Could not issue invoices"),
    onSuccess: (r) => { setIssuedCount(r.issued_count); setStep("issued"); setError(null); refreshInvoices(); },
    onError,
  });
  const discardM = useMutation({
    mutationFn: () => fetchJson(billingApi.discardBatch(schoolId, result!.batch.id), "Could not discard drafts"),
    onSuccess: () => { refreshInvoices(); onClose(); },
    onError,
  });

  const currency = preview?.currency ?? options.currency;
  const busy = previewM.isPending || generateM.isPending || issueM.isPending || discardM.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate term invoices</DialogTitle>
          <DialogDescription>
            {step === "select" && "Choose who to bill. You'll see a preview before anything is created."}
            {step === "preview" && "Nothing has been created yet. Review the totals and skipped students."}
            {step === "generated" && "Draft invoices were created. Issue them to assign invoice numbers and lock them."}
            {step === "issued" && "Done."}
          </DialogDescription>
        </DialogHeader>
        {error && <Feedback kind="error" message={error} />}

        {step === "select" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <FilterSelect label="Academic year" value={yearId} onChange={(v) => { setYearId(v); setTermId(""); }}
              items={academicYears.map(academicYearOption)} />
            <FilterSelect label="Term" value={termId} onChange={setTermId}
              items={(year?.terms ?? []).map((t) => ({ value: t.id, label: t.name }))} />
            <FilterSelect label="Class" value={classId} onChange={setClassId}
              items={[{ value: ALL, label: "All classes" }, ...options.classrooms.map((c) => ({ value: c.id, label: c.name }))]} />
          </div>
        )}

        {step === "preview" && preview && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Invoices to create" value={String(preview.summary.create_count)} />
              <Stat label="Total to bill" value={formatMoney(preview.summary.total_amount, currency)} />
              <Stat label="Students skipped" value={String(preview.summary.skip_count)} />
            </div>
            <Tabs defaultValue="create">
              <TabsList>
                <TabsTrigger value="create">Will create ({preview.will_create.length})</TabsTrigger>
                <TabsTrigger value="skip">Skipped ({preview.will_skip.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="create">
                <ScrollTable empty="No students would be billed. Check that fees exist for this term and students are enrolled.">
                  {preview.will_create.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Fees</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.will_create.map((r) => (
                          <TableRow key={r.student.id}>
                            <TableCell>{studentName(r.student)} <span className="text-xs text-slate-500">{r.student.student_no}</span></TableCell>
                            <TableCell>{r.classroom?.name ?? "—"}</TableCell>
                            <TableCell className="text-right">{r.line_count}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatMoney(r.total_amount, currency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollTable>
              </TabsContent>
              <TabsContent value="skip">
                <SkippedTable rows={preview.will_skip} />
              </TabsContent>
            </Tabs>
          </>
        )}

        {step === "generated" && result && (
          <div className="space-y-3">
            <Feedback kind="success" message={`Created ${result.created_count} draft invoice${result.created_count === 1 ? "" : "s"}.`} />
            {result.skipped.length > 0 && <SkippedTable rows={result.skipped} />}
          </div>
        )}

        {step === "issued" && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <p className="font-medium">Issued {issuedCount} invoice{issuedCount === 1 ? "" : "s"}.</p>
            <p className="text-sm text-slate-500">They are now numbered and locked. Corrections are made by cancelling and re-issuing.</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "select" && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => previewM.mutate()} disabled={!yearId || !termId || busy}>
                {previewM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Preview
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("select")} disabled={busy}>Back</Button>
              <Button onClick={() => generateM.mutate()} disabled={!preview?.summary.create_count || busy}>
                {generateM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create {preview?.summary.create_count ?? 0} drafts
              </Button>
            </>
          )}
          {step === "generated" && (
            <>
              <Button variant="outline" onClick={onClose} disabled={busy}>Keep as drafts</Button>
              {result!.created_count > 0 && (
                <>
                  <Button variant="outline" className="text-red-600" disabled={busy}
                    onClick={() => window.confirm("Delete all draft invoices from this run?") && discardM.mutate()}>
                    Discard drafts
                  </Button>
                  <Button disabled={busy}
                    onClick={() => window.confirm(`Issue ${result!.created_count} invoices? Issued invoices are numbered and can no longer be edited.`) && issueM.mutate()}>
                    {issueM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Issue all
                  </Button>
                </>
              )}
            </>
          )}
          {step === "issued" && <Button onClick={onClose}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ScrollTable({ children, empty }: { children: React.ReactNode; empty: string }) {
  return (
    <div className="max-h-[40vh] overflow-auto rounded-md border">
      {children || <div className="py-8 text-center text-sm text-slate-500">{empty}</div>}
    </div>
  );
}

function SkippedTable({ rows }: { rows: Preview["will_skip"] }) {
  return (
    <ScrollTable empty="No students skipped.">
      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.student_id}>
                <TableCell>{r.name} <span className="text-xs text-slate-500">{r.student_no}</span></TableCell>
                <TableCell className="text-slate-600">{r.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ScrollTable>
  );
}
