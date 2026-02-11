import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertCircle, Loader2, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/context/TenantContext";
import { subjectsApi, assessmentsApi, termsApi, academicYearsApi, termTemplatesApi } from "@/lib/api";

interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

interface SubjectFormData {
  name: string;
  code: string;
  description: string;
}

interface Assessment {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  term_id?: string;
}

interface AssessmentFormData {
  name: string;
  code: string;
  description: string;
  term_id: string;
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
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("");
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [isAssessmentEditModalOpen, setIsAssessmentEditModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubjectFormData>({
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  const { register: registerAssessment, handleSubmit: handleAssessmentSubmit, reset: resetAssessment, formState: { errors: assessmentErrors } } = useForm<AssessmentFormData>({
    defaultValues: {
      name: "",
      code: "",
      description: "",
      term_id: "",
    },
  });

  // Fetch subjects and academic years on mount
  useEffect(() => {
    if (schoolId) {
      fetchSubjects();
      fetchAcademicYears();
    }
  }, [schoolId]);

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
        setSelectedAcademicYearId(String(years[0].id));
        const templateId = years[0].termTemplateId || years[0].term_template_id || years[0].term_template?.id;
        if (templateId) await fetchTerms(String(templateId));
      }
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

  const fetchAssessments = async (termId: string) => {
    if (!termId) return;
    try {
      const response = await assessmentsApi.list(schoolId, termId);
      if (!response.ok) throw new Error("Failed to fetch assessments");
      const data = await response.json();
      setAssessments(Array.isArray(data) ? data : data.data || []);
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
    try {
      const response = await assessmentsApi.create(schoolId, data);
      if (!response.ok) throw new Error("Failed to create assessment");

      resetAssessment();
      await fetchAssessments(selectedTermId);
      toast({ title: "Success", description: "Assessment created successfully" });
      setActiveTab("assessments-list");
    } catch (error) {
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
      const response = await assessmentsApi.update(schoolId, editingAssessment.id, data);
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
      name: assessment.name,
      code: assessment.code,
      description: assessment.description || "",
      term_id: assessment.term_id || "",
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
          <TabsTrigger value="assessments-list">Assessments List</TabsTrigger>
          <TabsTrigger value="create-assessment">Create Assessment</TabsTrigger>
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
                  {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Subject Code *</Label>
                  <Input
                    id="code"
                    placeholder="MATH"
                    {...register("code", { required: "Subject code is required", minLength: { value: 2, message: "Code must be at least 2 characters" } })}
                  />
                  {errors.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description of the subject"
                    {...register("description")}
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Endpoint: POST /schools/{schoolId}/subjects
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
              <div className="space-y-2">
                <Label htmlFor="term-select">Term</Label>
                <select
                  id="term-select"
                  value={selectedTermId}
                  onChange={(e) => handleTermChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="">Select a term...</option>
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTermId && (
                <>
                  {assessments.length === 0 ? (
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
                    <Card>
                      <CardHeader>
                        <CardTitle>Assessments</CardTitle>
                        <CardDescription>Total: {assessments.length} assessments</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {assessments.map((assessment) => (
                                <TableRow key={assessment.id}>
                                  <TableCell className="font-medium">{assessment.name}</TableCell>
                                  <TableCell>{assessment.code}</TableCell>
                                  <TableCell className="text-slate-600">{assessment.description || "-"}</TableCell>
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
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
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
              <form onSubmit={handleAssessmentSubmit(handleCreateAssessment)} className="space-y-4">
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
                      if (templateId) fetchTerms(String(templateId));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md mb-3"
                  >
                    <option value="">Select an academic year...</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>

                  <Label htmlFor="assess-term">Term *</Label>
                  <select
                    id="assess-term"
                    {...registerAssessment("term_id", { required: "Term is required" })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    <option value="">Select a term...</option>
                    {terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                  {assessmentErrors.term_id && <p className="text-sm text-red-600">{assessmentErrors.term_id.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assess-name">Assessment Name *</Label>
                  <Input
                    id="assess-name"
                    placeholder="Midterm Exam"
                    {...registerAssessment("name", { required: "Assessment name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } })}
                  />
                  {assessmentErrors.name && <p className="text-sm text-red-600">{assessmentErrors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assess-code">Assessment Code *</Label>
                  <Input
                    id="assess-code"
                    placeholder="MTE"
                    {...registerAssessment("code", { required: "Assessment code is required", minLength: { value: 2, message: "Code must be at least 2 characters" } })}
                  />
                  {assessmentErrors.code && <p className="text-sm text-red-600">{assessmentErrors.code.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assess-description">Description</Label>
                  <Input
                    id="assess-description"
                    placeholder="Optional description"
                    {...registerAssessment("description")}
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Endpoint: POST /schools/{schoolId}/assessments
                  </AlertDescription>
                </Alert>

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
                  {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-code">Subject Code *</Label>
                  <Input
                    id="edit-code"
                    placeholder="MATH"
                    {...register("code", { required: "Subject code is required", minLength: { value: 2, message: "Code must be at least 2 characters" } })}
                  />
                  {errors.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
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

      {/* Edit Assessment Modal */}
      {isAssessmentEditModalOpen && editingAssessment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Assessment</CardTitle>
              <CardDescription>Update assessment details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssessmentSubmit(handleUpdateAssessment)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-assess-term">Term *</Label>
                  <select
                    id="edit-assess-term"
                    {...registerAssessment("term_id", { required: "Term is required" })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    <option value="">Select a term...</option>
                    {terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                  {assessmentErrors.term_id && <p className="text-sm text-red-600">{assessmentErrors.term_id.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-assess-name">Assessment Name *</Label>
                  <Input
                    id="edit-assess-name"
                    placeholder="Midterm Exam"
                    {...registerAssessment("name", { required: "Assessment name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } })}
                  />
                  {assessmentErrors.name && <p className="text-sm text-red-600">{assessmentErrors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-assess-code">Assessment Code *</Label>
                  <Input
                    id="edit-assess-code"
                    placeholder="MTE"
                    {...registerAssessment("code", { required: "Assessment code is required", minLength: { value: 2, message: "Code must be at least 2 characters" } })}
                  />
                  {assessmentErrors.code && <p className="text-sm text-red-600">{assessmentErrors.code.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-assess-description">Description</Label>
                  <Input
                    id="edit-assess-description"
                    placeholder="Optional description"
                    {...registerAssessment("description")}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAssessmentEditModalOpen(false);
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
    </AppLayout>
  );
}
