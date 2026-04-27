import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { guardiansApi } from "@/lib/api";
import { useTenant } from "@/context/TenantContext";
import { useStudents } from "@/hooks/use-students";
import Select from "react-select";
import { Label } from "@/components/ui/label";

interface GuardianFormData {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    students: { id: string; relation?: string }[];
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
    const [selectedStudents, setSelectedStudents] = useState<{ id: string; relation?: string }[]>([]);

    const studentOptions = (students || []).map((s: any) => ({
        value: s.id,
        label: `${s.first_name} ${s.last_name} (${s.student_no})`,
    }));

    const handleStudentsChange = (opts: any[]) => {
        setSelectedStudents(prev =>
            opts.map(opt => {
                const existing = prev.find(s => s.id === opt.value);
                return { id: opt.value, relation: existing?.relation || "" };
            })
        );
    };

    const handleRelationChange = (studentId: string, relation: string) => {
        setSelectedStudents(prev =>
            prev.map(s => s.id === studentId ? { ...s, relation } : s)
        );
    };

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
        } catch (e) {
            setApiError("Failed to create guardian");
        }
    };

    return (
        <AppLayout
            title="Guardians"
            description="Manage guardians for students."
            breadcrumbs={[{ label: "Guardians" }]}
        >
            <Tabs defaultValue="create" className="w-full">
                <TabsList className="grid w-full grid-cols-2 border-b">
                    <TabsTrigger value="create">Create Guardian</TabsTrigger>
                    <TabsTrigger value="guardians">Guardians List</TabsTrigger>
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
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" placeholder="Email" type="email" {...register("email")} />
                        </div>
                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" placeholder="Phone" {...register("phone")} />
                        </div>
                        <div>
                            <Label htmlFor="students">Students *</Label>
                            <Select
                                inputId="students"
                                isMulti
                                isLoading={studentsLoading}
                                options={studentOptions}
                                value={studentOptions.filter(opt => selectedStudents.some(s => s.id === opt.value))}
                                onChange={opts => handleStudentsChange(opts)}
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
                                </div>
                            ))}
                            {errors.students && <div className="text-red-500 text-xs">At least one student is required</div>}
                        </div>
                        {apiError && <div className="text-red-500 text-xs">{apiError}</div>}
                        {apiSuccess && <div className="text-green-600 text-xs">{apiSuccess}</div>}
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? "Creating..." : "Create Guardian"}
                        </Button>
                    </form>
                </TabsContent>

                <TabsContent value="guardians">
                    Tab 2
                </TabsContent>
            </Tabs>
        </AppLayout>
    );
}
