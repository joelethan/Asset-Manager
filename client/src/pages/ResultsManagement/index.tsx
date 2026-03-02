import ComingSoon from "@/components/common/ComingSoon";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStructure } from "@/context/StructureContext";
import { useTenant } from "@/context/TenantContext";
import { gradesApi } from "@/lib/api";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

interface Assessment {
    id: string;
    name: string;
    type: string;
    subject_id: string;
    academic_year_id?: string;
    term_template_item_id?: string;
    subject?: { name?: string };
}

interface Term {
    id: string;
    name: string;
    term_template_id: string;
    ordinal: number;
}

interface Year {
    id: string;
    name: string;
    status: string;
    term_template_id: string;
}

interface ClassroomDefinition {
    id: string;
    name: string;
    assessments?: Assessment[];
}

interface Student {
    id: string;
    first_name?: string;
    last_name?: string;
    student_no?: string;
    reg_no?: string;
}

interface Grade {
    id: string;
    student_id: string;
    assessment_id: string;
    score: string;
    percentage: string;
    letter_grade: string;
    remarks?: string;
    student?: Student;
}

export default function ResultsManagement() {
    const { selectedTenant } = useTenant();
    const schoolId = selectedTenant?.id as string;
    const {
        structure,
        isLoading: isStructureLoading,
        error: structureError,
        fetchStructure,
        selectValues,
        setSelectValues,
        grades,
        setGrades
    } = useStructure();
    // Use selectValues from context for filtering
    const selectedYearId = selectValues.year;
    const selectedTermId = selectValues.term;
    const selectedClassroomId = selectValues.classroom;
    const [isGradesLoading, setIsGradesLoading] = useState(false);
    const [gradesError, setGradesError] = useState<string | null>(null);

    const { handleSubmit, formState: { errors }, setValue, watch, control } = useForm({
        mode: "onChange",
        defaultValues: {
            year: "",
            term: "",
            classroom: "",
            assessment: "",
        },
    });

    // Keep selects in sync with react-hook-form
    useEffect(() => { setValue("year", selectValues.year); }, [selectValues.year, setValue]);
    useEffect(() => { setValue("term", selectValues.term); }, [selectValues.term, setValue]);
    useEffect(() => { setValue("classroom", selectValues.classroom); }, [selectValues.classroom, setValue]);
    useEffect(() => { setValue("assessment", selectValues.assessment); }, [selectValues.assessment, setValue]);

    useEffect(() => {
        if (schoolId && !structure) {
            fetchStructure(schoolId);
        }
    }, [schoolId, structure, fetchStructure]);

    // fetchStructure now handled by context
    const onSubmit = async (data: any) => {
        setIsGradesLoading(true);
        setGradesError(null);
        try {
            const res = await gradesApi.fetchForAssessment(schoolId, data.assessment);
            if (!res.ok) throw new Error("Failed to fetch grades");
            const result = await res.json();
            setGrades(result || []);
            setSelectValues({
                year: data.year,
                term: data.term,
                classroom: data.classroom,
                assessment: data.assessment,
                gradeYear: selectValues.gradeYear,
                gradeTerm: selectValues.gradeTerm,
                gradeClassroom: selectValues.gradeClassroom,
                gradeAssessment: selectValues.gradeAssessment,
            });
        } catch (err: any) {
            setGradesError(err?.message || "Failed to load grades");
        } finally {
            setIsGradesLoading(false);
        }
    };

    return (
        <AppLayout
            title="Assessments & Grades"
            description="Manage school assessments and grades"
            breadcrumbs={[{ label: "Results Management" }]}
        >
            <Tabs defaultValue="by-assessment" className="w-full">
                <TabsList>
                    <TabsTrigger value="by-assessment">By Assessment</TabsTrigger>
                    <TabsTrigger value="by-student">By Student</TabsTrigger>
                    <TabsTrigger value="by-classroom">By Classroom</TabsTrigger>
                    {/* Add more result views as needed */}
                </TabsList>
                <TabsContent value="by-assessment">
                    <Card className="border-slate-200">
                        <div className="w-full mx-auto mt-6 px-6 py-6">
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 items-end px-2 md:px-0">
                                    <div className="space-y-2">
                                        <Label htmlFor="year">Academic Year</Label>
                                        <Controller
                                            name="year"
                                            control={control}
                                            rules={{ required: "Select academic year" }}
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={(v) => { field.onChange(v); setSelectValues(prev => ({ ...prev, year: v })); }}>
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
                                        {errors.year && <p className="text-sm text-red-500">{errors.year.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="term">Term</Label>
                                        <Controller
                                            name="term"
                                            control={control}
                                            rules={{ required: "Select term" }}
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={(v) => { field.onChange(v); setSelectValues(prev => ({ ...prev, term: v })); }}>
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
                                        {errors.term && <p className="text-sm text-red-500">{errors.term.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="classroom">Classroom</Label>
                                        <Controller
                                            name="classroom"
                                            control={control}
                                            rules={{ required: "Select classroom" }}
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={(v) => { field.onChange(v); setSelectValues(prev => ({ ...prev, classroom: v })); }}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select classroom" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {structure?.definitionsOptions && structure.definitionsOptions.length > 0 ? (
                                                            structure.definitionsOptions
                                                                .filter(c => Array.isArray(c.assessments) && c.assessments.length > 0)
                                                                .map(classroom => (
                                                                    <SelectItem key={classroom.id} value={classroom.id}>{classroom.name}</SelectItem>
                                                                ))
                                                        ) : (
                                                            <div className="px-4 py-2 text-sm text-gray-500">No classrooms available</div>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {errors.classroom && <p className="text-sm text-red-500">{errors.classroom.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="assessment">Assessment</Label>
                                        <Controller
                                            name="assessment"
                                            control={control}
                                            rules={{ required: "Select assessment" }}
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={(v) => { field.onChange(v); setSelectValues(prev => ({ ...prev, assessment: v })); }}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select assessment" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(!selectedYearId || !selectedTermId) ? (
                                                            <div className="px-4 py-2 text-sm text-gray-500">Select academic year and term first</div>
                                                        ) : (() => {
                                                            const classroom = structure?.definitionsOptions?.find(c => c.id === selectedClassroomId);
                                                            if (classroom && Array.isArray(classroom.assessments) && classroom.assessments.length > 0) {
                                                                const filteredAssessments = classroom.assessments.filter((assessment: any) =>
                                                                    assessment.term_template_item_id === selectedTermId &&
                                                                    assessment.academic_year_id === selectedYearId
                                                                );
                                                                if (filteredAssessments.length > 0) {
                                                                    return filteredAssessments.map((assessment: any) => (
                                                                        <SelectItem key={assessment.id} value={assessment.id}>{` ${assessment?.subject?.name} (${assessment.name})`}</SelectItem>
                                                                    ));
                                                                } else {
                                                                    return <div className="px-4 py-2 text-sm text-gray-500">No assessments available for selected term and year</div>;
                                                                }
                                                            } else {
                                                                return <div className="px-4 py-2 text-sm text-gray-500">No assessments available</div>;
                                                            }
                                                        })()}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {errors.assessment && <p className="text-sm text-red-500">{errors.assessment.message}</p>}
                                    </div>
                                    <div className="flex items-end h-full">
                                        <button
                                            type="submit"
                                            className="w-full px-4 md:px-6 py-2 rounded-md bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                            disabled={isGradesLoading}
                                        >
                                            {isGradesLoading && (
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                </svg>
                                            )}
                                            {isGradesLoading ? "Loading..." : "Submit"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                            {/* Display grades table or loading/error states here */}
                            <div className="mt-6">
                                {isGradesLoading && (!grades || grades.length === 0) ? (
                                    <div className="overflow-x-auto animate-pulse">
                                        <table className="w-full text-left table-auto border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="px-3 py-2 text-sm font-medium">Reg No</th>
                                                    <th className="px-3 py-2 text-sm font-medium">Student</th>
                                                    <th className="px-3 py-2 text-sm font-medium">Score</th>
                                                    <th className="px-3 py-2 text-sm font-medium">%age</th>
                                                    <th className="px-3 py-2 text-sm font-medium">Grade</th>
                                                    <th className="px-3 py-2 text-sm font-medium">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...Array(6)].map((_, i) => (
                                                    <tr key={i} className="border-t">
                                                        <td className="px-3 py-2">
                                                            <div className="h-4 bg-gray-200 rounded w-16" />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="h-4 bg-gray-200 rounded w-28" />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="h-4 bg-gray-200 rounded w-12" />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="h-4 bg-gray-200 rounded w-12" />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="h-4 bg-gray-200 rounded w-10" />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="h-4 bg-gray-200 rounded w-20" />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : gradesError ? (
                                    <div className="text-sm text-red-600">{gradesError}</div>
                                ) : grades && grades.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left table-auto border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="px-3 py-2 text-sm font-medium">Reg No</th>
                                                    <th className="px-3 py-2 text-sm font-medium">Student</th>
                                                    <th className="px-3 py-2 text-sm font-medium">Score</th>
                                                    <th className="px-3 py-2 text-sm font-medium">%age</th>
                                                    <th className="px-3 py-2 text-sm font-medium">Grade</th>
                                                    <th className="px-3 py-2 text-sm font-medium">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {grades.map(g => (
                                                    <tr key={g.id} className="border-t">
                                                        <td className="px-3 py-2 text-sm">{(g as any).student?.reg_no || (g as any).student?.student_no || g.student_id}</td>
                                                        <td className="px-3 py-2 text-sm">{`${(g as any).student?.first_name || ''} ${(g as any).student?.last_name || ''}`.trim()}</td>
                                                        <td className="px-3 py-2 text-sm">{g.score}</td>
                                                        <td className="px-3 py-2 text-sm">{g.percentage}</td>
                                                        <td className="px-3 py-2 text-sm">{g.letter_grade}</td>
                                                        <td className="px-3 py-2 text-sm">{g.remarks ?? '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8">
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
                                            No grades found
                                        </div>
                                        <div className="text-sm text-gray-500 text-center max-w-xs">
                                            There are no grades available for the selected assessment.<br />
                                            Please check your filters or try another assessment.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </TabsContent>
                <TabsContent value="by-student">
                    <ComingSoon title="Result by Student" />
                </TabsContent>
                <TabsContent value="by-classroom">
                    <ComingSoon title="Result by Classroom" />
                </TabsContent>
            </Tabs>
        </AppLayout>
    );
}
// gradesApi.resultsByIdentity
