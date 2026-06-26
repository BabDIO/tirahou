// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  full_name: string
  phone: string
  avatar: string | null
  roles: Role[]
  is_active: boolean
  is_verified: boolean
  is_locked: boolean
  created_at: string
}

export interface Role {
  id: string
  name: string
  description: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuditLog {
  id: string
  user: string
  action: string
  module: string
  object_type: string
  object_id: string
  description: string
  ip_address: string | null
  timestamp: string
}

// ── Academic ──────────────────────────────────────────────────────────────────
export interface University {
  id: string
  name: string
  acronym: string
  logo: string | null
  address: string
  website: string
  email: string
  phone: string
}

export interface Faculty {
  id: string
  university: string
  university_name: string
  name: string
  acronym: string
  email: string
}

export interface Department {
  id: string
  faculty: string
  faculty_name: string
  name: string
  acronym: string
}

export interface AcademicYear {
  id: string
  label: string
  start_date: string
  end_date: string
  is_current: boolean
  candidature_start: string | null
  candidature_end: string | null
  admin_enrollment_start: string | null
  admin_enrollment_end: string | null
  peda_enrollment_start: string | null
  peda_enrollment_end: string | null
  courses_start: string | null
  courses_end: string | null
  exams_start: string | null
  exams_end: string | null
}

export interface LMDRegulation {
  id: string
  name: string
  cycle: string
  university: string
  credits_per_semester: number
  credits_per_year: number
  total_credits: number
  passing_grade: number
  compensation_allowed: boolean
  compensation_min_grade: number
  max_years_allowed: number
}

// ── Programs ──────────────────────────────────────────────────────────────────
export interface Program {
  id: string
  code: string
  name: string
  type: string
  type_display: string
  mode: string
  mode_display: string
  department: string
  department_name: string
  duration_semesters: number
  capacity: number
  fees: number
  status: string
  candidature_open: boolean
  languages: string
  prerequisites: string
  description: string
}

export interface Semester {
  id: string
  program: string
  number: number
  label: string
  total_credits: number
  ues?: UE[]
}

export interface UE {
  id: string
  code: string
  name: string
  credits: number
  coefficient: number
  volume_hours: number
  type: string
  eval_mode: string
  compensation_allowed: boolean
  passing_grade: number
  ecs?: EC[]
}

export interface EC {
  id: string
  code: string
  name: string
  activity_type: string
  activity_type_display: string
  volume_hours: number
  credits: number
  coefficient: number
}

export interface Group {
  id: string
  program: string
  academic_year: string
  name: string
  type: string
  capacity: number
}

// ── People ────────────────────────────────────────────────────────────────────
export interface Student {
  id: string
  user: User
  student_id: string
  national_id: string
  gender: string
  birth_date: string
  birth_place: string
  nationality: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  current_program: string | null
  program_name: string | null
  current_level: number
  status: string
  status_display: string
  photo: string | null
  baccalaureate_year: number | null
  baccalaureate_series: string
}

export interface Teacher {
  id: string
  user: User
  teacher_id: string
  grade: string
  grade_display: string
  status: string
  department: string | null
  department_name: string | null
  specialities: string
  bio: string
  office: string
  weekly_hours_quota: number
}

export interface AdminStaff {
  id: string
  user: User
  staff_id: string
  service: string
  position: string
  department: string | null
}

// ── Admissions ────────────────────────────────────────────────────────────────
export interface Application {
  id: string
  application_number: string
  applicant: string
  applicant_name: string
  program: string
  program_name: string
  academic_year: string
  status: string
  status_display: string
  submitted_at: string | null
  score: number | null
  rank: number | null
  last_diploma: string
  motivation_letter: string
  review_notes: string
}

export interface ApplicationDocument {
  id: string
  application: string
  doc_type: string
  file: string
  status: string
  rejection_reason: string
}

// ── Enrollment ────────────────────────────────────────────────────────────────
export interface AdminEnrollment {
  id: string
  enrollment_number: string
  student: string
  student_name: string
  program: string
  program_name: string
  academic_year: string
  type: string
  status: string
  status_display: string
  payment_validated: boolean
  notes: string
}

export interface PedaEnrollment {
  id: string
  admin_enrollment: string
  student_name: string
  semester: string
  semester_label: string
  group: string | null
  group_name: string | null
  status: string
  status_display: string
  confirmed_at: string | null
  ue_count?: number
}

// ── Finance ───────────────────────────────────────────────────────────────────
export interface FeeType {
  id: string
  name: string
  category: string
  category_display: string
  amount: number
  academic_year: string
  is_mandatory: boolean
}

export interface Invoice {
  id: string
  invoice_number: string
  student: string
  student_name: string
  academic_year: string
  status: string
  status_display: string
  total_amount: number
  paid_amount: number
  discount_amount: number
  remaining_amount: number
  due_date: string | null
  payments?: Payment[]
  installments?: Installment[]
}

export interface Payment {
  id: string
  invoice: string
  amount: number
  method: string
  method_display: string
  status: string
  receipt_number: string
  transaction_ref: string
  paid_at: string | null
}

export interface Scholarship {
  id: string
  student: string
  academic_year: string
  type: string
  amount: number
  percentage: number
  reason: string
}

export interface Installment {
  id: string
  invoice: string
  number: number
  amount: number
  due_date: string
  status: string
  paid_at: string | null
}

// ── Documents ─────────────────────────────────────────────────────────────────
export interface StudentDocument {
  id: string
  student: string
  category: string
  title: string
  file: string
  file_size: number
  mime_type: string
  version: number
  status: string
  uploaded_by: string
  verified_at: string | null
  rejection_reason: string
  created_at: string
}

export interface GeneratedDocument {
  id: string
  student: string
  doc_type: string
  doc_type_display: string
  title: string
  file: string | null
  verification_code: string
  status: string
  generated_by: string
  delivered_at: string | null
  valid_until: string | null
  created_at: string
}

// ── Evaluation ────────────────────────────────────────────────────────────────
export interface ExamSession {
  id: string
  semester: string
  academic_year: string
  session_type: string
  session_type_display: string
  start_date: string | null
  end_date: string | null
  is_open: boolean
}

export interface Grade {
  id: string
  student: string
  student_name: string
  ec: string
  ec_code: string
  exam_session: string
  cc_grade: number | null
  exam_grade: number | null
  final_grade: number | null
  is_absent: boolean
  status: string
}

export interface SemesterResult {
  id: string
  student: string
  semester: string
  semester_label: string
  exam_session: string
  average: number | null
  credits_obtained: number
  decision: string
  decision_display: string
  published: boolean
  rank: number | null
}

export interface GradeContest {
  id: string
  grade: string
  student: string
  reason: string
  status: string
  status_display: string
  response: string
  new_grade: number | null
}

// ── LMS ───────────────────────────────────────────────────────────────────────
export interface CourseSpace {
  id: string
  ue: string
  ue_code: string
  ue_name: string
  academic_year: string
  title: string
  description: string
  mode: string
  mode_display: string
  is_published: boolean
  banner: string | null
  created_at: string
}

export interface CourseModule {
  id: string
  course_space: string
  title: string
  description: string
  order: number
  is_published: boolean
  available_from: string | null
  resources?: CourseResource[]
}

export interface CourseResource {
  id: string
  module: string
  title: string
  type: string
  type_display: string
  file: string | null
  external_url: string
  description: string
  order: number
  is_downloadable: boolean
  is_published: boolean
  file_size: number
  duration_minutes: number | null
}

export interface Assignment {
  id: string
  course_space: string
  title: string
  type: string
  type_display: string
  instructions: string
  max_grade: number
  open_date: string
  due_date: string
  status: string
}

export interface Quiz {
  id: string
  course_space: string
  title: string
  duration_minutes: number
  max_grade: number
  open_date: string | null
  close_date: string | null
  is_published: boolean
  max_attempts: number
}

// ── Classes virtuelles ────────────────────────────────────────────────────────
export interface VirtualClassSession {
  id: string
  course_space: string
  course_space_title: string
  title: string
  description: string
  mode: string
  provider: string
  scheduled_start: string
  scheduled_end: string
  actual_start: string | null
  actual_end: string | null
  join_url: string
  recording_url: string
  is_recorded: boolean
  replay_available: boolean
  status: string
  status_display: string
  participants_count?: number
  room_capacity: number
  physical_room: string
}

// ── Présences ─────────────────────────────────────────────────────────────────
export interface AttendanceSheet {
  id: string
  session: string
  session_code: string
  is_open: boolean
  opened_at: string | null
  closed_at: string | null
  present_count?: number
  total_count?: number
}

export interface AttendanceRecord {
  id: string
  sheet: string
  student: string
  status: string
  method: string
  marked_at: string | null
  justification: string
  is_justified: boolean
}

export interface AbsenceSummary {
  id: string
  student: string
  student_name: string
  course_space: string
  course_space_title: string
  total_sessions: number
  present_count: number
  absent_count: number
  attendance_rate: number
  alert_sent: boolean
}

// ── Planning ──────────────────────────────────────────────────────────────────
export interface Room {
  id: string
  name: string
  code: string
  type: string
  capacity: number
  building: string
  has_projector: boolean
  has_computer: boolean
  has_internet: boolean
  is_virtual: boolean
}

export interface ScheduledSession {
  id: string
  ec_code: string
  ec_name: string
  teacher_name: string
  room_name: string
  mode: string
  mode_display: string
  start_datetime: string
  end_datetime: string
  status: string
  status_display: string
  cancellation_reason: string
}

// ── Stages & Mémoires ─────────────────────────────────────────────────────────
export interface Internship {
  id: string
  student: string
  student_name: string
  company_name: string
  subject: string
  start_date: string
  end_date: string
  status: string
  status_display: string
  supervisor_name?: string
}

export interface Thesis {
  id: string
  student: string
  student_name: string
  type: string
  type_display: string
  title: string
  abstract: string
  keywords: string
  supervisor: string | null
  director_name?: string
  status: string
  status_display: string
  final_file: string | null
  final_submission_date?: string | null
  is_published: boolean
}

export interface Defense {
  id: string
  thesis: string
  memoire_title?: string
  student_name?: string
  scheduled_date: string
  room: string
  virtual_link: string
  status: string
  status_display: string
  jury_count?: number
  grade: number | null
  mention: string
}

// ── Communication ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string
  type: string
  type_display: string
  channel: string
  channel_display: string
  title: string
  message: string
  is_read: boolean
  read_at: string | null
  created_at: string
  action_url: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  author: string
  author_name: string
  audience: string
  audience_display: string
  course_space: string | null
  course_space_title: string | null
  is_published: boolean
  published_at: string | null
  is_pinned: boolean
  attachment: string | null
  created_at: string
}

export interface Message {
  id: string
  sender: string
  sender_name: string
  sender_avatar: string | null
  recipient: string
  recipient_name: string
  recipient_avatar: string | null
  subject: string
  body: string
  is_read: boolean
  read_at: string | null
  parent: string | null
  attachment: string | null
  created_at: string
}

export interface Forum {
  id: string
  course_space: string
  course_space_title: string
  title: string
  description: string
  is_open: boolean
  posts_count: number
  recent_posts?: ForumPost[]
  created_at: string
}

export interface ForumPost {
  id: string
  forum: string
  author: string
  author_name: string
  author_avatar: string | null
  title: string
  content: string
  parent: string | null
  is_pinned: boolean
  attachment: string | null
  replies_count: number
  replies?: ForumPost[]
  created_at: string
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export interface DashboardData {
  students: { total: number; by_status: { status: string; count: number }[] }
  enrollments: { total: number }
  finance: { total_invoiced: number; total_paid: number }
  courses: { total_spaces: number }
  results: { average: number }
  enrollment_trend?: { month: string; inscrits: number }[]
}

export interface EngagementScore {
  id: string
  student: string
  student_name: string
  course_space: string
  academic_year: string
  connection_count: number
  total_time_minutes: number
  resources_viewed: number
  assignments_submitted: number
  quizzes_attempted: number
  completion_rate: number
  engagement_score: number
  dropout_risk: string
}

// ── Bibliothèque ──────────────────────────────────────────────────────────────
export interface LibraryDocument {
  id: string
  title: string
  author: string
  type: string
  type_display: string
  domain: string
  year: number
  isbn: string
  abstract: string
  keywords: string
  file: string | null
  file_url: string | null
  external_url: string
  access_level: string
  download_count: number
  view_count: number
  is_featured: boolean
  created_at: string
}

// ── API ───────────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiError {
  detail?: string
  [key: string]: unknown
}
