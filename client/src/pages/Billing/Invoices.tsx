import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenant } from "@/context/TenantContext";
import { billingApi } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { GenerateInvoicesDialog } from "./GenerateInvoicesDialog";
import {
  BillingOptions,
  Feedback,
  fetchJson,
  FilterSelect,
  academicYearOption,
  INVOICE_STATUSES,
  InvoiceStatus,
  InvoiceStatusBadge,
  invoiceStatusLabel,
  StudentRef,
  studentName,
  useAcademicYears,
} from "./shared";

const ALL = "__all__";
const OVERDUE = "__overdue__";
const PAGE_SIZE = 25;

interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  status: InvoiceStatus;
  is_overdue: boolean;
  kind: "TERM" | "ADHOC";
  due_date: string;
  total_amount: string;
  amount_paid: string;
  balance: string;
  currency: string;
  student: StudentRef;
  classroom: { id: string; name: string } | null;
  term_template_item: { id: string; name: string } | null;
}
interface InvoicePage {
  items: InvoiceRow[];
  total: number;
  page: number;
  page_size: number;
  sums: { total_amount: string; amount_paid: string; balance: string };
}

export default function Invoices() {
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string | undefined;
  const academicYears = useAcademicYears(schoolId);

  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState(ALL);
  const [classId, setClassId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [generateOpen, setGenerateOpen] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

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

  const year = options.data?.years.find((y) => y.id === yearId);

  const invoices = useQuery<InvoicePage>({
    queryKey: ["billing", schoolId, "invoices", { yearId, termId, classId, status, search, page }],
    enabled: !!schoolId && !!yearId,
    placeholderData: (prev) => prev,
    queryFn: () =>
      fetchJson(
        billingApi.listInvoices(schoolId!, {
          academicYearId: yearId,
          termId: termId !== ALL ? termId : undefined,
          classroomId: classId !== ALL ? classId : undefined,
          status: status !== ALL && status !== OVERDUE ? status : undefined,
          overdue: status === OVERDUE ? "true" : undefined,
          search: search || undefined,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        }),
        "Failed to load invoices",
      ),
  });

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };
  const currency = options.data?.currency ?? "UGX";
  const data = invoices.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <AppLayout
      title="Invoices"
      description="Generate, review and issue student fee invoices."
      breadcrumbs={[{ label: "Fees & Billing" }, { label: "Invoices" }]}
    >
      {!schoolId ? (
        <Alert><AlertDescription>Select a school to view invoices.</AlertDescription></Alert>
      ) : options.isError ? (
        <Feedback kind="error" message={(options.error as Error).message} />
      ) : options.isSuccess && !options.data.years.length ? (
        <Alert><AlertDescription>Create an academic year and set up fees before generating invoices.</AlertDescription></Alert>
      ) : (
        <Card className="border-slate-200">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FilterSelect label="Academic year" value={yearId}
                  onChange={resetPage((v: string) => { setYearId(v); setTermId(ALL); })}
                  items={academicYears.map(academicYearOption)} />
                <FilterSelect label="Term" value={termId} onChange={resetPage(setTermId)}
                  items={[{ value: ALL, label: "All terms" }, ...(year?.terms ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
                <FilterSelect label="Class" value={classId} onChange={resetPage(setClassId)}
                  items={[{ value: ALL, label: "All classes" }, ...(options.data?.classrooms ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
                <FilterSelect label="Status" value={status} onChange={resetPage(setStatus)}
                  items={[{ value: ALL, label: "All statuses" }, { value: OVERDUE, label: "Overdue" },
                    ...INVOICE_STATUSES.map((s) => ({ value: s, label: invoiceStatusLabel(s) }))]} />
              </div>
              <Button onClick={() => setGenerateOpen(true)} disabled={!options.data}>
                <FilePlus2 className="mr-2 h-4 w-4" />Generate invoices
              </Button>
            </div>
            <Input placeholder="Search student name, student no. or invoice no." value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)} className="max-w-md" />
          </CardHeader>
          <CardContent>
            {invoices.isError && <Feedback kind="error" message={(invoices.error as Error).message} />}
            {data && (
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <SumTile label="Billed (filtered)" value={formatMoney(data.sums.total_amount, currency)} />
                <SumTile label="Paid" value={formatMoney(data.sums.amount_paid, currency)} />
                <SumTile label="Balance" value={formatMoney(data.sums.balance, currency)} />
              </div>
            )}
            {invoices.isLoading ? (
              <div className="py-10 text-center text-slate-500">Loading invoices…</div>
            ) : !data?.items.length ? (
              <div className="py-10 text-center text-slate-500">
                No invoices match these filters. Use <strong>Generate invoices</strong> to bill a term.
              </div>
            ) : (
              <>
                <div className={`overflow-x-auto ${invoices.isFetching ? "opacity-70" : ""}`}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="hidden md:table-cell">Class</TableHead>
                        <TableHead className="hidden md:table-cell">Due</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <Link href={`/billing/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                              {inv.invoice_number ?? `Draft · ${inv.id.slice(0, 8)}`}
                            </Link>
                            <div className="text-xs text-slate-500">{inv.kind === "ADHOC" ? "Ad-hoc" : inv.term_template_item?.name}</div>
                          </TableCell>
                          <TableCell>
                            <div>{studentName(inv.student)}</div>
                            <div className="text-xs text-slate-500">{inv.student.student_no}</div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{inv.classroom?.name ?? "—"}</TableCell>
                          <TableCell className="hidden md:table-cell">{new Date(inv.due_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(inv.total_amount, inv.currency)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(inv.balance, inv.currency)}</TableCell>
                          <TableCell><InvoiceStatusBadge status={inv.status} overdue={inv.is_overdue} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>{data.total} invoice{data.total === 1 ? "" : "s"}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <span>Page {page} of {pageCount}</span>
                    <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {generateOpen && schoolId && options.data && (
        <GenerateInvoicesDialog
          schoolId={schoolId}
          options={options.data}
          academicYears={academicYears}
          defaultYearId={yearId}
          defaultTermId={termId !== ALL ? termId : undefined}
          defaultClassId={classId !== ALL ? classId : undefined}
          onClose={() => setGenerateOpen(false)}
        />
      )}
    </AppLayout>
  );
}

function SumTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50/60 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
