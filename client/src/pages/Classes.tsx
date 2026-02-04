import { useState, useEffect, FormEvent } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/context/TenantContext";
import { classroomDefinitionsApi, classroomOfferingsApi, academicYearsApi } from "@/lib/api";
import { useStudents } from "@/hooks/use-students";
import { useEnrollStudent, useEnrollments } from "@/hooks/use-enrollments";
import { useAcademicYears, useClassroomOfferings } from "@/hooks/use-academic-structure";

interface ClassroomDefinition {
  id: string;
  school_id: string;
  name: string;
  level: string;
}

interface AcademicYear {
  id: string;
  name: string;
  status: string;
}

interface ClassroomOffering {
  id: string;
  academic_year_id: string;
  classroom_definition_id: string;
  display_name: string;
}

interface EnrollmentData {
  studentId: string;
  classroomOfferingId: string;
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
  const [offerings, setOfferings] = useState<ClassroomOffering[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");

  // Form states
  const [classroomForm, setClassroomForm] = useState<FormState>({
    isOpen: false,
    isLoading: false,
    editingId: null,
  });

  const [offeringForm, setOfferingForm] = useState<FormState>({
    isOpen: false,
    isLoading: false,
    editingId: null,
  });

  // Form data
  const [classroomData, setClassroomData] = useState({ name: "", level: "" });
  const [offeringData, setOfferingData] = useState({ classroomDefinitionId: "", displayName: "" });

  // Enrollment state
  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentData>({
    studentId: "",
    classroomOfferingId: "",
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

  // Academic years and classroom offerings (via hooks)
  const { data: years } = useAcademicYears(schoolId);
  const yearList = Array.isArray(years) ? years : [];
  const activeYear = yearList.find((y: any) => String(y.status).toLowerCase() === "active");
  const yearId = activeYear ? activeYear.id : (yearList[0]?.id ?? null);
  const { data: offeringsData } = useClassroomOfferings(yearId ? String(yearId) : undefined);
  const classroomOfferingsForEnroll = Array.isArray(offeringsData) ? offeringsData : [];

  const { data: enrollmentsData, refetch: refetchEnrollments } = useEnrollments(yearId ? String(yearId) : undefined, schoolId);
  const enrollments = Array.isArray(enrollmentsData) ? enrollmentsData : [];

  const students = Array.isArray(studentsData) ? studentsData : studentsData?.data ?? [];

  // When offerings load, default to the first available offering (helps quick enroll)
  if (classroomOfferingsForEnroll.length > 0 && !enrollmentForm.classroomOfferingId) {
    setEnrollmentForm((f: any) => ({ ...f, classroomOfferingId: classroomOfferingsForEnroll[0].id }));
  }

  // Load data on mount and when tenant changes
  useEffect(() => {
    if (schoolId) {
      loadData();
    }
  }, [schoolId]);

  // Load academic years when selected year changes
  useEffect(() => {
    if (selectedYear) {
      loadOfferings(selectedYear);
    }
  }, [selectedYear]);

  const loadData = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      // Load classroom definitions
      const classroomsRes = await classroomDefinitionsApi.list(schoolId);
      if (!classroomsRes.ok) throw new Error("Failed to load classrooms");
      const classroomsData = await classroomsRes.json();
      setClassrooms(Array.isArray(classroomsData) ? classroomsData : []);

      // Load academic years
      const yearsRes = await academicYearsApi.list(schoolId);
      if (!yearsRes.ok) throw new Error("Failed to load academic years");
      const yearsData = await yearsRes.json();
      const years = Array.isArray(yearsData) ? yearsData : [];
      setAcademicYears(years);

      // Set first year as default, or active year if available
      if (years.length > 0) {
        const activeYear = years.find(year => year.status.toLowerCase() === "active");
        setSelectedYear(activeYear?.id || years[0].id);
      }
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

  const loadOfferings = async (yearId: string) => {
    try {
      const res = await classroomOfferingsApi.list(yearId);
      if (!res.ok) throw new Error("Failed to load classroom offerings");
      const data = await res.json();
      setOfferings(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error loading offerings",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Classroom Definition handlers
  const handleAddClassroom = () => {
    setClassroomData({ name: "", level: "" });
    setClassroomForm({ isOpen: true, isLoading: false, editingId: null });
  };

  const handleEditClassroom = (classroom: ClassroomDefinition) => {
    setClassroomData({ name: classroom.name, level: classroom.level });
    setClassroomForm({ isOpen: true, isLoading: false, editingId: classroom.id });
  };

  const handleSaveClassroom = async (e: any) => {
    e?.preventDefault?.();
    if (!classroomData.name.trim() || !classroomData.level.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and level are required",
        variant: "destructive",
      });
      return;
    }

    setClassroomForm((prev: any) => ({ ...prev, isLoading: true }));
    try {
      const method = classroomForm.editingId ? "update" : "create";
      let res;

      if (classroomForm.editingId) {
        res = await classroomDefinitionsApi.update(schoolId, classroomForm.editingId, classroomData);
      } else {
        res = await classroomDefinitionsApi.create(schoolId, classroomData);
      }

      if (!res.ok) throw new Error(`Failed to ${method} classroom`);

      toast({
        title: "Success",
        description: `Classroom ${method === "create" ? "created" : "updated"} successfully`,
      });

      setClassroomData({ name: "", level: "" });
      setClassroomForm({ isOpen: false, isLoading: false, editingId: null });
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
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

  // Classroom Offering handlers
  const handleAddOffering = () => {
    setOfferingData({ classroomDefinitionId: "", displayName: "" });
    setOfferingForm({ isOpen: true, isLoading: false, editingId: null });
  };

  const handleEditOffering = (offering: ClassroomOffering) => {
    setOfferingData({
      classroomDefinitionId: offering.classroom_definition_id,
      displayName: offering.display_name,
    });
    setOfferingForm({ isOpen: true, isLoading: false, editingId: offering.id });
  };

  const handleSaveOffering = async (e: any) => {
    e?.preventDefault?.();
    if (!offeringData.classroomDefinitionId || !offeringData.displayName.trim()) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    setOfferingForm((prev: any) => ({ ...prev, isLoading: true }));
    try {
      const method = offeringForm.editingId ? "update" : "create";
      let res;

      const payload = {
        classroomDefinitionId: offeringData.classroomDefinitionId,
        displayName: offeringData.displayName,
      };

      if (offeringForm.editingId) {
        res = await classroomOfferingsApi.update(selectedYear, offeringForm.editingId, payload);
      } else {
        res = await classroomOfferingsApi.create(selectedYear, payload);
      }

      if (!res.ok) throw new Error(`Failed to ${method} classroom offering`);

      toast({
        title: "Success",
        description: `Classroom offering ${method === "create" ? "created" : "updated"} successfully`,
      });

      setOfferingData({ classroomDefinitionId: "", displayName: "" });
      setOfferingForm({ isOpen: false, isLoading: false, editingId: null });
      loadOfferings(selectedYear);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setOfferingForm((prev: any) => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteOffering = async (id: string) => {
    if (!confirm("Are you sure you want to delete this classroom offering?")) return;

    try {
      const res = await classroomOfferingsApi.delete(selectedYear, id);
      if (!res.ok) throw new Error("Failed to delete classroom offering");

      toast({
        title: "Success",
        description: "Classroom offering deleted successfully",
      });

      loadOfferings(selectedYear);
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
    if (!selectedStudentForEnrollment || !enrollmentForm.classroomOfferingId) {
      toast({ title: "Error", description: "Please select a student and classroom offering", variant: "destructive" });
      return;
    }

    setEnrollmentFormState({ ...enrollmentFormState, isLoading: true });

    try {
      await enrollStudent.mutateAsync({
        offeringId: enrollmentForm.classroomOfferingId,
        schoolId: schoolId!,
        payload: {
          studentId: selectedStudentForEnrollment,
          startDate: new Date(enrollmentForm.startDate).toISOString(),
        },
      });

      setSelectedStudentForEnrollment("");
      setEnrollmentForm({ studentId: "", classroomOfferingId: "", startDate: new Date().toISOString().split("T")[0] });
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
      <AppLayout title="Classes" description="Manage classroom definitions and offerings">
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
      description="Manage classroom definitions and offerings for your school"
      breadcrumbs={[{ label: "Classes" }]}
    >
      <Tabs defaultValue="definitions" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="definitions">Classroom Definitions</TabsTrigger>
          <TabsTrigger value="offerings">Classroom Offerings</TabsTrigger>
          <TabsTrigger value="enrollments">Enroll in Class</TabsTrigger>
        </TabsList>

        {/* Classroom Definitions Tab */}
        <TabsContent value="definitions" className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Classroom Definitions</CardTitle>
              <CardDescription>Create and manage classroom levels for your school</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: List */}
                <div>
                  {classrooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                      <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-slate-500">No classroom definitions yet.</p>
                      <p className="text-sm text-slate-400 mt-1">Create one to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {classrooms.map((classroom) => (
                        <div key={classroom.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900">{classroom.name}</h4>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{classroom.level}</span>
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
                  <form onSubmit={handleSaveClassroom} className="space-y-4">
                    <div>
                      <Label htmlFor="class-name">Classroom Name *</Label>
                      <Input
                        id="class-name"
                        placeholder="e.g., Primary 7"
                        value={classroomData.name}
                        onChange={(e) => setClassroomData({ ...classroomData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="class-level">Level *</Label>
                      <Input
                        id="class-level"
                        placeholder="e.g., Primary"
                        value={classroomData.level}
                        onChange={(e) => setClassroomData({ ...classroomData, level: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={classroomForm.isLoading}
                        className="flex-1 gap-2"
                      >
                        {classroomForm.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {classroomForm.editingId ? "Update" : "Create"}
                      </Button>
                      {classroomForm.editingId && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setClassroomData({ name: "", level: "" });
                            setClassroomForm({ isOpen: false, isLoading: false, editingId: null });
                          }}
                        >
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

        {/* Classroom Offerings Tab */}
        <TabsContent value="offerings" className="space-y-4">
          {academicYears.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Academic Year</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year: any) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.status && `(${year.status})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {academicYears.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
                  <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-slate-500">No academic years found.</p>
                  <p className="text-sm text-slate-400 mt-1">Create an academic year first</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Classroom Offerings</CardTitle>
                <CardDescription>Create classroom offerings for the selected academic year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: List */}
                  <div>
                    {offerings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                        <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-slate-500">No classroom offerings for this year.</p>
                        <p className="text-sm text-slate-400 mt-1">Create one to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {offerings.map((offering: any) => (
                          <div key={offering.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 mb-1">{offering.display_name}</h4>
                              <p className="text-sm text-slate-600">{getClassroomName(offering.classroom_definition_id)}</p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button size="sm" variant="ghost" onClick={() => handleEditOffering(offering)} className="h-8">
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => handleDeleteOffering(offering.id)}>
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
                      {offeringForm.editingId ? "Edit Offering" : "Create New Offering"}
                    </h3>
                    <form onSubmit={handleSaveOffering} className="space-y-4">
                      <div>
                        <Label htmlFor="classroom-select">Classroom Definition *</Label>
                        <Select value={offeringData.classroomDefinitionId} onValueChange={(value) => setOfferingData({ ...offeringData, classroomDefinitionId: value })}>
                          <SelectTrigger id="classroom-select">
                            <SelectValue placeholder="Select a classroom" />
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
                      <div>
                        <Label htmlFor="display-name">Display Name *</Label>
                        <Input
                          id="display-name"
                          placeholder="e.g., Primary 7 A"
                          value={offeringData.displayName}
                          onChange={(e) => setOfferingData({ ...offeringData, displayName: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={offeringForm.isLoading}
                          className="flex-1 gap-2"
                        >
                          {offeringForm.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          {offeringForm.editingId ? "Update" : "Create"}
                        </Button>
                        {offeringForm.editingId && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setOfferingData({ classroomDefinitionId: "", displayName: "" });
                              setOfferingForm({ isOpen: false, isLoading: false, editingId: null });
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Enroll in Class Tab */}
        <TabsContent value="enrollments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enroll Student in Class</CardTitle>
              <CardDescription>Enroll a student into a classroom offering</CardDescription>
            </CardHeader>
            <CardContent>
              {classroomOfferingsForEnroll.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No classroom offerings available. Please create a classroom offering first.
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
                          <div key={e.id ?? e.offeringId ?? idx} className="p-2 border rounded flex items-center justify-between">
                            <div className="text-sm">{e.display_name || e.offeringDisplayName || e.name || (e.offering && e.offering.display_name) || "Offering"}</div>
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
                      <Label htmlFor="offering">Select Classroom Offering</Label>
                      <Select value={enrollmentForm.classroomOfferingId} onValueChange={(value) => setEnrollmentForm({ ...enrollmentForm, classroomOfferingId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a classroom offering" />
                        </SelectTrigger>
                        <SelectContent>
                          {classroomOfferingsForEnroll.map((offering: any) => (
                            <SelectItem key={offering.id} value={offering.id}>
                              {offering.display_name}
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
                        Endpoint: POST /classroom-offerings/{"{offeringId}"}/enrollments?schoolId={schoolId}
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
