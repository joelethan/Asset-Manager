import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { billingApi } from "@/lib/api";
import { AMOUNT_PATTERN, formatMoney, normalizeAmountInput } from "@/lib/money";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { Feedback, fetchJson, StudentRef, studentName } from "./shared";

interface Assignment {
  id: string;
  amount_override: string | null;
  waived_amount: string;
  waiver_reason: string | null;
}
interface EligibleStudent extends StudentRef {
  classroom: { id: string; name: string } | null;
  assignment: Assignment | null;
}
interface StructureLike { id: string; name: string; amount: string; is_mandatory: boolean }

/**
 * Optional fee: pick which students it is billed to.
 * Mandatory fee: everyone is billed; this dialog is used to record per-student overrides/waivers
 * (which requires an assignment row).
 */
export function AssignStudentsDialog({
  schoolId, currency, structure, onClose,
}: { schoolId: string; currency: string; structure: StructureLike; onClose: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EligibleStudent | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const queryKey = ["billing", schoolId, "eligible", structure.id];

  const students = useQuery<EligibleStudent[]>({
    queryKey,
    queryFn: () => fetchJson(billingApi.eligibleStudents(schoolId, structure.id), "Failed to load students"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (students.data ?? []).filter(
      (s) => !q || studentName(s).toLowerCase().includes(q) || s.student_no?.toLowerCase().includes(q),
    );
  }, [students.data, search]);
  const unassigned = filtered.filter((s) => !s.assignment);
  const assignedCount = (students.data ?? []).filter((s) => s.assignment).length;

  const refresh = () => qc.invalidateQueries({ queryKey });

  const assign = useMutation({
    mutationFn: () =>
      fetchJson(billingApi.assignStudents(schoolId, { fee_structure_id: structure.id, student_ids: Array.from(selected) }), "Could not assign students"),
    onSuccess: () => {
      setNotice({ kind: "success", message: `Assigned ${selected.size} student${selected.size === 1 ? "" : "s"}.` });
      setSelected(new Set());
      refresh();
    },
    onError: (e: Error) => setNotice({ kind: "error", message: e.message }),
  });

  const remove = useMutation({
    mutationFn: (a: Assignment) => fetchJson(billingApi.removeAssignment(schoolId, a.id), "Could not remove assignment"),
    onSuccess: refresh,
    onError: (e: Error) => setNotice({ kind: "error", message: e.message }),
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allVisibleSelected = unassigned.length > 0 && unassigned.every((s) => selected.has(s.id));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{structure.name}</DialogTitle>
          <DialogDescription>
            {structure.is_mandatory
              ? "This fee is billed to every student in scope. Add a student here only to give them a different amount or a waiver."
              : "This optional fee is billed only to the students assigned below."}{" "}
            Standard amount: {formatMoney(structure.amount, currency)}. {assignedCount} assigned.
            Changes apply to invoices generated from now on; existing invoices are not changed.
          </DialogDescription>
        </DialogHeader>
        {notice && <Feedback {...notice} />}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input placeholder="Search name or student no." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
          <Button onClick={() => assign.mutate()} disabled={!selected.size || assign.isPending}>
            {assign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign {selected.size || ""} selected
          </Button>
        </div>
        <div className="max-h-[50vh] overflow-auto rounded-md border">
          {students.isLoading ? (
            <div className="py-10 text-center text-slate-500">Loading students…</div>
          ) : students.isError ? (
            <div className="p-4"><Feedback kind="error" message={(students.error as Error).message} /></div>
          ) : !filtered.length ? (
            <div className="py-10 text-center text-slate-500">No students with an active enrollment for this fee's year and class.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={(c) => setSelected(c ? new Set(unassigned.map((s) => s.id)) : new Set())}
                      aria-label="Select all unassigned"
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Waived</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {!s.assignment && <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} aria-label={`Select ${studentName(s)}`} />}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{studentName(s)}</div>
                      <div className="text-xs text-slate-500">{s.student_no}</div>
                    </TableCell>
                    <TableCell>{s.classroom?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.assignment ? formatMoney(s.assignment.amount_override ?? structure.amount, currency) : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.assignment && Number(s.assignment.waived_amount) > 0 ? formatMoney(s.assignment.waived_amount, currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.assignment && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label="Edit amount or waiver">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(s.assignment!)}>
                            Remove
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>

      {editing?.assignment && (
        <AssignmentEditDialog
          schoolId={schoolId}
          currency={currency}
          standardAmount={structure.amount}
          student={editing}
          assignment={editing.assignment}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); setNotice({ kind: "success", message: "Saved." }); }}
        />
      )}
    </Dialog>
  );
}

function AssignmentEditDialog({
  schoolId, currency, standardAmount, student, assignment, onClose, onSaved,
}: {
  schoolId: string;
  currency: string;
  standardAmount: string;
  student: EligibleStudent;
  assignment: Assignment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [override, setOverride] = useState(assignment.amount_override ?? "");
  const [waived, setWaived] = useState(Number(assignment.waived_amount) > 0 ? assignment.waived_amount : "");
  const [reason, setReason] = useState(assignment.waiver_reason ?? "");
  const [error, setError] = useState<string | null>(null);

  const o = normalizeAmountInput(String(override));
  const w = normalizeAmountInput(String(waived));
  const overrideValid = !o || AMOUNT_PATTERN.test(o);
  const waivedValid = !w || AMOUNT_PATTERN.test(w);
  const needsReason = !!w && Number(w) > 0;
  const canSave = overrideValid && waivedValid && (!needsReason || reason.trim().length > 0);

  const save = useMutation({
    mutationFn: () =>
      fetchJson(
        billingApi.updateAssignment(schoolId, assignment.id, {
          amount_override: o || null,
          waived_amount: w || "0",
          waiver_reason: reason.trim() || undefined,
        }),
        "Could not save",
      ),
    onSuccess: onSaved,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{studentName(student)}</DialogTitle>
          <DialogDescription>Standard amount {formatMoney(standardAmount, currency)}. Waivers need a reason and are recorded against your account.</DialogDescription>
        </DialogHeader>
        {error && <Feedback kind="error" message={error} />}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="as-override">Custom amount (leave empty for the standard amount)</Label>
            <Input id="as-override" inputMode="decimal" value={override} onChange={(e) => setOverride(e.target.value)} />
            {!overrideValid && <p className="text-xs text-red-600">Enter a valid amount.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="as-waived">Waived amount</Label>
            <Input id="as-waived" inputMode="decimal" value={waived} onChange={(e) => setWaived(e.target.value)} placeholder="0" />
            {!waivedValid && <p className="text-xs text-red-600">Enter a valid amount.</p>}
          </div>
          {needsReason && (
            <div className="space-y-2">
              <Label htmlFor="as-reason">Waiver reason</Label>
              <Input id="as-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Staff child, bursary" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
