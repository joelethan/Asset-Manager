import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useTenant } from "@/context/TenantContext";
import { useAcademicYears } from "@/hooks/use-academic-structure";
import { useEnrollStudent, useEnrollments } from "@/hooks/use-enrollments";
import { useStudents } from "@/hooks/use-students";
import { useToast } from "@/hooks/use-toast";
import { classroomDefinitionsApi } from "@/lib/api";
import { AlertCircle, CheckCircle2, Edit2, Loader2, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

interface ClassroomDefinition {
  id: string;
  school_id: string;
  name: string;
  level: string;
  ordinal?: number;
}

interface AcademicYear {
  id: string;
  name: string;
  status: string;
}

interface EnrollmentData {
  studentId: string;
  definitionId: string;
  startDate: string;
}

interface FormState {
  isOpen: boolean;
  isLoading: boolean;
  editingId: string | null;
}

export default function Classes() {
  const { toast } = useToast();
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string;

  // Classroom Definition states
  const [classrooms, setClassrooms] = useState<ClassroomDefinition[]>([]);

  // Form states
  const [classroomForm, setClassroomForm] = useState<FormState>({
    isOpen: false,
    isLoading: false,
    editingId: null,
  });
  const [classroomServerError, setClassroomServerError] = useState<string>("");
  const [classroomServerErrorList, setClassroomServerErrorList] = useState<string[]>([]);
  // Form (react-hook-form)
  const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm({
    defaultValues: { name: "", level: "", ordinal: 1 },
    mode: "onChange",
  });

  // Enrollment state
  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentData>({
    studentId: "",
    definitionId: "",
    startDate: new Date().toISOString().split("T")[0],
  });

  const [selectedStudentForEnrollment, setSelectedStudentForEnrollment] = useState<string>("");
  const [enrollmentFormState, setEnrollmentFormState] = useState<FormState>({
    isOpen: false,
    isLoading: false,
    editingId: null,
  });

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student and enrollment hooks
  const { data: studentsData } = useStudents(schoolId);
  const enrollStudent = useEnrollStudent();

  const { data: years } = useAcademicYears(schoolId);
  const yearList = Array.isArray(years) ? years : [];
  const activeYear = yearList.find((y: any) => String(y.status).toLowerCase() === "active");
  const yearId = activeYear ? activeYear.id : (yearList[0]?.id ?? null);
  const { data: enrollmentsData, refetch: refetchEnrollments } = useEnrollments(yearId ? String(yearId) : undefined, schoolId);
  const enrollments = Array.isArray(enrollmentsData) ? enrollmentsData : [];

  const students = Array.isArray(studentsData) ? studentsData : studentsData?.data ?? [];

  // When classroom definitions load, default to the first available classroom for enrollments
  useEffect(() => {
    if (classrooms.length > 0 && !enrollmentForm.definitionId) {
      setEnrollmentForm((f: any) => ({ ...f, definitionId: classrooms[0].id }));
    }
  }, [classrooms]);

  // Load data on mount and when tenant changes
  useEffect(() => {
    if (schoolId) {
      loadData();
    }
  }, [schoolId]);

  // Load academic years when selected year changes
  const loadData = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      // Load classroom definitions
      const classroomsRes = await classroomDefinitionsApi.list(schoolId);
      if (!classroomsRes.ok) throw new Error("Failed to load classrooms");
      const classroomsData = await classroomsRes.json();
      setClassrooms(Array.isArray(classroomsData) ? classroomsData : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast({
        title: "Error loading data",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Classroom Definition handlers
  const handleAddClassroom = () => {
    reset({ name: "", level: "", ordinal: 1 });
    setClassroomForm({ isOpen: true, isLoading: false, editingId: null });
  };

  const handleEditClassroom = (classroom: ClassroomDefinition) => {
    reset({ name: classroom.name, level: classroom.level, ordinal: classroom.ordinal ?? 1 });
    setClassroomForm({ isOpen: true, isLoading: false, editingId: classroom.id });
  };

  const handleSaveClassroom = async (data: any) => {
    setError(null);
    setClassroomServerError("");
    setClassroomServerErrorList([]);
    setClassroomForm((prev: any) => ({ ...prev, isLoading: true }));
    try {
      const method = classroomForm.editingId ? "update" : "create";
      let res;
      if (classroomForm.editingId) {
        res = await classroomDefinitionsApi.update(schoolId, classroomForm.editingId, data);
      } else {
        res = await classroomDefinitionsApi.create(schoolId, data);
      }
      if (!res.ok) {
        let msg = `Failed to ${method} classroom`;
        let errorList: string[] = [];
        try {
          const err = await res.json();
          if (err?.error?.errors && Array.isArray(err.error.errors)) {
            msg = err?.error?.message || msg;
            errorList = err.error.errors.map((e: any) => e.message);
          } else if (err?.error?.message) {
            msg = err.error.message;
          } else if (err?.message) {
            msg = err.message;
          }
        } catch { }
        setClassroomServerError(msg);
        setClassroomServerErrorList(errorList);
        setError(msg);
        toast({ title: "Error", description: errorList.length > 0 ? errorList[0] : msg, variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: `Classroom ${method === "create" ? "created" : "updated"} successfully` });
      reset({ name: "", level: "", ordinal: 1 });
      setClassroomForm({ isOpen: false, isLoading: false, editingId: null });
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setClassroomServerError(message);
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setClassroomForm((prev: any) => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteClassroom = async (id: string) => {
    if (!confirm("Are you sure you want to delete this classroom?")) return;

    try {
      const res = await classroomDefinitionsApi.delete(schoolId, id);
      if (!res.ok) throw new Error("Failed to delete classroom");

      toast({
        title: "Success",
        description: "Classroom deleted successfully",
      });

      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleEnrollStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForEnrollment || !enrollmentForm.definitionId) {
      toast({ title: "Error", description: "Please select a student and classroom", variant: "destructive" });
      return;
    }

    setEnrollmentFormState({ ...enrollmentFormState, isLoading: true });

    try {
      await enrollStudent.mutateAsync({
        definitionId: enrollmentForm.definitionId,
        schoolId: schoolId!,
        payload: {
          studentId: selectedStudentForEnrollment,
          startDate: new Date(enrollmentForm.startDate).toISOString(),
        },
      });

      setSelectedStudentForEnrollment("");
      setEnrollmentForm({ studentId: "", definitionId: "", startDate: new Date().toISOString().split("T")[0] });
      setEnrollmentFormState({ isOpen: false, isLoading: false, editingId: null });
      toast({ title: "Success", description: "Student enrolled successfully" });
      // Refresh enrollments list
      refetchEnrollments();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to enroll student", variant: "destructive" });
    } finally {
      setEnrollmentFormState({ ...enrollmentFormState, isLoading: false });
    }
  }

  if (isLoadingData) {
    return (
      <AppLayout title="Classes" description="Manage classroom definitions">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const getClassroomName = (id: string) => {
    return classrooms.find((c: any) => c.id === id)?.name || "Unknown";
  };

  return (
    <AppLayout
      title="Classes"
      description="Manage classroom definitions for your school"
      breadcrumbs={[{ label: "Classes" }]}
    >
      <Tabs defaultValue="definitions" className="w-full">

        {/* Classroom Definitions Tab */}
        <TabsContent value="definitions" className="space-y-4">
          {/* {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )} */}

          <Card className="border-slate-200">
            <CardHeader>
              {/* <CardTitle>Create and Manage Classroom Definitions</CardTitle> */}
              {/* <CardDescription>Create and manage classroom levels for your school</CardDescription> */}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: List */}
                <div>
                  {isLoadingData && classrooms.length === 0 ? (
                    <div className="space-y-2 flex flex-col items-center justify-center text-center">
                      {/* <Loader2 className="h-4 w-4 text-primary animate-spin mb-2" /> */}
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : classrooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                      <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-slate-500">No classroom definitions yet.</p>
                      <p className="text-sm text-slate-400 mt-1">Create one to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {classrooms.map((classroom) => (
                        <div key={classroom.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900">{classroom.name}</h4>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{classroom.level}</span>
                            <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-700">#{classroom.ordinal}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEditClassroom(classroom)} className="h-8">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => handleDeleteClassroom(classroom.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Form */}
                <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    {classroomForm.editingId ? "Edit Classroom" : "Create New Classroom"}
                  </h3>
                  {(classroomServerError || classroomServerErrorList.length > 0) && (
                    <Alert variant="destructive" className="mb-4">
                      {classroomServerErrorList.length === 0 && <AlertCircle className="h-4 w-4" />}
                      <AlertDescription>
                        {classroomServerError && classroomServerErrorList.length === 0 && <div>{classroomServerError}</div>}
                        {classroomServerErrorList.length > 0 && (
                          <ul className="mt-2 ml-4 list-disc space-y-1">
                            {([...new Set(classroomServerErrorList)]).map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  <form onSubmit={handleSubmit(handleSaveClassroom)} className="space-y-4">
                    <div>
                      <Label htmlFor="class-name">Classroom Name *</Label>
                      <Input id="class-name" placeholder="e.g., Primary 7" {...register("name", {
                        required: "Classroom name is required",
                        minLength: { value: 3, message: "Name must be at least 3 characters" },
                        validate: value => value.trim().length > 0 || "Name cannot be empty"
                      })} />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message as string}</p>}
                    </div>
                    <div>
                      <Label htmlFor="class-level">Level *</Label>
                      <Input id="class-level" placeholder="e.g., Primary" {...register("level", {
                        required: "Level is required",
                        minLength: { value: 2, message: "Level must be at least 2 characters" },
                        validate: value => value.trim().length > 0 || "Level cannot be empty"
                      })} />
                      {errors.level && <p className="text-xs text-red-500 mt-1">{errors.level.message as string}</p>}
                    </div>
                    <div>
                      <Label htmlFor="class-ordinal">Ordinal *</Label>
                      <Input id="class-ordinal" type="number" min={1} placeholder="e.g., 1" {...register("ordinal", {
                        required: "Ordinal is required",
                        valueAsNumber: true,
                        min: { value: 1, message: "Ordinal must be a positive integer" },
                        validate: value => Number.isInteger(value) && value > 0 || "Ordinal must be a positive integer"
                      })} />
                      {errors.ordinal && <p className="text-xs text-red-500 mt-1">{errors.ordinal.message as string}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={classroomForm.isLoading || !isValid}
                        className="flex-1 gap-2"
                      >
                        {classroomForm.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {classroomForm.editingId ? "Update" : "Create"}
                      </Button>
                      {classroomForm.editingId && (
                        <Button type="button" variant="outline" onClick={() => { reset({ name: "", level: "", ordinal: 1 }); setClassroomForm({ isOpen: false, isLoading: false, editingId: null }); }}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enroll in Class Tab */}
        <TabsContent value="enrollments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enroll Student in Class</CardTitle>
              <CardDescription>Enroll a student into a classroom</CardDescription>
            </CardHeader>
            <CardContent>
              {classrooms.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No classroom definitions available. Please create a classroom first.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Current enrollments overview */}
                  {enrollments.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Current Enrollments</h4>
                      <div className="grid gap-2">
                        {enrollments.map((e: any, idx: number) => (
                          <div key={e.id ?? idx} className="p-2 border rounded flex items-center justify-between">
                            <div className="text-sm">{e.display_name || e.name || getClassroomName(e.classroom_definition_id) || "Classroom"}</div>
                            <div className="text-xs text-slate-500">{Array.isArray(e.students) ? `${e.students.length} students` : e.count ? `${e.count} students` : ""}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-right">
                        <Button variant="ghost" onClick={() => refetchEnrollments()}>
                          Refresh Enrollments
                        </Button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleEnrollStudent} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="student">Select Student</Label>
                      <Select value={selectedStudentForEnrollment} onValueChange={setSelectedStudentForEnrollment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student: any) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.student_no} - {student.first_name} {student.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="classroom">Select Classroom</Label>
                      <Select value={enrollmentForm.definitionId} onValueChange={(value) => setEnrollmentForm({ ...enrollmentForm, definitionId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a classroom" />
                        </SelectTrigger>
                        <SelectContent>
                          {classrooms.map((classroom: any) => (
                            <SelectItem key={classroom.id} value={classroom.id}>
                              {classroom.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={enrollmentForm.startDate}
                        onChange={(e) => setEnrollmentForm({ ...enrollmentForm, startDate: e.target.value })}
                        required
                      />
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Endpoint: POST /classroom-definitions/{"{definitionId}"}/enrollments?schoolId={schoolId}
                      </AlertDescription>
                    </Alert>

                    <Button type="submit" disabled={enrollmentFormState.isLoading} className="w-full">
                      {enrollmentFormState.isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Enroll Student
                        </>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
