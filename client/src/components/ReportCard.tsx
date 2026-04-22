import React from "react";

// Type definitions
export interface ReportCardConfig {
  showCredits: boolean;
  useGPA: boolean;
  showRank: boolean;
  showAttendance: boolean;
  showConduct: boolean;
  showActivities: boolean;
}

export interface ReportCardData {
  school: {
    name: string;
    contact: string;
    motto: string;
  };
  term: {
    name: string;
    year: string;
    dates: string;
  };
  student: {
    name: string;
    regNo: string;
    class: string;
    stream: string;
  };
  subjects: Array<{
    name: string;
    score: number;
    grade: string;
    credits?: number;
    remarks: string;
  }>;
  summary: {
    totalMarks: number;
    totalCredits?: number;
    average: number;
    gpa?: number;
    division?: string;
    rank?: number;
  };
  attendance?: {
    present: number;
    absent: number;
  };
  conduct?: string;
  activities?: string;
  comments: {
    teacher: string;
    head: string;
  };
  grading: Array<{
    label: string;
    range: string;
    description: string;
  }>;
}

// 1. Header Component
function Header({
  school,
  term,
  student,
}: {
  school: ReportCardData['school'];
  term: ReportCardData['term'];
  student: ReportCardData['student'];
}) {
  return (
    <div className="flex flex-col items-center border-b pb-4 mb-4">
      <div className="flex items-center w-full justify-between">
        <div className="w-24 h-24 bg-gray-200 flex items-center justify-center rounded text-xs text-gray-500 border mr-4 print:border-black">
          Logo
        </div>
        <div className="flex-1 flex flex-col items-center">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-900 print:text-black text-center">{school.name}</h1>
          <div className="text-sm text-gray-700 print:text-black text-center">{school.contact}</div>
          <div className="italic text-xs text-gray-500 print:text-black text-center">{school.motto}</div>
        </div>
        <div className="w-24 h-24 bg-gray-200 flex items-center justify-center rounded text-xs text-gray-500 border ml-4 print:border-black overflow-hidden">
          {/* Replace below with <img src={student.avatarUrl} ... /> if available */}
          Avatar
        </div>
      </div>
      <div className="flex justify-center mt-2 gap-6 text-sm">
        <span className="font-semibold">{term.name}</span>
        <span>Academic Year: {term.year}</span>
        <span>Dates: {term.dates}</span>
      </div>
    </div>
  );
}

// 2. StudentInfo Component
function StudentInfo({ student }: { student: ReportCardData['student'] }) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
      <div><span className="font-semibold">Name:</span> {student.name}</div>
      <div><span className="font-semibold">Reg No:</span> {student.regNo}</div>
      <div><span className="font-semibold">Class/Program:</span> {student.class}</div>
      <div><span className="font-semibold">Stream/Dept:</span> {student.stream}</div>
    </div>
  );
}

// 3. AcademicTable Component
function AcademicTable({ subjects, showCredits }: { subjects: ReportCardData['subjects']; showCredits: boolean }) {
  return (
    <table className="w-full border border-gray-400 print:border-black mb-4 text-sm">
      <thead className="bg-gray-100 print:bg-white">
        <tr>
          <th className="border border-gray-400 print:border-black px-2 py-1">Subject</th>
          <th className="border border-gray-400 print:border-black px-2 py-1">Score</th>
          <th className="border border-gray-400 print:border-black px-2 py-1">Grade</th>
          {showCredits && <th className="border border-gray-400 print:border-black px-2 py-1">Credits</th>}
          <th className="border border-gray-400 print:border-black px-2 py-1">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map((sub, i) => (
          <tr key={i}>
            <td className="border border-gray-400 print:border-black px-2 py-1">{sub.name}</td>
            <td className="border border-gray-400 print:border-black px-2 py-1 text-center">{sub.score}</td>
            <td className="border border-gray-400 print:border-black px-2 py-1 text-center">{sub.grade}</td>
            {showCredits && <td className="border border-gray-400 print:border-black px-2 py-1 text-center">{sub.credits ?? '-'}</td>}
            <td className="border border-gray-400 print:border-black px-2 py-1">{sub.remarks}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 4. PerformanceSummary Component
function PerformanceSummary({ summary, config }: { summary: ReportCardData['summary']; config: ReportCardConfig }) {
  return (
    <div className="flex flex-wrap gap-4 mb-4 text-sm">
      <div><span className="font-semibold">Total Marks:</span> {summary.totalMarks}</div>
      {config.showCredits && <div><span className="font-semibold">Total Credits:</span> {summary.totalCredits}</div>}
      <div><span className="font-semibold">Average:</span> {summary.average}</div>
      {config.useGPA ? (
        <div><span className="font-semibold">GPA:</span> {summary.gpa}</div>
      ) : (
        <div><span className="font-semibold">Division:</span> {summary.division}</div>
      )}
      {config.showRank && (
        <div><span className="font-semibold">Position:</span> {summary.rank}</div>
      )}
    </div>
  );
}

// 5. Optional Sections
function Attendance({ attendance }: { attendance?: ReportCardData['attendance'] }) {
  if (!attendance) return null;
  return (
    <div className="mb-2 text-sm">
      <span className="font-semibold">Attendance:</span> Present: {attendance.present}, Absent: {attendance.absent}
    </div>
  );
}
function Conduct({ conduct }: { conduct?: string }) {
  if (!conduct) return null;
  return (
    <div className="mb-2 text-sm">
      <span className="font-semibold">Conduct:</span> {conduct}
    </div>
  );
}
function Activities({ activities }: { activities?: string }) {
  if (!activities) return null;
  return (
    <div className="mb-2 text-sm">
      <span className="font-semibold">Co-curricular Activities:</span> {activities}
    </div>
  );
}

// 6. Comments Component
function Comments({ comments }: { comments: ReportCardData['comments'] }) {
  return (
    <div className="mb-4 text-sm">
      <div><span className="font-semibold">Teacher's Remark:</span> {comments.teacher}</div>
      <div><span className="font-semibold">Head Teacher/Dean Remark:</span> {comments.head}</div>
    </div>
  );
}

// 7. Signatures Component
function Signatures() {
  return (
    <div className="flex justify-between mt-20 mb-4">
      <div className="flex flex-col items-center">
        <div className="border-t-2 border-gray-400 w-40 print:border-black" style={{ height: 0 }} />
        <span className="text-xs mt-1">Class Teacher</span>
      </div>
      <div className="flex flex-col items-center">
        <div className="border-t-2 border-gray-400 w-40 print:border-black" style={{ height: 0 }} />
        <span className="text-xs mt-1">Head Teacher / Dean</span>
      </div>
    </div>
  );
}

// 8. Footer Component
function Footer({ grading }: { grading: ReportCardData['grading'] }) {
  return (
    <div className="mt-8 pt-4 border-t text-xs text-gray-700 print:text-black">
      <div className="font-semibold mb-1">Grading Scale:</div>
      <div className="flex flex-wrap gap-4">
        {grading.map((g, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="font-mono font-bold">{g.label}</span>
            <span>({g.range})</span>
            <span>- {g.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main ReportCard Component
export default function ReportCard({ data, config }: { data: ReportCardData; config: ReportCardConfig }) {
  return (
    <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-8 shadow print:shadow-none print:bg-white print:text-black border print:border-0 text-gray-900">
      <Header school={data.school} term={data.term} student={data.student} />
      <StudentInfo student={data.student} />
      <AcademicTable subjects={data.subjects} showCredits={config.showCredits} />
      <PerformanceSummary summary={data.summary} config={config} />
      {config.showAttendance && <Attendance attendance={data.attendance} />}
      {config.showConduct && <Conduct conduct={data.conduct} />}
      {config.showActivities && <Activities activities={data.activities} />}
      <Comments comments={data.comments} />
      <Signatures />
      <Footer grading={data.grading} />
    </div>
  );
}

// Example usage data and config
export const exampleData = {
  school: {
    name: "Atom International School",
    contact: "P.O. Box 123, Kampala | Tel: 0123-456789 | info@atom.edu",
    motto: "Knowledge is Power",
  },
  term: {
    name: "Term II",
    year: "2025",
    dates: "May 10 – Aug 15, 2025",
  },
  student: {
    name: "Jane Doe",
    regNo: "AIS/2025/0012",
    class: "S.2",
    stream: "East",
  },
  subjects: [
    { name: "Mathematics", score: 85, grade: "A", credits: 4, remarks: "Excellent" },
    { name: "English", score: 78, grade: "B+", credits: 3, remarks: "Very Good" },
    { name: "Biology", score: 65, grade: "C", credits: 3, remarks: "Good" },
    { name: "History", score: 90, grade: "A+", credits: 2, remarks: "Outstanding" },
  ],
  summary: {
    totalMarks: 318,
    totalCredits: 12,
    average: 79.5,
    gpa: 4.2,
    division: "I",
    rank: 3,
  },
  attendance: { present: 85, absent: 5 },
  conduct: "Excellent",
  activities: "Football, Debate Club",
  comments: {
    teacher: "Keep up the great work!",
    head: "Promoted to next class.",
  },
  grading: [
    { label: "A", range: "80–100", description: "Excellent" },
    { label: "B+", range: "75–79", description: "Very Good" },
    { label: "B", range: "70–74", description: "Good" },
    { label: "C", range: "60–69", description: "Credit" },
    { label: "D", range: "50–59", description: "Pass" },
    { label: "F", range: "0–49", description: "Fail" },
    { label: "Div 1", range: "Aggregate 8–32", description: "First Division" },
    { label: "Div 2", range: "Aggregate 33–45", description: "Second Division" },
    { label: "Div 3", range: "Aggregate 46–58", description: "Third Division" },
    { label: "Div 4", range: "Aggregate 59–72", description: "Fourth Division" },
  ],
};

export const exampleConfig = {
  showCredits: true,
  useGPA: true,
  showRank: true,
  showAttendance: true,
  showConduct: true,
  showActivities: true,
};
