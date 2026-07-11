import api from '../lib/axios'
import type {
  LoginCredentials, AuthTokens, User,
  PaginatedResponse, Student, Teacher, TeacherAvailability, Program,
  Application, AdminEnrollment, Invoice, Payment,
  Grade, SemesterResult, CourseSpace, ScheduledSession,
  Notification, DashboardData, AcademicYear, Faculty, Department,
} from '../types'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: LoginCredentials) =>
    api.post<AuthTokens & { user: User }>('/auth/login/', data),
  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),
  me: () => api.get<User>('/auth/me/'),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/auth/change-password/', data),
  getUsers: (params?: object) => api.get('/users/', { params }),
  createUser: (data: object) => api.post('/users/', data),
  updateUser: (id: string, data: object) => api.patch(`/users/${id}/`, data),
  assignRoles: (userId: string, roleIds: string[]) =>
    api.post(`/users/${userId}/roles/`, { role_ids: roleIds }),
  getRoles: () => api.get('/roles/'),
  getAuditLogs: (params?: object) => api.get('/audit-logs/', { params }),
  mfaSetup: () => api.post<{ secret: string; qr_code: string }>('/auth/mfa/setup/'),
  mfaVerifySetup: (code: string) => api.post('/auth/mfa/verify-setup/', { code }),
  mfaDisable: (password: string) => api.post('/auth/mfa/disable/', { password }),
}

// ── Academic ──────────────────────────────────────────────────────────────────
export const academicApi = {
  getAcademicYears: (params?: object) =>
    api.get<PaginatedResponse<AcademicYear>>('/academic-years/', { params }),
  createAcademicYear: (data: object) => api.post('/academic-years/', data),
  updateAcademicYear: (id: string, data: object) => api.patch(`/academic-years/${id}/`, data),
  getFaculties: (params?: object) =>
    api.get<PaginatedResponse<Faculty>>('/faculties/', { params }),
  createFaculty: (data: object) => api.post('/faculties/', data),
  getDepartments: (params?: object) =>
    api.get<PaginatedResponse<Department>>('/departments/', { params }),
  createDepartment: (data: object) => api.post('/departments/', data),
  getUniversities: (params?: object) => api.get('/universities/', { params }),
  getLMDRegulations: (params?: object) => api.get('/lmd-regulations/', { params }),
  createLMDRegulation: (data: object) => api.post('/lmd-regulations/', data),
}

// ── Programs ──────────────────────────────────────────────────────────────────
export const programsApi = {
  getPrograms: (params?: object) =>
    api.get<PaginatedResponse<Program>>('/programs/', { params }),
  getProgram: (id: string) => api.get<Program>(`/programs/${id}/`),
  createProgram: (data: Partial<Program>) => api.post<Program>('/programs/', data),
  updateProgram: (id: string, data: Partial<Program>) => api.patch<Program>(`/programs/${id}/`, data),
  deleteProgram: (id: string) => api.delete(`/programs/${id}/`),
  getMaquette: (id: string) => api.get(`/programs/${id}/maquette/`),
  getSemesters: (params?: object) => api.get('/semesters/', { params }),
  createSemester: (data: object) => api.post('/semesters/', data),
  getUEs: (params?: object) => api.get('/ues/', { params }),
  createUE: (data: object) => api.post('/ues/', data),
  getECs: (params?: object) => api.get('/ecs/', { params }),
  createEC: (data: object) => api.post('/ecs/', data),
  updateEC: (id: string, data: object) => api.patch(`/ecs/${id}/`, data),
  duplicateProgram: (id: string, data: object) => api.post(`/programs/${id}/duplicate/`, data),
  getGroups: (params?: object) => api.get('/groups/', { params }),
  createGroup: (data: object) => api.post('/groups/', data),
}

// ── People ────────────────────────────────────────────────────────────────────
export const studentsApi = {
  getStudents: (params?: object) =>
    api.get<PaginatedResponse<Student>>('/students/', { params }),
  getStudent: (id: string) => api.get<Student>(`/students/${id}/`),
  createStudent: (data: Partial<Student>) => api.post<Student>('/students/', data),
  updateStudent: (id: string, data: Partial<Student>) => api.patch<Student>(`/students/${id}/`, data),
  getAcademicHistory: (id: string) => api.get(`/students/${id}/academic_history/`),
  getGrades: (id: string) => api.get(`/students/${id}/grades/`),
}

export const teachersApi = {
  getTeachers: (params?: object) =>
    api.get<PaginatedResponse<Teacher>>('/teachers/', { params }),
  getTeacher: (id: string) => api.get<Teacher>(`/teachers/${id}/`),
  createTeacher: (data: Partial<Teacher>) => api.post<Teacher>('/teachers/', data),
  updateTeacher: (id: string, data: Partial<Teacher>) => api.patch<Teacher>(`/teachers/${id}/`, data),
}

export const teacherAvailabilityApi = {
  getAvailabilities: (params?: object) =>
    api.get<PaginatedResponse<TeacherAvailability>>('/teacher-availabilities/', { params }),
  createAvailability: (data: Partial<TeacherAvailability>) => api.post('/teacher-availabilities/', data),
  deleteAvailability: (id: string) => api.delete(`/teacher-availabilities/${id}/`),
}

export const adminStaffApi = {
  getStaff: (params?: object) => api.get('/admin-staff/', { params }),
  createStaff: (data: object) => api.post('/admin-staff/', data),
  updateStaff: (id: string, data: object) => api.patch(`/admin-staff/${id}/`, data),
}

// ── Admissions ────────────────────────────────────────────────────────────────
export const admissionsApi = {
  getApplications: (params?: object) =>
    api.get<PaginatedResponse<Application>>('/applications/', { params }),
  getApplication: (id: string) => api.get<Application>(`/applications/${id}/`),
  createApplication: (data: object) => api.post('/applications/', data),
  submitApplication: (id: string) => api.post(`/applications/${id}/submit/`),
  startReview: (id: string) => api.post(`/applications/${id}/start_review/`),
  decide: (id: string, data: object) => api.post(`/applications/${id}/decide/`, data),
  getDocuments: (params?: object) => api.get('/application-documents/', { params }),
  uploadDocument: (data: FormData) =>
    api.post('/application-documents/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  validateDocument: (id: string) => api.post(`/application-documents/${id}/validate/`),
  rejectDocument: (id: string, reason: string) =>
    api.post(`/application-documents/${id}/reject/`, { reason }),
  publishDecisions: (program: string, academicYear: string) =>
    api.post('/applications/publish_decisions/', { program, academic_year: academicYear }),
  checkResult: (applicationNumber: string) =>
    api.get('/admissions/check-result/', { params: { application_number: applicationNumber } }),
}

// ── Enrollment ────────────────────────────────────────────────────────────────
export const enrollmentApi = {
  getEnrollments: (params?: object) =>
    api.get<PaginatedResponse<AdminEnrollment>>('/admin-enrollments/', { params }),
  getEnrollment: (id: string) => api.get<AdminEnrollment>(`/admin-enrollments/${id}/`),
  createEnrollment: (data: object) => api.post<AdminEnrollment>('/admin-enrollments/', data),
  validateEnrollment: (id: string) => api.post(`/admin-enrollments/${id}/validate/`),
  validatePayment: (id: string) => api.post(`/admin-enrollments/${id}/validate_payment/`),
  getPedaEnrollments: (params?: object) => api.get('/peda-enrollments/', { params }),
  createPedaEnrollment: (data: object) => api.post('/peda-enrollments/', data),
  confirmPedaEnrollment: (id: string) => api.post(`/peda-enrollments/${id}/confirm/`),
  getUEEnrollments: (params?: object) => api.get('/ue-enrollments/', { params }),
  createUEEnrollment: (data: object) => api.post('/ue-enrollments/', data),
  deleteUEEnrollment: (id: string) => api.delete(`/ue-enrollments/${id}/`),
}

// ── Finance ───────────────────────────────────────────────────────────────────
export const financeApi = {
  getInvoices: (params?: object) =>
    api.get<PaginatedResponse<Invoice>>('/invoices/', { params }),
  getInvoice: (id: string) => api.get<Invoice>(`/invoices/${id}/`),
  createInvoice: (data: Partial<Invoice>) => api.post<Invoice>('/invoices/', data),
  addPayment: (invoiceId: string, data: Partial<Payment>) =>
    api.post<Payment>(`/invoices/${invoiceId}/add_payment/`, data),
  getSummary: () => api.get('/invoices/summary/'),
  getFeeTypes: (params?: object) => api.get('/fee-types/', { params }),
  createFeeType: (data: object) => api.post('/fee-types/', data),
  getPayments: (params?: object) => api.get('/payments/', { params }),
  getScholarships: (params?: object) => api.get('/scholarships/', { params }),
  createScholarship: (data: object) => api.post('/scholarships/', data),
  getCashJournal: (params?: object) => api.get('/finance/cash-journal/', { params }),
  // Échéanciers
  getInstallments: (params?: object) => api.get('/installments/', { params }),
  createInstallment: (data: object) => api.post('/installments/', data),
  markInstallmentPaid: (id: string) => api.post(`/installments/${id}/mark_paid/`),
  // Remises
  applyDiscount: (invoiceId: string, data: object) => api.post(`/invoices/${invoiceId}/apply_discount/`, data),
  // Paiement mobile money en ligne (E7)
  payOnline: (invoiceId: string, data: { phone: string; operator: string }) =>
    api.post<{ payment_url: string; transaction_id: string }>(`/invoices/${invoiceId}/pay_online/`, data),
}

// ── Documents & GED ───────────────────────────────────────────────────────────
export const documentsApi = {
  getStudentDocuments: (params?: object) =>
    api.get('/documents/student-documents/', { params }),
  uploadStudentDocument: (data: FormData) =>
    api.post('/documents/student-documents/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  validateDocument: (id: string) =>
    api.post(`/documents/student-documents/${id}/validate/`),
  rejectDocument: (id: string, reason: string) =>
    api.post(`/documents/student-documents/${id}/reject/`, { reason }),
  archiveDocument: (id: string) =>
    api.post(`/documents/student-documents/${id}/archive/`),
  getGeneratedDocuments: (params?: object) =>
    api.get('/documents/generated-documents/', { params }),
  generateDocument: (data: object) =>
    api.post('/documents/generated-documents/', data),
  getCategories: () => api.get('/documents/categories/'),
  verifyDocument: (code: string) =>
    api.get(`/documents/verify/${code}/`),
  // Génération PDF backend
  generateCertificatPDF: (studentId: string, params?: object) =>
    api.get(`/documents/generate/certificat/${studentId}/`, { params, responseType: 'blob' }),
  generateRelevePDF: (studentId: string, params?: object) =>
    api.get(`/documents/generate/releve/${studentId}/`, { params, responseType: 'blob' }),
  generateCarteEtudiantPDF: (studentId: string) =>
    api.get(`/documents/generate/carte-etudiant/${studentId}/`, { responseType: 'blob' }),
  generateFicheInscriptionPDF: (studentId: string) =>
    api.get(`/documents/generate/fiche-inscription/${studentId}/`, { responseType: 'blob' }),
  generateConvocationPDF: (data: object) =>
    api.post('/documents/generate/convocation/', data, { responseType: 'blob' }),
  generateDiplomePDF: (studentId: string, params?: object) =>
    api.get(`/documents/generate/diplome/${studentId}/`, { params, responseType: 'blob' }),
  computeResults: (semesterId: string, sessionId: string) =>
    api.post('/documents/compute-results/', { semester_id: semesterId, session_id: sessionId }),
  getTranscript: (studentId: string, params?: object) =>
    api.get(`/documents/transcript/${studentId}/`, { params }),
}

// ── Evaluation ────────────────────────────────────────────────────────────────
export const evaluationApi = {
  getExamSessions: (params?: object) => api.get('/exam-sessions/', { params }),
  createExamSession: (data: object) => api.post('/exam-sessions/', data),
  openExamSession: (id: string) => api.post(`/exam-sessions/${id}/open/`),
  closeExamSession: (id: string) => api.post(`/exam-sessions/${id}/close/`),
  getGrades: (params?: object) =>
    api.get<PaginatedResponse<Grade>>('/grades/', { params }),
  createGrade: (data: object) => api.post('/grades/', data),
  updateGrade: (id: string, data: Partial<Grade>) => api.patch<Grade>(`/grades/${id}/`, data),
  validateGrade: (id: string) => api.post(`/grades/${id}/validate/`),
  publishGrade: (id: string) => api.post(`/grades/${id}/publish/`),
  bulkImport: (data: object) => api.post('/grades/bulk_import/', data),
  exportGrades: (params?: object) =>
    api.get('/grades/export/', { params, responseType: 'blob' }),
  downloadTemplate: () =>
    api.get('/grades/template/', { responseType: 'blob' }),
  getSemesterResults: (params?: object) =>
    api.get<PaginatedResponse<SemesterResult>>('/semester-results/', { params }),
  publishAllResults: (examSessionId: string) =>
    api.post('/semester-results/publish_all/', { exam_session_id: examSessionId }),
  getJuries: (params?: object) => api.get('/juries/', { params }),
  createJury: (data: object) => api.post('/juries/', data),
  updateJury: (id: string, data: object) => api.patch(`/juries/${id}/`, data),
  downloadPV: (params?: object) => api.get('/semester-results/pv/', { params, responseType: 'blob' }),
  getRoomAssignments: (params?: object) => api.get('/exam-room-assignments/', { params }),
  createRoomAssignment: (data: object) => api.post('/exam-room-assignments/', data),
  deleteRoomAssignment: (id: string) => api.delete(`/exam-room-assignments/${id}/`),
  getGradeContests: (params?: object) => api.get('/grade-contests/', { params }),
  createGradeContest: (data: object) => api.post('/grade-contests/', data),
  acceptContest: (id: string, data: object) => api.post(`/grade-contests/${id}/accept/`, data),
  rejectContest: (id: string, data: object) => api.post(`/grade-contests/${id}/reject/`, data),
  
  // NOUVEAUX ENDPOINTS PAR ACTEUR
  // Étudiant
  getStudentGrades: (params?: object) => api.get('/evaluation/student/grades/', { params }),
  getStudentTranscript: (params?: object) => api.get('/evaluation/student/transcript/', { params }),
  submitGradeContest: (data: object) => api.post('/evaluation/student/contest/', data),

  // Enseignant
  getTeacherGrades: (params?: object) => api.get('/evaluation/teacher/grades/', { params }),
  getClassStatistics: (params?: object) => api.get('/evaluation/teacher/statistics/', { params }),
  enterGrade: (data: object) => api.post('/evaluation/teacher/enter-grade/', data),

  // Responsable Pédagogique
  validateGradesBulk: (gradeIds: number[]) => api.post('/evaluation/admin/validate-bulk/', { grade_ids: gradeIds }),
  calculateUEResults: (examSessionId: string) => api.post('/evaluation/admin/calculate-ue/', { exam_session_id: examSessionId }),
  calculateSemesterResults: (examSessionId: string) => api.post('/evaluation/admin/calculate-semester/', { exam_session_id: examSessionId }),

  // Admin Scolarité
  publishSemesterResults: (examSessionId: string) => api.post('/evaluation/admin/publish-results/', { exam_session_id: examSessionId }),
}

// ── LMS ───────────────────────────────────────────────────────────────────────
export const lmsApi = {
  getCourseSpaces: (params?: object) =>
    api.get<PaginatedResponse<CourseSpace>>('/course-spaces/', { params }),
  getCourseSpace: (id: string) => api.get<CourseSpace>(`/course-spaces/${id}/`),
  createCourseSpace: (data: object) => api.post('/course-spaces/', data),
  publishCourseSpace: (id: string) => api.post(`/course-spaces/${id}/publish/`),
  changeMode: (id: string, mode: string) => api.post(`/course-spaces/${id}/change_mode/`, { mode }),
  getMyProgress: (id: string) => api.get(`/course-spaces/${id}/my_progress/`),
  getStudentProgress: (params?: object) => api.get('/course-spaces/', { params }),
  getModules: (params?: object) => api.get('/course-modules/', { params }),
  createModule: (data: object) => api.post('/course-modules/', data),
  updateModule: (id: string, data: object) => api.patch(`/course-modules/${id}/`, data),
  getResources: (params?: object) => api.get('/course-resources/', { params }),
  uploadResource: (data: FormData) =>
    api.post('/course-resources/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAssignments: (params?: object) => api.get('/assignments/', { params }),
  createAssignment: (data: object) => api.post('/assignments/', data),
  submitAssignment: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/assignments/${id}/submit/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getSubmissions: (id: string) => api.get(`/assignments/${id}/submissions/`),
  getQuizzes: (params?: object) => api.get('/quizzes/', { params }),
  createQuiz: (data: object) => api.post('/quizzes/', data),
  startQuizAttempt: (id: string) => api.post(`/quizzes/${id}/start_attempt/`),
}

// ── Classes virtuelles ────────────────────────────────────────────────────────
export const virtualClassApi = {
  getSessions: (params?: object) => api.get('/virtual-sessions/', { params }),
  createSession: (data: object) => api.post('/virtual-sessions/', data),
  startSession: (id: string) => api.post(`/virtual-sessions/${id}/start/`),
  endSession: (id: string) => api.post(`/virtual-sessions/${id}/end/`),
  joinSession: (id: string, mode?: string) =>
    api.post(`/virtual-sessions/${id}/join/`, { join_mode: mode ?? 'online' }),
  cancelSession: (id: string) => api.post(`/virtual-sessions/${id}/cancel/`),
}

// ── Présences ─────────────────────────────────────────────────────────────────
export const attendanceApi = {
  getSheets: (params?: object) => api.get('/attendance-sheets/', { params }),
  createSheet: (data: object) => api.post('/attendance-sheets/', data),
  openSheet: (id: string) => api.post(`/attendance-sheets/${id}/open/`),
  closeSheet: (id: string) => api.post(`/attendance-sheets/${id}/close/`),
  markByCode: (id: string, code: string) =>
    api.post(`/attendance-sheets/${id}/mark_by_code/`, { code }),
  getRecords: (params?: object) => api.get('/attendance-records/', { params }),
  createRecord: (data: object) => api.post('/attendance-records/', data),
  getAbsenceSummaries: (params?: object) => api.get('/absence-summaries/', { params }),
}

// ── Planning ──────────────────────────────────────────────────────────────────
export const schedulingApi = {
  getSessions: (params?: object) =>
    api.get<PaginatedResponse<ScheduledSession>>('/sessions/', { params }),
  createSession: (data: object) => api.post('/sessions/', data),
  updateSession: (id: string, data: object) => api.patch(`/sessions/${id}/`, data),
  cancelSession: (id: string, reason: string) =>
    api.post(`/sessions/${id}/cancel/`, { reason }),
  getRooms: (params?: object) => api.get('/rooms/', { params }),
  createRoom: (data: object) => api.post('/rooms/', data),
  getAvailableRooms: (start: string, end: string) =>
    api.get('/rooms/available/', { params: { start, end } }),
  getTimetables: (params?: object) => api.get('/timetables/', { params }),
  publishTimetable: (id: string) => api.post(`/timetables/${id}/publish/`),
}

// ── Stages & Mémoires ─────────────────────────────────────────────────────────
export const internshipsApi = {
  getInternships: (params?: object) => api.get('/internships/', { params }),
  createInternship: (data: object) => api.post('/internships/', data),
  updateInternship: (id: string, data: object) => api.patch(`/internships/${id}/`, data),
  getTheses: (params?: object) => api.get('/theses/', { params }),
  createThesis: (data: object) => api.post('/theses/', data),
  validateSubject: (id: string) => api.post(`/theses/${id}/validate_subject/`),
  addProgress: (id: string, data: object) => api.post(`/theses/${id}/add_progress/`, data),
  submitFinal: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/theses/${id}/submit_final/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getDefenses: (params?: object) => api.get('/defenses/', { params }),
  createDefense: (data: object) => api.post('/defenses/', data),
  updateDefense: (id: string, data: object) => api.patch(`/defenses/${id}/`, data),
}

// ── Communication ─────────────────────────────────────────────────────────────
export const communicationApi = {
  getNotifications: (params?: object) =>
    api.get<PaginatedResponse<Notification>>('/notifications/', { params }),
  markRead: (id: string) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/notifications/mark_all_read/'),
  getUnreadCount: () => api.get('/notifications/unread_count/'),
  clearRead: () => api.delete('/notifications/clear_read/'),
  // NOUVEAU ENDPOINT
  sendNotification: (data: object) => api.post('/communication/notifications/send_notification/', data),
  
  getAnnouncements: (params?: object) => api.get('/announcements/', { params }),
  createAnnouncement: (data: object) => api.post('/announcements/', data),
  publishAnnouncement: (id: string) => api.post(`/announcements/${id}/publish/`),
  sendMessage: (data: object) => api.post('/messages/', data),
  getInbox: () => api.get('/messages/inbox/'),
  getSent: () => api.get('/messages/sent/'),
  getForums: (params?: object) => api.get('/forums/', { params }),
  createForum: (data: object) => api.post('/forums/', data),
  getForumPosts: (params?: object) => api.get('/forum-posts/', { params }),
  createForumPost: (data: object) => api.post('/forum-posts/', data),
  // Notifications push web (VAPID)
  getVapidPublicKey: () => api.get<{ public_key: string }>('/push/vapid-public-key/'),
  subscribePush: (data: object) => api.post('/push-subscriptions/', data),
  unsubscribePush: (endpoint: string) => api.post('/push-subscriptions/unsubscribe/', { endpoint }),
}

// ── Analytics & Reporting ─────────────────────────────────────────────────────
export const analyticsApi = {
  getDashboard: (params?: object) =>
    api.get<DashboardData>('/analytics/dashboard/', { params }),
  getEngagementScores: (params?: object) =>
    api.get('/analytics/engagement-scores/', { params }),
  getAtRisk: () => api.get('/analytics/engagement-scores/at_risk/'),
  getActivities: (params?: object) => api.get('/analytics/activities/', { params }),
  getDashboardStats: (params?: object) => api.get('/analytics/dashboard-stats/', { params }),
  // NOUVEAUX ENDPOINTS
  getPredictSuccess: (studentId: string) =>
    api.get(`/analytics/predict-success/?student_id=${studentId}`),
  getStudentsAtRisk: () => api.get('/analytics/students-at-risk/'),
  getPredictions: () => api.get('/analytics/predictions/'),
  getCohortAnalysis: (academicYearId?: string) =>
    api.get('/analytics/cohort-analysis/', { params: academicYearId ? { academic_year: academicYearId } : {} }),
  getPerformanceTrends: (days = 30) =>
    api.get(`/analytics/performance-trends/?days=${days}`),
  getTopPerformers: (limit = 10) =>
    api.get(`/analytics/top-performers/?limit=${limit}`),
  // Reporting avancé
  getReport: (params?: object) => api.get('/analytics/report/', { params }),
  getLmsStats: (params?: object) => api.get('/analytics/lms-stats/', { params }),
  getAttendanceStats: (params?: object) => api.get('/analytics/attendance-stats/', { params }),
  exportStudents: (params?: object) =>
    api.get('/analytics/export/students/', { params, responseType: 'blob' }),
  exportGrades: (params?: object) =>
    api.get('/analytics/export/grades/', { params, responseType: 'blob' }),
  exportGradesCSV: (params?: object) =>
    api.get('/grades/export/', { params, responseType: 'blob' }),
  downloadGradesTemplate: () =>
    api.get('/grades/template/', { responseType: 'blob' }),
  exportPayments: (params?: object) =>
    api.get('/analytics/export/payments/', { params, responseType: 'blob' }),
  // Badges & Wallet (S2/S3)
  getBadges: (params?: object) => api.get('/analytics/badges/', { params }),
  createBadge: (data: object) => api.post('/analytics/badges/', data),
  getStudentBadges: (params?: object) => api.get('/analytics/student-badges/', { params }),
  awardBadge: (data: object) => api.post('/analytics/student-badges/', data),
  getMyWallet: () => api.get('/analytics/wallets/me/'),
  getWallets: (params?: object) => api.get('/analytics/wallets/', { params }),
  creditWallet: (data: { student: string; type: string; amount: number; description: string }) =>
    api.post('/analytics/wallets/credit/', data),
  // Micro-certifications (8.30.2)
  getMicroCertifications: (params?: object) => api.get('/analytics/micro-certifications/', { params }),
  createMicroCertification: (data: object) => api.post('/analytics/micro-certifications/', data),
  getMyCertifications: (params?: object) => api.get('/analytics/student-certifications/', { params }),
  enrollCertification: (certificationId: string) =>
    api.post('/analytics/student-certifications/enroll/', { certification: certificationId }),
  certifyStudent: (studentCertificationId: string, data: { status: string; score?: number }) =>
    api.post(`/analytics/student-certifications/${studentCertificationId}/certify/`, data),
}

// ── Marketplace de cours (Phase 4) ──────────────────────────────────────────────
export const marketplaceApi = {
  getCourses: (params?: object) => api.get('/marketplace/courses/', { params }),
  getCourse: (id: string) => api.get(`/marketplace/courses/${id}/`),
  createCourse: (data: object) => api.post('/marketplace/courses/', data),
  updateCourse: (id: string, data: object) => api.patch(`/marketplace/courses/${id}/`, data),
  deleteCourse: (id: string) => api.delete(`/marketplace/courses/${id}/`),
  getMyCourses: () => api.get('/marketplace/courses/my_courses/'),
  publishCourse: (id: string) => api.post(`/marketplace/courses/${id}/publish/`),
  archiveCourse: (id: string) => api.post(`/marketplace/courses/${id}/archive/`),
  getLessons: (params?: object) => api.get('/marketplace/lessons/', { params }),
  createLesson: (data: object) => api.post('/marketplace/lessons/', data),
  updateLesson: (id: string, data: object) => api.patch(`/marketplace/lessons/${id}/`, data),
  deleteLesson: (id: string) => api.delete(`/marketplace/lessons/${id}/`),
  completeLesson: (id: string) => api.post(`/marketplace/lessons/${id}/complete/`),
  purchaseCourse: (courseId: string) => api.post('/marketplace/purchases/purchase/', { course: courseId }),
  getMyPurchases: () => api.get('/marketplace/purchases/my_purchases/'),
  getReviews: (params?: object) => api.get('/marketplace/reviews/', { params }),
  createReview: (data: { course: string; rating: number; comment: string }) =>
    api.post('/marketplace/reviews/', data),
}

// ── Bibliothèque ──────────────────────────────────────────────────────────────
export const libraryApi = {
  getDocuments: (params?: object) => api.get('/library/', { params }),
  getDocument: (id: string) => api.get(`/library/${id}/`),
  uploadDocument: (data: FormData) =>
    api.post('/library/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateDocument: (id: string, data: object) => api.patch(`/library/${id}/`, data),
  deleteDocument: (id: string) => api.delete(`/library/${id}/`),
  downloadDocument: (id: string) => api.post(`/library/${id}/download/`),
  getStats: () => api.get('/library/stats/'),
  getFeatured: () => api.get('/library/featured/'),
  getRecommendations: () => api.get('/library/recommendations/'),
  getPopular: () => api.get('/library/popular/'),
  getRecent: () => api.get('/library/recent/'),
  // Circulation — emprunts
  borrowDocument: (id: string) => api.post(`/library/${id}/borrow/`),
  reserveDocument: (id: string) => api.post(`/library/${id}/reserve/`),
  rateDocument: (id: string, data: { rating: number; comment?: string }) =>
    api.post(`/library/${id}/rate/`, data),
  getMyBorrowings: () => api.get('/library/my_borrowings/'),
  getMyReservations: () => api.get('/library/my_reservations/'),
  // Circulation — gestion (bibliothécaire)
  getBorrowings: (params?: object) => api.get('/library-borrowings/', { params }),
  returnBorrowing: (id: string) => api.post(`/library-borrowings/${id}/return_book/`),
  markPenaltyPaid: (id: string) => api.post(`/library-borrowings/${id}/mark_penalty_paid/`),
  getOverdueBorrowings: () => api.get('/library-borrowings/overdue/'),
  getReservations: (params?: object) => api.get('/library-reservations/', { params }),
  cancelReservation: (id: string) => api.post(`/library-reservations/${id}/cancel/`),
  notifyReservationAvailable: (id: string) => api.post(`/library-reservations/${id}/notify_available/`),
  // Listes de lecture
  getReadingLists: (params?: object) => api.get('/reading-lists/', { params }),
  createReadingList: (data: { name: string; description?: string; is_public?: boolean }) =>
    api.post('/reading-lists/', data),
  deleteReadingList: (id: string) => api.delete(`/reading-lists/${id}/`),
  addToReadingList: (listId: string, documentId: string) =>
    api.post(`/reading-lists/${listId}/add_document/`, { document_id: documentId }),
  removeFromReadingList: (listId: string, documentId: string) =>
    api.post(`/reading-lists/${listId}/remove_document/`, { document_id: documentId }),
}
