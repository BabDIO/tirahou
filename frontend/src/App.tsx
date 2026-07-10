import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ConfirmDialog from './components/ui/ConfirmDialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import MainLayout from './components/layout/MainLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import NotFoundPage from './pages/NotFoundPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ProfilePage from './pages/profile/ProfilePage'
// Vérification publique
import VerifyDocumentPage from './pages/verify/VerifyDocumentPage'
import VerifyAdmissionPage from './pages/verify/VerifyAdmissionPage'
// Admin / Scolarité
import StudentsPage from './pages/students/StudentsPage'
import TeachersPage from './pages/teachers/TeachersPage'
import ProgramsPage from './pages/programs/ProgramsPage'
import AcademicPage from './pages/academic/AcademicPage'
import AdmissionsPage from './pages/admissions/AdmissionsPage'
import EnrollmentPage from './pages/enrollment/EnrollmentPage'
import FinancePage from './pages/finance/FinancePage'
import DocumentsPage from './pages/documents/DocumentsPage'
import AnalyticsPage from './pages/analytics/AnalyticsPage'
// Pédagogie partagée
import EvaluationPage from './pages/evaluation/EvaluationPage'
import LMSPage from './pages/lms/LMSPage'
import VirtualClassesPage from './pages/lms/VirtualClassesPage'
import VirtualClassDetailPage from './pages/virtual-classes/VirtualClassDetailPage'
import AttendancePage from './pages/attendance/AttendancePage'
import SchedulingPage from './pages/scheduling/SchedulingPage'
import InternshipsPage from './pages/internships/InternshipsPage'
import LibraryPage from './pages/library/LibraryPage'
import CommunicationPage from './pages/communication/CommunicationPage'
// Pages étudiant
import MyGradesPage from './pages/student/MyGradesPage'
import MyEnrollmentPage from './pages/student/MyEnrollmentPage'
import MyFinancePage from './pages/student/MyFinancePage'
import MyDocumentsPage from './pages/student/MyDocumentsPage'
import MySchedulePage from './pages/student/MySchedulePage'
import MyAttendancePage from './pages/student/MyAttendancePage'
import MyVirtualClassesPage from './pages/student/MyVirtualClassesPage'
import MyInternshipPage from './pages/student/MyInternshipPage'
import MyCoursesPage from './pages/student/MyCoursesPage'
import CourseDetailPage from './pages/student/CourseDetailPage'
// Pages enseignant
import TeacherCoursesPage from './pages/teacher/TeacherCoursesPage'
import TeacherGradesPage from './pages/teacher/TeacherGradesPage'
import TeacherAttendancePage from './pages/teacher/TeacherAttendancePage'
import MyAssignmentsPage from './pages/teacher/MyAssignmentsPage'
import MyStudentsPage from './pages/teacher/MyStudentsPage'
import MyInternshipsTeacherPage from './pages/teacher/MyInternshipsTeacherPage'
// Pages admin
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminAuditPage from './pages/admin/AdminAuditPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
// Pages scolarité
import ScolariteDocumentsPage from './pages/scolarite/ScolariteDocumentsPage'
import ScolariteGeneratedDocsPage from './pages/scolarite/ScolariteGeneratedDocsPage'
// Pages financier
import FinanceCashJournalPage from './pages/financier/FinanceCashJournalPage'
import FinanceScholarshipsPage from './pages/financier/FinanceScholarshipsPage'
// Pages responsable
import ResponsableProgramPage from './pages/responsable/ResponsableProgramPage'
import ResponsableGroupsPage from './pages/responsable/ResponsableGroupsPage'
// Pages bibliothécaire
import BibliothecairePage from './pages/bibliothecaire/BibliothecairePage'
import TestPage from './pages/TestPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false },
  },
})

const ADMIN = ['super_admin', 'admin_institutionnel'] as const
const SCOLARITE = ['super_admin', 'admin_institutionnel', 'admin_scolarite'] as const
const FINANCE = ['super_admin', 'admin_institutionnel', 'admin_financier'] as const
const PEDA = ['super_admin', 'admin_institutionnel', 'admin_scolarite', 'responsable_pedagogique', 'chef_departement', 'enseignant', 'tuteur'] as const
const RESP = ['super_admin', 'admin_institutionnel', 'responsable_pedagogique', 'chef_departement'] as const
const STAFF = ['super_admin', 'admin_institutionnel', 'admin_scolarite', 'admin_financier', 'responsable_pedagogique', 'chef_departement', 'enseignant', 'tuteur', 'bibliothecaire'] as const
const ALL = [...STAFF, 'etudiant', 'doctorant'] as const
const TEACHER = ['enseignant', 'tuteur', 'super_admin', 'admin_institutionnel'] as const
const STUDENT = ['etudiant', 'doctorant'] as const
const BIBLIO = ['super_admin', 'admin_institutionnel', 'bibliothecaire'] as const

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '12px', fontSize: '14px' } }} />
        <ConfirmDialog />
        <BrowserRouter>
          <Routes>
            {/* ── Public ── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/verify" element={<VerifyDocumentPage />} />
            <Route path="/verify/:code" element={<VerifyDocumentPage />} />
            <Route path="/verify-admission" element={<VerifyAdmissionPage />} />

          {/* ── Protected ── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>

              {/* Commun à tous */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<CommunicationPage />} />
              <Route path="/communication" element={<CommunicationPage />} />

              {/* Bibliothèque — tous */}
              <Route element={<ProtectedRoute allowedRoles={[...ALL]} />}>
                <Route path="/library" element={<LibraryPage />} />
              </Route>

              {/* ── ADMIN / SCOLARITÉ ── */}
              <Route element={<ProtectedRoute allowedRoles={[...SCOLARITE]} />}>
                <Route path="/admissions" element={<AdmissionsPage />} />
                <Route path="/enrollment" element={<EnrollmentPage />} />
              </Route>

              {/* ── ÉTUDIANTS — consultés aussi par Finance et Responsable ── */}
              <Route element={<ProtectedRoute allowedRoles={[...SCOLARITE, 'admin_financier', 'responsable_pedagogique', 'chef_departement']} />}>
                <Route path="/students" element={<StudentsPage />} />
              </Route>

              {/* ── DOCUMENTS — consultés aussi par la bibliothèque ── */}
              <Route element={<ProtectedRoute allowedRoles={[...SCOLARITE, 'bibliothecaire']} />}>
                <Route path="/documents" element={<DocumentsPage />} />
              </Route>

              {/* ── ADMIN SEULEMENT ── */}
              <Route element={<ProtectedRoute allowedRoles={[...ADMIN]} />}>
                <Route path="/academic" element={<AcademicPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/audit" element={<AdminAuditPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />
              </Route>

              {/* ── ANALYTICS — Admin + Responsable pédagogique ── */}
              <Route element={<ProtectedRoute allowedRoles={[...ADMIN, 'responsable_pedagogique', 'chef_departement']} />}>
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Route>

              {/* ── ADMIN + RESPONSABLE ── */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin','admin_institutionnel','responsable_pedagogique','chef_departement','admin_scolarite']} />}>
                <Route path="/teachers" element={<TeachersPage />} />
                <Route path="/programs" element={<ProgramsPage />} />
              </Route>

              {/* ── FINANCE ── */}
              <Route element={<ProtectedRoute allowedRoles={[...FINANCE]} />}>
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/finance/journal" element={<FinanceCashJournalPage />} />
                <Route path="/finance/scholarships" element={<FinanceScholarshipsPage />} />
              </Route>

              {/* ── PÉDAGOGIE ── */}
              <Route element={<ProtectedRoute allowedRoles={[...PEDA]} />}>
                <Route path="/lms" element={<LMSPage />} />
                <Route path="/virtual-classes" element={<VirtualClassesPage />} />
                <Route path="/virtual-classes/:id" element={<VirtualClassDetailPage />} />
                <Route path="/evaluation" element={<EvaluationPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/scheduling" element={<SchedulingPage />} />
                <Route path="/internships" element={<InternshipsPage />} />
              </Route>

              {/* ── SCOLARITÉ SPÉCIFIQUE ── */}
              <Route element={<ProtectedRoute allowedRoles={[...SCOLARITE]} />}>
                <Route path="/scolarite/documents" element={<ScolariteDocumentsPage />} />
                <Route path="/scolarite/generated-docs" element={<ScolariteGeneratedDocsPage />} />
              </Route>

              {/* ── RESPONSABLE SPÉCIFIQUE ── */}
              <Route element={<ProtectedRoute allowedRoles={[...RESP]} />}>
                <Route path="/responsable/programs" element={<ResponsableProgramPage />} />
                <Route path="/responsable/groups" element={<ResponsableGroupsPage />} />
              </Route>

              {/* ── BIBLIOTHÉCAIRE ── */}
              <Route element={<ProtectedRoute allowedRoles={[...BIBLIO]} />}>
                <Route path="/bibliothecaire" element={<BibliothecairePage />} />
              </Route>

              {/* ── ENSEIGNANT ── */}
              <Route element={<ProtectedRoute allowedRoles={[...TEACHER]} />}>
                <Route path="/my-courses" element={<TeacherCoursesPage />} />
                <Route path="/my-grades-teacher" element={<TeacherGradesPage />} />
                <Route path="/my-attendance" element={<TeacherAttendancePage />} />
                <Route path="/my-assignments" element={<MyAssignmentsPage />} />
                <Route path="/my-students" element={<MyStudentsPage />} />
                <Route path="/my-internships-teacher" element={<MyInternshipsTeacherPage />} />
              </Route>

              {/* ── ÉTUDIANT ── */}
              <Route element={<ProtectedRoute allowedRoles={[...STUDENT]} />}>
                <Route path="/student/courses" element={<MyCoursesPage />} />
                <Route path="/student/courses/:id" element={<CourseDetailPage />} />
                <Route path="/my-enrollment" element={<MyEnrollmentPage />} />
                <Route path="/my-grades" element={<MyGradesPage />} />
                <Route path="/my-finance" element={<MyFinancePage />} />
                <Route path="/my-documents" element={<MyDocumentsPage />} />
                <Route path="/my-schedule" element={<MySchedulePage />} />
                <Route path="/my-attendance-student" element={<MyAttendancePage />} />
                <Route path="/my-virtual-classes" element={<MyVirtualClassesPage />} />
                <Route path="/my-internship" element={<MyInternshipPage />} />
              </Route>

            </Route>
          </Route>

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
