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

interface Assessment {
  id: string;
  name: string;
  type: string;
  subject_id: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_no: string;
}

interface Grade {
  id: string;
  student_id: string;
  assessment_id: string;
  score: string;
  percentage: string;
  letter_grade: string;
  remarks?: string;
}

interface GradeEntry {
  studentId: string;
  score: string;
  remarks: string;
}

export default function Grades() {
  const { toast } = useToast();
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string;

  const [grades, setGrades] = useState<Grade[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);

  // Fetch data on mount
  useEffect(() => {
    if (schoolId) {
      fetchAssessments();
      fetchSubjects();
      fetchStudents();
      fetchGrades();
    }
  }, [schoolId]);

  const fetchAssessments = async () => {
    try {
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
      const response = await fetch(`/api/schools/${schoolId}/subjects`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch subjects");
      const data = await response.json();
      setSubjects(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.warn("Failed to fetch subjects");
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

  const fetchGrades = async () => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/grades`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch grades");
      const data = await response.json();
      setGrades(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.warn("Failed to fetch grades");
    }
  };

  const handleAssessmentChange = (assessmentId: string) => {
    setSelectedAssessment(assessmentId);
    // Initialize grade entries for all students
    const entries = students.map((student) => ({
      studentId: student.id,
      score: "",
      remarks: "",
    }));
    setGradeEntries(entries);
  };

  const handleScoreChange = (index: number, score: string) => {
    const updated = [...gradeEntries];
    updated[index].score = score;
    setGradeEntries(updated);
  };

  const handleRemarksChange = (index: number, remarks: string) => {
    const updated = [...gradeEntries];
    updated[index].remarks = remarks;
    setGradeEntries(updated);
  };

  const handleBulkCreateGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validGrades = gradeEntries.filter((g) => g.score !== "");

      if (validGrades.length === 0) {
        toast({ title: "Error", description: "Please enter at least one grade", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/schools/${schoolId}/grades/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          assessmentId: selectedAssessment,
          grades: validGrades.map((g) => ({
            studentId: g.studentId,
            score: parseFloat(g.score),
            remarks: g.remarks,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to create grades");

      const result = await response.json();
      setGradeEntries(gradeEntries.map((g) => ({ ...g, score: "", remarks: "" })));
      await fetchGrades();
      toast({
        title: "Success",
        description: `Created ${result.created} grades${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create grades", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGrade = async (gradeId: string) => {
    if (!confirm("Are you sure you want to delete this grade?")) return;

    try {
      const response = await fetch(`/api/schools/${schoolId}/grades/${gradeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!response.ok) throw new Error("Failed to delete grade");

      setGrades(grades.filter((g) => g.id !== gradeId));
      toast({ title: "Success", description: "Grade deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete grade", variant: "destructive" });
    }
  };

  return (
    <AppLayout
      title="Grades"
      description="Manage student grades and scores"
      breadcrumbs={[{ label: "Grades" }]}
    >
      <Tabs defaultValue="grades" className="w-full">
        <TabsList>
          <TabsTrigger value="grades">Grade Records</TabsTrigger>
          <TabsTrigger value="enter">Enter Grades</TabsTrigger>
        </TabsList>

        {/* Grade Records Tab */}
        <TabsContent value="grades" className="space-y-4">
          {grades.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                  <AlertCircle className="h-8 w-8 text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900">No grades yet</h3>
                  <p className="text-slate-500 max-w-sm mt-2">Enter grades for your first assessment.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Grades</CardTitle>
                <CardDescription>Total: {grades.length} grades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.map((grade) => {
                        const student = students.find((s) => s.id === grade.student_id);
                        const assessment = assessments.find((a) => a.id === grade.assessment_id);
                        return (
                          <TableRow key={grade.id}>
                            <TableCell className="font-medium">{student?.first_name} {student?.last_name}</TableCell>
                            <TableCell>{assessment?.name || "-"}</TableCell>
                            <TableCell>{grade.score}</TableCell>
                            <TableCell>{grade.percentage}%</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {grade.letter_grade}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGrade(grade.id)}
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

        {/* Enter Grades Tab */}
        <TabsContent value="enter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enter Grades in Bulk</CardTitle>
              <CardDescription>Add grades for all students in an assessment (8.1)</CardDescription>
            </CardHeader>
            <CardContent>
              {assessments.length === 0 || students.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please create assessments and students first before entering grades.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleBulkCreateGrades} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assessment">Select Assessment *</Label>
                    <Select value={selectedAssessment} onValueChange={handleAssessmentChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an assessment" />
                      </SelectTrigger>
                      <SelectContent>
                        {assessments.map((assessment) => {
                          const subject = subjects.find((s) => s.id === assessment.subject_id);
                          return (
                            <SelectItem key={assessment.id} value={assessment.id}>
                              {assessment.name} ({subject?.name})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedAssessment && gradeEntries.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Remarks</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {gradeEntries.map((entry, index) => {
                              const student = students.find((s) => s.id === entry.studentId);
                              return (
                                <TableRow key={entry.studentId}>
                                  <TableCell className="font-medium">
                                    {student?.student_no} - {student?.first_name} {student?.last_name}
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="Score"
                                      value={entry.score}
                                      onChange={(e) => handleScoreChange(index, e.target.value)}
                                      className="w-24"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Remarks"
                                      value={entry.remarks}
                                      onChange={(e) => handleRemarksChange(index, e.target.value)}
                                      className="w-40"
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Endpoint: POST /schools/{schoolId}/grades/bulk
                        </AlertDescription>
                      </Alert>

                      <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Save Grades
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
