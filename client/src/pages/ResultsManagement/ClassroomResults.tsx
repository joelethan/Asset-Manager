import NoDataComponent from "@/components/common/NoDataComponent";
import SubmitButton from "@/components/common/SubmitButton";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStructure } from "@/context/StructureContext";
import { useTenant } from "@/context/TenantContext";
import { gradesApi } from "@/lib/api";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";

const ClassroomResults: React.FC = () => {
    const {
        structure,
        byDefinitionSelects,
        setByDefinitionSelects,
        byDefinitionResult,
        setByDefinitionResult
    } = useStructure();
    const { selectedTenant } = useTenant();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!selectedTenant) return null;

    const schoolId = selectedTenant.id;
    const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm({
        defaultValues: {
            yearId: byDefinitionSelects?.yearId || "",
            termId: byDefinitionSelects?.termId || "",
            definitionId: byDefinitionSelects?.definitionId || "",
        },
    });

    // Keep form in sync with context
    React.useEffect(() => {
        setValue("yearId", byDefinitionSelects?.yearId || "");
        setValue("termId", byDefinitionSelects?.termId || "");
        setValue("definitionId", byDefinitionSelects?.definitionId || "");
    }, [byDefinitionSelects, setValue]);

    // Update context when form changes
    React.useEffect(() => {
        const subscription = watch((values) => {
            setByDefinitionSelects((prev: any) => ({ ...prev, ...values }));
        });
        return () => subscription.unsubscribe();
    }, [watch, setByDefinitionSelects]);

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setByDefinitionResult(null);
        setError(null);
        setByDefinitionSelects((prev: any) => ({ ...prev, ...data }));
        try {
            // Replace with correct API call for classroom results
            const response = await gradesApi.resultsByClassroom(
                schoolId,
                data.yearId,
                data.termId,
                data.definitionId
            );
            const results = await response.json();
            setByDefinitionResult(results);
        } catch (error) {
            console.error("Failed to fetch classroom results:", error);
            setError("Failed to fetch results. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-slate-200">
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-row gap-4 items-end px-6 py-6">
                    <div className="space-y-2 flex-1 min-w-0">
                        <Label htmlFor="year">Academic Year</Label>
                        <Controller
                            name="yearId"
                            control={control}
                            rules={{ required: "Select academic year" }}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
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
                        {errors.yearId && <p className="text-sm text-red-500">{errors.yearId.message as string}</p>}
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                        <Label htmlFor="term">Term</Label>
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
                        {errors.termId && <p className="text-sm text-red-500">{errors.termId.message as string}</p>}
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                        <Label htmlFor="term">Classroom</Label>
                        <Controller
                            name="definitionId"
                            control={control}
                            rules={{ required: "Select classroom" }}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select classroom" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {structure?.definitionsOptions && structure.definitionsOptions.length > 0 ? (
                                            structure.definitionsOptions.map(term => (
                                                <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                                            ))
                                        ) : (
                                            <div className="px-4 py-2 text-sm text-gray-500">No terms available</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.definitionId && <p className="text-sm text-red-500">{errors.definitionId.message as string}</p>}
                    </div>
                    <SubmitButton text="Load" loading={isLoading} />
                </div>
            </form>

            {/* Loading Skeleton Table */}
            {isLoading && (
                <div className="px-6 pb-6">
                    <div className="overflow-x-auto animate-pulse">
                        <table className="w-full text-left table-auto border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="px-3 py-2 text-sm font-medium">Student</th>
                                    <th className="px-3 py-2 text-sm font-medium">Reg No</th>
                                    {[...Array(4)].map((_, i) => (
                                        <th key={i} className="px-3 py-2 text-sm font-medium">
                                            <div className="h-4 bg-gray-200 rounded w-24" />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[...Array(4)].map((_, rowIdx) => (
                                    <tr key={rowIdx} className="border-t">
                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                                        {[...Array(4)].map((_, colIdx) => (
                                            <td key={colIdx} className="px-3 py-2">
                                                <div className="space-y-1">
                                                    <div className="h-3 bg-gray-200 rounded w-14" />
                                                    <div className="h-3 bg-gray-200 rounded w-10" />
                                                    <div className="h-3 bg-gray-200 rounded w-12" />
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Results Table */}
            {!isLoading &&
                byDefinitionResult &&
                Array.isArray(byDefinitionResult.assessments) &&
                byDefinitionResult.assessments.length > 0 &&
                Array.isArray(byDefinitionResult.results) &&
                byDefinitionResult.results.length > 0 && (
                    <div className="px-6 pb-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left table-auto border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-2 text-sm font-medium">Student</th>
                                        <th className="px-3 py-2 text-sm font-medium">Reg No</th>
                                        {byDefinitionResult.assessments.map((assessment: any) => (
                                            <th key={assessment.id} className="px-3 py-2 text-sm font-medium">
                                                {`${assessment?.component?.subject?.name}: ${assessment?.component?.name}` || "-"} <span className="font-normal">({assessment.name})</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {byDefinitionResult.results.map((result: any) => (
                                        <tr key={result.student.id} className="border-t">
                                            <td className="px-3 py-2 text-sm font-medium">
                                                {result.student.first_name} {result.student.last_name}
                                            </td>
                                            <td className="px-3 py-2 text-sm">{result.student.reg_no || result.student.student_no || result.student.id}</td>
                                            {byDefinitionResult.assessments.map((assessment: any) => {
                                                // Find grade for this student and assessment
                                                const grade = result.grades?.find((g: any) => g.assessment?.id === assessment.id);
                                                return (
                                                    <td key={assessment.id} className="px-3 py-2 text-sm">
                                                        {grade ? (
                                                            <div>
                                                                <div>Score: {grade.score}</div>
                                                                <div>%: {grade.percentage}</div>
                                                                <div>Grade: {grade.letter_grade}</div>
                                                                <div className="text-xs text-gray-500">{grade.remarks ?? ""}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">N/A</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            {/* No Data State */}
            {!isLoading && (
                (Object.keys(byDefinitionResult).length === 0 ||
                    (byDefinitionResult && Array.isArray(byDefinitionResult.assessments) && byDefinitionResult.assessments.length === 0 &&
                        Array.isArray(byDefinitionResult.results) && byDefinitionResult.results.length === 0)) && (
                    <div className="px-6 pb-6">
                        <NoDataComponent message="No results found for this classroom in the selected year and term." />
                    </div>
                )
            )}

        </Card>
    );
};

export default ClassroomResults;
