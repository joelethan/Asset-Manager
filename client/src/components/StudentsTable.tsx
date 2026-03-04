import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Download, Edit2, Eye, RefreshCw } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

type Student = {
  id: string;
  student_no?: string;
  reg_no?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  status?: string;
  date_of_birth?: string;
  avatar_url?: string;
  created_at?: string;
};

export default function StudentsTable({
  students,
  onRefresh,
  onSelectionChange,
  selectedIds: propSelectedIds,
}: {
  students: Student[];
  onRefresh?: () => void;
  onSelectionChange?: (selectedStudents: Student[]) => void;
  selectedIds?: string[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Keep internal selection in sync with external prop when provided
  useEffect(() => {
    if (!propSelectedIds) return;
    setSelectedIds(new Set(propSelectedIds));
  }, [propSelectedIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.student_no, s.reg_no, s.first_name, s.last_name, s.email, s.phone]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [students, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedIds);
      pageItems.forEach((s: Student) => newSelected.add(s.id));
      setSelectedIds(newSelected);
      const selectedStudents = students.filter((s) => newSelected.has(s.id));
      onSelectionChange?.(selectedStudents);
    } else {
      const newSelected = new Set(selectedIds);
      pageItems.forEach((s: Student) => newSelected.delete(s.id));
      setSelectedIds(newSelected);
      const selectedStudents = students.filter((s) => newSelected.has(s.id));
      onSelectionChange?.(selectedStudents);
    }
  };

  const handleSelectRow = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedIds(newSelected);
    const selectedStudents = students.filter((s) => newSelected.has(s.id));
    onSelectionChange?.(selectedStudents);
  };

  const isAllPageSelected = pageItems.length > 0 && pageItems.every((s: Student) => selectedIds.has(s.id));
  const isPartialSelected = pageItems.some((s: Student) => selectedIds.has(s.id)) && !isAllPageSelected;

  const exportCSV = () => {
    const headers = ["student_no", "reg_no", "first_name", "last_name", "email", "phone", "gender", "status", "date_of_birth", "created_at"];
    const rows = [headers.join(",")].concat(
      students.map((s) =>
        headers.map((h) => {
          const v = (s as any)[h] ?? "";
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(",")
      )
    );
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle>All Students</CardTitle>
          <CardDescription>Total: {students.length} students</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by name, reg or student no"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-sm"
          />
          <Select value={String(perPage)} onValueChange={(v: string) => { setPerPage(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 / page</SelectItem>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={() => onRefresh?.()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-sm font-medium w-12">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    ref={el => {
                      if (el) el.indeterminate = isPartialSelected;
                    }}
                    onChange={e => handleSelectAll(e.target.checked)}
                    aria-label="Select all students on page"
                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                  />
                </th>
                <th className="px-3 py-2 text-sm font-medium">Student No</th>
                <th className="px-3 py-2 text-sm font-medium">Reg No</th>
                <th className="px-3 py-2 text-sm font-medium">Name</th>
                <th className="px-3 py-2 text-sm font-medium">Gender</th>
                <th className="px-3 py-2 text-sm font-medium">Status</th>
                <th className="px-3 py-2 text-sm font-medium">Birth Date</th>
                <th className="px-3 py-2 text-sm font-medium">Joined</th>
                <th className="px-3 py-2 text-sm font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((s: Student) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={e => handleSelectRow(s.id, e.target.checked)}
                      aria-label={`Select ${s.first_name} ${s.last_name}`}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{s.student_no || "-"}</td>
                  <td className="px-3 py-2">{s.reg_no || "-"}</td>
                  <td className="px-3 py-2">{`${s.first_name || ""} ${s.last_name || ""}`}</td>
                  <td className="px-3 py-2">{s.gender || "-"}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === "active"
                      ? "bg-green-100 text-green-700"
                      : s.status === "inactive"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-700"
                      }`}>
                      {s.status || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : "-"}</td>
                  <td className="px-3 py-2">{s.created_at ? new Date(s.created_at).toLocaleDateString() : "-"}</td>
                  <td className="px-3 py-2 text-right space-x-2 flex justify-end">
                    <Button size="sm" variant="ghost" className="hover:bg-slate-100 text-blue-600 hover:text-blue-700" aria-label="View student">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="hover:bg-slate-100 text-blue-600 hover:text-blue-700" aria-label="Edit student">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="hover:bg-slate-100 text-green-600 hover:text-green-700" aria-label="Student fees">
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">Showing {start + 1}–{Math.min(start + perPage, total)} of {total} entries</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((p: number) => Math.max(1, p - 1))}>Prev</Button>
            <div className="px-2">{page} / {totalPages}</div>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
