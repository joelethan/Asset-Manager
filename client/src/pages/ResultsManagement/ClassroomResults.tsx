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
                    <div className="flex items-end h-full">
                        <button
                            type="submit"
                            className="px-6 py-2 rounded-md bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading && (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                            )}
                            {isLoading ? "Loading..." : "Submit"}
                        </button>
                    </div>
                </div>
            </form>
        </Card>
    );
};

export default ClassroomResults;
