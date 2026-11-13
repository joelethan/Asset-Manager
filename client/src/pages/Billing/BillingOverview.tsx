import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenant } from "@/context/TenantContext";
import { billingApi } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { academicYearOption, BillingOptions, downloadResponse, Feedback, fetchJson, FilterSelect, useAcademicYears } from "./shared";

const ALL = "__all__";

export interface BillingSummary {
  currency: string;
  invoice_count: number;
  draft_count: number;
  billed: string;
  waived: string;
  collected: string;
  outstanding: string;
  collection_rate: number | null;
  overdue: { count: number; amount: string };
  due_next_14_days: { count: number; amount: string };
  by_status: Record<string, number>;
}
interface ClassRow {
  classroom_id: string | null;
  classroom_name: string;
  student_count: number;
  invoice_count: number;
  billed: string;
  collected: string;
  outstanding: string;
  collection_rate: number | null;
  overdue_count: number;
}

export default function BillingOverview() {
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string | undefined;
  const academicYears = useAcademicYears(schoolId);
  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState(ALL);
  const [exporting, setExporting] = useState<"invoices" | "payments" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const options = useQuery<BillingOptions>({
    queryKey: ["billing", schoolId, "options"],
    enabled: !!schoolId,
    staleTime: 60_000,
    queryFn: () => fetchJson(billingApi.options(schoolId!), "Failed to load billing options"),
  });
  useEffect(() => {
    if (!yearId && academicYears.length) {
      setYearId((academicYears.find((y) => y.status?.toLowerCase() === "active") ?? academicYears[0]).id);
    }
  }, [academicYears, yearId]);

  const scope = { academicYearId: yearId, termId: termId !== ALL ? termId : undefined };
  const summary = useQuery<BillingSummary>({
    queryKey: ["billing", schoolId, "summary", scope],
    enabled: !!schoolId && !!yearId,
    placeholderData: (prev) => prev,
    queryFn: () => fetchJson(billingApi.summary(schoolId!, scope), "Failed to load summary"),
  });
  const byClass = useQuery<ClassRow[]>({
    queryKey: ["billing", schoolId, "by-class", scope],
    enabled: !!schoolId && !!yearId,
    placeholderData: (prev) => prev,
    queryFn: () => fetchJson(billingApi.byClass(schoolId!, scope), "Failed to load class breakdown"),
  });

  const runExport = async (kind: "invoices" | "payments") => {
    if (!schoolId) return;
    setExporting(kind);
    setExportError(null);
    try {
      const year = options.data?.years.find((y) => y.id === yearId);
      const params = kind === "invoices"
        ? scope
        : { from: year?.start_date?.slice(0, 10), to: year?.end_date?.slice(0, 10) };
      await downloadResponse(billingApi.exportCsv(schoolId, kind, params), `${kind}.csv`);
    } catch (e) {
      setExportError((e as Error).message);
    } finally {
      setExporting(null);
    }
  };

  const year = options.data?.years.find((y) => y.id === yearId);
  const s = summary.data;
  const cur = s?.currency ?? options.data?.currency ?? "UGX";

  return (
    <AppLayout
      title="Fees Overview"
      description="What has been billed, collected and is still outstanding."
      breadcrumbs={[{ label: "Fees & Billing" }, { label: "Overview" }]}
    >
      {!schoolId ? (
        <Alert><AlertDescription>Select a school to view billing.</AlertDescription></Alert>
      ) : options.isError ? (
        <Feedback kind="error" message={(options.error as Error).message} />
      ) : options.isSuccess && !options.data.years.length ? (
        <Alert><AlertDescription>Create an academic year and set up fees to start billing.</AlertDescription></Alert>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 md:w-[28rem]">
              <FilterSelect label="Academic year" value={yearId} onChange={(v) => { setYearId(v); setTermId(ALL); }}
                items={academicYears.map(academicYearOption)} />
              <FilterSelect label="Term" value={termId} onChange={setTermId}
                items={[{ value: ALL, label: "Whole year" }, ...(year?.terms ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => runExport("invoices")} disabled={!!exporting}>
                {exporting === "invoices" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Invoices CSV
              </Button>
              <Button variant="outline" onClick={() => runExport("payments")} disabled={!!exporting} title="Payments received during the selected academic year">
                {exporting === "payments" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Payments CSV
              </Button>
            </div>
          </div>
          {exportError && <Feedback kind="error" message={exportError} />}
          {summary.isError && <Feedback kind="error" message={(summary.error as Error).message} />}

          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${summary.isFetching ? "opacity-70" : ""}`}>
            <Tile label="Billed" value={s ? formatMoney(s.billed, cur) : "—"}
              hint={s ? `${s.invoice_count} issued invoice${s.invoice_count === 1 ? "" : "s"}${Number(s.waived) > 0 ? ` · ${formatMoney(s.waived, cur)} waived` : ""}` : ""} />
            <Tile label="Collected" value={s ? formatMoney(s.collected, cur) : "—"}
              hint={s?.collection_rate !== null && s?.collection_rate !== undefined ? `${s.collection_rate}% collection rate` : "No invoices yet"} />
            <Tile label="Outstanding" value={s ? formatMoney(s.outstanding, cur) : "—"}
              hint={s ? `${formatMoney(s.due_next_14_days.amount, cur)} due in the next 14 days` : ""} />
            <Tile label="Overdue" value={s ? formatMoney(s.overdue.amount, cur) : "—"} tone={s && s.overdue.count > 0 ? "bad" : undefined}
              hint={s ? <Link href="/billing/invoices" className="hover:underline">{s.overdue.count} overdue invoice{s.overdue.count === 1 ? "" : "s"}</Link> : ""} />
          </div>

          {s && s.draft_count > 0 && (
            <Alert>
              <AlertDescription>
                {s.draft_count} draft invoice{s.draft_count === 1 ? " is" : "s are"} not included above until issued.{" "}
                <Link href="/billing/invoices" className="font-medium underline">Review drafts</Link>
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">By class</CardTitle>
              <CardDescription>Class is the student's enrollment in the selected academic year.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {byClass.isLoading ? (
                <div className="py-8 text-center text-slate-500">Loading…</div>
              ) : byClass.isError ? (
                <Feedback kind="error" message={(byClass.error as Error).message} />
              ) : !byClass.data?.length ? (
                <div className="py-8 text-center text-slate-500">No issued invoices for this period.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Students</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="w-40">Collection</TableHead>
                      <TableHead className="text-right">Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byClass.data.map((r) => (
                      <TableRow key={r.classroom_id ?? "none"}>
                        <TableCell className="font-medium">{r.classroom_name}</TableCell>
                        <TableCell className="text-right">{r.student_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(r.billed, cur)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(r.collected, cur)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(r.outstanding, cur)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-slate-100" role="img" aria-label={`${r.collection_rate ?? 0}% collected`}>
                              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, r.collection_rate ?? 0)}%` }} />
                            </div>
                            <span className="w-12 text-right text-xs tabular-nums text-slate-600">{r.collection_rate ?? 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right ${r.overdue_count ? "text-red-600 font-medium" : ""}`}>{r.overdue_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: React.ReactNode; tone?: "bad" }) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold tabular-nums ${tone === "bad" ? "text-red-600" : "text-slate-900"}`}>{value}</div>
        {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      </CardContent>
    </Card>
  );
}
