import { useState, ChangeEvent, useRef, FormEvent, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertCircle, CheckCircle2, Loader2, DownloadCloud, UploadCloud, Users, ArrowRight, Trash2 } from "lucide-react";
import StudentsTable from "@/components/StudentsTable";
import { studentsApi, enrollmentsApi, academicYearsApi, classroomDefinitionsApi, termTemplatesApi, subjectsApi, assessmentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/context/TenantContext";
import { useStudents, useCreateStudent } from "@/hooks/use-students";

interface Student {
  id: string;
  school_id: string;
  student_no: string;
  reg_no: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

interface FormState {
  isOpen: boolean;
  isLoading: boolean;
  editingId: string | null;
}

interface StudentFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  avatarUrl: string;
}

interface AcademicYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  termTemplateId: string;
}

interface TermTemplate {
  id: string;
  name: string;
  structure: Term[];
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

export default function Students() {
  const { toast } = useToast();
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string;

  // Form setup with react-hook-form
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "",
      dateOfBirth: "",
      address: "",
      avatarUrl: "",
    },
  });

  const firstNameValue = watch("firstName");
  const lastNameValue = watch("lastName");

  // Student states and queries
  const { data: studentsData, refetch: refetchStudents } = useStudents(schoolId);
  const createStudent = useCreateStudent();

  // Bulk enrollment states
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [enrollmentStartDate, setEnrollmentStartDate] = useState<string>("");
  const [bulkEnrolling, setBulkEnrolling] = useState(false);
  const [activeTab, setActiveTab] = useState("students");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedDefinition, setSelectedDefinition] = useState<string>("");
  const [years, setYears] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingDefinitions, setLoadingDefinitions] = useState(false);

  // Student enrollments viewing states
  const [viewYear, setViewYear] = useState<string>("");
  const [viewDefinition, setViewDefinition] = useState<string>("");
  const [viewYears, setViewYears] = useState<any[]>([]);
  const [viewDefinitions, setViewDefinitions] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loadingViewYears, setLoadingViewYears] = useState(false);
  const [loadingViewDefinitions, setLoadingViewDefinitions] = useState(false);

  // Assessment states
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [assessmentSubjects, setAssessmentSubjects] = useState<Subject[]>([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState<AssessmentFormData>({
    termId: "",
    subjectId: "",
    name: "",
    type: "exam",
    maxScore: "100",
    weight: "0.4",
    assessmentDate: new Date().toISOString().split("T")[0],
  });

  // Fetch academic years and subjects on mount for assessments tab
  useEffect(() => {
    if (schoolId && activeTab === "assessments-view") {
      fetchAcademicYears();
    }
  }, [schoolId, activeTab]);

  // Fetch assessment subjects on mount
  useEffect(() => {
    if (schoolId) {
      fetchAssessmentSubjects();
    }
  }, [schoolId]);

  // Fetch terms when academic year is selected
  useEffect(() => {
    if (selectedYearId && activeTab === "assessments-create") {
      const selectedYear = academicYears.find((y: AcademicYear) => y.id === selectedYearId);
      if (selectedYear) {
        fetchTerms(selectedYear.termTemplateId);
        fetchAssessments();
      }
    }
  }, [selectedYearId, activeTab, academicYears]);

  const [loadingEnrolled, setLoadingEnrolled] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
  const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      toast({ title: "Invalid file", description: "Avatar must be PNG, JPG or WEBP", variant: "destructive" });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: "File too large", description: "Avatar must be under 2MB", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    try {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    } catch {
      setAvatarPreview("");
    }
  };

  const students = Array.isArray(studentsData) ? studentsData : studentsData?.data ?? [];

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleCreateStudent = async (data: StudentFormData) => {
    try {
      // If a file was provided, convert to data URL and include in payload
      const payload: any = { ...data };
      if (avatarFile) {
        const toDataUrl = (file: File) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

        payload.avatarUrl = await toDataUrl(avatarFile);
      }

      await createStudent.mutateAsync({ schoolId: schoolId!, data: payload });

      reset();
      setAvatarFile(null);
      setAvatarPreview("");
      toast({ title: "Success", description: "Student created successfully" });
      refetchStudents();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to create student", variant: "destructive" });
    }
  };

  const handleBulkEnroll = async () => {
    if (selectedStudents.length === 0) {
      toast({ title: "No students selected", description: "Please select at least one student", variant: "destructive" });
      return;
    }
    if (!enrollmentStartDate) {
      toast({ title: "No start date", description: "Please select an enrollment start date", variant: "destructive" });
      return;
    }

    // Load years and navigate to enrollments tab
    setLoadingYears(true);
    try {
      const res = await academicYearsApi.list(schoolId);
      const data = await res.json();
      setYears(Array.isArray(data) ? data : data?.data || []);
      setActiveTab("enrollments");
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load academic years", variant: "destructive" });
    } finally {
      setLoadingYears(false);
    }
  };

  const handleYearChange = async (yearId: string) => {
    setSelectedYear(yearId);
    setSelectedDefinition("");
    setLoadingDefinitions(true);
    try {
      const res = await classroomDefinitionsApi.list(schoolId);
      const data = await res.json();
      setDefinitions(Array.isArray(data) ? data : data?.data || []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load classroom definitions", variant: "destructive" });
    } finally {
      setLoadingDefinitions(false);
    }
  };

  const handleConfirmEnrollment = async () => {
    if (!selectedYear) {
      toast({ title: "No year selected", description: "Please select an academic year", variant: "destructive" });
      return;
    }
    if (!selectedDefinition) {
      toast({ title: "No definition selected", description: "Please select a classroom definition", variant: "destructive" });
      return;
    }

    setBulkEnrolling(true);
    try {
      const enrollments = selectedStudents.map((student: any) => ({
        studentId: student.id,
        startDate: new Date(enrollmentStartDate).toISOString(),
      }));

      await enrollmentsApi.bulkCreate(
        selectedYear,
        selectedDefinition,
        schoolId,
        { enrollments }
      );

      toast({ title: "Success", description: `${selectedStudents.length} students enrolled successfully` });
      setSelectedStudents([]);
      setEnrollmentStartDate("");
      setSelectedYear("");
      setSelectedDefinition("");
      refetchStudents();
      setActiveTab("students");
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to enroll students", variant: "destructive" });
    } finally {
      setBulkEnrolling(false);
    }
  };

  const handleLoadViewYears = async () => {
    setLoadingViewYears(true);
    try {
      const res = await academicYearsApi.list(schoolId);
      const data = await res.json();
      setViewYears(Array.isArray(data) ? data : data?.data || []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load academic years", variant: "destructive" });
    } finally {
      setLoadingViewYears(false);
    }
  };

  const handleViewYearChange = async (yearId: string) => {
    setViewYear(yearId);
    setViewDefinition("");
    setEnrolledStudents([]);
    setLoadingViewDefinitions(true);
    try {
      const res = await classroomDefinitionsApi.list(schoolId);
      const data = await res.json();
      setViewDefinitions(Array.isArray(data) ? data : data?.data || []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load classroom definitions", variant: "destructive" });
    } finally {
      setLoadingViewDefinitions(false);
    }
  };

  const handleViewDefinitionChange = async (definitionId: string) => {
    setViewDefinition(definitionId);
    setLoadingEnrolled(true);
    try {
      const res = await enrollmentsApi.list(viewYear, schoolId);
      const data = await res.json();

      // data structure: { academicYear, classrooms: [...], totalStudents }
      const responseData = Array.isArray(data) ? { classrooms: data } : data;
      const classrooms = responseData?.classrooms || [];

      // Find the classroom that matches the selected definition
      const selectedClassroom = classrooms.find(
        (classroom: any) => String(classroom.classroomDefinition?.id) === definitionId
      );

      if (selectedClassroom) {
        setEnrolledStudents(selectedClassroom.students || []);
      } else {
        setEnrolledStudents([]);
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load enrolled students", variant: "destructive" });
      setEnrolledStudents([]);
    } finally {
      setLoadingEnrolled(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await studentsApi.templateDownload();
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students_template";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded", description: "Template downloaded" });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to download template", variant: "destructive" });
    }
  };

  const handleUploadChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUploadFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      toast({ title: "No file", description: "Please select a file to upload", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      const res = await studentsApi.importStudents(schoolId!, fd);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }
      toast({ title: "Success", description: "Students uploaded successfully" });
      setUploadFile(null);
      refetchStudents();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to upload file", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Assessment functions
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

  const fetchAssessmentSubjects = async () => {
    try {
      const response = await subjectsApi.list(schoolId);
      if (!response.ok) throw new Error("Failed to fetch subjects");
      const data = await response.json();
      setAssessmentSubjects(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.warn("Failed to fetch subjects");
      toast({ title: "Error", description: "Failed to fetch subjects", variant: "destructive" });
    }
  };

  const fetchTerms = async (termTemplateId: string) => {
    try {
      const response = await termTemplatesApi.get(schoolId, termTemplateId);
      if (!response.ok) throw new Error("Failed to fetch term template");
      const data = await response.json();
      const template: TermTemplate = Array.isArray(data) ? data[0] : data;
      const termList = template.structure || [];
      setTerms(termList);
      // Reset term selection when year changes
      setAssessmentForm((prev: AssessmentFormData) => ({ ...prev, termId: "" }));
    } catch (error) {
      console.warn("Failed to fetch term template");
      toast({ title: "Error", description: "Failed to fetch term template", variant: "destructive" });
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssessmentLoading(true);

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
      setAssessmentLoading(false);
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
      title="Students"
      description="Manage students and their enrollments"
      breadcrumbs={[{ label: "Students" }]}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="students">Student Directory</TabsTrigger>
          {/* <TabsTrigger value="create">Create Student</TabsTrigger> */}
          <TabsTrigger value="uploads">Student Uploads</TabsTrigger>
          <TabsTrigger value="student-enrollments">Student Enrollments</TabsTrigger>
          {/* <TabsTrigger value="assessments-view">Assessments</TabsTrigger>
          <TabsTrigger value="assessments-create">Create Assessment</TabsTrigger> */}
        </TabsList>

        {/* Students Directory Tab */}
        <TabsContent value="students" className="space-y-4">
          {selectedStudents.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-blue-900">{selectedStudents.length} student(s) selected</p>
                      <p className="text-sm text-blue-700">Ready to enroll in a class</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="enrollmentDate" className="text-sm">Start Date</Label>
                    <Input
                      id="enrollmentDate"
                      type="date"
                      value={enrollmentStartDate}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEnrollmentStartDate(e.target.value)}
                      className="max-w-xs"
                    />

                    <Button
                      onClick={handleBulkEnroll}
                      disabled={loadingYears || !enrollmentStartDate}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {loadingYears ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Bulk Enroll
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedStudents([]);
                        setEnrollmentStartDate("");
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {students.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                  <AlertCircle className="h-8 w-8 text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900">No students yet</h3>
                  <p className="text-slate-500 max-w-sm mt-2">Create your first student to get started.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <StudentsTable
              students={students}
              onRefresh={refetchStudents}
              onSelectionChange={(students) => setSelectedStudents(students as any)}
              selectedIds={selectedStudents.map((s: Student) => s.id)}
            />
          )}
        </TabsContent>

        {/* Student Uploads Tab */}
        <TabsContent value="uploads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Uploads</CardTitle>
              <CardDescription>Download the template and upload a filled file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <DownloadCloud className="mr-2 h-4 w-4" />
                  Download Template
                </Button>

                <div className="flex flex-col">
                  <Input id="students-upload" type="file" accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleUploadChange} />
                  {uploadFile && <p className="text-sm mt-2">Selected: {uploadFile.name}</p>}
                </div>

                <Button onClick={handleUploadSubmit} disabled={uploading || !uploadFile}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Accepted formats: XLSX. The server will process the uploaded file.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Student Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Student</CardTitle>
              <CardDescription>Add a new student to the system</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleCreateStudent)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="avatar">Avatar</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                        {avatarPreview ? (
                          <AvatarImage src={avatarPreview} alt="Avatar preview" />
                        ) : (
                          <AvatarFallback>{(firstNameValue?.[0] || "") + (lastNameValue?.[0] || "")}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <Input id="avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} ref={avatarInputRef} />
                        <p className="text-sm text-slate-500 mt-1">PNG/JPG/WEBP — max 2MB</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      {...register("firstName", {
                        required: "First name is required",
                        minLength: { value: 2, message: "First name must be at least 2 characters" },
                      })}
                    />
                    {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      {...register("lastName", {
                        required: "Last name is required",
                        minLength: { value: 2, message: "Last name must be at least 2 characters" },
                      })}
                    />
                    {errors.lastName && <p className="text-sm text-red-500">{errors.lastName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@student.test"
                      {...register("email", {
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Please enter a valid email address",
                        },
                      })}
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="0700000002"
                      {...register("phone")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register("dateOfBirth", {
                        required: "Date of birth is required",
                      })}
                    />
                    {errors.dateOfBirth && <p className="text-sm text-red-500">{errors.dateOfBirth.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main Street, City"
                      {...register("address")}
                    />
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Endpoint: POST /students?schoolId={schoolId}
                  </AlertDescription>
                </Alert>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Student
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student Enrollments Tab */}
        <TabsContent value="enrollments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enroll Students</CardTitle>
              <CardDescription>Select the academic year and classroom definition for enrollment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Card */}
              <Card className="border-blue-100 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-900">
                      Enrolling <span className="font-bold">{selectedStudents.length}</span> student(s)
                    </p>
                    <p className="text-sm text-blue-700">
                      Start Date: <span className="font-semibold">{new Date(enrollmentStartDate).toLocaleDateString()}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Year and Definition Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Academic Year *</Label>
                  <Select value={selectedYear} onValueChange={handleYearChange} disabled={loadingYears}>
                    <SelectTrigger id="year">
                      <SelectValue placeholder={loadingYears ? "Loading..." : "Select academic year"} />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year.id} value={String(year.id)}>
                          {year.name || `Year ${year.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="definition">Classroom Definition *</Label>
                  <Select value={selectedDefinition} onValueChange={setSelectedDefinition} disabled={!selectedYear || loadingDefinitions}>
                    <SelectTrigger id="definition">
                      <SelectValue placeholder={!selectedYear ? "Select a year first" : loadingDefinitions ? "Loading..." : "Select classroom definition"} />
                    </SelectTrigger>
                    <SelectContent>
                      {definitions.map((def) => (
                        <SelectItem key={def.id} value={String(def.id)}>
                          {def.name || `Definition ${def.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selected Students List */}
              <div className="space-y-2">
                <Label>Selected Students ({selectedStudents.length})</Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-4 bg-slate-50">
                  {selectedStudents.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedStudents.map((student) => (
                        <li key={student.id} className="text-sm text-slate-700">
                          <span className="font-medium">{student.first_name} {student.last_name}</span>
                          <span className="text-slate-500"> ({student.student_no || student.reg_no})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No students selected</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab("students");
                    setSelectedYear("");
                    setSelectedDefinition("");
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmEnrollment}
                  disabled={bulkEnrolling || !selectedYear || !selectedDefinition}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {bulkEnrolling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm Enrollment
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student Enrollments View Tab */}
        <TabsContent value="student-enrollments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>View Student Enrollments</CardTitle>
              <CardDescription>View students enrolled in a specific classroom definition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Year and Definition Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="viewYear">Academic Year *</Label>
                  <Select value={viewYear} onValueChange={handleViewYearChange} disabled={loadingViewYears}>
                    <SelectTrigger id="viewYear">
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {viewYears.length === 0 && !loadingViewYears && (
                        <div className="p-2 text-sm text-slate-500">
                          {viewYears.length === 0 ? (
                            <span onClick={handleLoadViewYears} className="cursor-pointer text-blue-600 hover:underline">
                              Click to load years
                            </span>
                          ) : (
                            "No years available"
                          )}
                        </div>
                      )}
                      {viewYears.map((year) => (
                        <SelectItem key={year.id} value={String(year.id)}>
                          {year.name || `Year ${year.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="viewDefinition">Classroom Definition *</Label>
                  <Select value={viewDefinition} onValueChange={handleViewDefinitionChange} disabled={!viewYear || loadingViewDefinitions}>
                    <SelectTrigger id="viewDefinition">
                      <SelectValue placeholder={!viewYear ? "Select a year first" : loadingViewDefinitions ? "Loading..." : "Select classroom definition"} />
                    </SelectTrigger>
                    <SelectContent>
                      {viewDefinitions.map((def) => (
                        <SelectItem key={def.id} value={String(def.id)}>
                          {def.name || `Definition ${def.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Enrolled Students Table */}
              {viewDefinition && (
                <div className="space-y-2">
                  <Label>Enrolled Students ({enrolledStudents.length})</Label>
                  {loadingEnrolled ? (
                    <Card>
                      <CardContent className="pt-6 pb-6 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </CardContent>
                    </Card>
                  ) : enrolledStudents.length > 0 ? (
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Student No</TableHead>
                            <TableHead>Reg No</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Enrolled Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enrolledStudents.map((enrollment) => (
                            <TableRow key={enrollment.enrollmentId}>
                              <TableCell className="font-medium">
                                {enrollment.student?.firstName} {enrollment.student?.lastName}
                              </TableCell>
                              <TableCell>{enrollment.student?.studentNo || "-"}</TableCell>
                              <TableCell>{enrollment.student?.regNo || "-"}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {enrollment.student?.status ? enrollment.student.status.charAt(0).toUpperCase() + enrollment.student.status.slice(1) : "Active"}
                                </span>
                              </TableCell>
                              <TableCell>
                                {enrollment.startDate
                                  ? new Date(enrollment.startDate).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6 pb-6">
                        <p className="text-sm text-slate-500 text-center">
                          No students enrolled in this classroom definition
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {!viewDefinition && viewYear && (
                <Card>
                  <CardContent className="pt-6 pb-6">
                    <p className="text-sm text-slate-500 text-center">
                      Select a classroom definition to view enrolled students
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessments View Tab */}
        <TabsContent value="assessments-view" className="space-y-4">
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
                        const subject = assessmentSubjects.find((s: Subject) => s.id === assessment.subject_id);
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
        <TabsContent value="assessments-create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Assessment</CardTitle>
              <CardDescription>Add a new assessment or exam</CardDescription>
            </CardHeader>
            <CardContent>
              {terms.length === 0 || assessmentSubjects.length === 0 ? (
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
                          {assessmentSubjects.map((subject: Subject) => (
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

                  <Button type="submit" disabled={assessmentLoading} className="w-full">
                    {assessmentLoading ? (
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
