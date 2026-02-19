import { AppLayout } from "@/components/layout/AppLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/context/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { academicYearsApi, assessmentsApi, classroomDefinitionsApi, enrollmentsApi, gradesApi, subjectsApi, termTemplatesApi } from "@/lib/api";
import { AlertCircle, Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

interface GradeInput {
  studentId: string;
  score: string;
  remarks: string;
}

interface SubjectFormData {
  name: string;
  code: string;
  description: string;
}

interface Assessment {
  id: string;
  school_id: string;
  term_id: string;
  subject_id: string;
  classroom_definition_id: string;
  name: string;
  type: string;
  max_score: string;
  weight: string;
  assessment_date?: string;
}

interface AssessmentFormData {
  termId: string;
  subjectId: string;
  classroomDefinitionId: string;
  name: string;
  type: string;
  maxScore: string;
  weight: string;
  assessmentDate: string;
}

interface Term {
  id: string;
  name: string;
}

export default function Subjects() {
  const { toast } = useToast();
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("subjects");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Assessment state
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [groupedAssessments, setGroupedAssessments] = useState<any[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("");
  const [classroomDefinitions, setClassroomDefinitions] = useState<any[]>([]);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [isAssessmentEditModalOpen, setIsAssessmentEditModalOpen] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | string[] | null>(null);
  const [assessmentErrorList, setAssessmentErrorList] = useState<string[]>([]);

  const [gradingAssessment, setGradingAssessment] = useState<Assessment | null>(null);
  const [gradingStudents, setGradingStudents] = useState<any[]>([]);
  const [loadingGradingStudents, setLoadingGradingStudents] = useState(false);

  const assessmentSubjects = subjects.filter((s) => assessments.some((a) => a.subject_id === s.id));

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubjectFormData>({
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  const {
    control,
    handleSubmit: handleGradesSubmit,
    formState: { errors: gradeErrors },
    reset: resetGradesForm,
  } = useForm<{ grades: GradeInput[] }>({
    defaultValues: {
      grades: gradingStudents.map((student) => ({
        studentId: student.id,
        score: "",
        remarks: "",
      })),
    },
  });

  useEffect(() => {
    // Reset form when students change
    resetGradesForm({
      grades: gradingStudents.map((student) => ({
        studentId: student.id,
        score: "",
        remarks: "",
      })),
    });
  }, [gradingStudents, resetGradesForm]);

  const { fields } = useFieldArray({
    control,
    name: "grades",
  });

  const { register: registerAssessment, handleSubmit: handleAssessmentSubmit, reset: resetAssessment, formState: { errors: assessmentErrors }, } = useForm<AssessmentFormData>({
    defaultValues: {
      termId: "",
      subjectId: "",
      classroomDefinitionId: "",
      name: "",
      type: "exam",
      maxScore: "100",
      weight: "0.4",
      assessmentDate: new Date().toISOString().split("T")[0],
    },
  });

  // Fetch subjects and academic years on mount
  useEffect(() => {
    if (schoolId) {
      fetchSubjects();
      fetchAcademicYears();
      fetchClassroomDefinitions();
    }
  }, [schoolId]);

  useEffect(() => {
    if (gradingAssessment && schoolId) {
      setLoadingGradingStudents(true);
      enrollmentsApi.enrolledStudents(schoolId, gradingAssessment.id)
        .then(async (res) => {
          const data = await res.json();
          setGradingStudents(Array.isArray(data) ? data : data?.data || []);
        })
        .catch(() => setGradingStudents([]))
        .finally(() => setLoadingGradingStudents(false));
    } else {
      setGradingStudents([]);
    }
  }, [gradingAssessment, schoolId]);

  const fetchSubjects = async () => {
    try {
      const response = await subjectsApi.list(schoolId);
      if (!response.ok) throw new Error("Failed to fetch subjects");
      const data = await response.json();
      setSubjects(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch subjects", variant: "destructive" });
    }
  };

  const handleCreateSubject = async (data: SubjectFormData) => {
    setIsLoading(true);
    try {
      const response = await subjectsApi.create(schoolId, data);
      if (!response.ok) throw new Error("Failed to create subject");

      reset();
      await fetchSubjects();
      toast({ title: "Success", description: "Subject created successfully" });
      setActiveTab("subjects");
    } catch (error) {
      toast({ title: "Error", description: "Failed to create subject", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    try {
      const response = await subjectsApi.delete(schoolId, subjectId);
      if (!response.ok) throw new Error("Failed to delete subject");

      await fetchSubjects();
      toast({ title: "Success", description: "Subject deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete subject", variant: "destructive" });
    }
  };

  const handleUpdateSubject = async (data: SubjectFormData) => {
    if (!editingSubject) return;
    setIsLoading(true);
    try {
      const response = await subjectsApi.update(schoolId, editingSubject.id, data);
      if (!response.ok) throw new Error("Failed to update subject");

      await fetchSubjects();
      reset();
      setEditingSubject(null);
      setIsEditModalOpen(false);
      toast({ title: "Success", description: "Subject updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update subject", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const startEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    reset({
      name: subject.name,
      code: subject.code,
      description: subject.description || "",
    });
    setIsEditModalOpen(true);
  };

  // Assessment handlers
  const fetchAcademicYears = async () => {
    try {
      const res = await academicYearsApi.list(schoolId);
      if (!res.ok) return;
      const data = await res.json();
      const years = Array.isArray(data) ? data : data.data || [];
      setAcademicYears(years);
      if (years.length > 0) {
        // Prefer the year with status === 'active', fallback to first.
        const activeYear = years.find((y: any) => y.status === "active") || years[0];
        setSelectedAcademicYearId(String(activeYear.id));
        const templateId = activeYear.termTemplateId || activeYear.term_template_id || activeYear.term_template?.id;
        if (templateId) await fetchTerms(String(templateId));
      }
    } catch (error) {
      // silently fail
    }
  };

  const fetchClassroomDefinitions = async () => {
    try {
      const res = await classroomDefinitionsApi.list(schoolId);
      if (!res.ok) return;
      const data = await res.json();
      const classrooms = Array.isArray(data) ? data : data.data || [];
      setClassroomDefinitions(classrooms);
    } catch (error) {
      // silently fail
    }
  };

  const fetchTerms = async (termTemplateId: string) => {
    try {
      if (!termTemplateId) return;
      const res = await termTemplatesApi.get(schoolId, termTemplateId);
      if (!res.ok) return;
      const data = await res.json();
      const template = Array.isArray(data) ? data[0] : data;
      const structure = template?.structure || template?.terms || [];
      setTerms(Array.isArray(structure) ? structure : []);
    } catch (error) {
      // silently fail
    }
  };

  // Helper to extract a term's display name from various possible keys
  const getTermNameFromObj = (t: any) => {
    if (!t) return "";
    return t.name || t.termName || t.term_name || t.title || t.label || "";
  };

  const fetchAssessments = async (termId: string) => {
    if (!termId) return;
    try {
      const response = await assessmentsApi.list(schoolId, selectedAcademicYearId, termId);
      if (!response.ok) throw new Error("Failed to fetch assessments");
      const data = await response.json();
      // Backend returns grouped data: [{ classroomDefinition, assessments: [...] }]
      const groups = Array.isArray(data) ? data : data.data || [];
      setGroupedAssessments(groups);
      // also set flat assessments for legacy usage
      const flat = groups.reduce((acc: any[], g: any) => acc.concat(g.assessments || []), [] as any[]);
      setAssessments(flat);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch assessments", variant: "destructive" });
    }
  };

  const handleTermChange = (termId: string) => {
    setSelectedTermId(termId);
    if (termId) {
      fetchAssessments(termId);
    }
  };

  const handleCreateAssessment = async (data: AssessmentFormData) => {
    setIsAssessmentLoading(true);
    setAssessmentError(null);
    setAssessmentErrorList([]);
    try {
      // Parse date (date-only input) and create full UTC timestamp at 09:00
      const dateonly = data.assessmentDate;
      const timestamp = new Date(`${dateonly}T09:00:00Z`).toISOString();

      const payload = {
        yearId: selectedAcademicYearId,
        termTemplateItemId: data.termId,
        classroomDefinitionId: data.classroomDefinitionId,
        subjectId: data.subjectId,
        name: data.name,
        type: data.type,
        maxScore: parseFloat(data.maxScore),
        weight: parseFloat(data.weight),
        assessmentDate: timestamp,
      };
      const response = await assessmentsApi.create(schoolId, payload);
      if (!response.ok) {
        let errorMsg = "Failed to create assessment";
        let errorList: string[] = [];
        try {
          const err = await response.json();
          if (err?.error?.errors && Array.isArray(err.error.errors)) {
            errorList = err.error.errors.map((e: any) => e.message || e).filter(Boolean);
          }
          if (err?.error?.message) {
            errorMsg = err.error.message;
          } else if (err?.message) {
            errorMsg = err.message;
          }
        } catch { }
        setAssessmentError(errorMsg);
        setAssessmentErrorList(errorList);
        throw new Error("Failed to create assessment");
      }

      resetAssessment();
      await fetchAssessments(selectedTermId);
      toast({ title: "Success", description: "Assessment created successfully" });
      setActiveTab("assessments-list");
    } catch (error) {
      if (!assessmentError) setAssessmentError("Failed to create assessment");
      toast({ title: "Error", description: "Failed to create assessment", variant: "destructive" });
    } finally {
      setIsAssessmentLoading(false);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;

    try {
      const response = await assessmentsApi.delete(schoolId, assessmentId);
      if (!response.ok) throw new Error("Failed to delete assessment");

      await fetchAssessments(selectedTermId);
      toast({ title: "Success", description: "Assessment deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete assessment", variant: "destructive" });
    }
  };

  const handleUpdateAssessment = async (data: AssessmentFormData) => {
    if (!editingAssessment) return;
    setIsAssessmentLoading(true);
    try {
      // Parse date (date-only input) and create full UTC timestamp at 09:00
      const dateonly = data.assessmentDate;
      const timestamp = new Date(`${dateonly}T09:00:00Z`).toISOString();

      const payload = {
        name: data.name,
        type: data.type,
        maxScore: parseFloat(data.maxScore),
        weight: parseFloat(data.weight),
        assessmentDate: timestamp,
      };
      const response = await assessmentsApi.update(schoolId, editingAssessment.id, payload);
      if (!response.ok) throw new Error("Failed to update assessment");

      await fetchAssessments(selectedTermId);
      resetAssessment();
      setEditingAssessment(null);
      setIsAssessmentEditModalOpen(false);
      toast({ title: "Success", description: "Assessment updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update assessment", variant: "destructive" });
    } finally {
      setIsAssessmentLoading(false);
    }
  };

  const startEditAssessment = (assessment: Assessment) => {
    setEditingAssessment(assessment);
    resetAssessment({
      termId: assessment.term_id,
      subjectId: assessment.subject_id,
      classroomDefinitionId: assessment.classroom_definition_id,
      name: assessment.name,
      type: assessment.type,
      maxScore: String(assessment.max_score),
      weight: String(assessment.weight),
      assessmentDate: assessment.assessment_date ? assessment.assessment_date.split("T")[0] : new Date().toISOString().split("T")[0],
    });
    setIsAssessmentEditModalOpen(true);
  };

  return (
    <AppLayout
      title="Subjects & Assessments"
      description="Manage school subjects and assessments"
      breadcrumbs={[{ label: "Subjects & Assessments" }]}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="subjects">Subject List</TabsTrigger>
          <TabsTrigger value="create">Create Subject</TabsTrigger>
          <TabsTrigger value="create-assessment">Create Assessment</TabsTrigger>
          <TabsTrigger value="assessments-list">Assessments List</TabsTrigger>
          {gradingAssessment && (
            <TabsTrigger value="grade-assessment">Grade Assessment</TabsTrigger>
          )}
        </TabsList>

        {/* Subjects List Tab */}
        <TabsContent value="subjects" className="space-y-4">
          {subjects.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                  <AlertCircle className="h-8 w-8 text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900">No subjects yet</h3>
                  <p className="text-slate-500 max-w-sm mt-2">Create your first subject to get started.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Subjects</CardTitle>
                <CardDescription>Total: {subjects.length} subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((subject) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-medium">{subject.name}</TableCell>
                          <TableCell>{subject.code}</TableCell>
                          <TableCell className="text-slate-600">{subject.description || "-"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${subject.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
                              {subject.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right space-x-2 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditSubject(subject)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* Create Subject Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Subject</CardTitle>
              <CardDescription>Add a new subject to the school</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleCreateSubject)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Subject Name *</Label>
                  <Input
                    id="name"
                    placeholder="Mathematics"
                    {...register("name", { required: "Subject name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } })}
                  />
                  {errors?.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Subject Code *</Label>
                  <Input
                    id="code"
                    placeholder="MATH"
                    {...register("code", { required: "Subject code is required", minLength: { value: 2, message: "Code must be at least 2 characters" } })}
                  />
                  {errors?.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description of the subject"
                    {...register("description")}
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Subject
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessments List Tab */}
        <TabsContent value="assessments-list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Term to View Assessments</CardTitle>
              <CardDescription>Choose an academic term to manage assessments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="view-assess-year">Academic Year</Label>
                  <select
                    id="view-assess-year"
                    value={selectedAcademicYearId}
                    onChange={(e) => {
                      const yearId = e.target.value;
                      setSelectedAcademicYearId(yearId);
                      const year = academicYears.find((y: any) => String(y.id) === yearId);
                      console.log("Selected year:", year);
                      const templateId = year?.termTemplateId || year?.term_template_id || year?.term_template?.id;
                      setSelectedTermId("");
                      setAssessments([]);
                      if (templateId) fetchTerms(String(templateId));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    <option value="">Select an academic year...</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {`${year.name} ${year.status === "active" ? "(Active)" : ""}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="term-select">Term</Label>
                  <select
                    id="term-select"
                    value={selectedTermId}
                    onChange={(e) => handleTermChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    <option value="">Select a term...</option>
                    {terms.map((term: Term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Accordions and edit panel layout */}
              <div className="flex w-full mt-6">
                <div className={editingAssessment ? "w-1/2 pr-4 transition-all" : "w-full transition-all"}>
                  {selectedTermId && (
                    groupedAssessments.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                            <AlertCircle className="h-8 w-8 text-slate-400 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900">No assessments</h3>
                            <p className="text-slate-500 max-w-sm mt-2">Create an assessment to get started.</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Accordion type="multiple" className="space-y-2">
                        {groupedAssessments.map((group: any) => {
                          const classroom = group.classroomDefinition || group.classroom_definition || {};
                          const items = group.assessments || [];
                          const header = `${classroom.name || "Unknown"}${classroom.level ? ` :` : ""} [ ${items.length} ]`;
                          return (
                            <AccordionItem key={classroom.id || header} value={String(classroom.id || header)}>
                              <AccordionTrigger>{header}</AccordionTrigger>
                              <AccordionContent>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Subject & Assessment</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Max Score</TableHead>
                                        <TableHead>Weight</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Grade</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                      {items.map((assessment: any) => {
                                        const subject = assessment.subject || subjects.find((s) => s.id === assessment.subject_id) || {};
                                        return (
                                          <TableRow key={assessment.id}>
                                            <TableCell className="font-medium">
                                              <div className="flex flex-col">
                                                <span className="text-slate-900">{subject.name || "Unknown"}</span>
                                                <span className="text-sm text-slate-600">{assessment.name}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell>{assessment.type}</TableCell>
                                            <TableCell>{assessment.max_score}</TableCell>
                                            <TableCell>{assessment.weight}</TableCell>
                                            <TableCell>{assessment.assessment_date ? new Date(assessment.assessment_date).toLocaleDateString() : "-"}</TableCell>
                                            <TableCell>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  setGradingAssessment(assessment);
                                                  setActiveTab("grade-assessment");
                                                }}
                                              >
                                                Grade
                                              </Button>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2 flex justify-end">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => startEditAssessment(assessment)}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                              >
                                                <Edit className="h-4 w-4" />
                                              </Button>
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
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    )
                  )}
                </div>
                {editingAssessment && (
                  <div className="w-1/2 pl-4">
                    <Card className="w-full">
                      <CardHeader>
                        <CardTitle>Edit Assessment</CardTitle>
                        <CardDescription>Update assessment details</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form
                          onSubmit={handleAssessmentSubmit((formData) => {
                            handleUpdateAssessment(formData);
                          })}
                          className="space-y-4"
                        >
                          {/* Display context info as labels */}
                          <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <Label>Academic Year</Label>
                              <div className="text-slate-900 font-medium">
                                {(() => {
                                  const yearId = (editingAssessment as any)?.yearId || selectedAcademicYearId;
                                  const year = academicYears.find((y: any) => String(y.id) === String(yearId));
                                  return year?.name || "Unknown";
                                })()}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Term</Label>
                              <div className="text-slate-900 font-medium">
                                {(() => {
                                  const termId = editingAssessment?.term_id || selectedTermId;
                                  const term = terms.find((t: Term) => String(t.id) === String(termId));
                                  return term?.name || "Unknown";
                                })()}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Subject</Label>
                              <div className="text-slate-900 font-medium">
                                {subjects.find((s: Subject) => String(s.id) === editingAssessment?.subject_id)?.name || "Unknown"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Classroom Definition</Label>
                              <div className="text-slate-900 font-medium">
                                {classroomDefinitions.find((c: any) => String(c.id) === editingAssessment?.classroom_definition_id)?.name || "Unknown"}
                              </div>
                            </div>
                          </div>
                          {/* Hidden fields for form data */}
                          <input type="hidden" value={editingAssessment?.term_id || selectedTermId} {...registerAssessment("termId")} />
                          <input type="hidden" value={editingAssessment?.subject_id} {...registerAssessment("subjectId")} />
                          <input type="hidden" value={editingAssessment?.classroom_definition_id} {...registerAssessment("classroomDefinitionId")} />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-assess-name">Assessment Name *</Label>
                              <Input
                                id="edit-assess-name"
                                placeholder="Midterm Exam"
                                {...registerAssessment("name", { required: "Assessment name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } })}
                              />
                              {assessmentErrors?.name && <p className="text-sm text-red-600">{assessmentErrors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-assess-type">Type *</Label>
                              <select
                                id="edit-assess-type"
                                {...registerAssessment("type", { required: "Type is required" })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                              >
                                <option value="exam">Exam</option>
                                <option value="test">Test</option>
                                <option value="quiz">Quiz</option>
                                <option value="homework">Homework</option>
                                <option value="project">Project</option>
                              </select>
                              {assessmentErrors?.type && <p className="text-sm text-red-600">{assessmentErrors.type.message}</p>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-assess-maxScore">Max Score *</Label>
                            <Input
                              id="edit-assess-maxScore"
                              type="number"
                              placeholder="100"
                              {...registerAssessment("maxScore", { required: "Max score is required", min: { value: 0, message: "Must be 0 or more" } })}
                            />
                            {assessmentErrors?.maxScore && <p className="text-sm text-red-600">{assessmentErrors.maxScore.message}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-assess-weight">Weight *</Label>
                            <Input
                              id="edit-assess-weight"
                              type="number"
                              step="0.1"
                              placeholder="0.4"
                              {...registerAssessment("weight", { required: "Weight is required", min: { value: 0, message: "Must be 0 or more" } })}
                            />
                            {assessmentErrors?.weight && <p className="text-sm text-red-600">{assessmentErrors.weight.message}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-assess-date">Assessment Date *</Label>
                            <Input
                              id="edit-assess-date"
                              type="date"
                              {...registerAssessment("assessmentDate", { required: "Assessment date is required" })}
                            />
                            {assessmentErrors?.assessmentDate && <p className="text-sm text-red-600">{assessmentErrors.assessmentDate.message}</p>}
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditingAssessment(null);
                                resetAssessment();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={isAssessmentLoading}>
                              {isAssessmentLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>Update Assessment</>
                              )}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Assessment Tab */}
        <TabsContent value="create-assessment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Assessment</CardTitle>
              <CardDescription>Add a new assessment to the school</CardDescription>
            </CardHeader>
            <CardContent>
              {(assessmentError || assessmentErrorList.length > 0) && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    {assessmentError && <div>{assessmentError}</div>}
                    {assessmentErrorList.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1">
                        {assessmentErrorList.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleAssessmentSubmit(handleCreateAssessment)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assess-year">Academic Year</Label>
                    <select
                      id="assess-year"
                      value={selectedAcademicYearId}
                      onChange={(e) => {
                        const yearId = e.target.value;
                        setSelectedAcademicYearId(yearId);
                        const year = academicYears.find((y: any) => String(y.id) === yearId);
                        const templateId = year?.termTemplateId || year?.term_template_id || year?.term_template?.id;
                        // reset selected term when year changes
                        resetAssessment({ name: "", type: "exam", maxScore: "100", weight: "0.4", assessmentDate: new Date().toISOString().split("T")[0] });
                        if (templateId) fetchTerms(String(templateId));
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    >
                      <option value="">Select an academic year...</option>
                      {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assess-term">Term *</Label>
                    <select
                      id="assess-term"
                      {...registerAssessment("termId", { required: "Term is required" })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    >
                      <option value="">Select a term...</option>
                      {terms.map((term: Term) => (
                        <option key={term.id} value={term.id}>
                          {term.name}
                        </option>
                      ))}
                    </select>
                    {assessmentErrors?.termId && <p className="text-sm text-red-600">{assessmentErrors.termId.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assess-subject">Subject *</Label>
                    <select
                      id="assess-subject"
                      {...registerAssessment("subjectId", { required: "Subject is required" })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    >
                      <option value="">Select a subject...</option>
                      {subjects.map((subject: Subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    {assessmentErrors?.subjectId && <p className="text-sm text-red-600">{assessmentErrors.subjectId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assess-classroom">Classroom Definition *</Label>
                    <select
                      id="assess-classroom"
                      {...registerAssessment("classroomDefinitionId", { required: "Classroom definition is required" })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    >
                      <option value="">Select a classroom...</option>
                      {classroomDefinitions.map((classroom: any) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.name}
                        </option>
                      ))}
                    </select>
                    {assessmentErrors?.classroomDefinitionId && <p className="text-sm text-red-600">{assessmentErrors.classroomDefinitionId.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assess-name">Assessment Name *</Label>
                    <Input
                      id="assess-name"
                      placeholder="Midterm Exam"
                      {...registerAssessment("name", { required: "Assessment name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } })}
                    />
                    {assessmentErrors?.name && <p className="text-sm text-red-600">{assessmentErrors.name.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assess-type">Type *</Label>
                    <select
                      id="assess-type"
                      {...registerAssessment("type", { required: "Type is required" })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    >
                      <option value="exam">Exam</option>
                      <option value="test">Test</option>
                      <option value="quiz">Quiz</option>
                      <option value="homework">Homework</option>
                      <option value="project">Project</option>
                    </select>
                    {assessmentErrors?.type && <p className="text-sm text-red-600">{assessmentErrors.type.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assess-maxScore">Max Score *</Label>
                    <Input
                      id="assess-maxScore"
                      type="number"
                      placeholder="100"
                      {...registerAssessment("maxScore", {
                        required: "Max score is required",
                        min: { value: 0, message: "Must be 0 or more" },
                        validate: value => !isNaN(Number(value)) || "Must be a number"
                      })}
                    />
                    {assessmentErrors?.maxScore && <p className="text-sm text-red-600">{assessmentErrors.maxScore.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assess-weight">Weight *</Label>
                    <Input
                      id="assess-weight"
                      type="number"
                      step="0.1"
                      placeholder="0.4"
                      {...registerAssessment("weight", {
                        required: "Weight is required",
                        min: { value: 0, message: "Must be 0 or more" },
                        max: { value: 1, message: "Must be 1 or less" },
                        validate: value => !isNaN(Number(value)) || "Must be a number"
                      })}
                    />
                    {assessmentErrors?.weight && <p className="text-sm text-red-600">{assessmentErrors.weight.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assess-date">Assessment Date *</Label>
                    <Input
                      id="assess-date"
                      type="date"
                      {...registerAssessment("assessmentDate", { required: "Assessment date is required" })}
                    />
                    {assessmentErrors?.assessmentDate && <p className="text-sm text-red-600">{assessmentErrors.assessmentDate.message}</p>}
                  </div>
                </div>

                <Button type="submit" disabled={isAssessmentLoading} className="w-full">
                  {isAssessmentLoading ? (
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grade Assessment Tab */}
        <TabsContent value="grade-assessment" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Grade Assessment</CardTitle>
                {/* Only show submit button if there are students to grade and an assessment is selected */}
                {gradingAssessment && gradingStudents.length > 0 && (
                  <Button
                    onClick={handleGradesSubmit(async (data) => {
                      try {
                        if (!gradingAssessment) {
                          toast({ title: "Error", description: "No assessment selected.", variant: "destructive" });
                          return;
                        }
                        const payload = {
                          assessmentId: gradingAssessment.id,
                          grades: data.grades
                            .filter(g => g.score !== "" && !isNaN(Number(g.score)))
                            .map(g => ({
                              studentId: g.studentId,
                              score: parseFloat(g.score),
                              remarks: g.remarks,
                            })),
                        };
                        if (payload.grades.length === 0) {
                          toast({ title: "Error", description: "Please enter at least one score.", variant: "destructive" });
                          return;
                        }
                        const res = await gradesApi.bulkCreate(schoolId, payload);
                        if (!res.ok) throw new Error("Failed to submit grades");
                        toast({ title: "Success", description: "Grades submitted successfully." });
                        resetGradesForm();
                        setGradingAssessment(null);
                        setActiveTab("assessments-list");
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to submit grades", variant: "destructive" });
                      }
                    })}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Submit Grades
                  </Button>
                )}
              </div>
              <CardDescription>
                {gradingAssessment
                  ? `Grading: ${gradingAssessment.name} (${assessmentSubjects.find(s => s.id === gradingAssessment.subject_id)?.name || "Unknown Subject"})`
                  : "Select an assessment to grade."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gradingAssessment ? (
                loadingGradingStudents ? (
                  <p>Loading students...</p>
                ) : gradingStudents.length === 0 ? (
                  <p>No students enrolled for this assessment.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name (Stnd No.)</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, idx) => (
                        <TableRow key={field.studentId}>
                          <TableCell>
                            {`${gradingStudents[idx]?.first_name} ${gradingStudents[idx]?.last_name} (${gradingStudents[idx]?.student_no})`}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={gradingAssessment?.max_score || 100}
                              {...control.register(`grades.${idx}.score`, {
                                required: "Score is required",
                                min: { value: 0, message: "Score must be at least 0" },
                                max: { value: Number(gradingAssessment?.max_score) || 100, message: `Max score is ${gradingAssessment?.max_score}` },
                                validate: value => !isNaN(Number(value)) || "Must be a number",
                              })}
                              placeholder="Score"
                              className="w-24"
                            />
                            {gradeErrors.grades?.[idx]?.score && (
                              <p className="text-xs text-red-600">{gradeErrors.grades[idx].score.message}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              {...control.register(`grades.${idx}.remarks`)}
                              placeholder="Remarks"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              ) : (
                <p>Select an assessment from the list to begin grading.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Subject Modal */}
      {isEditModalOpen && editingSubject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Subject</CardTitle>
              <CardDescription>Update subject details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleUpdateSubject)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Subject Name *</Label>
                  <Input
                    id="edit-name"
                    placeholder="Mathematics"
                    {...register("name", { required: "Subject name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } })}
                  />
                  {errors?.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-code">Subject Code *</Label>
                  <Input
                    id="edit-code"
                    placeholder="MATH"
                    {...register("code", { required: "Subject code is required", minLength: { value: 2, message: "Code must be at least 2 characters" } })}
                  />
                  {errors?.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    placeholder="Optional description of the subject"
                    {...register("description")}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingSubject(null);
                      reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>Update Subject</>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
