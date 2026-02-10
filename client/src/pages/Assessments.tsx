import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/context/TenantContext";
import { academicYearsApi, termsApi, subjectsApi, assessmentsApi } from "@/lib/api";

interface AcademicYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  termTemplateId: string;
}

interface Term {
  id: string;
  name: string;
  ordinal: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Assessment {
  id: string;
  school_id: string;
  term_id: string;
  subject_id: string;
  name: string;
  type: string;
  max_score: string;
  weight: string;
  assessment_date?: string;
}

interface AssessmentFormData {
  termId: string;
  subjectId: string;
  name: string;
  type: string;
  maxScore: string;
  weight: string;
  assessmentDate: string;
}

export default function Assessments() {
  const { toast } = useToast();
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string;

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState<AssessmentFormData>({
    termId: "",
    subjectId: "",
    name: "",
    type: "exam",
    maxScore: "100",
    weight: "0.4",
    assessmentDate: new Date().toISOString().split("T")[0],
  });

  // Fetch data on mount
  useEffect(() => {
    if (schoolId) {
      fetchAcademicYears();
      fetchSubjects();
    }
  }, [schoolId]);

  // Fetch terms when academic year is selected
  useEffect(() => {
    if (selectedYearId) {
      fetchTerms(selectedYearId);
      fetchAssessments();
    }
  }, [selectedYearId]);

  const fetchAcademicYears = async () => {
    try {
      const response = await academicYearsApi.list(schoolId);
      if (!response.ok) throw new Error("Failed to fetch academic years");
      const data = await response.json();
      const years = Array.isArray(data) ? data : data.data || [];
      setAcademicYears(years);
      
      // Auto-select first year if available
      if (years.length > 0) {
        setSelectedYearId(years[0].id);
      }
    } catch (error) {
      console.warn("Failed to fetch academic years");
      toast({ title: "Error", description: "Failed to fetch academic years", variant: "destructive" });
    }
  };

  const fetchAssessments = async () => {
    try {
      // We'll fetch assessments for the specific year by getting terms first
      // then fetching assessments filtered by those terms
      const response = await fetch(`/api/schools/${schoolId}/assessments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch assessments");
      const data = await response.json();
      setAssessments(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.warn("Failed to fetch assessments");
    }
  };


  const fetchSubjects = async () => {
    try {
      const response = await subjectsApi.list(schoolId);
      if (!response.ok) throw new Error("Failed to fetch subjects");
      const data = await response.json();
      setSubjects(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.warn("Failed to fetch subjects");
      toast({ title: "Error", description: "Failed to fetch subjects", variant: "destructive" });
    }
  };

  const fetchTerms = async (yearId: number) => {
    try {
      const response = await termsApi.list(yearId);
      if (!response.ok) throw new Error("Failed to fetch terms");
      const data = await response.json();
      setTerms(Array.isArray(data) ? data : data.data || []);
      // Reset term selection when year changes
      setAssessmentForm((prev: AssessmentFormData) => ({ ...prev, termId: "" }));
    } catch (error) {
      console.warn("Failed to fetch terms");
      toast({ title: "Error", description: "Failed to fetch terms", variant: "destructive" });
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await assessmentsApi.create(schoolId, {
        termId: assessmentForm.termId,
        subjectId: assessmentForm.subjectId,
        name: assessmentForm.name,
        type: assessmentForm.type,
        maxScore: parseFloat(assessmentForm.maxScore),
        weight: parseFloat(assessmentForm.weight),
        assessmentDate: new Date(assessmentForm.assessmentDate).toISOString(),
      });

      if (!response.ok) throw new Error("Failed to create assessment");

      const newAssessment = await response.json();
      setAssessments([...assessments, newAssessment]);
      setAssessmentForm({
        termId: "",
        subjectId: "",
        name: "",
        type: "exam",
        maxScore: "100",
        weight: "0.4",
        assessmentDate: new Date().toISOString().split("T")[0],
      });
      toast({ title: "Success", description: "Assessment created successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create assessment", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;

    try {
      const response = await assessmentsApi.delete(schoolId, assessmentId);

      if (!response.ok) throw new Error("Failed to delete assessment");

      setAssessments(assessments.filter((a: Assessment) => a.id !== assessmentId));
      toast({ title: "Success", description: "Assessment deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete assessment", variant: "destructive" });
    }
  };

  return (
    <AppLayout
      title="Assessments"
      description="Manage school assessments and exams"
      breadcrumbs={[{ label: "Assessments" }]}
    >
      {/* Academic Year Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Academic Year</CardTitle>
        </CardHeader>
        <CardContent>
          {academicYears.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No academic years found. Please create an academic year first.
              </AlertDescription>
            </Alert>
          ) : (
            <Select
              value={selectedYearId?.toString() || ""}
              onValueChange={(value: string) => setSelectedYearId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an academic year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year: AcademicYear) => (
                  <SelectItem key={year.id} value={year.id.toString()}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="assessments" className="w-full">
        <TabsList>
          <TabsTrigger value="assessments">Assessment List</TabsTrigger>
          <TabsTrigger value="create">Create Assessment</TabsTrigger>
        </TabsList>

        {/* Assessments List Tab */}
        <TabsContent value="assessments" className="space-y-4">
          {assessments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                  <AlertCircle className="h-8 w-8 text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900">No assessments yet</h3>
                  <p className="text-slate-500 max-w-sm mt-2">Create your first assessment to get started.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Assessments</CardTitle>
                <CardDescription>Total: {assessments.length} assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Max Score</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assessments.map((assessment: Assessment) => {
                        const subject = subjects.find((s: Subject) => s.id === assessment.subject_id);
                        return (
                          <TableRow key={assessment.id}>
                            <TableCell className="font-medium">{assessment.name}</TableCell>
                            <TableCell>{subject?.name || "-"}</TableCell>
                            <TableCell>{assessment.type}</TableCell>
                            <TableCell>{assessment.max_score}</TableCell>
                            <TableCell>{assessment.weight}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAssessment(assessment.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Create Assessment Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Assessment</CardTitle>
              <CardDescription>Add a new assessment or exam (7.1)</CardDescription>
            </CardHeader>
            <CardContent>
              {terms.length === 0 || subjects.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please create terms and subjects first before creating assessments.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleCreateAssessment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="term">Term *</Label>
                      <Select value={assessmentForm.termId} onValueChange={(value: string) => setAssessmentForm({ ...assessmentForm, termId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a term" />
                        </SelectTrigger>
                        <SelectContent>
                          {terms.map((term: Term) => (
                            <SelectItem key={term.id} value={term.id}>
                              {term.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Select value={assessmentForm.subjectId} onValueChange={(value: string) => setAssessmentForm({ ...assessmentForm, subjectId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject: Subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Assessment Name *</Label>
                    <Input
                      id="name"
                      placeholder="Mid-Term Exam"
                      value={assessmentForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssessmentForm({ ...assessmentForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Assessment Type *</Label>
                      <Select value={assessmentForm.type} onValueChange={(value: string) => setAssessmentForm({ ...assessmentForm, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exam">Exam</SelectItem>
                          <SelectItem value="test">Test</SelectItem>
                          <SelectItem value="quiz">Quiz</SelectItem>
                          <SelectItem value="homework">Homework</SelectItem>
                          <SelectItem value="project">Project</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxScore">Max Score *</Label>
                      <Input
                        id="maxScore"
                        type="number"
                        placeholder="100"
                        value={assessmentForm.maxScore}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssessmentForm({ ...assessmentForm, maxScore: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight *</Label>
                      <Input
                        id="weight"
                        type="number"
                        placeholder="0.4"
                        step="0.1"
                        value={assessmentForm.weight}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssessmentForm({ ...assessmentForm, weight: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Assessment Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={assessmentForm.assessmentDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssessmentForm({ ...assessmentForm, assessmentDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Endpoint: POST /schools/{schoolId}/assessments
                    </AlertDescription>
                  </Alert>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Assessment
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
