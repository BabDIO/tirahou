import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useRole } from '../../hooks/useRole'
import { authApi } from '../../api'
import { cn } from '../../lib/utils'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList,
  CreditCard, FileText, BarChart3, Calendar, Video, Bell,
  ChevronDown, LogOut, Settings, Menu, BookMarked,
  UserCheck, Building2, Award, MessageSquare, ChevronRight,
  Search, HelpCircle, Zap, Library, Briefcase, Home, Shield, Gift, UserPlus,
  Wallet as WalletIcon, Store as StoreIcon, CheckSquare,
} from 'lucide-react'
import { Avatar, ThemeToggle } from '../ui'
import GlobalSearch from '../search/GlobalSearch'
import { useQuery } from '@tanstack/react-query'
import { communicationApi } from '../../api'
import { Link } from 'react-router-dom'

// ── Navigation par rôle ───────────────────────────────────────────────────────
const ADMIN_NAV = [
  {
    group: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', color: 'text-blue-400' },
      { to: '/notifications', icon: Bell, label: 'Notifications', color: 'text-amber-400' },
    ],
  },
  {
    group: 'Académique',
    items: [
      { to: '/students', icon: GraduationCap, label: 'Étudiants', color: 'text-violet-400' },
      { to: '/teachers', icon: UserCheck, label: 'Enseignants', color: 'text-emerald-400' },
      { to: '/programs', icon: BookMarked, label: 'Programmes', color: 'text-sky-400' },
      { to: '/academic', icon: Building2, label: 'Structure', color: 'text-orange-400' },
    ],
  },
  {
    group: 'Scolarité',
    items: [
      { to: '/admissions', icon: ClipboardList, label: 'Admissions', color: 'text-pink-400' },
      { to: '/enrollment', icon: Users, label: 'Inscriptions', color: 'text-teal-400' },
      { to: '/finance', icon: CreditCard, label: 'Finance', color: 'text-green-400' },
      { to: '/documents', icon: FileText, label: 'Documents', color: 'text-indigo-400' },
    ],
  },
  {
    group: 'Pédagogie',
    items: [
      { to: '/lms', icon: BookOpen, label: 'Campus Virtuel', color: 'text-cyan-400' },
      { to: '/virtual-classes', icon: Video, label: 'Classes Virtuelles', color: 'text-red-400' },
      { to: '/evaluation', icon: Award, label: 'Évaluations', color: 'text-yellow-400' },
      { to: '/attendance', icon: UserCheck, label: 'Présences', color: 'text-lime-400' },
      { to: '/scheduling', icon: Calendar, label: 'Emploi du temps', color: 'text-fuchsia-400' },
      { to: '/internships', icon: Briefcase, label: 'Stages & Mémoires', color: 'text-orange-400' },
      { to: '/library', icon: Library, label: 'Bibliothèque', color: 'text-amber-400' },
      { to: '/marketplace', icon: StoreIcon, label: 'Marketplace', color: 'text-orange-400' },
    ],
  },
  {
    group: 'Pilotage',
    items: [
      { to: '/analytics', icon: BarChart3, label: 'Analytics', color: 'text-blue-400' },
      { to: '/admin/gamification', icon: Award, label: 'Badges & Récompenses', color: 'text-fuchsia-400' },
      { to: '/communication', icon: MessageSquare, label: 'Communication', color: 'text-rose-400' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { to: '/admin/users', icon: Users, label: 'Utilisateurs', color: 'text-red-400' },
      { to: '/scolarite/parents', icon: UserPlus, label: 'Parents & Tuteurs', color: 'text-cyan-400' },
      { to: '/admin/audit', icon: Shield, label: 'Journal d\'audit', color: 'text-slate-400' },
      { to: '/admin/settings', icon: Settings, label: 'Paramètres', color: 'text-gray-400 dark:text-gray-500' },
    ],
  },
]

const SCOLARITE_NAV = [
  {
    group: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', color: 'text-blue-400' },
      { to: '/notifications', icon: Bell, label: 'Notifications', color: 'text-amber-400' },
    ],
  },
  {
    group: 'Gestion',
    items: [
      { to: '/students', icon: GraduationCap, label: 'Étudiants', color: 'text-violet-400' },
      { to: '/admissions', icon: ClipboardList, label: 'Admissions', color: 'text-pink-400' },
      { to: '/enrollment', icon: Users, label: 'Inscriptions', color: 'text-teal-400' },
      { to: '/scolarite/parents', icon: UserPlus, label: 'Parents & Tuteurs', color: 'text-cyan-400' },
      { to: '/documents', icon: FileText, label: 'Documents', color: 'text-indigo-400' },
      { to: '/scolarite/documents', icon: Shield, label: 'Vérification pièces', color: 'text-amber-400' },
      { to: '/scolarite/generated-docs', icon: FileText, label: 'Générer documents', color: 'text-emerald-400' },
    ],
  },
  {
    group: 'Pédagogie',
    items: [
      { to: '/evaluation', icon: Award, label: 'Notes & Résultats', color: 'text-yellow-400' },
      { to: '/scolarite/results', icon: CheckSquare, label: 'Résultats semestriels', color: 'text-emerald-400' },
      { to: '/scheduling', icon: Calendar, label: 'Emploi du temps', color: 'text-fuchsia-400' },
      { to: '/attendance', icon: UserCheck, label: 'Présences', color: 'text-lime-400' },
    ],
  },
  {
    group: 'Communication',
    items: [
      { to: '/communication', icon: MessageSquare, label: 'Communication', color: 'text-rose-400' },
    ],
  },
]

const FINANCIER_NAV = [
  {
    group: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', color: 'text-blue-400' },
      { to: '/notifications', icon: Bell, label: 'Notifications', color: 'text-amber-400' },
    ],
  },
  {
    group: 'Finance',
    items: [
      { to: '/finance', icon: CreditCard, label: 'Factures & Paiements', color: 'text-green-400' },
      { to: '/finance/payments', icon: CheckSquare, label: 'Validation paiements', color: 'text-emerald-400' },
      { to: '/finance/journal', icon: FileText, label: 'Journal de caisse', color: 'text-emerald-400' },
      { to: '/finance/scholarships', icon: Gift, label: 'Bourses & Exonérations', color: 'text-violet-400' },
      { to: '/students', icon: GraduationCap, label: 'Étudiants', color: 'text-violet-400' },
    ],
  },
  {
    group: 'Communication',
    items: [
      { to: '/communication', icon: MessageSquare, label: 'Communication', color: 'text-rose-400' },
    ],
  },
]

const ENSEIGNANT_NAV = [
  {
    group: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', color: 'text-blue-400' },
      { to: '/notifications', icon: Bell, label: 'Notifications', color: 'text-amber-400' },
    ],
  },
  {
    group: 'Enseignement',
    items: [
      { to: '/my-courses', icon: BookOpen, label: 'Mes Cours', color: 'text-cyan-400' },
      { to: '/my-assignments', icon: FileText, label: 'Mes Devoirs', color: 'text-indigo-400' },
      { to: '/my-students', icon: Users, label: 'Mes Étudiants', color: 'text-violet-400' },
      { to: '/virtual-classes', icon: Video, label: 'Classes Virtuelles', color: 'text-red-400' },
      { to: '/my-grades-teacher', icon: Award, label: 'Notes & Évaluations', color: 'text-yellow-400' },
      { to: '/my-attendance', icon: UserCheck, label: 'Présences', color: 'text-lime-400' },
      { to: '/scheduling', icon: Calendar, label: 'Mon Planning', color: 'text-fuchsia-400' },
      { to: '/my-internships-teacher', icon: Briefcase, label: 'Encadrements', color: 'text-orange-400' },
    ],
  },
  {
    group: 'Ressources',
    items: [
      { to: '/library', icon: Library, label: 'Bibliothèque', color: 'text-amber-400' },
      { to: '/marketplace', icon: StoreIcon, label: 'Marketplace', color: 'text-orange-400' },
      { to: '/marketplace/my-courses', icon: BookMarked, label: 'Mes cours marketplace', color: 'text-orange-400' },
      { to: '/communication', icon: MessageSquare, label: 'Communication', color: 'text-rose-400' },
    ],
  },
]

const ETUDIANT_NAV = [
  {
    group: 'Mon Espace',
    items: [
      { to: '/dashboard', icon: Home, label: 'Accueil', color: 'text-blue-400' },
      { to: '/notifications', icon: Bell, label: 'Notifications', color: 'text-amber-400' },
    ],
  },
  {
    group: 'Scolarité',
    items: [
      { to: '/my-enrollment', icon: GraduationCap, label: 'Mon Inscription', color: 'text-violet-400' },
      { to: '/my-grades', icon: Award, label: 'Mes Notes', color: 'text-yellow-400' },
      { to: '/my-documents', icon: FileText, label: 'Mes Documents', color: 'text-indigo-400' },
      { to: '/my-finance', icon: CreditCard, label: 'Mes Paiements', color: 'text-green-400' },
      { to: '/my-attendance-student', icon: UserCheck, label: 'Mon Assiduité', color: 'text-lime-400' },
      { to: '/my-wallet', icon: WalletIcon, label: 'Mon Portefeuille', color: 'text-fuchsia-400' },
      { to: '/my-certifications', icon: GraduationCap, label: 'Micro-certifications', color: 'text-indigo-400' },
    ],
  },
  {
    group: 'Cours',
    items: [
      { to: '/student/courses', icon: BookOpen, label: 'Mes Cours', color: 'text-cyan-400' },
      { to: '/my-virtual-classes', icon: Video, label: 'Classes Virtuelles', color: 'text-red-400' },
      { to: '/my-schedule', icon: Calendar, label: 'Mon Emploi du temps', color: 'text-fuchsia-400' },
      { to: '/my-internship', icon: Briefcase, label: 'Mon Stage / Mémoire', color: 'text-orange-400' },
      { to: '/library', icon: Library, label: 'Bibliothèque', color: 'text-amber-400' },
      { to: '/marketplace', icon: StoreIcon, label: 'Marketplace', color: 'text-orange-400' },
    ],
  },
  {
    group: 'Communication',
    items: [
      { to: '/communication', icon: MessageSquare, label: 'Messages', color: 'text-rose-400' },
    ],
  },
]

const RESPONSABLE_NAV = [
  {
    group: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', color: 'text-blue-400' },
      { to: '/notifications', icon: Bell, label: 'Notifications', color: 'text-amber-400' },
    ],
  },
  {
    group: 'Académique',
    items: [
      { to: '/responsable/programs', icon: BookMarked, label: 'Pilotage programmes', color: 'text-sky-400' },
      { to: '/responsable/groups', icon: Users, label: 'Groupes TD/TP', color: 'text-teal-400' },
      { to: '/programs', icon: BookMarked, label: 'Programmes', color: 'text-violet-400' },
      { to: '/teachers', icon: UserCheck, label: 'Enseignants', color: 'text-emerald-400' },
      { to: '/students', icon: GraduationCap, label: 'Étudiants', color: 'text-violet-400' },
    ],
  },
  {
    group: 'Pédagogie',
    items: [
      { to: '/lms', icon: BookOpen, label: 'Campus Virtuel', color: 'text-cyan-400' },
      { to: '/evaluation', icon: Award, label: 'Évaluations', color: 'text-yellow-400' },
      { to: '/responsable/grades-validation', icon: CheckSquare, label: 'Validation des notes', color: 'text-emerald-400' },
      { to: '/scheduling', icon: Calendar, label: 'Emploi du temps', color: 'text-fuchsia-400' },
      { to: '/internships', icon: Briefcase, label: 'Stages & Mémoires', color: 'text-orange-400' },
    ],
  },
  {
    group: 'Pilotage',
    items: [
      { to: '/analytics', icon: BarChart3, label: 'Analytics', color: 'text-blue-400' },
      { to: '/admin/gamification', icon: Award, label: 'Badges & Récompenses', color: 'text-fuchsia-400' },
      { to: '/communication', icon: MessageSquare, label: 'Communication', color: 'text-rose-400' },
    ],
  },
]

const BIBLIOTHECAIRE_NAV = [
  {
    group: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', color: 'text-blue-400' },
      { to: '/notifications', icon: Bell, label: 'Notifications', color: 'text-amber-400' },
    ],
  },
  {
    group: 'Bibliothèque',
    items: [
      { to: '/bibliothecaire', icon: Library, label: 'Gestion fonds documentaire', color: 'text-amber-400' },
      { to: '/library', icon: BookOpen, label: 'Catalogue public', color: 'text-cyan-400' },
      { to: '/marketplace', icon: StoreIcon, label: 'Marketplace', color: 'text-orange-400' },
      { to: '/documents', icon: FileText, label: 'Documents étudiants', color: 'text-indigo-400' },
    ],
  },
  {
    group: 'Communication',
    items: [
      { to: '/communication', icon: MessageSquare, label: 'Communication', color: 'text-rose-400' },
    ],
  },
]

// ── Breadcrumb map ────────────────────────────────────────────────────────────
const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Tableau de bord', '/students': 'Étudiants', '/teachers': 'Enseignants',
  '/programs': 'Programmes', '/academic': 'Structure Académique', '/admissions': 'Admissions',
  '/enrollment': 'Inscriptions', '/finance': 'Finance', '/documents': 'Documents',
  '/evaluation': 'Évaluations & Notes', '/lms': 'Campus Virtuel', '/virtual-classes': 'Classes Virtuelles',
  '/attendance': 'Présences', '/scheduling': 'Emploi du Temps', '/analytics': 'Analytics',
  '/communication': 'Communication', '/notifications': 'Notifications',
  '/internships': 'Stages & Mémoires', '/library': 'Bibliothèque Numérique',
  '/my-enrollment': 'Mon Inscription', '/my-grades': 'Mes Notes',
  '/my-documents': 'Mes Documents', '/my-finance': 'Mes Paiements',
  '/my-courses': 'Mes Cours', '/my-grades-teacher': 'Notes & Évaluations',
  '/my-attendance': 'Gestion Présences', '/my-attendance-student': 'Mon Assiduité',
  '/my-schedule': 'Mon Emploi du Temps', '/my-virtual-classes': 'Mes Classes Virtuelles',
  '/my-internship': 'Mon Stage & Mémoire', '/my-assignments': 'Mes Devoirs',
  '/my-students': 'Mes Étudiants', '/my-internships-teacher': 'Mes Encadrements',
  '/admin/users': 'Gestion Utilisateurs', '/admin/audit': 'Journal d\'Audit',
  '/admin/settings': 'Paramètres Système',
  '/scolarite/documents': 'Vérification Documents',
  '/scolarite/generated-docs': 'Documents Académiques',
  '/scolarite/results': 'Résultats Semestriels',
  '/scolarite/parents': 'Parents & Tuteurs',
  '/my-wallet': 'Mon Portefeuille',
  '/my-certifications': 'Micro-certifications',
  '/admin/gamification': 'Badges & Récompenses',
  '/marketplace': 'Marketplace de cours',
  '/marketplace/my-courses': 'Mes cours marketplace',
  '/finance/journal': 'Journal de Caisse',
  '/finance/scholarships': 'Bourses & Exonérations',
  '/finance/payments': 'Validation des Paiements',
  '/responsable/programs': 'Pilotage Pédagogique',
  '/responsable/groups': 'Groupes TD/TP',
  '/responsable/grades-validation': 'Validation des Notes',
  '/bibliothecaire': 'Gestion Bibliothèque',
  '/student/courses': 'Mes Cours',
  '/profile': 'Mon Profil',
  '/verify': 'Vérification Document',
}

// ── Badge couleur par rôle ────────────────────────────────────────────────────
const roleBadge: Record<string, { label: string; color: string }> = {
  super_admin:             { label: 'Super Admin',       color: 'bg-red-500/20 text-red-300' },
  admin_institutionnel:    { label: 'Admin',             color: 'bg-orange-500/20 text-orange-300' },
  admin_scolarite:         { label: 'Scolarité',         color: 'bg-blue-500/20 text-blue-300' },
  admin_financier:         { label: 'Finance',           color: 'bg-green-500/20 text-green-300' },
  responsable_pedagogique: { label: 'Resp. Péda.',       color: 'bg-violet-500/20 text-violet-300' },
  chef_departement:        { label: 'Chef Dept.',        color: 'bg-purple-500/20 text-purple-300' },
  enseignant:              { label: 'Enseignant',        color: 'bg-cyan-500/20 text-cyan-300' },
  tuteur:                  { label: 'Tuteur',            color: 'bg-teal-500/20 text-teal-300' },
  etudiant:                { label: 'Étudiant',          color: 'bg-emerald-500/20 text-emerald-300' },
  doctorant:               { label: 'Doctorant',         color: 'bg-lime-500/20 text-lime-300' },
  bibliothecaire:          { label: 'Bibliothécaire',    color: 'bg-amber-500/20 text-amber-300' },
  invite:                  { label: 'Invité',            color: 'bg-gray-500/20 text-gray-300' },
  support_technique:       { label: 'Support',           color: 'bg-slate-500/20 text-slate-300' },
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, logout, refreshToken } = useAuthStore()
  const { isAdmin, isScolarite, isFinancier, isEnseignant, isEtudiant, isResponsable, isBibliothecaire, roles } = useRole()
  const navigate = useNavigate()
  const location = useLocation()

  // Choisir la nav selon le rôle
  const navItems = (() => {
    if (isAdmin) return ADMIN_NAV
    if (isScolarite) return SCOLARITE_NAV
    if (isFinancier) return FINANCIER_NAV
    if (isEnseignant) return ENSEIGNANT_NAV
    if (isEtudiant) return ETUDIANT_NAV
    if (isResponsable) return RESPONSABLE_NAV
    if (isBibliothecaire) return BIBLIOTHECAIRE_NAV
    return ADMIN_NAV // fallback
  })()

  const primaryRole = roles[0] ?? ''
  const badge = roleBadge[primaryRole] ?? { label: primaryRole, color: 'bg-gray-500/20 text-gray-300' }

  const handleLogout = async () => {
    try { if (refreshToken) await authApi.logout(refreshToken) } finally {
      logout(); navigate('/login')
    }
  }

  const currentLabel = breadcrumbMap[location.pathname] ?? 'Page'

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={cn(
        'flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out',
        'bg-[#0c1220] border-r border-white/5',
        sidebarOpen ? 'w-[240px]' : 'w-[60px]'
      )}>

        {/* Logo */}
        <div className={cn(
          'flex items-center h-16 border-b border-white/5 flex-shrink-0',
          sidebarOpen ? 'px-4 gap-3' : 'justify-center'
        )}>
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight tracking-tight">TIRAHOU</p>
              <p className="text-slate-500 text-[10px] leading-tight">Plateforme Universitaire</p>
            </div>
          )}
        </div>

        {/* Role badge */}
        {sidebarOpen && (
          <div className="px-3 pt-3">
            <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full', badge.color)}>
              {badge.label}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-none py-3 px-2 space-y-5">
          {navItems.map((group) => (
            <div key={group.group}>
              {sidebarOpen && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  {group.group}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, color }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      title={!sidebarOpen ? label : undefined}
                      className={({ isActive }) => cn(
                        'relative flex items-center gap-3 rounded-xl text-sm transition-all duration-150',
                        sidebarOpen ? 'px-3 py-2' : 'justify-center p-2.5',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && sidebarOpen && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-400 rounded-r-full" />
                          )}
                          <Icon className={cn('w-4 h-4 flex-shrink-0 transition-colors', isActive ? color : '')} />
                          {sidebarOpen && <span className="truncate font-medium text-[13px]">{label}</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 border-t border-white/5 p-2">
          {sidebarOpen ? (
            <div>
              <button
                aria-label="Menu utilisateur"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
              >
                <Avatar name={user?.full_name ?? 'U'} size="sm" color="bg-primary-600 text-white" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white text-xs font-semibold truncate">{user?.full_name}</p>
                  <p className="text-slate-500 text-[10px] truncate">{badge.label}</p>
                </div>
                <ChevronDown className={cn('w-3.5 h-3.5 text-slate-500 transition-transform', userMenuOpen && 'rotate-180')} />
              </button>
              {userMenuOpen && (
                <div className="mt-1 bg-white/5 rounded-xl overflow-hidden border border-white/10">
                  <button className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={() => navigate('/profile')}>
                    <Settings className="w-3.5 h-3.5" /> Paramètres
                  </button>
                  <button className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                    <HelpCircle className="w-3.5 h-3.5" /> Aide
                  </button>
                  <div className="border-t border-white/10" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Déconnexion"
              className="w-full flex justify-center p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-5 flex-shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-slate-400 flex-shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-sm min-w-0">
              <span className="text-gray-400 dark:text-slate-500 text-xs">TIRAHOU</span>
              <ChevronRight className="w-3 h-3 text-gray-300 dark:text-slate-600 flex-shrink-0" />
              <span className="font-semibold text-gray-800 dark:text-slate-200 truncate">{currentLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 w-56 hover:border-primary-400 hover:bg-white dark:hover:bg-slate-900 transition-all text-left"
            >
              <Search className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
              <span className="text-xs text-gray-400 dark:text-slate-500 flex-1">Recherche rapide...</span>
              <kbd className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">Ctrl K</kbd>
            </button>
            <ThemeToggle />
            <NotificationBell />
            {user && (
              <div className="flex items-center gap-2.5 pl-2 border-l border-gray-100 dark:border-slate-800">
                <Avatar name={user.full_name} size="sm" color="bg-primary-600 text-white" />
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 leading-tight">{user.full_name}</p>
                  <p className="text-[10px] leading-tight">
                    <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold', badge.color)}>
                      {badge.label}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 page-enter">
            <Outlet />
          </div>
        </main>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}

function NotificationBell() {
  const { data } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => communicationApi.getNotifications({ is_read: false }).then(r => r.data),
    refetchInterval: 30000, // Rafraîchir toutes les 30s
  })
  const unread = data?.count ?? 0

  return (
    <Link to="/notifications">
      <button className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-slate-400">
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white dark:ring-slate-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </Link>
  )
}
