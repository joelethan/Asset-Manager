import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/context/TenantContext";
import { billingApi } from "@/lib/api";
import { AMOUNT_PATTERN, formatMoney, normalizeAmountInput } from "@/lib/money";
import { AssignStudentsDialog } from "./AssignStudentsDialog";
import {
  academicYearOption,
  AcademicYearOptionData,
  BillingOptions,
  Feedback,
  fetchJson,
  FilterSelect,
  useAcademicYears,
} from "./shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Copy, Eye, Lock, Loader2, Pencil, Plus, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------


interface FeeCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  _count?: { fee_structures: number };
}

type Frequency = "ONCE" | "PER_TERM" | "PER_YEAR";

interface FeeStructure {
  id: string;
  name: string;
  amount: string;
  due_date: string | null;
  frequency: Frequency;
  is_mandatory: boolean;
  is_active: boolean;
  is_locked: boolean;
  academic_year_id: string;
  term_template_item_id: string | null;
  classroom_definition_id: string | null;
  fee_category_id: string;
  fee_category: { id: string; name: string; code: string };
  term_template_item: { id: string; name: string } | null;
  classroom_definition: { id: string; name: string } | null;
}

const ALL = "__all__";
const NONE = "__none__";
const FREQUENCY_LABEL: Record<Frequency, string> = { ONCE: "One-off", PER_TERM: "Per term", PER_YEAR: "Per year" };

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}


// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FeeSetup() {
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string | undefined;

  const optionsQuery = useQuery<BillingOptions>({
    queryKey: ["billing", schoolId, "options"],
    enabled: !!schoolId,
    staleTime: 60_000,
    queryFn: () => fetchJson(billingApi.options(schoolId!), "Failed to load billing options"),
  });

  return (
    <AppLayout
      title="Fee Setup"
      description="Define fee categories and the fees charged per academic year, term and class."
      breadcrumbs={[{ label: "Fees & Billing" }, { label: "Fee Setup" }]}
    >
      {!schoolId ? (
        <Alert><AlertDescription>Select a school to manage fees.</AlertDescription></Alert>
      ) : optionsQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getErrorMessage(optionsQuery.error, "Failed to load billing options")}</AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="structures" className="w-full">
          <TabsList className="grid w-full grid-cols-2 border-b">
            <TabsTrigger value="structures">Fee Structures</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          <TabsContent value="structures" className="mt-4">
            <StructuresTab schoolId={schoolId} options={optionsQuery.data} loadingOptions={optionsQuery.isLoading} />
          </TabsContent>
          <TabsContent value="categories" className="mt-4">
            <CategoriesTab schoolId={schoolId} />
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// Categories tab
// ---------------------------------------------------------------------------

function CategoriesTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FeeCategory | "new" | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  const categories = useQuery<FeeCategory[]>({
    queryKey: ["billing", schoolId, "categories"],
    queryFn: () => fetchJson(billingApi.listCategories(schoolId), "Failed to load fee categories"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["billing", schoolId] });

  const seed = useMutation({
    mutationFn: () => fetchJson<{ created: number }>(billingApi.seedDefaultCategories(schoolId), "Could not add default categories"),
    onSuccess: (r) => {
      setNotice({ kind: "success", message: r.created ? `Added ${r.created} default categories.` : "All default categories already exist." });
      invalidate();
    },
    onError: (e: unknown) => setNotice({ kind: "error", message: getErrorMessage(e, "Could not add default categories") }),
  });

  const toggle = useMutation({
    mutationFn: (c: FeeCategory) => fetchJson(billingApi.setCategoryActive(schoolId, c.id, !c.is_active), "Could not update category"),
    onSuccess: invalidate,
    onError: (e: unknown) => setNotice({ kind: "error", message: getErrorMessage(e, "Could not update category") }),
  });

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Fee categories</CardTitle>
          <CardDescription>The types of fees your school charges. Deactivate a category to stop using it for new fees.</CardDescription>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => seed.mutate()} disabled={seed.isPending}>
            {seed.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Add defaults
          </Button>
          <Button onClick={() => setEditing("new")}><Plus className="mr-2 h-4 w-4" />New category</Button>
        </div>
      </CardHeader>
      <CardContent>
        {notice && <Feedback {...notice} />}
        {categories.isLoading ? (
          <div className="py-10 text-center text-slate-500">Loading categories…</div>
        ) : categories.isError ? (
          <Feedback kind="error" message={getErrorMessage(categories.error, "Failed to load fee categories")} />
        ) : !categories.data?.length ? (
          <div className="py-10 text-center text-slate-500">
            No fee categories yet. Use <strong>Add defaults</strong> to start with Tuition, Boarding, Transport and more.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.data.map((c) => (
                <TableRow key={c.id} className={c.is_active ? "" : "opacity-60"}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><code className="text-xs">{c.code}</code></TableCell>
                  <TableCell className="hidden md:table-cell text-slate-600">{c.description || "—"}</TableCell>
                  <TableCell className="text-right">{c._count?.fee_structures ?? 0}</TableCell>
                  <TableCell>
                    <Switch checked={c.is_active} disabled={toggle.isPending} onCheckedChange={() => toggle.mutate(c)} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {editing && (
        <CategoryDialog
          schoolId={schoolId}
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); setNotice({ kind: "success", message: msg }); invalidate(); }}
        />
      )}
    </Card>
  );
}

function CategoryDialog({
  schoolId, category, onClose, onSaved,
}: { schoolId: string; category: FeeCategory | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [code, setCode] = useState(category?.code ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), code: code.trim().toUpperCase(), description: description.trim() || undefined };
      return fetchJson(
        category ? billingApi.updateCategory(schoolId, category.id, body) : billingApi.createCategory(schoolId, body),
        "Could not save category",
      );
    },
    onSuccess: () => onSaved(category ? "Category updated." : "Category created."),
    onError: (e: unknown) => setError(getErrorMessage(e, "Could not save category")),
  });

  const codeValid = /^[A-Z0-9_]{2,30}$/.test(code.trim().toUpperCase());
  const canSave = name.trim().length > 0 && codeValid && !save.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New fee category"}</DialogTitle>
        </DialogHeader>
        {error && <Feedback kind="error" message={error} />}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tuition" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-code">Code</Label>
            <Input id="cat-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="TUITION" />
            {code && !codeValid && <p className="text-xs text-red-600">2–30 uppercase letters, digits or underscores.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!canSave}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Structures tab
// ---------------------------------------------------------------------------

function StructuresTab({
  schoolId, options, loadingOptions,
}: { schoolId: string; options?: BillingOptions; loadingOptions: boolean }) {
  const qc = useQueryClient();
  const academicYears = useAcademicYears(schoolId);
  const [yearId, setYearId] = useState<string>("");
  const [termFilter, setTermFilter] = useState<string>(ALL);
  const [classFilter, setClassFilter] = useState<string>(ALL);
  const [editing, setEditing] = useState<FeeStructure | "new" | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [assigning, setAssigning] = useState<FeeStructure | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  // Default to the active year, else the most recent one.
  useEffect(() => {
    if (!yearId && academicYears.length) {
      setYearId((academicYears.find((y) => y.status?.toLowerCase() === "active") ?? academicYears[0]).id);
    }
  }, [academicYears, yearId]);

  const year = options?.years.find((y) => y.id === yearId);
  const currency = options?.currency ?? "UGX";

  const structures = useQuery<FeeStructure[]>({
    queryKey: ["billing", schoolId, "structures", yearId, termFilter, classFilter],
    enabled: !!yearId,
    placeholderData: (prev) => prev,
    queryFn: () =>
      fetchJson(
        billingApi.listStructures(schoolId, {
          academicYearId: yearId,
          termId: termFilter !== ALL && termFilter !== NONE ? termFilter : undefined,
          classroomId: classFilter !== ALL && classFilter !== NONE ? classFilter : undefined,
        }),
        "Failed to load fee structures",
      ),
  });

  // "Year-level" / "School-wide" filters are applied client-side (null fields).
  const rows = useMemo(
    () =>
      (structures.data ?? []).filter(
        (s) => (termFilter !== NONE || !s.term_template_item_id) && (classFilter !== NONE || !s.classroom_definition_id),
      ),
    [structures.data, termFilter, classFilter],
  );

  const toggle = useMutation({
    mutationFn: (s: FeeStructure) => fetchJson(billingApi.setStructureActive(schoolId, s.id, !s.is_active), "Could not update fee"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing", schoolId, "structures"] }),
    onError: (e: unknown) => setNotice({ kind: "error", message: getErrorMessage(e, "Could not update fee") }),
  });

  if (loadingOptions) return <div className="py-10 text-center text-slate-500">Loading…</div>;
  if (!options?.years.length) {
    return <Alert><AlertDescription>Create an academic year under Academic Structure before setting up fees.</AlertDescription></Alert>;
  }
  const noCategories = !options.categories.some((c) => c.is_active);

  return (
    <Card className="border-slate-200">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Fee structures</CardTitle>
            <CardDescription>What each class is charged per term or year. Optional fees are billed only to assigned students.</CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setCopyOpen(true)}><Copy className="mr-2 h-4 w-4" />Copy from…</Button>
            <Button onClick={() => setEditing(editing ? null : "new")} disabled={noCategories && !editing}>
              {editing ? <Eye className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editing ? "View fees" : "New fee"}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FilterSelect label="Academic year" value={yearId} onChange={(v) => { setYearId(v); setTermFilter(ALL); }}
            items={academicYears.map(academicYearOption)} />
          <FilterSelect label="Term" value={termFilter} onChange={setTermFilter}
            items={[{ value: ALL, label: "All terms" }, { value: NONE, label: "Year-level only" },
            ...(year?.terms ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
          <FilterSelect label="Class" value={classFilter} onChange={setClassFilter}
            items={[{ value: ALL, label: "All classes" }, { value: NONE, label: "School-wide only" },
            ...options.classrooms.map((c) => ({ value: c.id, label: c.name }))]} />
        </div>
      </CardHeader>
      {editing && (
        <CardContent className="pt-0">
          <StructureForm
            key={editing === "new" ? "new" : editing.id}
            schoolId={schoolId}
            options={options}
            academicYears={academicYears}
            defaultYearId={yearId}
            structure={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={(msg) => {
              setEditing(null);
              setNotice({ kind: "success", message: msg });
              qc.invalidateQueries({ queryKey: ["billing", schoolId] });
            }}
          />
        </CardContent>
      )}
      <CardContent>
        {notice && <Feedback {...notice} />}
        {noCategories && <Feedback kind="error" message="Add at least one active fee category (Categories tab) before creating fees." />}
        {structures.isLoading ? (
          <div className="py-10 text-center text-slate-500">Loading fees…</div>
        ) : structures.isError ? (
          <Feedback kind="error" message={getErrorMessage(structures.error, "Failed to load fee structures")} />
        ) : !rows.length ? (
          <div className="py-10 text-center text-slate-500">No fees match these filters. Create one, or copy from a previous term.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id} className={s.is_active ? "" : "opacity-60"}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {s.name}
                        {s.is_locked && <Lock className="h-3.5 w-3.5 text-slate-400" aria-label="Invoiced: amount locked" />}
                      </div>
                      <div className="text-xs text-slate-500">
                        {FREQUENCY_LABEL[s.frequency]}{s.due_date ? ` · due ${new Date(s.due_date).toLocaleDateString()}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>{s.fee_category.name}</TableCell>
                    <TableCell>{s.term_template_item?.name ?? <span className="text-slate-500">Whole year</span>}</TableCell>
                    <TableCell>{s.classroom_definition?.name ?? <span className="text-slate-500">All classes</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(s.amount, currency)}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_mandatory ? "secondary" : "outline"}>{s.is_mandatory ? "Mandatory" : "Optional"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={s.is_active} disabled={toggle.isPending} onCheckedChange={() => toggle.mutate(s)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex">
                        <Button variant="ghost" size="icon" onClick={() => setAssigning(s)}
                          aria-label={`Students for ${s.name}`} title={s.is_mandatory ? "Student overrides & waivers" : "Assign students"}>
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {assigning && (
        <AssignStudentsDialog
          schoolId={schoolId}
          currency={currency}
          structure={assigning}
          onClose={() => setAssigning(null)}
        />
      )}

      {copyOpen && (
        <CopyDialog
          schoolId={schoolId}
          options={options}
          academicYears={academicYears}
          targetYearId={yearId}
          onClose={() => setCopyOpen(false)}
          onDone={(msg) => {
            setCopyOpen(false);
            setNotice({ kind: "success", message: msg });
            qc.invalidateQueries({ queryKey: ["billing", schoolId, "structures"] });
          }}
        />
      )}
    </Card>
  );
}

function StructureForm({
  schoolId, options, academicYears, defaultYearId, structure, onClose, onSaved,
}: {
  schoolId: string;
  options: BillingOptions;
  academicYears: AcademicYearOptionData[];
  defaultYearId: string;
  structure: FeeStructure | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const locked = !!structure?.is_locked;
  const [yearId, setYearId] = useState(structure?.academic_year_id ?? defaultYearId);
  const [termId, setTermId] = useState(structure?.term_template_item_id ?? NONE);
  const [classId, setClassId] = useState(structure?.classroom_definition_id ?? NONE);
  const [categoryId, setCategoryId] = useState(structure?.fee_category_id ?? "");
  const [name, setName] = useState(structure?.name ?? "");
  const [amount, setAmount] = useState(structure?.amount ?? "");
  const [dueDate, setDueDate] = useState(structure?.due_date?.slice(0, 10) ?? "");
  const [frequency, setFrequency] = useState<Frequency>(structure?.frequency ?? "PER_TERM");
  const [mandatory, setMandatory] = useState(structure?.is_mandatory ?? true);
  const [error, setError] = useState<string | null>(null);

  const year = options.years.find((y) => y.id === yearId);
  const normalizedAmount = normalizeAmountInput(String(amount));
  const amountValid = AMOUNT_PATTERN.test(normalizedAmount) && Number(normalizedAmount) > 0;
  const termRequired = frequency === "PER_TERM";
  const canSave = !!name.trim() && !!categoryId && amountValid && (!termRequired || termId !== NONE);

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        name: name.trim(),
        due_date: dueDate || null,
        is_mandatory: mandatory,
      };
      if (!locked) {
        Object.assign(body, {
          academic_year_id: yearId,
          term_template_item_id: termId === NONE ? null : termId,
          classroom_definition_id: classId === NONE ? null : classId,
          fee_category_id: categoryId,
          amount: normalizedAmount,
          frequency,
        });
      }
      return fetchJson(
        structure ? billingApi.updateStructure(schoolId, structure.id, body) : billingApi.createStructure(schoolId, body),
        "Could not save fee",
      );
    },
    onSuccess: () => onSaved(structure ? "Fee updated." : "Fee created."),
    onError: (e: unknown) => setError(getErrorMessage(e, "Could not save fee")),
  });

  const categories = options.categories.filter((c) => c.is_active || c.id === structure?.fee_category_id);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-6">
      <div>
        <h3 className="font-semibold text-slate-900">
          {structure ? "Edit fee" : "Create New Fee"}
        </h3>
        {locked && (
          <p className="mt-2 flex items-start gap-2 text-sm text-amber-700">
            <Lock className="h-4 w-4 mt-0.5 shrink-0" />
            This fee is already on issued invoices, so its amount, term, class, category and frequency are locked.
            Create a new fee if the price changes.
          </p>
        )}
      </div>
      {error && <Feedback kind="error" message={error} />}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fs-name">Name</Label>
            <Input id="fs-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="P5 Tuition – Term 1" />
          </div>
          <FilterSelect label="Category" value={categoryId} onChange={setCategoryId} disabled={locked}
            items={categories.map((c) => ({ value: c.id, label: c.name }))} />
          <div className="space-y-1.5">
            <Label htmlFor="fs-amount" className="text-xs text-slate-500">Amount ({options.currency})</Label>
            <Input id="fs-amount" inputMode="decimal" value={amount} disabled={locked}
              onChange={(e) => setAmount(e.target.value)} placeholder="450,000" />
            {amount && !amountValid && <p className="text-xs text-red-600">Enter a positive amount (max 2 decimals).</p>}
          </div>
          <FilterSelect label="Academic year" value={yearId} disabled={locked}
            onChange={(v) => { setYearId(v); setTermId(NONE); }}
            items={academicYears.map(academicYearOption)} />
          <FilterSelect label="Frequency" value={frequency} disabled={locked}
            onChange={(v) => setFrequency(v as Frequency)}
            items={(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => ({ value: f, label: FREQUENCY_LABEL[f] }))} />
          <div>
            <FilterSelect label="Term" value={termId} onChange={setTermId} disabled={locked}
              items={[{ value: NONE, label: "Whole year" }, ...(year?.terms ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
            {termRequired && termId === NONE && <p className="mt-1 text-xs text-red-600">Per-term fees need a term.</p>}
          </div>
          <FilterSelect label="Class" value={classId} onChange={setClassId} disabled={locked}
            items={[{ value: NONE, label: "All classes" }, ...options.classrooms.map((c) => ({ value: c.id, label: c.name }))]} />
          <div className="space-y-1.5">
            <Label htmlFor="fs-due" className="text-xs text-slate-500">Due date (optional)</Label>
            <Input id="fs-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:mt-5">
            <div>
              <Label htmlFor="fs-mandatory">Mandatory</Label>
              <p className="text-xs text-slate-500">{mandatory ? "Billed to every student in scope" : "Billed only to assigned students"}</p>
            </div>
            <Switch id="fs-mandatory" checked={mandatory} onCheckedChange={setMandatory} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!canSave || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
          </Button>
        </div>
      </form>
    </section>
  );
}

function CopyDialog({
  schoolId, options, academicYears, targetYearId, onClose, onDone,
}: {
  schoolId: string;
  options: BillingOptions;
  academicYears: AcademicYearOptionData[];
  targetYearId: string;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [fromYearId, setFromYearId] = useState(academicYears.find((y) => y.id !== targetYearId)?.id ?? targetYearId);
  const [fromTermId, setFromTermId] = useState(ALL);
  const [toYearId, setToYearId] = useState(targetYearId);
  const [toTermId, setToTermId] = useState(NONE);
  const [error, setError] = useState<string | null>(null);

  const fromYear = options.years.find((y) => y.id === fromYearId);
  const toYear = options.years.find((y) => y.id === toYearId);
  const singleTerm = fromTermId !== ALL;
  const canCopy = !(singleTerm && toTermId === NONE) && !(fromYearId === toYearId && (!singleTerm || fromTermId === toTermId));

  const copy = useMutation({
    mutationFn: () =>
      fetchJson<{ created: number; skipped: { name: string; reason: string }[] }>(
        billingApi.copyStructures(schoolId, {
          from_academic_year_id: fromYearId,
          from_term_template_item_id: singleTerm ? fromTermId : undefined,
          to_academic_year_id: toYearId,
          to_term_template_item_id: singleTerm ? toTermId : undefined,
        }),
        "Could not copy fees",
      ),
    onSuccess: (r) =>
      onDone(`Copied ${r.created} fee${r.created === 1 ? "" : "s"}${r.skipped.length ? `, skipped ${r.skipped.length} (already present or no matching term)` : ""}. Review due dates on the copied fees.`),
    onError: (e: unknown) => setError(getErrorMessage(e, "Could not copy fees")),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy fees</DialogTitle>
          <DialogDescription>
            Copies active fees with their amounts. Fees that already exist in the target are skipped, so this is safe to repeat.
            Due dates are not copied.
          </DialogDescription>
        </DialogHeader>
        {error && <Feedback kind="error" message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <FilterSelect label="From year" value={fromYearId} onChange={(v) => { setFromYearId(v); setFromTermId(ALL); }}
            items={academicYears.map(academicYearOption)} />
          <FilterSelect label="From term" value={fromTermId} onChange={setFromTermId}
            items={[{ value: ALL, label: "All terms (map by term number)" }, ...(fromYear?.terms ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
          <FilterSelect label="To year" value={toYearId} onChange={(v) => { setToYearId(v); setToTermId(NONE); }}
            items={academicYears.map(academicYearOption)} />
          {singleTerm && (
            <FilterSelect label="To term" value={toTermId} onChange={setToTermId}
              items={[{ value: NONE, label: "Select term" }, ...(toYear?.terms ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => copy.mutate()} disabled={!canCopy || copy.isPending}>
            {copy.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Copy fees
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
