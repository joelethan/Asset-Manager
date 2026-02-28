import { gradesApi } from "@/lib/api";
import React, { createContext, ReactNode, useContext, useState } from "react";

export interface Structure {
    years?: any[];
    terms?: any[];
    classroomDefinitions?: any[];
}

interface StructureContextProps {
    structure: Structure | null;
    isLoading: boolean;
    error: string | null;
    fetchStructure: (schoolId: string) => Promise<void>;
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
    grades: any[] | null;
    setGrades: React.Dispatch<React.SetStateAction<any[] | null>>;
    classrooms: any[];
    setClassrooms: React.Dispatch<React.SetStateAction<any[]>>;
    subjects: any[];
    setSubjects: React.Dispatch<React.SetStateAction<any[]>>;
    classroomsRes: any;
    setClassroomsRes: React.Dispatch<React.SetStateAction<any>>;
    classroomDefinitions: any[];
    setClassroomDefinitions: React.Dispatch<React.SetStateAction<any[]>>;
}

const StructureContext = createContext<StructureContextProps | undefined>(undefined);

export const StructureProvider = ({ children }: { children: ReactNode }) => {
    // State is only in memory, persists across navigation but not reloads
    const [structure, setStructure] = useState<Structure | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
    const [grades, setGrades] = useState<any[] | null>(null);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [classroomsRes, setClassroomsRes] = useState<any>(null);
    const [classroomDefinitions, setClassroomDefinitions] = useState<any[]>([]);

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
                classroomDefinitions: data.classroomDefinitions || data.classroom_definitions || [],
            });
            setClassroomDefinitions(data.classroomDefinitions || data.classroom_definitions || []);
        } catch (err: any) {
            setError(err?.message || "Failed to load school structure");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <StructureContext.Provider value={{ structure, isLoading, error, fetchStructure, selectValues, setSelectValues, grades, setGrades, classrooms, setClassrooms, classroomsRes, setClassroomsRes, subjects, setSubjects, classroomDefinitions, setClassroomDefinitions }}>
            {children}
        </StructureContext.Provider>
    );
};

export const useStructure = () => {
    const ctx = useContext(StructureContext);
    if (!ctx) throw new Error("useStructure must be used within a StructureProvider");
    return ctx;
};
