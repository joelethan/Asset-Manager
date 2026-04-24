import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfileProvider, useProfile } from "@/context/ProfileContext";
import { TenantProvider } from "@/context/TenantContext";
import AcademicStructure from "@/pages/AcademicStructure";
import Classes from "@/pages/Classes";
import CreateSchool from "@/pages/CreateSchool";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Schools from "@/pages/Schools";
import Settings from "@/pages/Settings";
import Students from "@/pages/Students";
import Subjects from "@/pages/Subjects";
import Teachers from "@/pages/Teachers";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { Redirect, Route, Switch, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import ResultsManagement from "./pages/ResultsManagement";
import ReportCards from "./pages/ReportCards";

function RootRedirect() {
  const { isAuthenticated, initialized, profile } = useProfile();
  if (!initialized) return null;
  return <Redirect to={isAuthenticated ? (profile?.memberships?.length ? "/dashboard" : "/schools-create") : "/login"} />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, initialized, profile } = useProfile();
  if (!initialized) return null;
  if (isAuthenticated) return <Redirect to={profile?.memberships?.length ? "/dashboard" : "/schools-create"} />;
  return <Component />;
}

function CatchAllRedirect() {
  const { isAuthenticated, initialized, profile } = useProfile();
  if (!initialized) return null;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!profile?.memberships?.length) return <Redirect to="/schools-create" />;
  return <Redirect to="/dashboard" />;
}

function AppRouter() {
  const { isAuthenticated, profile } = useProfile();
  const hasMemberships = !!profile?.memberships?.length;

  return (
    <WouterRouter>
      <Switch>
        <Route path="/" component={RootRedirect} />

        {/* Public routes - redirect to dashboard if already authenticated */}
        <Route path="/login">
          <PublicRoute component={Login} />
        </Route>
        <Route path="/register">
          <PublicRoute component={Register} />
        </Route>

        {/* If authenticated but does not belong to any school, show only Create School + Settings */}
        {isAuthenticated && !hasMemberships && (
          <>
            <Route path="/schools-create" component={CreateSchool} />
            {/* <Route path="/settings" component={Settings} /> */}
          </>
        )}

        {/* Protected routes - only when authenticated and has at least one school membership */}
        {isAuthenticated && hasMemberships && (
          <>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/academic-structure" component={AcademicStructure} />
            <Route path="/schools" component={Schools} />
            <Route path="/students" component={Students} />
            <Route path="/teachers" component={Teachers} />
            <Route path="/classes" component={Classes} />
            <Route path="/results" component={ResultsManagement} />
            <Route path="/subjects" component={Subjects} />
            {/* <Route path="/report-cards" component={ReportCards} /> */}
            {/* <Route path="/settings" component={Settings} /> */}
          </>
        )}

        {/* Catch-all for unrecognized routes */}
        <Route component={CatchAllRedirect} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <TenantProvider>
          <TooltipProvider delayDuration={0}>
            {/* <Toaster /> */}
            <AppRouter />
          </TooltipProvider>
        </TenantProvider>
      </ProfileProvider>
    </QueryClientProvider>
  );
}

export default App;


//  - All Students: Shows new students who haven't registered in any classes yet (For allocation).
//  - Classes > Classroom Enrollments: Shows students who are registered per class. By promotion or otherwise.
//           - As they report, they can be moved to the "Enrolled" section of the class,
//              which indicates they are actively enrolled in that class for the term.
//  - Students > Student Profile: Shows detailed information about a specific student.


//  - Let us add an extra Tab for 'Student Uploads'. [150-153: students.tsx]
//  - This should have both downloading a template & uploading the filled template.



// Generate a React + Tailwind CSS component called ReportCard for an Academic Management Information System (ACMIS).

// General Requirements:
// - A4 printable layout (210mm x 297mm)
// - Clean, professional, grayscale-friendly design
// - Use functional React components
// - Use Tailwind CSS for styling
// - Component must be modular and reusable
// - Accept two props: `data` (all report data) and `config` (toggles and system behavior)

// Layout Structure:
// 1. Header Component:
//    - Displays school name, logo placeholder, contact details
//    - Includes school motto
//    - Shows term/semester name, academic year, and term dates

// 2. StudentInfo Component:
//    - Fields: full name, admission/registration number
//    - Class/program, stream/faculty/department

// 3. AcademicTable Component:
//    - Dynamic table rendering subjects or course units
//    - Columns:
//        subject name
//        marks/score
//        grade
//        optional credit units (controlled by config.showCredits)
//        remarks
//    - Must support variable number of subjects

// 4. PerformanceSummary Component:
//    - Displays total marks or total credits
//    - Displays average score
//    - If config.useGPA is true → show GPA
//    - Else → show division/grade classification
//    - Optionally show student position if config.showRank is true

// 5. Optional Sections (render conditionally):
//    - Attendance (present, absent) → config.showAttendance
//    - Conduct/discipline → config.showConduct
//    - Co-curricular activities → config.showActivities

// 6. Comments Component:
//    - Teacher/tutor remarks
//    - Head teacher/dean remarks

// 7. Signatures Component:
//    - Signature placeholders for class teacher and head teacher/dean
//    - Include label text under each line

// 8. Footer Component:
//    - Display grading scale legend
//    - Must support both:
//        A–F grading system
//        Division 1–4 system
//    - Render grading dynamically from data.grading array

// Styling Requirements:
// - Use Tailwind utility classes
// - Ensure proper spacing, borders, and alignment
// - Tables must be clearly visible in black-and-white printing
// - Avoid heavy colors; use light gray backgrounds where needed
// - Ensure print-friendly styles (no shadows when printing)

// System Design Considerations:
// - All sections must be separate functional components
// - Use clean props for each section
// - Ensure layout adapts for:
//      primary school (no GPA, no credits)
//      secondary school (division + optional ranking)
//      university (GPA + credit units)
// - Code should be easy to extend and maintain

// Output:
// - Return a complete working React component file
// - Include example `data` and `config` objects for testing
