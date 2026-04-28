import SubmitButton from "@/components/common/SubmitButton";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTenant } from "@/context/TenantContext";
import { useStudents } from "@/hooks/use-students";
import { guardiansApi } from "@/lib/api";
import { Edit, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Select, { MultiValue } from "react-select";

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
    const [apiError, setApiError] = useState<string | null>(null);
    const [apiSuccess, setApiSuccess] = useState<string | null>(null);
    const [selectedStudents, setSelectedStudents] = useState<{ id: string; relation?: string; is_primary?: boolean }[]>([]);
    const [guardians, setGuardians] = useState<Guardian[]>([]);
    const [guardiansLoading, setGuardiansLoading] = useState(false);
    const [guardiansError, setGuardiansError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("guardians");

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
    const [editForm, setEditForm] = useState<GuardianFormData | null>(null);
    const [editStudents, setEditStudents] = useState<{ id: string; relation?: string; is_primary?: boolean }[]>([]);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editSuccess, setEditSuccess] = useState<string | null>(null);

    type StudentOption = { value: string; label: string };

    const studentOptions: StudentOption[] = (students || []).map((s: any) => ({
        value: s.id,
        label: `${s.first_name} ${s.last_name} (${s.student_no})`,
    }));

    const handleStudentsChange = (opts: MultiValue<StudentOption>) => {
        const arr = Array.isArray(opts) ? [...opts] : [];
        setSelectedStudents(prev =>
            arr.map(opt => {
                const existing = prev.find(s => s.id === opt.value);
                return { id: opt.value, relation: existing?.relation || "", is_primary: existing?.is_primary || false };
            })
        );
    };

    const handleRelationChange = (studentId: string, relation: string) => {
        setSelectedStudents(prev =>
            prev.map(s => s.id === studentId ? { ...s, relation } : s)
        );
    };

    // Update handlePrimaryChange to accept checked value
    const handlePrimaryChange = (studentId: string, checked: boolean) => {
        setSelectedStudents(prev =>
            prev.map(s => s.id === studentId ? { ...s, is_primary: checked } : s)
        );
    };

    // Refetch guardians
    const fetchGuardians = () => {
        if (!schoolId) return;
        setGuardiansLoading(true);
        setGuardiansError(null);
        guardiansApi.getGuardians(schoolId)
            .then(async res => {
                if (!res.ok) {
                    const err = await res.json();
                    setGuardiansError(err?.error?.message || "Failed to fetch guardians");
                    setGuardians([]);
                } else {
                    const data = await res.json();
                    setGuardians(data);
                }
            })
            .catch(() => {
                setGuardiansError("Failed to fetch guardians");
                setGuardians([]);
            })
            .finally(() => setGuardiansLoading(false));
    };

    useEffect(() => {
        fetchGuardians();
    }, [schoolId]);

    const onSubmit = async (data: Omit<GuardianFormData, "students">) => {
        setApiSuccess(null);
        setApiError(null);
        if (!selectedStudents.length) {
            setApiError("At least one student is required");
            return;
        }
        const payload: GuardianFormData = {
            ...data,
            students: selectedStudents,
        };
        try {
            const res = await guardiansApi.create(payload);
            if (!res.ok) {
                const err = await res.json();
                setApiError(err?.error?.message || "Failed to create guardian");
                return;
            }
            setApiSuccess("Guardian created successfully!");
            reset();
            setSelectedStudents([]);
            fetchGuardians(); // Refetch guardians
            setActiveTab("guardians"); // Switch to guardians tab
        } catch (e) {
            setApiError("Failed to create guardian");
        }
    };

    const handleEditGuardian = (guardian: Guardian) => {
        setEditingGuardian(guardian);
        setEditForm({
            firstName: guardian.first_name,
            lastName: guardian.last_name,
            email: guardian.email || "",
            phone: guardian.phone || "",
            students: guardian.students.map(sg => ({
                id: sg.student?.id || sg.id,
                relation: sg.relation,
                is_primary: sg.is_primary,
            })),
        });
        setEditStudents(guardian.students.map(sg => ({
            id: sg.student?.id || sg.id,
            relation: sg.relation,
            is_primary: sg.is_primary,
        })));
        setEditModalOpen(true);
        setEditError(null);
        setEditSuccess(null);
    };

    const handleEditStudentsChange = (opts: MultiValue<StudentOption>) => {
        const arr = Array.isArray(opts) ? [...opts] : [];
        setEditStudents(prev =>
            arr.map(opt => {
                const existing = prev.find(s => s.id === opt.value);
                return { id: opt.value, relation: existing?.relation || "", is_primary: existing?.is_primary || false };
            })
        );
    };
    const handleEditRelationChange = (studentId: string, relation: string) => {
        setEditStudents(prev =>
            prev.map(s => s.id === studentId ? { ...s, relation } : s)
        );
    };
    const handleEditPrimaryChange = (studentId: string, checked: boolean) => {
        setEditStudents(prev =>
            prev.map(s => s.id === studentId ? { ...s, is_primary: checked } : s)
        );
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editForm) return;
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGuardian || !editForm) return;
        setEditSubmitting(true);
        setEditError(null);
        setEditSuccess(null);
        if (!editStudents.length) {
            setEditError("At least one student is required");
            setEditSubmitting(false);
            return;
        }
        try {
            const payload = {
                ...editForm,
                students: editStudents,
            };
            const res = await guardiansApi.update(editingGuardian.id, payload);
            if (!res.ok) {
                const err = await res.json();
                setEditError(err?.error?.message || "Failed to update guardian");
                setEditSubmitting(false);
                return;
            }
            setEditSuccess("Guardian updated successfully!");
            setEditModalOpen(false);
            fetchGuardians();
        } catch (e) {
            setEditError("Failed to update guardian");
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleDeleteGuardian = async (guardianId: string) => {
        if (!window.confirm("Are you sure you want to delete this guardian?")) return;
        setApiError(null);
        setApiSuccess(null);
        try {
            const res = await guardiansApi.delete(guardianId);
            if (!res.ok) {
                const err = await res.json();
                setApiError(err?.error?.message || "Failed to delete guardian");
                return;
            }
            setApiSuccess("Guardian deleted successfully!");
            fetchGuardians();
        } catch (e) {
            setApiError("Failed to delete guardian");
        }
    };

    return (
        <AppLayout
            title="Guardians"
            description="Manage guardians for students."
            breadcrumbs={[{ label: "Guardians" }]}
        >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 border-b">
                    <TabsTrigger value="guardians">Guardians List</TabsTrigger>
                    <TabsTrigger value="create">Create Guardian</TabsTrigger>
                </TabsList>

                <TabsContent value="create">
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
                            <Label htmlFor="students">Students *</Label>
                            <Select
                                inputId="students"
                                isMulti
                                isLoading={studentsLoading}
                                options={studentOptions}
                                value={studentOptions.filter((opt: StudentOption) => selectedStudents.some(s => s.id === opt.value))}
                                onChange={handleStudentsChange}
                                placeholder="Search and select students..."
                                className="mb-2"
                                classNamePrefix="react-select"
                                isDisabled={!students}
                                noOptionsMessage={() => studentsLoading ? "Loading students..." : "No students found"}
                            />
                            {selectedStudents.map((student, idx) => (
                                <div key={student.id} className="flex items-center gap-2 mb-2">
                                    <span>
                                        {studentOptions.find(opt => opt.value === student.id)?.label}
                                    </span>
                                    <Input
                                        placeholder="Relation (e.g. Father, Mother)"
                                        value={student.relation || ""}
                                        onChange={e => handleRelationChange(student.id, e.target.value)}
                                        className="w-48"
                                    />
                                    <input
                                        type="checkbox"
                                        checked={student.is_primary === true}
                                        onChange={e => handlePrimaryChange(student.id, e.target.checked)}
                                        className="ml-2"
                                        title="Set as primary guardian for this student"
                                    />
                                    <span className="text-xs ml-1">Primary</span>
                                </div>
                            ))}
                            {errors.students && <div className="text-red-500 text-xs">At least one student is required</div>}
                        </div>
                        {apiError && <div className="text-red-500 text-xs">{apiError}</div>}
                        {apiSuccess && <div className="text-green-600 text-xs">{apiSuccess}</div>}
                        <SubmitButton
                            loading={isSubmitting}
                            disabled={isSubmitting}
                            text="Create Guardian"
                            className="w-full"
                        />
                    </form>
                </TabsContent>

                <TabsContent value="guardians">
                    <Card className="border-slate-200">
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
                                        {guardiansLoading ? (
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
                                                <td colSpan={5} className="text-red-500 text-xs py-4">{guardiansError}</td>
                                            </tr>
                                        ) : guardians.length === 0 ? (
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
                                            guardians.map(g => (
                                                <tr key={g.id} className="border-t">
                                                    <td className="px-3 py-2">{g.first_name} {g.last_name}</td>
                                                    <td className="px-3 py-2">{g.email}</td>
                                                    <td className="px-3 py-2">{g.phone}</td>
                                                    <td className="px-3 py-2">
                                                        <ul>
                                                            {g.students.map((sg: any) => (
                                                                <li key={sg.id} className="flex items-center gap-2">
                                                                    {sg.student?.first_name} {sg.student?.last_name}
                                                                    {sg.relation && <> (<span className="italic">{sg.relation}</span>)</>}
                                                                    {sg.is_primary && (
                                                                        <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold border border-green-300">Primary</span>
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
                            <Label htmlFor="editStudents">Students *</Label>
                            <Select
                                inputId="editStudents"
                                isMulti
                                isLoading={studentsLoading}
                                options={studentOptions}
                                value={studentOptions.filter((opt: StudentOption) => editStudents.some(s => s.id === opt.value))}
                                onChange={handleEditStudentsChange}
                                placeholder="Search and select students..."
                                className="mb-2"
                                classNamePrefix="react-select"
                                isDisabled={!students}
                                noOptionsMessage={() => studentsLoading ? "Loading students..." : "No students found"}
                            />
                            {editStudents.map((student, idx) => (
                                <div key={student.id} className="flex items-center gap-2 mb-2">
                                    <span>
                                        {studentOptions.find(opt => opt.value === student.id)?.label}
                                    </span>
                                    <Input
                                        placeholder="Relation (e.g. Father, Mother)"
                                        value={student.relation || ""}
                                        onChange={e => handleEditRelationChange(student.id, e.target.value)}
                                        className="w-48"
                                    />
                                    <input
                                        type="checkbox"
                                        checked={student.is_primary === true}
                                        onChange={e => handleEditPrimaryChange(student.id, e.target.checked)}
                                        className="ml-2"
                                        title="Set as primary guardian for this student"
                                    />
                                    <span className="text-xs ml-1">Primary</span>
                                </div>
                            ))}
                            {editError && <div className="text-red-500 text-xs">{editError}</div>}
                            {editSuccess && <div className="text-green-600 text-xs">{editSuccess}</div>}
                        </div>
                        <SubmitButton loading={editSubmitting} disabled={editSubmitting} text="Save Changes" className="w-full" />
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
