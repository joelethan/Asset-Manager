import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

    const [structure, setStructure] = useState<{ years?: Year[]; terms?: Term[]; classroomDefinitions?: ClassroomDefinition[] } | null>(null);
    const [isStructureLoading, setIsStructureLoading] = useState(false);
    const [structureError, setStructureError] = useState<string | null>(null);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [selectedTermId, setSelectedTermId] = useState<string>("");
    const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
    const [grades, setGrades] = useState<Grade[] | null>(null);
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
    useEffect(() => { setValue("year", selectedYearId); }, [selectedYearId, setValue]);
    useEffect(() => { setValue("term", selectedTermId); }, [selectedTermId, setValue]);
    useEffect(() => { setValue("classroom", selectedClassroomId); }, [selectedClassroomId, setValue]);
    useEffect(() => { setValue("assessment", selectedAssessmentId); }, [selectedAssessmentId, setValue]);

    useEffect(() => {
        if (schoolId) {
            fetchStructure();
        }
    }, [schoolId]);

    useEffect(() => {
        console.log("Fetched Structure:", structure);
    }, [structure]);

    const fetchStructure = async () => {
        setIsStructureLoading(true);
        setStructureError(null);
        try {
            const res = await gradesApi.getStructure(schoolId);
            if (!res.ok) throw new Error("Failed to fetch school structure");
            const data = await res.json();
            setStructure({
                years: data.years || [],
                terms: data.terms || [],
                classroomDefinitions: data.classroomDefinitions || data.classroom_definitions || [],
            });
        } catch (err: any) {
            setStructureError(err?.message || "Failed to load school structure");
        } finally {
            setIsStructureLoading(false);
        }
    };

    const onSubmit = async (data: any) => {
        setIsGradesLoading(true);
        setGradesError(null);
        // setGrades(null);
        try {
            const res = await gradesApi.fetchForAssessment(schoolId, data.assessment);
            if (!res.ok) throw new Error("Failed to fetch grades");
            const result = await res.json();
            setGrades(result || []);
        } catch (err: any) {
            setGradesError(err?.message || "Failed to load grades");
        } finally {
            setIsGradesLoading(false);
        }
    };

    return (
        <AppLayout
            title="Results Management"
            description="Manage school results and grades"
            breadcrumbs={[{ label: "Results Management" }]}
        >
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
                                        <Select value={field.value} onValueChange={(v) => { field.onChange(v); setSelectedYearId(v); }}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select academic year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {structure?.years && structure.years.length > 0 ? (
                                                    structure.years.map(year => (
                                                        <SelectItem key={year.id} value={year.id}>
                                                            {`${year.name} ${year.status === "active" ? "(Active)" : ""}`}
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
                                        <Select value={field.value} onValueChange={(v) => { field.onChange(v); setSelectedTermId(v); }}>
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
                                        <Select value={field.value} onValueChange={(v) => { field.onChange(v); setSelectedClassroomId(v); }}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select classroom" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {structure?.classroomDefinitions && structure.classroomDefinitions.length > 0 ? (
                                                    structure.classroomDefinitions
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
                                        <Select value={field.value} onValueChange={(v) => { field.onChange(v); setSelectedAssessmentId(v); }}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select assessment" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(!selectedYearId || !selectedTermId) ? (
                                                    <div className="px-4 py-2 text-sm text-gray-500">Select academic year and term first</div>
                                                ) : (() => {
                                                    const classroom = structure?.classroomDefinitions?.find(c => c.id === selectedClassroomId);
                                                    if (classroom && Array.isArray(classroom.assessments) && classroom.assessments.length > 0) {
                                                        const filteredAssessments = classroom.assessments.filter(assessment =>
                                                            assessment.term_template_item_id === selectedTermId &&
                                                            assessment.academic_year_id === selectedYearId
                                                        );
                                                        if (filteredAssessments.length > 0) {
                                                            return filteredAssessments.map(assessment => (
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
                                <button className="w-full px-4 md:px-6 py-2 rounded-md bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">
                                    Submit
                                </button>
                            </div>
                        </div>
                    </form>
                    {/* Display grades table or loading/error states here */}
                    <div className="mt-6">
                        {isGradesLoading && (!grades || grades.length === 0) ? (
                            <div className="text-sm text-gray-600">Loading grades...</div>
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
                        ) : grades && grades.length === 0 ? (
                            <div className="text-sm text-gray-600">No grades found for the selected assessment.</div>
                        ) : null}
                    </div>
                </div>
            </Card>
        </AppLayout>
    );
}
