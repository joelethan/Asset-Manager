import React, { useMemo, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, Eye, Edit2, DollarSign } from "lucide-react";

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
      pageItems.forEach((s) => newSelected.add(s.id));
      setSelectedIds(newSelected);
      const selectedStudents = students.filter((s) => newSelected.has(s.id));
      onSelectionChange?.(selectedStudents);
    } else {
      const newSelected = new Set(selectedIds);
      pageItems.forEach((s) => newSelected.delete(s.id));
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

  const isAllPageSelected = pageItems.length > 0 && pageItems.every((s) => selectedIds.has(s.id));
  const isPartialSelected = pageItems.some((s) => selectedIds.has(s.id)) && !isAllPageSelected;

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
    a.download = `students-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle>All Students</CardTitle>
          <CardDescription>Total: {students.length} students</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by name, reg or student no"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-sm"
          />
          <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
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
          <Table>
            <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllPageSelected}
                      indeterminate={isPartialSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all on page"
                    />
                  </TableHead>
                <TableHead>Student No</TableHead>
                <TableHead>Reg No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Birth Date</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(s.id)}
                      onCheckedChange={(checked) => handleSelectRow(s.id, checked as boolean)}
                      aria-label={`Select ${s.first_name} ${s.last_name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{s.student_no || "-"}</TableCell>
                  <TableCell>{s.reg_no || "-"}</TableCell>
                  <TableCell>{`${s.first_name || ""} ${s.last_name || ""}`}</TableCell>
                  <TableCell>{s.gender || "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : s.status === "Inactive"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>{s.status || "-"}</span>
                  </TableCell>
                  <TableCell>{s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>{s.created_at ? new Date(s.created_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" className="hover:bg-slate-100" aria-label="View student">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="hover:bg-slate-100" aria-label="Edit student">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="hover:bg-slate-100" aria-label="Student fees">
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">Showing {start + 1}–{Math.min(start + perPage, total)} of {total} entries</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <div className="px-2">{page} / {totalPages}</div>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
