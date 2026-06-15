import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStructure } from "@/context/StructureContext";
import { useTenant } from "@/context/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { assessmentsApi, enrollmentsApi, gradesApi, subjectsApi } from "@/lib/api";
import { Edit, Loader2, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import ViewAssessmentsTab from "./Subjects/ViewAssessmentsTab";

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
  level: string; // Add this line
  components: AssessmentComponentFormData[];
}

interface AssessmentComponentFormData {
  name: string;
  code: string;
  type: string;
}

interface Assessment {
  id: string;
  school_id: string;
  term_id: string;
  subject_id: string;
  classroom_definition_id: string;
  name: string;
  type: string;
  maxScore: string;
  weight: string;
  date?: string;
}

interface AssessmentFormData {
  yearId: string;
  termId: string;
  subjectId: string;
  componentId: string;
  classroomDefinitionId: string;
  level: string;
  name: string;
  type: string;
  maxScore: string;
  weight: string;
  date: string;
}

interface Term {
  id: string;
  name: string;
}

export default function Subjects() {
  const { toast } = useToast();
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string;

  const {
    selectValues: globalSelectValues,
    setSelectValues: setGlobalSelectValues,
    structure,
    fetchStructure,
    subjectOptions,
    termOptions,
    yearOptions,
    gradingStudents,
    setSubjectOptions,
    definitionsOptions,
    setGradingStudents,
  } = useStructure();

  const [fetchingSubjects, setFetchingSubjects] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submittingGrades, setSubmittingGrades] = useState(false);
  const [activeTab, setActiveTab] = useState("subjects");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Assessment state
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | string[] | null>(null);
  const [assessmentErrorList, setAssessmentErrorList] = useState<string[]>([]);
  const [gradingAssessment, setGradingAssessment] = useState<Assessment | null>(null);
  const [loadingGradingStudents, setLoadingGradingStudents] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [subjectErrorList, setSubjectErrorList] = useState<string[]>([]);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control: subjectControl,
    watch,
    formState: { errors },
  } = useForm<SubjectFormData>({
    defaultValues: {
      name: "",
      code: "",
      description: "",
      level: "",
      components: [
        { name: "", code: "", type: "WRITTEN" }
      ],
    },
  });

  const { fields: componentFields, append: appendComponent, remove: removeComponent } = useFieldArray({
    control: subjectControl,
    name: "components",
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
    if (schoolId && !structure) {
      fetchStructure(schoolId);
    }
  }, [schoolId, structure, fetchStructure]);

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

  const {
    register: registerAssessment,
    handleSubmit: handleAssessmentSubmit,
    reset: resetAssessment,
    formState: { errors: assessmentErrors },
    control: controlAssessment,
    getValues: getAssessmentValues,
  } = useForm<AssessmentFormData>({
    defaultValues: {
      yearId: "",
      termId: "",
      subjectId: "",
      classroomDefinitionId: "",
      name: "Exams",
      type: "END_OF_TERM",
      maxScore: "100",
      weight: "0.4",
      date: new Date().toISOString().split("T")[0],
    },
  });

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
    } else { }
  }, [schoolId]);

  const fetchSubjects = async () => {
    setFetchingSubjects(true);
    try {
      const response = await subjectsApi.list(schoolId);
      if (!response.ok) throw new Error("Failed to fetch subjects");
      const data = await response.json();
      setSubjectOptions(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch subjects", variant: "destructive" });
    } finally {
      setFetchingSubjects(false);
    }
  };

  const handleRowClick = (subjectId: string) => {
    setExpandedSubjectId(prev => (prev === subjectId ? null : subjectId));
  };

  const handleCreateSubject = async (data: SubjectFormData) => {
    setIsLoading(true);
    setSubjectError(null);
    setSubjectErrorList([]);
    try {
      // Filter out empty components
      const componentsToCreate = data.components.filter(c => c.name.trim());

      if (componentsToCreate.length === 0) {
        setSubjectError("At least one assessment component is required");
        setSubjectErrorList(["Please add at least one assessment component"]);
        setIsLoading(false);
        return;
      }

      const payload = {
        name: data.name,
        code: data.code,
        description: data.description,
        level: data.level,
        components: componentsToCreate.map(c => ({
          name: c.name,
          code: c.code || c.name.substring(0, 3).toUpperCase(),
          type: c.type,
        })),
      };

      const response = await subjectsApi.create(schoolId, payload);
      if (!response.ok) {
        let errorMsg = "Failed to create subject";
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
        setSubjectError(errorMsg);
        setSubjectErrorList(errorList);
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
        return;
      }

      reset();
      await fetchSubjects();
      toast({ title: "Success", description: "Subject created successfully" });
      setActiveTab("subjects");
    } catch (error) {
      setSubjectError("Failed to create subject");
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

  const handleCreateAssessment = async (data: AssessmentFormData) => {
    setIsAssessmentLoading(true);
    setAssessmentError(null);
    setAssessmentErrorList([]);
    try {
      // Parse date (date-only input) and create full UTC timestamp at 09:00
      const dateonly = data.date;
      const timestamp = new Date(`${dateonly}T09:00:00Z`).toISOString();

      const payload = {
        yearId: data.yearId,
        termTemplateItemId: data.termId,
        classroomDefinitionId: data.classroomDefinitionId,
        componentId: data.componentId,
        name: data.name,
        type: data.type,
        weight: parseFloat(data.weight),
        maxScore: parseFloat(data.maxScore),
        date: timestamp,
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

      await fetchStructure(schoolId);
      resetAssessment();
      toast({ title: "Success", description: "Assessment created successfully" });
    } catch (error) {
      if (!assessmentError) setAssessmentError("Failed to create assessment");
      toast({ title: "Error", description: "Failed to create assessment", variant: "destructive" });
    } finally {
      setIsAssessmentLoading(false);
    }
  };

  // Add these to your useForm for the assessments-list tab
  const {
    control: filterControl,
    handleSubmit: handleFilterSubmit,
    formState: { errors: filterErrors },
    setValue,
  } = useForm({
    defaultValues: {
      academicYear: "",
      term: "",
      classroom: "",
      assessment: "",
    },
  });
  globalSelectValues.gradeAssessment
  // Keep selects in sync with react-hook-form
  useEffect(() => { setValue("assessment", globalSelectValues.gradeAssessment); }, [globalSelectValues.gradeAssessment, setValue]);
  useEffect(() => { setValue("classroom", globalSelectValues.gradeClassroom); }, [globalSelectValues.gradeClassroom, setValue]);
  useEffect(() => { setValue("academicYear", globalSelectValues.gradeYear); }, [globalSelectValues.gradeYear, setValue]);
  useEffect(() => { setValue("term", globalSelectValues.gradeTerm); }, [globalSelectValues.gradeTerm, setValue]);
  const prevGradeTermRef = useRef(globalSelectValues.gradeTerm);
  const prevGradeYearRef = useRef(globalSelectValues.gradeYear);

  useEffect(() => {
    let shouldReset = false;
    if (
      prevGradeTermRef.current &&
      prevGradeTermRef.current !== globalSelectValues.gradeTerm
    ) {
      shouldReset = true;
    }
    if (
      prevGradeYearRef.current &&
      prevGradeYearRef.current !== globalSelectValues.gradeYear
    ) {
      shouldReset = true;
    }
    if (shouldReset) {
      setValue("assessment", "");
      setGlobalSelectValues(prev => ({
        ...prev,
        gradeAssessment: ""
      }));
    }
    prevGradeTermRef.current = globalSelectValues.gradeTerm;
    prevGradeYearRef.current = globalSelectValues.gradeYear;
  }, [globalSelectValues.gradeTerm, globalSelectValues.gradeYear, setValue, setGlobalSelectValues]);

  // Add these state variables near your other useState hooks:
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  // Fix: Use globalSelectValues for selectedAcademicYearId, selectedTermId, selectedClassroomId
  const selectedAcademicYearId = globalSelectValues.gradeYear || "";
  const selectedTermId = globalSelectValues.gradeTerm || "";
  const selectedClassroomId = globalSelectValues.gradeClassroom || "";

  // Add these derived filtered options after your useForm for assessments:
  const selectedAssessmentLevel = useWatch({
    control: controlAssessment,
    name: "level",
  });
  const selectedLevel = selectedAssessmentLevel?.toLowerCase();

  const filteredSubjectOptions =
    selectedLevel
      ? subjectOptions.filter((s: any) => (s.level || "").toLowerCase() === selectedLevel)
      : subjectOptions;

  const filteredDefinitionsOptions =
    selectedLevel
      ? definitionsOptions.filter((c: any) => (c.level || "").toLowerCase() === selectedLevel)
      : definitionsOptions;

  return (
    <AppLayout
      title="Subjects & Assessments"
      description="Manage school subjects and assessments"
      breadcrumbs={[{ label: "Subjects & Assessments" }]}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 border-b">
          <TabsTrigger value="subjects">Subjects List</TabsTrigger>
          <TabsTrigger value="create">Create Subject</TabsTrigger>
          <TabsTrigger value="create-assessment">Create Assessment</TabsTrigger>
          <TabsTrigger value="view-assessments">View Assessments</TabsTrigger>
          <TabsTrigger value="assessments-list">Grade Assessment</TabsTrigger>
        </TabsList>

        {/* Subjects List Tab */}
        <TabsContent value="subjects" className="space-y-4">
          {fetchingSubjects ? (
            <Card className="border-slate-200">
              <CardContent>
                <div className="overflow-x-auto animate-pulse">
                  <table className="w-full text-left table-auto border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-sm font-medium">Name</th>
                        <th className="px-3 py-2 text-sm font-medium">Code</th>
                        <th className="px-3 py-2 text-sm font-medium">Description</th>
                        <th className="px-3 py-2 text-sm font-medium">Status</th>
                        <th className="px-3 py-2 text-sm font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(6)].map((_, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">
                            <div className="h-4 bg-gray-200 rounded w-16" />
                          </td>
                          <td className="px-3 py-2">
                            <div className="h-4 bg-gray-200 rounded w-12" />
                          </td>
                          <td className="px-3 py-2">
                            <div className="h-4 bg-gray-200 rounded w-24" />
                          </td>
                          <td className="px-3 py-2">
                            <div className="h-4 bg-gray-200 rounded w-10" />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : subjectOptions.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                  <svg
                    className="w-12 h-12 text-gray-300 mb-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 17v.01M12 7v6m0 8a9 9 0 100-18 9 9 0 000 18z"
                    />
                  </svg>
                  <div className="text-base font-medium text-gray-700 mb-1">
                    No subjects found
                  </div>
                  <div className="text-sm text-gray-500 text-center max-w-xs">
                    There are no subjects available.<br />
                    Please create a subject to get started.
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200">
              <CardHeader>
                {/* <CardTitle>All Subjects</CardTitle> */}
                <CardDescription>Total: {subjectOptions.length} subjects</CardDescription>
              </CardHeader>
              <CardContent>
                {/* make table scrollable internally */}
                <div className="overflow-x-auto">
                  <div className="max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-left table-auto border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-sm font-medium">Name</th>
                          {/* <th className="px-3 py-2 text-sm font-medium">Code</th> */}
                          <th className="px-3 py-2 text-sm font-medium">Description</th>
                          <th className="px-3 py-2 text-sm font-medium">Level</th>
                          <th className="px-3 py-2 text-sm font-medium">Papers / Components</th>
                          {/* <th className="px-3 py-2 text-sm font-medium">Status</th> */}
                          <th className="px-3 py-2 text-sm font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectOptions.map((subject: any) => (
                          <React.Fragment key={subject.id}>
                            <tr
                              className={`border-t cursor-pointer ${expandedSubjectId === subject.id ? "bg-blue-50/30" : ""}`}
                              onClick={() => handleRowClick(subject.id)}
                            >
                              <td className="px-3 py-2 font-medium">{subject.name}</td>
                              {/* <td className="px-3 py-2">{subject.code}</td> */}
                              <td className="px-3 py-2 text-slate-600">{subject.description || "-"}</td>
                              <td className="px-3 py-2 text-sm">{subject.level || "-"}</td>
                              <td className="px-3 py-2">
                                {subject.components && subject.components.length > 0 ? (
                                  <span className="text-xs text-blue-700">{subject.components.length} component(s)</span>
                                ) : (
                                  <span className="text-xs text-gray-400">No components</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right space-x-2 flex justify-end">
                                {/* <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={e => {
                                    e.stopPropagation();
                                    startEditSubject(subject);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button> */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleDeleteSubject(subject.id);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                            {expandedSubjectId === subject.id && (
                              <tr>
                                <td colSpan={6} className="bg-blue-50/20 px-3 py-2">
                                  <div>
                                    {/* <div className="font-semibold mb-2">Assessment Components:</div> */}
                                    {subject.components && subject.components.length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {subject.components.map((component: any) => (
                                          <div
                                            key={component.id}
                                            className="inline-flex flex-col items-start px-3 py-2 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 min-w-[160px]"
                                            title={`${component.name} (${component.type})`}
                                          >
                                            <div>
                                              <span className="font-semibold">{component.code}</span> - {component.name}
                                            </div>
                                            <div className="text-slate-600">
                                              Type: <span className="font-semibold">{component.type}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">No components for this subject.</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Create Subject Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              {/* <CardTitle>Create New Subject</CardTitle> */}
              {/* <CardDescription>Add a new subject with assessment components</CardDescription> */}
            </CardHeader>
            <CardContent>
              {(subjectError || subjectErrorList.length > 0) && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    {subjectError && <div>{subjectError}</div>}
                    {subjectErrorList.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1">
                        {subjectErrorList.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit(handleCreateSubject)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* LEFT COLUMN: Subject Fields */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700">Subject Details</h3>

                    {selectedTenant?.institutionType === "SECONDARY_SCHOOL" && (
                      <div className="space-y-2">
                        <Label htmlFor="level">Level *</Label>
                        <Controller
                          name="level"
                          control={subjectControl}
                          rules={{ required: "Level is required" }}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger id="level">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="O-Level">O-Level</SelectItem>
                                <SelectItem value="A-Level">A-Level</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.level && (
                          <p className="text-sm text-red-600">{errors.level.message}</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="name">Subject Name *</Label>
                      <Input
                        id="name"
                        placeholder="Mathematics"
                        {...register("name", {
                          required: "Subject name is required",
                          minLength: { value: 2, message: "Name must be at least 2 characters" }
                        })}
                      />
                      {errors?.name &&
                        <p className="text-sm text-red-600">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="code">Subject Code *</Label>
                      <Input
                        id="code"
                        placeholder="MATH"
                        {...register("code", {
                          required: "Subject code is required",
                          minLength: { value: 2, message: "Code must be at least 2 characters" }
                        })}
                      />
                      {errors?.code &&
                        <p className="text-sm text-red-600">{errors.code.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="Optional description of the subject"
                        {...register("description")}
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Assessment Components */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700">Assessment Components *</h3>

                    <div className="space-y-3 max-h-96 overflow-y-auto border border-slate-200 rounded-md p-3">
                      {componentFields.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No components added. Add at least one.</p>
                      ) : (
                        componentFields.map((field, index) => (
                          <div key={field.id} className="space-y-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-medium text-gray-600">Component {index + 1}</span>
                              {componentFields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeComponent(index)}
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            <div>
                              <Label htmlFor={`comp-name-${index}`} className="text-xs">Name *</Label>
                              <Input
                                id={`comp-name-${index}`}
                                placeholder="e.g., Paper 1"
                                size="sm"
                                {...register(`components.${index}.name`, {
                                  required: "Component name is required",
                                })}
                                className="text-sm"
                              />
                              {errors?.components?.[index]?.name &&
                                <p className="text-xs text-red-600">{errors.components[index]?.name?.message}</p>}
                            </div>

                            <div>
                              <Label htmlFor={`comp-code-${index}`} className="text-xs">Code</Label>
                              <Input
                                id={`comp-code-${index}`}
                                placeholder="e.g., P1 (auto-generated if empty)"
                                size="sm"
                                {...register(`components.${index}.code`)}
                                className="text-sm"
                              />
                            </div>

                            {/* <div className="grid grid-cols-2 gap-2"> */}
                              <div>
                                <Label htmlFor={`comp-type-${index}`} className="text-xs">Type *</Label>
                                <Controller
                                  name={`components.${index}.type`}
                                  control={subjectControl}
                                  rules={{ required: "Type is required" }}
                                  render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                      <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="WRITTEN">Written</SelectItem>
                                        <SelectItem value="PRACTICAL">Practical</SelectItem>
                                        <SelectItem value="ORAL">Oral</SelectItem>
                                        <SelectItem value="COURSEWORK">Coursework</SelectItem>
                                        <SelectItem value="PROJECT">Project</SelectItem>
                                        <SelectItem value="PERFORMANCE">Performance</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                                {typeof errors.components?.[index]?.type === "object" && "message" in (errors.components[index]?.type ?? {}) && (
                                  <p className="text-xs text-red-600">{(errors.components[index]?.type as any)?.message}</p>
                                )}
                              </div>


                            </div>
                          // </div>
                        ))
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={watch("level")?.toLowerCase() !== "a-level"}
                      size="sm"
                      onClick={() => appendComponent({
                        name: "",
                        code: "",
                        type: "WRITTEN",
                      })}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Component
                    </Button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button type="submit" disabled={isLoading} className="flex-1">
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
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view-assessments" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              {/* <CardTitle>View Assessments</CardTitle> */}
            </CardHeader>
            <CardContent className="space-y-4">
              <ViewAssessmentsTab />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessments List Tab */}
        <TabsContent value="assessments-list" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              {/* <CardTitle>Grade Assessment</CardTitle>  */}
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={handleFilterSubmit(async (data) => {
                  setIsFilterLoading(true);
                  try {
                    // 1. Save selected filter values to global state
                    setGlobalSelectValues(prev => ({
                      ...prev,
                      gradeYear: data.academicYear,
                      gradeTerm: data.term,
                      gradeClassroom: data.classroom,
                      gradeAssessment: data.assessment,
                    }));

                    // 2. Find the selected assessment object from definitionsOptions
                    const classroom = structure?.definitionsOptions?.find(c => c.id === data.classroom);
                    const assessment =
                      classroom?.assessments?.find((a: any) => a.id === data.assessment);

                    if (!assessment) {
                      toast({ title: "Error", description: "Assessment not found.", variant: "destructive" });
                      setIsFilterLoading(false);
                      return;
                    }

                    // 3. Fetch enrolled students for the selected assessment
                    const res = await enrollmentsApi.enrolledStudents(schoolId, assessment.id);
                    if (!res.ok) throw new Error("Failed to fetch enrolled students");
                    const students = await res.json();

                    setGradingStudents(Array.isArray(students) ? students : students?.data || []);

                  } catch (error) {
                    toast({ title: "Error", description: "Failed to fetch enrolled students.", variant: "destructive" });
                  } finally {
                    setIsFilterLoading(false);
                  }
                })}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 items-end px-2 md:px-0">
                  {/* Academic Year */}
                  <div className="space-y-2">
                    <Label htmlFor="view-assess-year">Academic Year *</Label>
                    <Controller
                      name="academicYear"
                      control={filterControl}
                      rules={{ required: "Academic year is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            setGlobalSelectValues(prev => ({
                              ...prev,
                              gradeYear: v,
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select academic year" />
                          </SelectTrigger>
                          <SelectContent>
                            {structure?.years && structure.years.length > 0 ? (
                              structure.years.map(year => (
                                <SelectItem key={year.id} value={year.id}>
                                  {year.name || `Year ${year.id}`}
                                  {year.status === "active" && (
                                    <span className="ml-2 text-green-600 font-semibold">(Active)</span>
                                  )}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500">No academic years available</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {filterErrors.academicYear && <p className="text-sm text-red-500">{filterErrors.academicYear.message}</p>}
                  </div>
                  {/* Term */}
                  <div className="space-y-2">
                    <Label htmlFor="term-select">Term *</Label>
                    <Controller
                      name="term"
                      control={filterControl}
                      rules={{ required: "Term is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            setGlobalSelectValues(prev => ({
                              ...prev,
                              gradeTerm: v,
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                          <SelectContent>
                            {structure?.terms && structure.terms.length > 0 ? (
                              structure.terms.map(term => (
                                <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500">No terms available</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {filterErrors.term && <p className="text-sm text-red-500">{filterErrors.term.message}</p>}
                  </div>
                  {/* Classroom */}
                  <div className="space-y-2">
                    <Label htmlFor="classroom-select">Classroom *</Label>
                    <Controller
                      name="classroom"
                      control={filterControl}
                      rules={{ required: "Classroom is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            setGlobalSelectValues(prev => ({
                              ...prev,
                              gradeClassroom: v,
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select classroom" />
                          </SelectTrigger>
                          <SelectContent>
                            {structure?.definitionsOptions && structure.definitionsOptions.length > 0 ? (
                              structure.definitionsOptions
                                .filter(c => Array.isArray(c.assessments) && c.assessments.length > 0)
                                .map(classroom => (
                                  <SelectItem key={classroom.id} value={classroom.id}>{classroom.name}</SelectItem>
                                ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500">No classrooms available</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {filterErrors.classroom && <p className="text-sm text-red-500">{filterErrors.classroom.message}</p>}
                  </div>
                  {/* Assessment */}
                  <div className="space-y-2">
                    <Label htmlFor="assessment-select">Assessment *'</Label>
                    <Controller
                      name="assessment"
                      control={filterControl}
                      rules={{ required: "Assessment is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            setGlobalSelectValues(prev => ({
                              ...prev,
                              gradeAssessment: v,
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select assessment" />
                          </SelectTrigger>
                          <SelectContent>
                            {(!selectedAcademicYearId || !selectedTermId) ? (
                              <div className="px-4 py-2 text-sm text-gray-500">
                                Select academic year and term first
                              </div>
                            ) : (() => {
                              const classroom = structure?.definitionsOptions?.find(c => c.id === selectedClassroomId);
                              if (classroom && Array.isArray(classroom.assessments) && classroom.assessments.length > 0) {
                                const filteredAssessments = classroom.assessments.filter((assessment: any) =>
                                  assessment.term_template_item_id === selectedTermId &&
                                  assessment.academic_year_id === selectedAcademicYearId
                                );
                                setGradingAssessment(filteredAssessments.find((a: any) => a.id === globalSelectValues.gradeAssessment));
                                if (filteredAssessments.length > 0) {
                                  return filteredAssessments.map((assessment: any) => {
                                    return (
                                      <SelectItem key={assessment.id} value={assessment.id}>{`${assessment?.component?.subject?.name}: ${assessment?.component?.name} (${assessment.name})`}</SelectItem>
                                    )
                                  });
                                } else {
                                  return <div className="px-4 py-2 text-sm text-gray-500">No assessments available for selected term and year</div>;
                                }
                              } else {
                                return <div className="px-4 py-2 text-sm text-gray-500">No assessments available</div>;
                              }
                            })()}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {filterErrors.assessment && <p className="text-sm text-red-500">{filterErrors.assessment.message}</p>}
                  </div>
                  {/* Submit Button */}
                  <div className="flex items-end h-full">
                    <Button
                      type="submit"
                      className="w-full px-4 md:px-6 py-2 rounded-md bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition flex items-center justify-center gap-2"
                      disabled={isFilterLoading}
                    >
                      {isFilterLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          Loading...
                        </>
                      ) : (
                        <>Load</>
                      )}
                    </Button>
                  </div>
                </div>
              </form>

              <div className="mt-6">
                {isFilterLoading && gradingStudents.length === 0 ? (
                  <div className="overflow-x-auto animate-pulse">
                    <table className="w-full text-left table-auto border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-sm font-medium">Reg No</th>
                          <th className="px-3 py-2 text-sm font-medium">Student</th>
                          <th className="px-3 py-2 text-sm font-medium">Score</th>
                          <th className="px-3 py-2 text-sm font-medium">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(6)].map((_, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">
                              <div className="h-4 bg-gray-200 rounded w-16" />
                            </td>
                            <td className="px-3 py-2">
                              <div className="h-4 bg-gray-200 rounded w-28" />
                            </td>
                            <td className="px-3 py-2">
                              <div className="h-4 bg-gray-200 rounded w-12" />
                            </td>
                            <td className="px-3 py-2">
                              <div className="h-4 bg-gray-200 rounded w-20" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : gradingStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <svg
                      className="w-12 h-12 text-gray-300 mb-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 17v.01M12 7v6m0 8a9 9 0 100-18 9 9 0 000 18z"
                      />
                    </svg>
                    <div className="text-base font-medium text-gray-700 mb-1">
                      No students enrolled for this assessment.
                    </div>
                    <div className="text-sm text-gray-500 text-center max-w-xs">
                      There are no students for the selected assessment.<br />
                      Please check your filters or try another assessment.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left table-auto border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-sm font-medium">Reg No'</th>
                          <th className="px-3 py-2 text-sm font-medium">Student</th>
                          <th className="px-3 py-2 text-sm font-medium">Score</th>
                          {/* <th className="px-3 py-2 text-sm font-medium">Remarks</th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, idx) => (
                          <tr key={field.studentId} className="border-t">
                            <td className="px-3 py-2 text-sm">
                              {gradingStudents[idx]?.reg_no || gradingStudents[idx]?.student_no || gradingStudents[idx]?.id}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {`${gradingStudents[idx]?.first_name || ""} ${gradingStudents[idx]?.last_name || ""}`.trim()}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={0}
                                max={gradingAssessment?.maxScore || 100}
                                {...control.register(`grades.${idx}.score`, {
                                  min: { value: 0, message: "Score must be at least 0" },
                                  max: { value: Number(gradingAssessment?.maxScore) || 100, message: `Max score is ${gradingAssessment?.maxScore}` },
                                  validate: value => value === "" || !isNaN(Number(value)) || "Must be a number",
                                })}
                                placeholder="Score"
                                className="w-24"
                              />
                              {gradeErrors.grades?.[idx]?.score && (
                                <p className="text-xs text-red-600">{gradeErrors.grades[idx].score.message}</p>
                              )}
                            </td>
                            {/* <td className="px-3 py-2">
                              <Input
                                {...control.register(`grades.${idx}.remarks`)}
                                placeholder="Remarks"
                              />
                            </td> */}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {gradingAssessment && gradingStudents.length > 0 && (
                <div className="flex justify-end w-full">
                  <Button
                    disabled={submittingGrades}
                    onClick={handleGradesSubmit(async (data) => {
                      setSubmittingGrades(true);
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

                        // Refetch enrolled students for this assessment
                        setLoadingGradingStudents(true);
                        enrollmentsApi.enrolledStudents(schoolId, gradingAssessment.id)
                          .then(async (res) => {
                            const data = await res.json();
                            setGradingStudents(Array.isArray(data) ? data : data?.data || []);
                          })
                          .catch(() => setGradingStudents([]))
                          .finally(() => setLoadingGradingStudents(false));
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to submit grades", variant: "destructive" });
                      }
                      finally {
                        setSubmittingGrades(false);
                      }
                    })}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submittingGrades ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        Submiting...
                      </>
                    ) : (
                      "Submit Grades"
                    )}
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Create Assessment Tab */}
        <TabsContent value="create-assessment" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              {/* <CardTitle>Create New Assessment</CardTitle> */}
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
                <div className="grid grid-cols-6 gap-4">
                  <div className="space-y-2 w-full">
                    <Label htmlFor="view-assess-year">Academic Year *</Label>
                    <Controller
                      name="yearId"
                      control={controlAssessment}
                      rules={{ required: "Select academic year" }}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select academic year" />
                          </SelectTrigger>
                          <SelectContent>
                            {yearOptions.length > 0 ? (
                              yearOptions.map(year => (
                                <SelectItem key={year.id} value={year.id}>
                                  {year.name || `Year ${year.id}`}
                                  {year.status === "active" && (
                                    <span className="ml-2 text-green-600 font-semibold">(Active)</span>
                                  )}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500">No years available</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {assessmentErrors.yearId &&
                      <p className="text-sm text-red-500">{assessmentErrors.yearId.message}</p>}
                  </div>

                  <div className="space-y-2 w-full">
                    <Label htmlFor="view-assess-year">Term *</Label>
                    <Controller
                      name="termId"
                      control={controlAssessment}
                      rules={{ required: "Select term" }}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                          <SelectContent>
                            {termOptions.length > 0 ? (
                              termOptions.map(term => (
                                <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500">No terms available</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {assessmentErrors.termId &&
                      <p className="text-sm text-red-500">{assessmentErrors.termId.message}</p>}
                  </div>

                  <div className="space-y-2 w-full">
                    <Label htmlFor="level">Level *</Label>
                    <Controller
                      name="level"
                      control={controlAssessment}
                      rules={{ required: "Select level" }}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="level" className="w-full">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="O-Level">O-Level</SelectItem>
                            <SelectItem value="A-Level">A-Level</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {assessmentErrors.level &&
                      <p className="text-sm text-red-500">{assessmentErrors.level.message}</p>}
                  </div>

                  <div className="space-y-2 w-full">
                    <Label htmlFor="assess-subject">Subject *</Label>
                    <Controller
                      name="subjectId"
                      control={controlAssessment}
                      rules={{ required: "Subject is required" }}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a subject..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredSubjectOptions.length > 0 ? (
                              filteredSubjectOptions.map(subject => (
                                <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500">No subjects available</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {assessmentErrors.subjectId &&
                      <p className="text-sm text-red-600">{assessmentErrors.subjectId.message}</p>}
                  </div>

                  <div className="space-y-2 w-full">
                    <Label htmlFor="assess-component">Component *</Label>
                    <Controller
                      name="componentId"
                      control={controlAssessment}
                      rules={{ required: "Component is required" }}
                      render={({ field }) => {
                        const watchedSubjectId = useWatch({
                          control: controlAssessment,
                          name: "subjectId",
                        });
                        const components = getSubjectComponents(filteredSubjectOptions, watchedSubjectId);
                        return (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={components.length === 0}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a component..." />
                            </SelectTrigger>
                            <SelectContent>
                              {components.length > 0 ? (
                                components.map((comp: any) => (
                                  <SelectItem
                                    key={comp.id || comp.code || comp.name}
                                    value={comp.id || comp.code || comp.name}
                                  >
                                    {comp.name} {comp.code ? `(${comp.code})` : ""}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-4 py-2 text-sm text-gray-500">No components available</div>
                              )}
                            </SelectContent>
                          </Select>
                        );
                      }}
                    />
                    {assessmentErrors.componentId &&
                      <p className="text-sm text-red-600">{assessmentErrors.componentId.message}</p>}
                  </div>

                  <div className="space-y-2 w-full">
                    <Label htmlFor="assess-classroom">Classroom *</Label>
                    <Controller
                      name="classroomDefinitionId"
                      control={controlAssessment}
                      rules={{ required: "Classroom is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a classroom..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredDefinitionsOptions.length > 0 ? (
                              filteredDefinitionsOptions.map((classroom: any) => (
                                <SelectItem key={classroom.id} value={classroom.id}>{classroom.name}</SelectItem>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500">No classrooms available</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {assessmentErrors.classroomDefinitionId &&
                      <p className="text-sm text-red-600">{assessmentErrors.classroomDefinitionId.message}</p>}
                  </div>
                </div>

                {/* <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assess-name">Assessment Name *</Label>
                    <Input
                      id="assess-name"
                      placeholder="Midterm Exam"
                      {...registerAssessment("name", { required: "Assessment name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } })}
                    />
                    {assessmentErrors?.name &&
                      <p className="text-sm text-red-600">{assessmentErrors.name.message}</p>}
                  </div>
                </div> */}

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assess-type">Type *</Label>
                    <Controller
                      name="type"
                      control={controlAssessment}
                      rules={{ required: "Type is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CAT">CONTINUOUS ASSESSMENT</SelectItem>
                            <SelectItem value="MIDTERM">MID TERM</SelectItem>
                            <SelectItem value="END_OF_TERM">END OF TERM</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {assessmentErrors.type &&
                      <p className="text-sm text-red-600">{assessmentErrors.type.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                    {assessmentErrors?.weight &&
                      <p className="text-sm text-red-600">{assessmentErrors.weight.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assess-maxScore">Max Score *</Label>
                    <Input
                      id="assess-maxScore"
                      type="number"
                      step="0.1"
                      placeholder="100"
                      {...registerAssessment("maxScore", {
                        required: "Max score is required",
                        min: { value: 0, message: "Must be 0 or more" },
                        validate: value => !isNaN(Number(value)) || "Must be a number"
                      })}
                    />
                    {assessmentErrors?.maxScore &&
                      <p className="text-sm text-red-600">{assessmentErrors.maxScore.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assess-date">Assessment Date *</Label>
                    <Input
                      id="assess-date"
                      type="date"
                      {...registerAssessment("date", { required: "Assessment date is required" })}
                    />
                    {assessmentErrors?.date &&
                      <p className="text-sm text-red-600">{assessmentErrors.date.message}</p>}
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
                    {...register("name", {
                      required: "Subject name is required",
                      minLength: { value: 2, message: "Name must be at least 2 characters" }
                    })}
                  />
                  {errors?.name &&
                    <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-code">Subject Code *</Label>
                  <Input
                    id="edit-code"
                    placeholder="MATH"
                    {...register("code", {
                      required: "Subject code is required",
                      minLength: { value: 2, message: "Code must be at least 2 characters" }
                    })}
                  />
                  {errors?.code &&
                    <p className="text-sm text-red-600">{errors.code.message}</p>}
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

export function getSubjectComponents(subjectOptions: any[], subjectId: string) {
  const subject = subjectOptions.find((s: any) => s.id === subjectId);
  return subject?.components || [];
}
