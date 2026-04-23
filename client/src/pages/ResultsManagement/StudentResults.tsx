import NoDataComponent from "@/components/common/NoDataComponent";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStructure } from "@/context/StructureContext";
import { useTenant } from "@/context/TenantContext";
import { gradesApi, reportCardsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";

const StudentResults: React.FC = () => {
    const {
        structure,
        byStudentSelects,
        setByStudentSelects,
        byStudentResult,
        setByStudentResult
    } = useStructure();
    const { selectedTenant } = useTenant();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!selectedTenant) return null;

    const schoolId = selectedTenant.id;
    const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm({
        defaultValues: {
            yearId: byStudentSelects?.yearId || "",
            termId: byStudentSelects?.termId || "",
            identity: byStudentSelects?.identity || "",
        },
    });

    // Keep form in sync with context
    React.useEffect(() => {
        setValue("yearId", byStudentSelects?.yearId || "");
        setValue("termId", byStudentSelects?.termId || "");
        setValue("identity", byStudentSelects?.identity || "");
    }, [byStudentSelects, setValue]);

    // Update context when form changes
    React.useEffect(() => {
        const subscription = watch((values) => {
            setByStudentSelects((prev: any) => ({ ...prev, ...values }));
        });
        return () => subscription.unsubscribe();
    }, [watch, setByStudentSelects]);

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setByStudentResult(null);
        setError(null);
        setByStudentSelects((prev: any) => ({ ...prev, ...data }));
        try {
            const response = await gradesApi.resultsByIdentity(
                schoolId,
                data.yearId,
                data.termId,
                data.identity
            );
            const results = await response.json();
            setByStudentResult(results);
        } catch (error) {
            console.error("Failed to fetch results by identity:", error);
            setError("Failed to fetch results. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!byStudentResult?.student?.id || !byStudentSelects?.yearId || !byStudentSelects?.termId) {
            toast({
                title: "Error",
                description: "Missing required data to generate report",
                variant: "destructive"
            });
            return;
        }

        setIsGeneratingReport(true);

        try {
            // Call the new direct download endpoint
            const response = await reportCardsApi.downloadByIdentity(
                schoolId,
                byStudentSelects.yearId,
                byStudentSelects.termId,
                byStudentSelects.identity,
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Failed to generate report card" }));
                throw new Error(errorData.message || "Failed to generate report card");
            }

            toast({
                title: "Success",
                description: `Report card generated successfully for ${byStudentResult.student.first_name} ${byStudentResult.student.last_name}`,
            });

            const contentDisposition = response.headers.get("content-disposition");
            let fileName = "report-card.pdf";
            if (contentDisposition) {
                const matches = contentDisposition.match(/filename="([^"]+)"/);
                if (matches) fileName = matches[1];
            }

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            // Open PDF preview in a new tab using a link element for better compatibility
            const link = document.createElement('a');
            link.href = blobUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Keep URL in memory for longer to ensure preview loads and persists
            // The user can download from the preview tab if needed
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
        } catch (error) {
            console.error("Failed to generate report card:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to generate report card",
                variant: "destructive"
            });
        } finally {
            setIsGeneratingReport(false);
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
                        <Label htmlFor="identity">Student Identity</Label>
                        <Controller
                            name="identity"
                            control={control}
                            rules={{ required: "Enter student identity" }}
                            render={({ field }) => (
                                <Input
                                    id="identity"
                                    placeholder="Enter student number or reg no"
                                    {...field}
                                />
                            )}
                        />
                        {errors.identity && <p className="text-xs text-red-500 mt-1">{errors.identity.message as string}</p>}
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
            <div className="px-6 pb-6">
                {isLoading && (
                    <div className="overflow-x-auto animate-pulse">
                        <table className="w-full text-left table-auto border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="px-3 py-2 text-sm font-medium">Subject</th>
                                    <th className="px-3 py-2 text-sm font-medium">Assessment</th>
                                    <th className="px-3 py-2 text-sm font-medium">Score</th>
                                    <th className="px-3 py-2 text-sm font-medium">%age</th>
                                    <th className="px-3 py-2 text-sm font-medium">Grade</th>
                                    <th className="px-3 py-2 text-sm font-medium">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...Array(4)].map((_, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-10" /></td>
                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {error && (
                    <div className="text-sm text-red-600 mt-4">{error}</div>
                )}
                {byStudentResult && (!byStudentResult.grades || byStudentResult.grades.length === 0) && (
                    <NoDataComponent message="No grades found for this student in the selected year and term." />
                )}
                {byStudentResult && byStudentResult.grades && byStudentResult.grades.length > 0 && (
                    <div>
                        <div className="mb-4 flex flex-col md:flex-row md:items-center md:gap-8 gap-2">
                            <div>
                                <span className="font-semibold">Student:</span> {byStudentResult.student?.first_name} {byStudentResult.student?.last_name} ({byStudentResult.student?.reg_no || byStudentResult.student?.student_no})
                            </div>
                            <div>
                                <span className="font-semibold">Overall Average:</span> {byStudentResult.overallAverage}
                            </div>
                            <div>
                                <span className="font-semibold">Overall Grade:</span> {byStudentResult.overallLetterGrade}
                            </div>
                            <button
                                onClick={handleGenerateReport}
                                disabled={isGeneratingReport}
                                className="px-4 py-2 rounded-md bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isGeneratingReport ? "Generating..." : "Generate Report Card"}
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left table-auto border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-2 text-sm font-medium">Subject</th>
                                        <th className="px-3 py-2 text-sm font-medium">Assessment</th>
                                        <th className="px-3 py-2 text-sm font-medium">Score</th>
                                        <th className="px-3 py-2 text-sm font-medium">%age</th>
                                        <th className="px-3 py-2 text-sm font-medium">Grade</th>
                                        <th className="px-3 py-2 text-sm font-medium">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byStudentResult.grades.map((g: any, i: number) => (
                                        <tr key={i} className="border-t">
                                            <td className="px-3 py-2 text-sm">{g.assessment?.subject?.name || '-'}</td>
                                            <td className="px-3 py-2 text-sm">{g.assessment?.name || '-'}</td>
                                            <td className="px-3 py-2 text-sm">{g.score}</td>
                                            <td className="px-3 py-2 text-sm">{g.percentage}</td>
                                            <td className="px-3 py-2 text-sm">{g.letter_grade}</td>
                                            <td className="px-3 py-2 text-sm">{g.remarks ?? '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {byStudentResult === null && !isLoading && !error && (
                    <NoDataComponent message="Select filters and submit to view student results." />
                )}
            </div>
        </Card>
    );
};

export default StudentResults;
