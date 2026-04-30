import SubmitButton from "@/components/common/SubmitButton";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Select as ShadSelect,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/context/TenantContext";
import { useCreateGuardian, useDeleteGuardian, useGuardians, useSetPrimaryGuardian, useUpdateGuardian } from "@/hooks/use-guardians";
import { useStudents } from "@/hooks/use-students";
import { guardiansApi } from "@/lib/api"; // Make sure this import exists
import { Edit, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Select from "react-select";

// Guardian and StudentGuardian types for type safety
interface StudentGuardian {
    id: string;
    relation?: string;
    is_primary?: boolean;
    student?: {
        id: string;
        first_name: string;
        last_name: string;
        student_no?: string;
        reg_no?: string;
        email?: string;
        phone?: string;
    };
}

interface Guardian {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    students: StudentGuardian[];
}

interface GuardianFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    students: { id: string; relation?: string; is_primary?: boolean }[];
}

interface MessageFormData {
    studentId: string;
    type: string;
    category?: string;
    subject?: string;
    message: string;
}

export default function Guardians() {
    const { selectedTenant } = useTenant();
    const schoolId = selectedTenant?.id;
    const { data: students, isLoading: studentsLoading } = useStudents(schoolId);
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GuardianFormData>({
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            students: []
        }
    });
    const { data: guardians = [], isLoading: guardiansLoading, error: guardiansError } = useGuardians(schoolId);
    const createGuardianMutation = useCreateGuardian();
    const updateGuardianMutation = useUpdateGuardian();
    const deleteGuardianMutation = useDeleteGuardian();
    const setPrimaryMutation = useSetPrimaryGuardian();

    const [apiError, setApiError] = useState<string | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<{ id: string; relation?: string; is_primary?: boolean } | null>(null);
    const [activeTab, setActiveTab] = useState("guardians");

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
    const [editForm, setEditForm] = useState<GuardianFormData | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [editSuccess, setEditSuccess] = useState<string | null>(null);

    // State for send message form
    const [messageForm, setMessageForm] = useState({
        studentId: "",
        type: "Email",
        category: "",
        subject: "",
        message: "",
    });
    const [messageLoading, setMessageLoading] = useState(false);
    const [messageSuccess, setMessageSuccess] = useState<string | null>(null);
    const [messageError, setMessageError] = useState<string | null>(null);

    type StudentOption = { value: string; label: string };

    const studentOptions: StudentOption[] = (students || []).map((s: any) => ({
        value: s.id,
        label: `${s.first_name} ${s.last_name} (${s.student_no})`,
    }));

    const handleStudentChange = (opt: StudentOption | null) => {
        if (!opt) {
            setSelectedStudent(null);
            return;
        }
        const student = {
            id: opt.value,
            relation: "",
            is_primary: false,
        };
        setSelectedStudent(student);
    };

    const handleStudentRelationChange = (relation: string) => {
        if (!selectedStudent) return;
        setSelectedStudent(prev => prev ? { ...prev, relation } : null);
    };

    const handleStudentPrimaryChange = (is_primary: boolean) => {
        if (!selectedStudent) return;
        setSelectedStudent(prev => prev ? { ...prev, is_primary } : null);
    };

    const onSubmit = async (data: Omit<GuardianFormData, "students">) => {
        setApiError(null);
        if (!selectedStudent) {
            setApiError("A student must be selected");
            return;
        }
        const payload: GuardianFormData = {
            ...data,
            students: [selectedStudent],
        };
        try {
            await createGuardianMutation.mutateAsync({ data: payload });
            reset();
            setSelectedStudent(null);
            setActiveTab("guardians"); // Switch to guardians tab
        } catch (e) {
            setApiError((e as Error).message || "Failed to create guardian");
        }
    };

    const handleEditGuardian = (guardian: Guardian) => {
        setEditingGuardian(guardian);
        setEditForm({
            firstName: guardian.first_name || "",
            lastName: guardian.last_name || "",
            email: guardian.email || "",
            phone: guardian.phone || "",
            students: [],
        });
        setEditModalOpen(true);
        setEditError(null);
        setEditSuccess(null);
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editForm) return;
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGuardian || !editForm) return;
        setEditError(null);
        setEditSuccess(null);
        try {
            // Exclude students from the update payload - student assignments are not edited here
            const { students: _students, ...payload } = editForm;
            await updateGuardianMutation.mutateAsync({ guardianId: editingGuardian.id, data: payload });
            setEditSuccess("Guardian updated successfully!");
            setEditModalOpen(false);
        } catch (e) {
            setEditError((e as Error).message || "Failed to update guardian");
        }
    };

    const handleDeleteGuardian = async (guardianId: string) => {
        if (!window.confirm("Are you sure you want to delete this guardian?")) return;
        setApiError(null);
        try {
            await deleteGuardianMutation.mutateAsync({ guardianId });
        } catch (e) {
            setApiError((e as Error).message || "Failed to delete guardian");
        }
    };

    const handleSetPrimary = async (studentId: string, guardianId: string) => {
        const key = `${studentId}-${guardianId}`;
        setSetPrimaryLoading(prev => new Set(prev).add(key));
        setApiError(null);
        try {
            await setPrimaryMutation.mutateAsync({ studentId, guardianId });
        } catch (e) {
            setApiError((e as Error).message || "Failed to set primary guardian");
        } finally {
            setSetPrimaryLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }
    };

    const [setPrimaryLoading, setSetPrimaryLoading] = useState<Set<string>>(new Set());

    const [search, setSearch] = useState("");

    const filteredGuardians = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return guardians;
        return guardians.filter((g: any) => {
            const studentNames = (g.students || []).map((sg: any) => `${sg.student?.first_name || ""} ${sg.student?.last_name || ""}`).join(" ");
            return [g.first_name, g.last_name, g.email, g.phone, studentNames]
                .filter(Boolean)
                .some(v => v!.toLowerCase().includes(q));
        });
    }, [guardians, search]);

    // Handler for form changes
    const handleMessageFormChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setMessageForm({ ...messageForm, [e.target.name]: e.target.value });
    };

    // Handler for student select
    const handleMessageStudentChange = (opt: { value: string } | null) => {
        setMessageForm({ ...messageForm, studentId: opt?.value || "" });
    };

    // Use react-hook-form for the message form
    const {
        control,
        handleSubmit: handleMessageSubmit,
        reset: resetMessageForm,
        formState: { errors: messageErrors, isSubmitting: messageIsSubmitting }
    } = useForm<MessageFormData>({
        defaultValues: {
            studentId: "",
            type: "Email",
            category: "",
            subject: "",
            message: "",
        }
    });

    const onSendMessage = async (data: MessageFormData) => {
        setMessageSuccess(null);
        setMessageError(null);
        try {
            const response = await guardiansApi.sendMessageToStudentGuardians(
                data.studentId,
                {
                    type: data.type,
                    category: data.category,
                    subject: data.subject,
                    message: data.message,
                }
            );

            // If your API client returns a Response object, check status here
            if (response?.status && response.status >= 400) {
                // Try to extract error message from response body
                let errorMsg = "Failed to send message 1";
                try {
                    const errorBody = await response.json();
                    errorMsg = errorBody.error.message || errorMsg;
                } catch {
                    // fallback if json parsing fails
                }
                setMessageError(errorMsg);
                return; // Do not reset the form
            }

            setMessageSuccess("Message sent to primary guardian!");
            resetMessageForm();
        } catch (err: any) {
            let errorMsg = "Failed to send message 2";
            if (err instanceof Response) {
                try {
                    const errorBody = await err.json();
                    errorMsg = errorBody?.message || errorMsg;
                } catch {
                    // fallback if json parsing fails
                }
            } else if (err?.message) {
                errorMsg = err.message;
            }
            setMessageError(errorMsg);
        }
    };

    return (
        <AppLayout
            title="Guardians"
            description="Manage guardians for students."
            breadcrumbs={[{ label: "Guardians" }]}
        >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 border-b">
                    <TabsTrigger value="create">Create Guardian</TabsTrigger>
                    <TabsTrigger value="guardians">Guardians List</TabsTrigger>
                    <TabsTrigger value="messages">Guardian Messages</TabsTrigger>
                </TabsList>

                <TabsContent value="create">
                    <Card className="border-slate-200">
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className=" space-y-4 mt-6">
                                <div>
                                    <Label htmlFor="firstName">First Name *</Label>
                                    <Input id="firstName" placeholder="First Name" {...register("firstName", { required: true })} />
                                    {errors.firstName && <div className="text-red-500 text-xs">First name is required</div>}
                                </div>
                                <div>
                                    <Label htmlFor="lastName">Last Name *</Label>
                                    <Input id="lastName" placeholder="Last Name" {...register("lastName", { required: true })} />
                                    {errors.lastName && <div className="text-red-500 text-xs">Last name is required</div>}
                                </div>
                                <div>
                                    <Label htmlFor="email">Email *</Label>
                                    <Input id="email" placeholder="Email" type="email" {...register("email", { required: "Email is required" })} />
                                    {errors.email && <div className="text-red-500 text-xs">{errors.email.message}</div>}
                                </div>
                                <div>
                                    <Label htmlFor="phone">Phone *</Label>
                                    <Input id="phone" placeholder="Phone" {...register("phone", { required: "Phone is required" })} />
                                    {errors.phone && <div className="text-red-500 text-xs">{errors.phone.message}</div>}
                                </div>
                                <div>
                                    <Label htmlFor="students">Student *</Label>
                                    <Select
                                        inputId="students"
                                        isLoading={studentsLoading}
                                        options={studentOptions}
                                        value={studentOptions.find((opt: StudentOption) => selectedStudent?.id === opt.value) || null}
                                        onChange={opt => handleStudentChange(opt as StudentOption)}
                                        placeholder="Search and select a student..."
                                        className="mb-2"
                                        classNamePrefix="react-select"
                                        isDisabled={!students}
                                        noOptionsMessage={() => studentsLoading ? "Loading students..." : "No students found"}
                                    />
                                    {selectedStudent && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span>
                                                {studentOptions.find(opt => opt.value === selectedStudent.id)?.label}
                                            </span>
                                            <Input
                                                placeholder="Relation (e.g. Father, Mother)"
                                                value={selectedStudent.relation || ""}
                                                onChange={e => handleStudentRelationChange(e.target.value)}
                                                className="w-48"
                                            />
                                            <input
                                                type="checkbox"
                                                checked={selectedStudent.is_primary === true}
                                                onChange={e => handleStudentPrimaryChange(e.target.checked)}
                                                className="ml-2"
                                                title="Set as primary guardian for this student"
                                            />
                                            <span className="text-xs ml-1">Primary</span>
                                        </div>
                                    )}
                                    {errors.students && <div className="text-red-500 text-xs">At least one student is required</div>}
                                </div>
                                {apiError && <div className="text-red-500 text-xs">{apiError}</div>}
                                <SubmitButton
                                    loading={createGuardianMutation.isPending}
                                    disabled={createGuardianMutation.isPending}
                                    text="Create Guardian"
                                    className="w-full"
                                />
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="guardians">
                    <Card className="border-slate-200">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>All Guardians</CardTitle>
                                <CardDescription>Total: {guardians.length} guardians</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Search by name, email, phone or student"
                                    value={search}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); }}
                                    className="max-w-sm"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left table-auto border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="px-3 py-2 text-sm font-medium">Name</th>
                                            <th className="px-3 py-2 text-sm font-medium">Email</th>
                                            <th className="px-3 py-2 text-sm font-medium">Phone</th>
                                            <th className="px-3 py-2 text-sm font-medium">Students</th>
                                            <th className="px-3 py-2 text-sm font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {guardiansLoading && filteredGuardians.length === 0 ? (
                                            // Skeleton rows
                                            [...Array(6)].map((_, i) => (
                                                <tr key={i} className="border-t">
                                                    <td className="px-3 py-2">
                                                        <div className="h-4 bg-gray-200 rounded w-24" />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="h-4 bg-gray-200 rounded w-32" />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="h-4 bg-gray-200 rounded w-20" />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="h-4 bg-gray-200 rounded w-40" />
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <div className="h-4 bg-gray-200 rounded w-16 ml-auto" />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : guardiansError ? (
                                            <tr>
                                                <td colSpan={5} className="text-red-500 text-xs py-4">{guardiansError?.message}</td>
                                            </tr>
                                        ) : filteredGuardians.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8">
                                                    <div className="flex flex-col items-center justify-center text-center">
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
                                                            No guardians found
                                                        </div>
                                                        <div className="text-sm text-gray-500 text-center max-w-xs">
                                                            There are no guardians available.<br />
                                                            Please create a guardian to get started.
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredGuardians.map((g: any) => (
                                                <tr key={g.id} className="border-t">
                                                    <td className="px-3 py-2">{g.first_name} {g.last_name}</td>
                                                    <td className="px-3 py-2">{g.email}</td>
                                                    <td className="px-3 py-2">{g.phone}</td>
                                                    <td className="px-3 py-2">
                                                        <ul>
                                                            {g.students.map((sg: any) => (
                                                                <li key={sg.id} className="flex items-center gap-2">
                                                                    {sg.student?.first_name} {sg.student?.last_name}
                                                                    {sg.relation && <> (<span className="italic px-0">{sg.relation}</span>)</>}
                                                                    {sg.is_primary && (
                                                                        <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold border border-green-300">Primary</span>
                                                                    )}
                                                                    {!sg.is_primary && (
                                                                        <button
                                                                            className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-300 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            onClick={() => handleSetPrimary(sg.student?.id, g.id)}
                                                                            disabled={setPrimaryLoading.has(`${sg.student?.id}-${g.id}`)}
                                                                            title="Set as Primary Guardian"
                                                                        >
                                                                            {setPrimaryLoading.has(`${sg.student?.id}-${g.id}`) ? "Setting..." : "Set Primary"}
                                                                        </button>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <button
                                                            className="inline-flex items-center p-1 text-blue-600 hover:text-blue-800"
                                                            onClick={() => handleEditGuardian(g)}
                                                            title="Edit"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            className="inline-flex items-center p-1 text-red-600 hover:text-red-800 ml-2"
                                                            onClick={() => handleDeleteGuardian(g.id)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="messages">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle>Send Message to Primary Guardian</CardTitle>
                            <CardDescription>
                                Select a student and send a message to their primary guardian.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleMessageSubmit(onSendMessage)}
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                                {/* Left column */}
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <Label>Student *</Label>
                                        <Controller
                                            name="studentId"
                                            control={control}
                                            rules={{ required: "Student is required" }}
                                            render={({ field }) => (
                                                <Select
                                                    inputId="sendMessageStudent"
                                                    options={studentOptions}
                                                    value={studentOptions.find(opt => opt.value === field.value) || null}
                                                    onChange={opt => field.onChange(opt?.value || "")}
                                                    placeholder="Select student..."
                                                    isDisabled={studentsLoading}
                                                />
                                            )}
                                        />
                                        {messageErrors.studentId && (
                                            <div className="text-red-500 text-xs">{messageErrors.studentId.message}</div>
                                        )}
                                    </div>
                                    <div>
                                        <Label>Type *</Label>
                                        <Controller
                                            name="type"
                                            control={control}
                                            rules={{ required: "Type is required" }}
                                            render={({ field }) => (
                                                <ShadSelect value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Email">Email</SelectItem>
                                                        {/* <SelectItem value="SMS">SMS</SelectItem>
                                                        <SelectItem value="WhatsApp">WhatsApp</SelectItem> */}
                                                    </SelectContent>
                                                </ShadSelect>
                                            )}
                                        />
                                        {messageErrors.type && (
                                            <div className="text-red-500 text-xs mt-1">{messageErrors.type.message}</div>
                                        )}
                                    </div>
                                    <div>
                                        <Label>Category *</Label>
                                        <Controller
                                            name="category"
                                            control={control}
                                            rules={{ required: "Category is required" }}
                                            render={({ field }) => (
                                                <Input {...field} />
                                            )}
                                        />
                                        {messageErrors.category && (
                                            <div className="text-red-500 text-xs">{messageErrors.category.message}</div>
                                        )}
                                    </div>
                                </div>
                                {/* Right column */}
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <Label>Subject *</Label>
                                        <Controller
                                            name="subject"
                                            control={control}
                                            rules={{ required: "Subject is required" }}
                                            render={({ field }) => (
                                                <Input {...field} />
                                            )}
                                        />
                                        {messageErrors.subject && (
                                            <div className="text-red-500 text-xs">{messageErrors.subject.message}</div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <Label>Message *</Label>
                                        <Controller
                                            name="message"
                                            control={control}
                                            rules={{ required: "Message is required" }}
                                            render={({ field }) => (
                                                <textarea
                                                    {...field}
                                                    className="w-full border rounded p-2 min-h-[120px] flex-1"
                                                    rows={6}
                                                />
                                            )}
                                        />
                                        {messageErrors.message && (
                                            <div className="text-red-500 text-xs">{messageErrors.message.message}</div>
                                        )}
                                    </div>
                                </div>
                                {/* Feedback and submit button - full width below */}
                                <div className="md:col-span-2 flex flex-col gap-2">
                                    {messageError && (
                                        <div className="text-red-500 text-xs">{messageError}</div>
                                    )}
                                    {messageSuccess && (
                                        <div className="text-green-600 text-xs">{messageSuccess}</div>
                                    )}
                                    <SubmitButton
                                        loading={messageIsSubmitting}
                                        disabled={messageIsSubmitting}
                                        text="Send Message"
                                        className="w-full"
                                    />
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="top-10 md:top-10 !translate-y-0">
                    <DialogTitle>Edit Guardian</DialogTitle>
                    <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
                        <div>
                            <Label htmlFor="editFirstName">First Name *</Label>
                            <Input id="editFirstName" name="firstName" value={editForm?.firstName || ""} onChange={handleEditFormChange} required />
                        </div>
                        <div>
                            <Label htmlFor="editLastName">Last Name *</Label>
                            <Input id="editLastName" name="lastName" value={editForm?.lastName || ""} onChange={handleEditFormChange} required />
                        </div>
                        <div>
                            <Label htmlFor="editEmail">Email *</Label>
                            <Input id="editEmail" name="email" type="email" value={editForm?.email || ""} onChange={handleEditFormChange} required />
                        </div>
                        <div>
                            <Label htmlFor="editPhone">Phone *</Label>
                            <Input id="editPhone" name="phone" value={editForm?.phone || ""} onChange={handleEditFormChange} required />
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Only guardian details can be edited here.</div>
                            {editError && <div className="text-red-500 text-xs">{editError}</div>}
                            {editSuccess && <div className="text-green-600 text-xs">{editSuccess}</div>}
                        </div>
                        <SubmitButton loading={updateGuardianMutation.isPending} disabled={updateGuardianMutation.isPending} text="Save Changes" className="w-full" />
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
