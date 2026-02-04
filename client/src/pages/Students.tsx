import { useState, useEffect, ChangeEvent, useRef } from "react";
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
import { Plus, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import StudentsTable from "@/components/StudentsTable";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/context/TenantContext";
import { studentsApi, enrollmentsApi, academicYearsApi, classroomOfferingsApi } from "@/lib/api";

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

interface ClassroomOffering {
  id: string;
  display_name: string;
  classroom_definition_id: string;
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

interface EnrollmentData {
  studentId: string;
  classroomOfferingId: string;
  startDate: string;
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

  // Student states
  const [students, setStudents] = useState<Student[]>([]);
  const [offerings, setOfferings] = useState<ClassroomOffering[]>([]);
  const [formState, setFormState] = useState<FormState>({
    isOpen: false,
    isLoading: false,
    editingId: null,
  });

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

  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentData>({
    studentId: "",
    classroomOfferingId: "",
    startDate: new Date().toISOString().split("T")[0],
  });

  const [selectedStudentForEnrollment, setSelectedStudentForEnrollment] = useState<string>("");

  // Fetch students, academic years and offerings on mount
  useEffect(() => {
    if (schoolId) {
      loadData();
    }
  }, [schoolId]);

  const loadData = async () => {
    try {
      // Fetch students using the API
      const studentsRes = await studentsApi.list(schoolId);
      if (!studentsRes.ok) throw new Error("Failed to fetch students");
      const studentsData = await studentsRes.json();
      setStudents(Array.isArray(studentsData) ? studentsData : studentsData.data || []);

      // Fetch academic years and offerings
      const yearsRes = await academicYearsApi.list(schoolId);
      if (!yearsRes.ok) throw new Error("Failed to fetch academic years");
      const years = await yearsRes.json();
      const yearList = Array.isArray(years) ? years : [];

      // Prefer active year
      const activeYear = yearList.find((y: any) => String(y.status).toLowerCase() === "active");
      const yearId = activeYear ? activeYear.id : (yearList[0]?.id ?? null);

      if (yearId) {
        const offeringsRes = await classroomOfferingsApi.list(String(yearId));
        if (!offeringsRes.ok) throw new Error("Failed to fetch offerings");
        const offeringsData = await offeringsRes.json();
        setOfferings(Array.isArray(offeringsData) ? offeringsData : []);
      } else {
        setOfferings([]);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to fetch data", variant: "destructive" });
    }
  };

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

      const response = await studentsApi.create(schoolId, payload);
      if (!response.ok) throw new Error("Failed to create student");

      const newStudent = await response.json();
      setStudents([...students, newStudent]);
      reset();
      setAvatarFile(null);
      setAvatarPreview("");
      setFormState({ isOpen: false, isLoading: false, editingId: null });
      toast({ title: "Success", description: "Student created successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create student", variant: "destructive" });
    }
  };

  const handleEnrollStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForEnrollment || !enrollmentForm.classroomOfferingId) {
      toast({ title: "Error", description: "Please select a student and classroom offering", variant: "destructive" });
      return;
    }

    setFormState({ ...formState, isLoading: true });

    try {
      const response = await enrollmentsApi.create(
        enrollmentForm.classroomOfferingId,
        schoolId,
        {
          studentId: selectedStudentForEnrollment,
          startDate: new Date(enrollmentForm.startDate).toISOString(),
        }
      );

      if (!response.ok) throw new Error("Failed to enroll student");

      setSelectedStudentForEnrollment("");
      setEnrollmentForm({ studentId: "", classroomOfferingId: "", startDate: new Date().toISOString().split("T")[0] });
      setFormState({ isOpen: false, isLoading: false, editingId: null });
      toast({ title: "Success", description: "Student enrolled successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to enroll student", variant: "destructive" });
    } finally {
      setFormState({ ...formState, isLoading: false });
    }
  };

  return (
    <AppLayout
      title="Students"
      description="Manage students and their enrollments"
      breadcrumbs={[{ label: "Students" }]}
    >
      <Tabs defaultValue="students" className="w-full">
        <TabsList>
          <TabsTrigger value="students">Student Directory</TabsTrigger>
          <TabsTrigger value="create">Create Student</TabsTrigger>
          <TabsTrigger value="enroll">Enroll in Class</TabsTrigger>
        </TabsList>

        {/* Students Directory Tab */}
        <TabsContent value="students" className="space-y-4">
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
            <StudentsTable students={students} onRefresh={loadData} />
          )}
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

        {/* Enroll in Class Tab */}
        <TabsContent value="enroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enroll Student in Class</CardTitle>
              <CardDescription>Enroll a student into a classroom offering</CardDescription>
            </CardHeader>
            <CardContent>
              {offerings.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No classroom offerings available. Please create a classroom offering first.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleEnrollStudent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student">Select Student</Label>
                    <Select value={selectedStudentForEnrollment} onValueChange={setSelectedStudentForEnrollment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a student" />
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

                  <div className="space-y-2">
                    <Label htmlFor="offering">Select Classroom Offering</Label>
                    <Select value={enrollmentForm.classroomOfferingId} onValueChange={(value) => setEnrollmentForm({ ...enrollmentForm, classroomOfferingId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a classroom offering" />
                      </SelectTrigger>
                      <SelectContent>
                        {offerings.map((offering) => (
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

                  <Button type="submit" disabled={formState.isLoading} className="w-full">
                    {formState.isLoading ? (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
