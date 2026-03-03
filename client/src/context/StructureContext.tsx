import { gradesApi } from "@/lib/api";
import React, { useState } from "react";

export interface Structure {
    years?: any[];
    terms?: any[];
    definitionsOptions?: any[];
    subjects?: any[];
}

interface StructureContextProps {
    structure: Structure | null;
    isLoading: boolean;
    error: string | null;
    fetchStructure: (schoolId: string) => Promise<void>;
    assessSelects: {
        yearId: string;
        termId: string;
        definitionId: string;
    };
    setAssessSelects: React.Dispatch<React.SetStateAction<{
        yearId: string;
        termId: string;
        definitionId: string;
    }>>;
    byDefinitionSelects: {
        yearId: string;
        termId: string;
        definitionId: string;
    };
    setByDefinitionSelects: React.Dispatch<React.SetStateAction<{
        yearId: string;
        termId: string;
        definitionId: string;
    }>>;
    byStudentSelects: {
        yearId: string;
        termId: string;
        identity: string;
    };
    setByStudentSelects: React.Dispatch<React.SetStateAction<{
        yearId: string;
        termId: string;
        identity: string;
    }>>;
    selectValues: {
        year: string;
        term: string;
        classroom: string;
        assessment: string;
        gradeYear: string;
        gradeTerm: string;
        gradeClassroom: string;
        gradeAssessment: string;
    };
    setSelectValues: React.Dispatch<React.SetStateAction<{
        year: string;
        term: string;
        classroom: string;
        assessment: string;
        gradeYear: string;
        gradeTerm: string;
        gradeClassroom: string;
        gradeAssessment: string;
    }>>;
    grades: any[];
    setGrades: React.Dispatch<React.SetStateAction<any[]>>;
    classrooms: any[];
    setClassrooms: React.Dispatch<React.SetStateAction<any[]>>;
    subjects: any[];
    setSubjects: React.Dispatch<React.SetStateAction<any[]>>;
    classroomsRes: any;
    setClassroomsRes: React.Dispatch<React.SetStateAction<any>>;
    definitionsOptions: any[];
    setDefinitionsOptions: React.Dispatch<React.SetStateAction<any[]>>;
    subjectOptions: any[];
    setSubjectOptions: React.Dispatch<React.SetStateAction<any[]>>;
    termOptions: any[];
    setTermOptions: React.Dispatch<React.SetStateAction<any[]>>;
    yearOptions: any[];
    setYearOptions: React.Dispatch<React.SetStateAction<any[]>>;
    gradingStudents: any[];
    setGradingStudents: React.Dispatch<React.SetStateAction<any[]>>;
    byStudentResult: any;
    setByStudentResult: React.Dispatch<React.SetStateAction<any>>;
    byDefinitionResult: any;
    setByDefinitionResult: React.Dispatch<React.SetStateAction<any>>;
    listAssessResult: any;
    setListAssessResult: React.Dispatch<React.SetStateAction<any>>;
}

const StructureContext = React.createContext<StructureContextProps | undefined>(undefined);

export const StructureProvider = ({ children }: { children: React.ReactNode }) => {
    // State is only in memory, persists across navigation but not reloads
    const [structure, setStructure] = useState<Structure | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assessSelects, setAssessSelects] = useState({
        yearId: "",
        termId: "",
        definitionId: "",
    });
    const [byDefinitionSelects, setByDefinitionSelects] = useState({
        yearId: "",
        termId: "",
        definitionId: "",
    });
    const [byStudentSelects, setByStudentSelects] = useState({
        yearId: "",
        termId: "",
        identity: "",
    });
    const [selectValues, setSelectValues] = useState({
        year: "",
        term: "",
        classroom: "",
        assessment: "",
        gradeYear: "",
        gradeTerm: "",
        gradeClassroom: "",
        gradeAssessment: ""
    });
    const [grades, setGrades] = useState<any[]>([]);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [termOptions, setTermOptions] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [yearOptions, setYearOptions] = useState<any[]>([]);
    const [subjectOptions, setSubjectOptions] = useState<any[]>([]);
    const [classroomsRes, setClassroomsRes] = useState<any>(null);
    const [definitionsOptions, setDefinitionsOptions] = useState<any[]>([]);
    const [gradingStudents, setGradingStudents] = useState<any[]>([]);
    const [byStudentResult, setByStudentResult] = useState<any>(null);
    const [byDefinitionResult, setByDefinitionResult] = useState<any>(null);
    const [listAssessResult, setListAssessResult] = useState<any>(null);

    const fetchStructure = async (schoolId: string) => {
        if (!schoolId) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await gradesApi.getStructure(schoolId);
            if (!res.ok) throw new Error("Failed to fetch school structure");
            const data = await res.json();
            setStructure({
                years: data.years || [],
                terms: data.terms || [],
                definitionsOptions: data.classroomDefinitions || [],
                subjects: data.subjects || []
            });
            setYearOptions(data.years || []);
            setDefinitionsOptions(data.classroomDefinitions || []);
            setSubjectOptions(data.subjects || []);
            setTermOptions(data.terms || []);
        } catch (err: any) {
            setError(err?.message || "Failed to load school structure");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <StructureContext.Provider value={{
            structure,
            isLoading,
            error,
            fetchStructure,
            byStudentSelects,
            setByStudentSelects,
            byStudentResult,
            setByStudentResult,
            assessSelects,
            setAssessSelects,
            byDefinitionSelects,
            setByDefinitionSelects,
            byDefinitionResult,
            setByDefinitionResult,
            listAssessResult,
            setListAssessResult,
            selectValues,
            setSelectValues,
            grades,
            setGrades,
            classrooms,
            setClassrooms,
            classroomsRes,
            setClassroomsRes,
            subjectOptions,
            setSubjectOptions,
            termOptions,
            setTermOptions,
            subjects,
            setSubjects,
            definitionsOptions,
            setDefinitionsOptions,
            yearOptions,
            setYearOptions,
            gradingStudents,
            setGradingStudents
        }}>
            {children}
        </StructureContext.Provider>
    );
};

export const useStructure = () => {
    const ctx = React.useContext(StructureContext);
    if (!ctx) throw new Error("useStructure must be used within a StructureProvider");
    return ctx;
};
