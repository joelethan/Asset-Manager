import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertCircle, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/context/TenantContext";
import { Checkbox } from "@/components/ui/checkbox";

interface AcademicYear {
  id: string;
  name: string;
  status: string;
}

interface Term {
  id: string;
  name: string;
  ordinal: number;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_no: string;
}

interface ReportCard {
  id: string;
  student_id: string;
  academic_year_id: string;
  term_id: string;
  overall_average: string;
  total_subjects: number;
  rank?: number;
  total_students?: number;
  status: string;
  generated_at: string;
}

interface ReportCardSummary {
  subject: {
    name: string;
  };
  average: string;
  letterGrade: string;
}

interface ReportCardDetail extends ReportCard {
  summary?: {
    overallAverage: string;
    overallLetterGrade: string;
    subjects: ReportCardSummary[];
  };
}

export default function ReportCards() {
  const { toast } = useToast();
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string;

  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [includeRank, setIncludeRank] = useState(true);
  const [autoPublish, setAutoPublish] = useState(false);
  const [selectedReportCard, setSelectedReportCard] = useState<ReportCardDetail | null>(null);

  // Fetch data on mount
  useEffect(() => {
    if (schoolId) {
      fetchAcademicYears();
      fetchStudents();
      fetchReportCards();
    }
  }, [schoolId]);

  // Fetch terms when year changes
  useEffect(() => {
    if (selectedYear) {
      fetchTerms(selectedYear);
    }
  }, [selectedYear]);

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/years`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch academic years");
      const data = await response.json();
      setAcademicYears(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.warn("Failed to fetch academic years");
    }
  };

  const fetchTerms = async (yearId: string) => {
    try {
      const response = await fetch(`/api/years/${yearId}/terms`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch terms");
      const data = await response.json();
      setTerms(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.warn("Failed to fetch terms");
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/students?schoolId=${schoolId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      setStudents(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.warn("Failed to fetch students");
    }
  };

  const fetchReportCards = async () => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/report-cards`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch report cards");
      const data = await response.json();
      setReportCards(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.warn("Failed to fetch report cards");
    }
  };

  const handleGenerateReportCard = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedYear || !selectedTerm || !selectedStudent) {
      toast({ title: "Error", description: "Please select all required fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/schools/${schoolId}/report-cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          studentId: selectedStudent,
          academicYearId: selectedYear,
          termId: selectedTerm,
          includeRank,
          autoPublish,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate report card");

      const newReportCard = await response.json();
      setReportCards([...reportCards, newReportCard]);
      setSelectedStudent("");
      toast({ title: "Success", description: "Report card generated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate report card", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishReportCard = async (reportCardId: string) => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/report-cards/${reportCardId}/publish`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!response.ok) throw new Error("Failed to publish report card");

      setReportCards(
        reportCards.map((rc) =>
          rc.id === reportCardId ? { ...rc, status: "published" } : rc
        )
      );
      toast({ title: "Success", description: "Report card published successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to publish report card", variant: "destructive" });
    }
  };

  const handleViewReportCard = async (reportCardId: string) => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/report-cards/${reportCardId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!response.ok) throw new Error("Failed to fetch report card details");

      const data = await response.json();
      setSelectedReportCard(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load report card details", variant: "destructive" });
    }
  };

  const getStudentName = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    return student ? `${student.first_name} ${student.last_name}` : "-";
  };

  const getTermName = (termId: string) => {
    const term = terms.find((t) => t.id === termId);
    return term ? term.name : "-";
  };

  const getYearName = (yearId: string) => {
    const year = academicYears.find((y) => y.id === yearId);
    return year ? year.name : "-";
  };

  return (
    <AppLayout
      title="Report Cards"
      description="Generate and manage student report cards"
      breadcrumbs={[{ label: "Report Cards" }]}
    >
      <Tabs defaultValue="reports" className="w-full">
        <TabsList>
          <TabsTrigger value="reports">Report Cards</TabsTrigger>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
        </TabsList>

        {/* Report Cards List Tab */}
        <TabsContent value="reports" className="space-y-4">
          {selectedReportCard ? (
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{getStudentName(selectedReportCard.student_id)}</CardTitle>
                    <CardDescription>
                      {getTermName(selectedReportCard.term_id)} {getYearName(selectedReportCard.academic_year_id)}
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedReportCard(null)}>
                    Back to List
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-slate-50 border-0">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-slate-500 text-sm">Overall Average</p>
                        <p className="text-3xl font-bold text-primary">
                          {selectedReportCard.summary?.overallAverage || selectedReportCard.overall_average}
                        </p>
                        <p className="text-lg font-semibold mt-2">
                          {selectedReportCard.summary?.overallLetterGrade}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50 border-0">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-slate-500 text-sm">Class Rank</p>
                        <p className="text-3xl font-bold text-primary">
                          {selectedReportCard.rank || "-"}
                        </p>
                        <p className="text-sm text-slate-600 mt-2">
                          of {selectedReportCard.total_students || "-"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedReportCard.summary?.subjects && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Subject Results</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Average</TableHead>
                          <TableHead>Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReportCard.summary.subjects.map((subject, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{subject.subject.name}</TableCell>
                            <TableCell>{subject.average}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {subject.letterGrade}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedReportCard.status === "draft" && (
                    <Button
                      onClick={() => handlePublishReportCard(selectedReportCard.id)}
                      className="flex-1"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Publish Report Card
                    </Button>
                  )}
                  {selectedReportCard.status === "published" && (
                    <span className="flex-1 px-4 py-2 rounded-md bg-green-100 text-green-700 text-sm font-medium text-center">
                      Published
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : reportCards.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                  <AlertCircle className="h-8 w-8 text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900">No report cards yet</h3>
                  <p className="text-slate-500 max-w-sm mt-2">Generate your first report card.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>All Report Cards</CardTitle>
                <CardDescription>Total: {reportCards.length} report cards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Average</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportCards.map((rc) => (
                        <TableRow key={rc.id}>
                          <TableCell className="font-medium">{getStudentName(rc.student_id)}</TableCell>
                          <TableCell>{getYearName(rc.academic_year_id)}</TableCell>
                          <TableCell>{getTermName(rc.term_id)}</TableCell>
                          <TableCell>{rc.overall_average}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              rc.status === "published"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {rc.status.charAt(0).toUpperCase() + rc.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewReportCard(rc.id)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Generate Report Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Generate Report Card</CardTitle>
              <CardDescription>Create a new report card for a student (10.1)</CardDescription>
            </CardHeader>
            <CardContent>
              {academicYears.length === 0 || students.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please create academic years and students first before generating reports.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleGenerateReportCard} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label>Academic Year *</label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select academic year" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYears.map((year) => (
                            <SelectItem key={year.id} value={year.id}>
                              {year.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label>Term *</label>
                      <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={!selectedYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          {terms.map((term) => (
                            <SelectItem key={term.id} value={term.id}>
                              {term.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label>Student *</label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.student_no} - {student.first_name} {student.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includeRank"
                        checked={includeRank}
                        onCheckedChange={(checked) => setIncludeRank(checked as boolean)}
                      />
                      <label htmlFor="includeRank" className="cursor-pointer">
                        Include Rank (if enrolled in classroom with other students)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="autoPublish"
                        checked={autoPublish}
                        onCheckedChange={(checked) => setAutoPublish(checked as boolean)}
                      />
                      <label htmlFor="autoPublish" className="cursor-pointer">
                        Auto Publish
                      </label>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Endpoint: POST /schools/{schoolId}/report-cards
                    </AlertDescription>
                  </Alert>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Generate Report Card
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
