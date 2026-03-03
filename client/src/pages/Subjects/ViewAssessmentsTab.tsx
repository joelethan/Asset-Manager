import SubmitButton from "@/components/common/SubmitButton";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useStructure } from "@/context/StructureContext";
import { useTenant } from "@/context/TenantContext";
import { assessmentsApi } from "@/lib/api";
import { FC, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

const ViewAssessmentsTab: FC = () => {
    const { structure, assessSelects, setAssessSelects, listAssessResult, setListAssessResult } = useStructure();
    const { selectedTenant } = useTenant();
    const schoolId = selectedTenant?.id as string;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm({
        defaultValues: {
            yearId: assessSelects?.yearId || "",
            termId: assessSelects?.termId || "",
            definitionId: assessSelects?.definitionId || "",
        },
    });

    // Keep form in sync with global assessSelects
    useEffect(() => {
        setValue("yearId", assessSelects?.yearId || "");
        setValue("termId", assessSelects?.termId || "");
        setValue("definitionId", assessSelects?.definitionId || "");
    }, [assessSelects, setValue]);

    // Update global assessSelects when form values change
    useEffect(() => {
        const subscription = watch((values) => {
            setAssessSelects((prev: any) => ({ ...prev, ...values }));
        });
        return () => subscription.unsubscribe();
    }, [watch, setAssessSelects]);

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError(null);
        setAssessSelects((prev: any) => ({ ...prev, ...data }));
        try {
            if (!schoolId) throw new Error("School ID not found");
            const response = await assessmentsApi.getClassroomAssessments(
                schoolId,
                data.yearId,
                data.termId,
                data.definitionId
            );
            const resultData = await response.json();
            setListAssessResult(resultData || []);
        } catch (err: any) {
            setError(err.message || "Failed to fetch assessments");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-row gap-4 items-end">
                <div className="space-y-2 flex-1 min-w-0">
                    <Label htmlFor="yearId">Academic Year *</Label>
                    <Controller
                        name="yearId"
                        control={control}
                        rules={{ required: "Select academic year" }}
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select academic year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {structure?.years && structure.years.length > 0 ? (
                                        structure.years.map((year) => (
                                            <SelectItem key={year.id} value={year.id}>
                                                {year.name || `Year ${year.id}`}
                                                {year.status === "active" && (
                                                    <span className="ml-2 text-green-600 font-semibold">
                                                        (Active)
                                                    </span>
                                                )}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-sm text-gray-500">
                                            No academic years available
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.yearId && (
                        <p className="text-sm text-red-500">
                            {errors.yearId.message as string}
                        </p>
                    )}
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                    <Label htmlFor="termId">Term *</Label>
                    <Controller
                        name="termId"
                        control={control}
                        rules={{ required: "Select term" }}
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select term" />
                                </SelectTrigger>
                                <SelectContent>
                                    {structure?.terms && structure.terms.length > 0 ? (
                                        structure.terms.map((term) => (
                                            <SelectItem key={term.id} value={term.id}>
                                                {term.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-sm text-gray-500">
                                            No terms available
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.termId && (
                        <p className="text-sm text-red-500">
                            {errors.termId.message as string}
                        </p>
                    )}
                </div>
                {true && <div className="space-y-2 flex-1 min-w-0">
                    <Label htmlFor="definitionId">Classroom Definition *</Label>
                    <Controller
                        name="definitionId"
                        control={control}
                        rules={{ required: "Select classroom definition" }}
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select classroom" />
                                </SelectTrigger>
                                <SelectContent>
                                    {structure?.definitionsOptions &&
                                        structure.definitionsOptions.length > 0 ? (
                                        structure.definitionsOptions.map((def) => (
                                            <SelectItem key={def.id} value={def.id}>
                                                {def.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-sm text-gray-500">
                                            No classrooms available
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.definitionId && (
                        <p className="text-sm text-red-500">
                            {errors.definitionId?.message as string}
                        </p>
                    )}
                </div>}
                <SubmitButton loading={loading} text="Load" />
            </div>
            {loading && (
                <div className="mt-6 overflow-x-auto animate-pulse">
                    <table className="w-full text-left table-auto border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="px-3 py-2 text-sm font-medium">Assessment Name</th>
                                <th className="px-3 py-2 text-sm font-medium">Subject</th>
                                <th className="px-3 py-2 text-sm font-medium">Type</th>
                                <th className="px-3 py-2 text-sm font-medium">Max Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(6)].map((_, i) => (
                                <tr key={i} className="border-t">
                                    <td className="px-3 py-2">
                                        <div className="h-4 bg-gray-200 rounded w-32" />
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="h-4 bg-gray-200 rounded w-24" />
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="h-4 bg-gray-200 rounded w-16" />
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="h-4 bg-gray-200 rounded w-12" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {error && (
                <div className="mt-4 text-red-600">{error}</div>
            )}
            {/* Assessments Table */}
            {!loading && !error && listAssessResult?.length > 0 && (
                <div className="mt-6">
                    {listAssessResult.map((classroom: any) => {
                        return (
                            <div key={classroom.classroomDefinition.id} className="mb-8">
                                <h3 className="font-semibold mb-2">
                                    {`${classroom.assessments[0]?.term_template_item.name || ''}, ${classroom.classroomDefinition.name}`}
                                </h3>
                                <table className="w-full text-left table-auto border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="px-3 py-2 text-sm font-medium">Assessment Name</th>
                                            <th className="px-3 py-2 text-sm font-medium">Subject</th>
                                            <th className="px-3 py-2 text-sm font-medium">Type</th>
                                            <th className="px-3 py-2 text-sm font-medium">Max Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classroom.assessments.map((assessment: any) => (
                                            <tr key={assessment.id} className="border-t">
                                                <td className="px-3 py-2 text-sm">{assessment.name}</td>
                                                <td className="px-3 py-2 text-sm">{assessment.subject?.name || '-'}</td>
                                                <td className="px-3 py-2 text-sm">{assessment.type}</td>
                                                <td className="px-3 py-2 text-sm">{assessment.max_score}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    })}
                </div>
            )}
            {!loading && !error && listAssessResult?.length === 0 && (
                <div className="mt-6 text-gray-500 text-center">
                    <div className="mb-2 font-semibold">No assessments found for selected filters.</div>
                    <div className="text-sm">Try changing the filters or check if assessments have been created for this classroom.</div>
                </div>
            )}
        </form>
    );
};

export default ViewAssessmentsTab;
