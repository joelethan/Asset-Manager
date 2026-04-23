import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertCircle, Loader2, FileText, CheckCircle2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/context/TenantContext";
import { gradesApi, reportCardsApi } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Controller, useForm } from "react-hook-form";

interface AcademicYear {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  school_id: string;
  term_template_id: string;
  created_at?: string;
  updated_at?: string;
  term_template?: {
    id: string;
    name: string;
    is_locked: boolean;
  };
}

interface Term {
  id: string;
  name: string;
  ordinal: number;
  term_template_id: string;
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
  school_id: string;
  academic_year_id: string;
  term_template_item_id: string;
  overall_average: string | number;
  total_subjects: number;
  rank?: number | null;
  total_students?: number | null;
  remarks?: string | null;
  status: 'draft' | 'published' | 'archived';
  generated_at: string;
  published_at?: string | null;
  generated_by: string;
  pdf_url?: string | null;
  student?: Student;
}

interface ClassroomDefinition {
  id: string;
  name: string;
  level: string;
  school_id: string;
  assessments?: any[];
}

interface SchoolStructure {
  years: AcademicYear[];
  terms: Term[];
  classroomDefinitions: ClassroomDefinition[];
  subjects: any[];
}

interface ReportCardSubjectSummary {
  subject: {
    name: string;
  };
  average: string | number;
  letterGrade: string;
}

interface ReportCardSummary {
  overallAverage?: string | number;
  overallLetterGrade?: string;
  subjects?: ReportCardSubjectSummary[];
}

interface ReportCardDetail extends ReportCard {
  summary?: ReportCardSummary;
}

export default function ReportCards() {
  const { toast } = useToast();
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string;

  // Structure data from gradesApi.getStructure
  const [structure, setStructure] = useState<SchoolStructure | null>(null);
  const [structureLoading, setStructureLoading] = useState(false);

  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReportCard, setSelectedReportCard] = useState<ReportCardDetail | null>(null);
  const [downloadingPDFId, setDownloadingPDFId] = useState<string | null>(null);

  // Form setup with react-hook-form
  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      selectedYear: "",
      selectedTerm: "",
      selectedStudent: "",
      selectedStudents: [] as string[],
      selectedClassroom: "",
      generationMode: 'single' as 'single' | 'multiple' | 'classroom',
      includeRank: true,
      autoPublish: false,
    },
  });

  // Fetch data on mount
  useEffect(() => {
    if (schoolId) {
      fetchStructure();
      fetchStudents();
      fetchReportCards();
    }
  }, [schoolId]);

  const fetchStructure = async () => {
    if (!schoolId) return;
    setStructureLoading(true);
    try {
      const res = await gradesApi.getStructure(schoolId);
      if (!res.ok) throw new Error("Failed to fetch school structure");
      const data = await res.json();
      setStructure({
        years: data.years || [],
        terms: data.terms || [],
        classroomDefinitions: data.classroomDefinitions || [],
        subjects: data.subjects || []
      });
    } catch (error) {
      console.warn("Failed to fetch school structure:", error);
    } finally {
      setStructureLoading(false);
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
      const response = await reportCardsApi.list(schoolId);
      if (!response.ok) throw new Error("Failed to fetch report cards");
      const data = await response.json();
      setReportCards(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.warn("Failed to fetch report cards");
    }
  };

  const handleGenerateReportCard = async (data: any) => {
    const { selectedYear, selectedTerm, selectedStudent, selectedStudents, selectedClassroom, generationMode, includeRank, autoPublish } = data;

    if (!selectedYear || !selectedTerm) {
      toast({ title: "Error", description: "Please select academic year and term", variant: "destructive" });
      return;
    }

    let payload: any = {
      academicYearId: selectedYear,
      termTemplateItemId: selectedTerm,
      includeRank,
      autoPublish,
    };

    if (generationMode === 'single') {
      if (!selectedStudent) {
        toast({ title: "Error", description: "Please select a student", variant: "destructive" });
        return;
      }
      payload.studentId = selectedStudent;
    } else if (generationMode === 'multiple') {
      if (selectedStudents.length === 0) {
        toast({ title: "Error", description: "Please select at least one student", variant: "destructive" });
        return;
      }
      payload.studentIds = selectedStudents;
    } else if (generationMode === 'classroom') {
      if (!selectedClassroom) {
        toast({ title: "Error", description: "Please select a classroom", variant: "destructive" });
        return;
      }
      payload.classroomDefinitionId = selectedClassroom;
    }

    setIsLoading(true);

    try {
      const response = await reportCardsApi.generate(schoolId, payload);

      if (!response.ok) throw new Error("Failed to generate report card");

      const result = await response.json();

      // Refresh the report cards list
      await fetchReportCards();

      // Reset selections
      setValue("selectedStudent", "");
      setValue("selectedStudents", []);
      setValue("selectedClassroom", "");

      if (result.generated > 0) {
        toast({
          title: "Success",
          description: `Generated ${result.generated} report card${result.generated > 1 ? 's' : ''}${result.errors > 0 ? ` (${result.errors} failed)` : ''}`
        });
      } else {
        toast({
          title: "Warning",
          description: "No report cards were generated",
          variant: "destructive"
        });
      }

      if (result.errors > 0) {
        console.warn("Generation errors:", result.failed);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate report card", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishReportCard = async (reportCardId: string) => {
    try {
      const response = await reportCardsApi.publish(schoolId, reportCardId);

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
      const response = await reportCardsApi.get(schoolId, reportCardId);

      if (!response.ok) throw new Error("Failed to fetch report card details");

      const data = await response.json();
      setSelectedReportCard(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load report card details", variant: "destructive" });
    }
  };

  const handleDownloadPDF = async (reportCardId: string) => {
    setDownloadingPDFId(reportCardId);
    try {
      const response = await reportCardsApi.downloadPDF(schoolId, reportCardId);

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error("PDF has not been generated yet. Please wait a moment and try again.");
        }
        throw new Error("Failed to download PDF");
      }

      // Get filename from content-disposition header or create one
      const contentDisposition = response.headers.get("content-disposition");
      let fileName = "report-card.pdf";
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="([^"]+)"/);
        if (matches) fileName = matches[1];
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast({ title: "Success", description: "Report card PDF downloaded successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingPDFId(null);
    }
  };

  const getStudentName = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    return student ? `${student.first_name} ${student.last_name}` : "-";
  };

  const getTermName = (termId: string) => {
    const term = structure?.terms.find((t) => t.id === termId);
    return term ? term.name : "-";
  };

  const getYearName = (yearId: string) => {
    const year = structure?.years.find((y) => y.id === yearId);
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
                      {getTermName(selectedReportCard.term_template_item_id)} {getYearName(selectedReportCard.academic_year_id)}
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
                  <Button
                    onClick={() => handleDownloadPDF(selectedReportCard.id)}
                    variant="outline"
                    disabled={downloadingPDFId === selectedReportCard.id}
                  >
                    {downloadingPDFId === selectedReportCard.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </>
                    )}
                  </Button>
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
                          <TableCell>{getTermName(rc.term_template_item_id)}</TableCell>
                          <TableCell>{rc.overall_average}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${rc.status === "published"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                              }`}>
                              {rc.status.charAt(0).toUpperCase() + rc.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewReportCard(rc.id)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="View details"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPDF(rc.id)}
                                disabled={downloadingPDFId === rc.id}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Download PDF"
                              >
                                {downloadingPDFId === rc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
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
              <CardDescription>Generate report cards for students (10.1)</CardDescription>
            </CardHeader>
            <CardContent>
              {(structure?.years.length === 0) ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please create academic years and students first before generating reports.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit(handleGenerateReportCard)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label>Academic Year *</label>
                      <Controller
                        name="selectedYear"
                        control={control}
                        rules={{ required: "Select academic year" }}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select academic year" />
                            </SelectTrigger>
                            <SelectContent>
                              {structure?.years.map((year) => (
                                <SelectItem key={year.id} value={year.id}>
                                  {year.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.selectedYear && <p className="text-sm text-red-500">{errors.selectedYear.message as string}</p>}
                    </div>
                    <div className="space-y-2">
                      <label>Term *</label>
                      <Controller
                        name="selectedTerm"
                        control={control}
                        rules={{ required: "Select term" }}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={!watch("selectedYear")}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select term" />
                            </SelectTrigger>
                            <SelectContent>
                              {structure?.terms.map((term) => (
                                <SelectItem key={term.id} value={term.id}>
                                  {term.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.selectedTerm && <p className="text-sm text-red-500">{errors.selectedTerm.message as string}</p>}
                    </div>
                  </div>

                  {/* Generation Mode Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Generation Mode *</label>
                    <Controller
                      name="generationMode"
                      control={control}
                      render={({ field }) => (
                        <div className="flex gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="generationMode"
                              value="single"
                              checked={field.value === 'single'}
                              onChange={() => field.onChange('single')}
                            />
                            <span>Single Student</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="generationMode"
                              value="multiple"
                              checked={field.value === 'multiple'}
                              onChange={() => field.onChange('multiple')}
                            />
                            <span>Multiple Students</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="generationMode"
                              value="classroom"
                              checked={field.value === 'classroom'}
                              onChange={() => field.onChange('classroom')}
                            />
                            <span>Entire Classroom</span>
                          </label>
                        </div>
                      )}
                    />
                  </div>

                  {/* Conditional Selection Fields */}
                  {watch("generationMode") === 'single' && (
                    <div className="space-y-2">
                      <label>Student *</label>
                      <Controller
                        name="selectedStudent"
                        control={control}
                        rules={{ required: "Select a student" }}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
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
                        )}
                      />
                      {errors.selectedStudent && <p className="text-sm text-red-500">{errors.selectedStudent.message as string}</p>}
                    </div>
                  )}

                  {watch("generationMode") === 'multiple' && (
                    <div className="space-y-2">
                      <label>Students *</label>
                      <Controller
                        name="selectedStudents"
                        control={control}
                        rules={{ validate: (value) => value.length > 0 || "Select at least one student" }}
                        render={({ field }) => (
                          <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                            {students.map((student) => (
                              <label key={student.id} className="flex items-center gap-2 py-1 cursor-pointer">
                                <Checkbox
                                  checked={field.value.includes(student.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...field.value, student.id]);
                                    } else {
                                      field.onChange(field.value.filter((id: string) => id !== student.id));
                                    }
                                  }}
                                />
                                <span className="text-sm">
                                  {student.student_no} - {student.first_name} {student.last_name}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      />
                      {watch("selectedStudents")?.length > 0 && (
                        <p className="text-sm text-slate-600">
                          {watch("selectedStudents").length} student{watch("selectedStudents").length > 1 ? 's' : ''} selected
                        </p>
                      )}
                      {errors.selectedStudents && <p className="text-sm text-red-500">{errors.selectedStudents.message as string}</p>}
                    </div>
                  )}

                  {watch("generationMode") === 'classroom' && (
                    <div className="space-y-2">
                      <label>Classroom *</label>
                      <Controller
                        name="selectedClassroom"
                        control={control}
                        rules={{ required: "Select a classroom" }}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select classroom" />
                            </SelectTrigger>
                            <SelectContent>
                              {structure?.classroomDefinitions.map((classroom) => (
                                <SelectItem key={classroom.id} value={classroom.id}>
                                  {classroom.name} {classroom.level ? `(${classroom.level})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.selectedClassroom && <p className="text-sm text-red-500">{errors.selectedClassroom.message as string}</p>}
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t">
                    <Controller
                      name="includeRank"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="includeRank"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <label htmlFor="includeRank" className="cursor-pointer">
                            Include Rank (if enrolled in classroom with other students)
                          </label>
                        </div>
                      )}
                    />
                    <Controller
                      name="autoPublish"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="autoPublish"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <label htmlFor="autoPublish" className="cursor-pointer">
                            Auto Publish
                          </label>
                        </div>
                      )}
                    />
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Endpoint: POST /schools/{"{schoolId}"}/report-cards
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
                        Generate Report Card{watch("generationMode") === 'multiple' && watch("selectedStudents")?.length > 1 ? 's' : watch("generationMode") === 'classroom' ? 's' : ''}
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
