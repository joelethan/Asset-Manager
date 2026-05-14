import SubmitButton from "@/components/common/SubmitButton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStructure } from "@/context/StructureContext";
import { useTenant } from "@/context/TenantContext";
import { studentsApi } from "@/lib/api";
import React from "react";
import { Controller, useForm } from "react-hook-form";

const ViewStudent: React.FC = () => {
    const { selectedTenant } = useTenant();
    const schoolId = selectedTenant?.id as string;
    const { studentDetails, setStudentDetails } = useStructure();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStudentDetails({ identity: studentDetails.identity, details: studentDetails.details, loading: true });
        try {
            const response = await studentsApi.studentDetails(schoolId, studentDetails.identity);
            const data = await response.json();
            if (data) {
                setStudentDetails({ identity: studentDetails.identity, details: data, loading: false });
            }
        } catch (err: any) { }
    };

    // Guardian form state with react-hook-form
    const {
        register,
        handleSubmit: handleGuardianSubmit,
        reset,
        control,
        formState: { errors, isSubmitting, touchedFields, submitCount }
    } = useForm({
        mode: "onTouched",
        reValidateMode: "onChange"
    });
    const [guardianError, setGuardianError] = React.useState<string | null>(null);
    const [guardianSuccess, setGuardianSuccess] = React.useState<string | null>(null);

    const onGuardianSubmit = async (data: any) => {
        setGuardianError(null);
        setGuardianSuccess(null);
        try {
            const studentId = studentDetails.details?.id;
            if (!studentId) {
                setGuardianError("Student ID not found.");
                return;
            }
            const response = await studentsApi.addGuardian(studentId, {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                relation: data.relation
            });
            if (response.ok) {
                setGuardianSuccess("Guardian added successfully!");
                reset();
            } else {
                setGuardianError("Failed to add guardian.");
            }
        } catch (err) {
            setGuardianError("Failed to add guardian.");
        }
    };

    return (
        <Card className="border-slate-200 w-full">
            <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center w-full">
                    <form onSubmit={handleSubmit} className="flex flex-row items-center gap-4 w-full max-w-sm mx-auto">
                        <Input
                            value={studentDetails.identity}
                            onChange={e => setStudentDetails({ ...studentDetails, identity: e.target.value })}
                            placeholder="Enter Student No or Reg No"
                            className="w-full"
                            disabled={studentDetails.loading}
                        />
                        <SubmitButton loading={studentDetails.loading} disabled={!studentDetails.identity} />
                    </form>
                    {studentDetails.loading && !studentDetails.details && (
                        <div className="mt-8 w-full flex flex-col items-center justify-center min-h-[200px] text-center">
                            <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                            </svg>
                            <h3 className="text-lg font-semibold text-blue-700">Loading student details...</h3>
                        </div>
                    )}
                    {(!studentDetails.details || Object.keys(studentDetails.details).length === 0) && !studentDetails.loading && (
                        <div className="mt-8 w-full flex flex-col items-center justify-center min-h-[200px] text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03-9-9-9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                            <h3 className="text-lg font-semibold text-slate-900">No student data</h3>
                            <p className="text-slate-500 max-w-sm mt-2">Search for a student by entering their Student No or Reg No above.</p>
                        </div>
                    )}
                    {studentDetails.details && Object.keys(studentDetails.details).length > 0 && (
                        <div className="mt-8 w-full bg-white rounded-lg shadow border border-slate-200 p-6 flex flex-col md:flex-row gap-6">
                            <div className="flex flex-col md:w-1/3 w-full md:border-r md:border-slate-200 md:pr-6">
                                <div className="flex flex-col items-center mb-6 md:border-b md:border-slate-200 md:pb-3">
                                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden mb-3">
                                        {studentDetails.details.avatar_url ? (
                                            <img src={studentDetails.details.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            <span className="text-4xl text-slate-400 font-bold">
                                                {studentDetails.details.first_name?.charAt(0)}
                                                {studentDetails.details.last_name?.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-semibold text-lg text-slate-900 mt-2">{studentDetails.details.first_name} {studentDetails.details.last_name}</div>
                                    <div className="text-sm text-slate-500 mt-1">{studentDetails.details.status === "active" ? "Active" : "Inactive"}</div>
                                </div>
                                <div className="grid grid-cols-1 gap-y-3 text-sm w-full">
                                    <div>
                                        <span className="font-semibold font-medium text-slate-700">Student No:</span>
                                        <span className="ml-2 text-slate-900">{studentDetails.details.student_no}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold font-medium text-slate-700">Reg No:</span>
                                        <span className="ml-2 text-slate-900">{studentDetails.details.reg_no}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold font-medium text-slate-700">Gender:</span>
                                        <span className="ml-2 text-slate-900">{studentDetails.details.gender}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold font-medium text-slate-700">Date of Birth:</span>
                                        <span className="ml-2 text-slate-900">{studentDetails.details.date_of_birth ? new Date(studentDetails.details.date_of_birth).toLocaleDateString() : "-"}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold font-medium text-slate-700">Religion:</span>
                                        <span className="ml-2 text-slate-900">{studentDetails.details.religion || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold font-medium text-slate-700">Address:</span>
                                        <span className="ml-2 text-slate-900">{studentDetails.details.address || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold font-medium text-slate-700">Email:</span>
                                        <span className="ml-2 text-slate-900">{studentDetails.details.email || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold font-medium text-slate-700">Phone:</span>
                                        <span className="ml-2 text-slate-900">{studentDetails.details.phone || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold font-medium text-slate-700">Created At:</span>
                                        <span className="ml-2 text-slate-900">{studentDetails.details.created_at ? new Date(studentDetails.details.created_at).toLocaleDateString() : "-"}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold font-medium text-slate-700">Last Updated At:</span>
                                        <span className="ml-2 text-slate-900">{studentDetails.details.updated_at ? new Date(studentDetails.details.updated_at).toLocaleDateString() : "-"}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 md:w-2/3 w-full px-0 md:px-6">
                                <div className="mb-6">
                                    <span className="text-lg font-semibold text-slate-700">Guardians</span>
                                </div>
                                {studentDetails.details.guardians && studentDetails.details.guardians.length > 0 && (
                                    <div className="mb-6 overflow-x-auto">
                                        <table className="w-full text-left table-auto border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="px-3 py-2 text-sm font-medium">Name</th>
                                                    <th className="px-3 py-2 text-sm font-medium">Relation</th>
                                                    <th className="px-3 py-2 text-sm font-medium">Email</th>
                                                    <th className="px-3 py-2 text-sm font-medium">Phone</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {studentDetails.details.guardians.map((g: any, i: number) => (
                                                    <tr key={g.id || i} className="border-t">
                                                        <td className="px-3 py-2 text-sm">{`${g.first_name || ''} ${g.last_name || ''}`}</td>
                                                        <td className="px-3 py-2 text-sm">{g.relation}</td>
                                                        <td className="px-3 py-2 text-sm">{g.email}</td>
                                                        <td className="px-3 py-2 text-sm">{g.phone}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <form onSubmit={handleGuardianSubmit(onGuardianSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div>
                                        <Input
                                            {...register("firstName", { required: "First name is required" })}
                                            placeholder="First Name"
                                            disabled={isSubmitting}
                                        />
                                        {errors.firstName && (touchedFields.firstName || submitCount > 0) && typeof errors.firstName.message === 'string' && (
                                            <span className="text-xs text-red-600">{errors.firstName.message}</span>
                                        )}
                                    </div>
                                    <div>
                                        <Input
                                            {...register("lastName", { required: "Last name is required" })}
                                            placeholder="Last Name"
                                            disabled={isSubmitting}
                                        />
                                        {errors.lastName && (touchedFields.lastName || submitCount > 0) && typeof errors.lastName.message === 'string' && (
                                            <span className="text-xs text-red-600">{errors.lastName.message}</span>
                                        )}
                                    </div>
                                    <div>
                                        <Input
                                            {...register("email", { required: "Email is required", pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: "Invalid email address" } })}
                                            placeholder="Email"
                                            type="email"
                                            disabled={isSubmitting}
                                        />
                                        {errors.email && (touchedFields.email || submitCount > 0) && typeof errors.email.message === 'string' && (
                                            <span className="text-xs text-red-600">{errors.email.message}</span>
                                        )}
                                    </div>
                                    <div>
                                        <Input
                                            {...register("phone", { required: "Phone is required", pattern: { value: /^\d{10,}$/, message: "Invalid phone number" } })}
                                            placeholder="Phone"
                                            disabled={isSubmitting}
                                        />
                                        {errors.phone && (touchedFields.phone || submitCount > 0) && typeof errors.phone.message === 'string' && (
                                            <span className="text-xs text-red-600">{errors.phone.message}</span>
                                        )}
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <Controller
                                            name="relation"
                                            control={control}
                                            rules={{ required: "Relation is required" }}
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value || ""}
                                                    onValueChange={field.onChange}
                                                    disabled={isSubmitting}
                                                >
                                                    <SelectTrigger id="relation">
                                                        <SelectValue placeholder="Select Relation" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Mother">Mother</SelectItem>
                                                        <SelectItem value="Father">Father</SelectItem>
                                                        <SelectItem value="Guardian">Guardian</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {errors.relation && (touchedFields.relation || submitCount > 0) && typeof errors.relation.message === 'string' && (
                                            <span className="text-xs text-red-600">{errors.relation.message}</span>
                                        )}
                                    </div>
                                    <div className="col-span-1 md:col-span-2 flex justify-end">
                                        <SubmitButton loading={isSubmitting} />
                                    </div>
                                </form>
                                {guardianError && <p className="text-red-600 mt-2">{guardianError}</p>}
                                {guardianSuccess && <p className="text-green-600 mt-2">{guardianSuccess}</p>}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default ViewStudent;
