import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, BookOpen, Users, BarChart3, Video,
  Shield, Globe, Smartphone, ArrowRight, CheckCircle,
  Building2, Award, Calendar, CreditCard, Zap,
  ChevronRight, Star, TrendingUp, Lock, FileText, Briefcase,
} from 'lucide-react'

const NAV_LINKS = ['Fonctionnalités', 'Architecture', 'Modules', 'Contact']

const STATS = [
  { value: '60+', label: 'Pages & écrans', icon: Globe },
  { value: '36', label: 'Endpoints API', icon: Zap },
  { value: '13', label: 'Rôles utilisateurs', icon: Users },
  { value: '100%', label: 'CDC couvert', icon: CheckCircle },
]

const FEATURES = [
  {
    icon: GraduationCap,
    title: 'Système LMD Complet',
    desc: 'Licence, Master, Doctorat — maquettes pédagogiques, UE, EC, crédits, compensations et délibérations.',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: BookOpen,
    title: 'Campus Virtuel LMS',
    desc: 'Espaces de cours, modules, ressources, devoirs, quiz auto-corrigés et suivi de progression.',
    color: 'from-cyan-500 to-blue-600',
    bg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Video,
    title: 'Classes Virtuelles',
    desc: 'BBB, Jitsi, Zoom intégrés. Mode hybride natif, enregistrements, replays et présences automatiques.',
    color: 'from-red-500 to-rose-600',
    bg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
  {
    icon: CreditCard,
    title: 'Finance & Paiements',
    desc: 'Facturation, mobile money, échéanciers, bourses, exonérations, journal de caisse et rapprochement.',
    color: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Pilotage',
    desc: 'Tableaux de bord KPI, détection précoce de décrochage, scores d\'engagement et recommandations.',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: Shield,
    title: 'Sécurité & Audit',
    desc: 'JWT + RBAC, 13 rôles granulaires, journalisation complète, MFA et protection OWASP.',
    color: 'from-slate-500 to-gray-600',
    bg: 'bg-slate-50',
    iconColor: 'text-slate-600',
  },
  {
    icon: FileText,
    title: 'GED & Documents',
    desc: 'Génération PDF sécurisée, QR code de vérification, certificats, relevés et diplômes officiels.',
    color: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    icon: Briefcase,
    title: 'Stages & Mémoires',
    desc: 'Suivi des stages, dépôt de mémoires, encadrements, soutenances et archivage bibliothèque.',
    color: 'from-orange-500 to-amber-600',
    bg: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
]

const MODULES_GRID = [
  { icon: Building2, label: 'Structure académique', color: 'text-orange-500' },
  { icon: Users, label: 'Admissions', color: 'text-pink-500' },
  { icon: GraduationCap, label: 'Inscriptions', color: 'text-violet-500' },
  { icon: BookOpen, label: 'LMS / Cours', color: 'text-cyan-500' },
  { icon: Award, label: 'Notes & Résultats', color: 'text-yellow-500' },
  { icon: Calendar, label: 'Emploi du temps', color: 'text-fuchsia-500' },
  { icon: Video, label: 'Classes virtuelles', color: 'text-red-500' },
  { icon: BarChart3, label: 'Analytics', color: 'text-blue-500' },
  { icon: CreditCard, label: 'Finance', color: 'text-green-500' },
  { icon: FileText, label: 'GED & Documents', color: 'text-indigo-500' },
  { icon: Briefcase, label: 'Stages & Mémoires', color: 'text-amber-500' },
  { icon: Globe, label: 'API & Intégrations', color: 'text-teal-500' },
]

const TECH_STACK = [
  { tech: 'Backend', value: 'Django 4.2 + DRF + JWT', icon: '🐍' },
  { tech: 'Frontend', value: 'React 18 + Vite + TypeScript', icon: '⚛️' },
  { tech: 'Styling', value: 'Tailwind CSS + Lucide Icons', icon: '🎨' },
  { tech: 'State', value: 'Zustand + TanStack Query', icon: '⚡' },
  { tech: 'Auth', value: 'JWT + Refresh Token + RBAC', icon: '🔐' },
  { tech: 'API', value: 'REST + Swagger / OpenAPI 3.0', icon: '📡' },
  { tech: 'Base de données', value: 'SQLite (dev) / PostgreSQL', icon: '🗄️' },
  { tech: 'Déploiement', value: 'Cloud / On-premise / Hybride', icon: '☁️' },
]

const ROLES = [
  { name: 'Super Admin', desc: 'Accès total au système', color: 'bg-red-100 text-red-700' },
  { name: 'Scolarité', desc: 'Inscriptions & documents', color: 'bg-blue-100 text-blue-700' },
  { name: 'Finance', desc: 'Paiements & facturation', color: 'bg-green-100 text-green-700' },
  { name: 'Resp. Péda.', desc: 'Programmes & résultats', color: 'bg-violet-100 text-violet-700' },
  { name: 'Enseignant', desc: 'Cours & évaluations', color: 'bg-cyan-100 text-cyan-700' },
  { name: 'Étudiant', desc: 'Espace personnel', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Bibliothécaire', desc: 'Fonds documentaire', color: 'bg-amber-100 text-amber-700' },
  { name: 'Tuteur', desc: 'Encadrements', color: 'bg-teal-100 text-teal-700' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-gray-900 text-lg tracking-tight">SIGUVH</span>
              <span className="hidden sm:inline text-gray-400 text-xs ml-2">Université Virtuelle Hybride</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`}
                className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-4 py-2">
              Connexion
            </button>
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-gray-900/20 active:scale-95">
              Accéder <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-24 relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        {/* Orbs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 rounded-full px-5 py-2 mb-8">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">Plateforme opérationnelle — v1.0</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
              Gérez votre université<br />
              <span className="bg-gradient-to-r from-primary-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                en un seul endroit.
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              L'université de demain, aujourd'hui.
              Administrez, enseignez et pilotez votre établissement depuis une seule plateforme.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button onClick={() => navigate('/login')}
                className="flex items-center gap-2.5 bg-white text-gray-900 font-bold px-8 py-4 rounded-2xl hover:bg-gray-100 transition-all shadow-2xl shadow-white/10 active:scale-95 text-sm">
                <Zap className="w-4 h-4 text-primary-600" />
                Accéder à la plateforme
                <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#fonctionnalités"
                className="flex items-center gap-2 border border-white/20 text-white/80 hover:text-white hover:border-white/40 font-semibold px-8 py-4 rounded-2xl transition-all text-sm">
                Découvrir les fonctionnalités
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {STATS.map(({ value, label, icon: Icon }) => (
                <div key={label} className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-5 hover:bg-white/[0.09] transition-colors">
                  <Icon className="w-5 h-5 text-primary-400 mb-2 mx-auto" />
                  <p className="text-3xl font-black text-white">{value}</p>
                  <p className="text-slate-500 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── Modules rapides ── */}
      <section id="modules" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">
            18 modules intégrés
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {MODULES_GRID.map(({ icon: Icon, label, color }) => (
              <div key={label}
                className="flex flex-col items-center gap-2.5 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-white hover:shadow-md transition-all cursor-pointer group">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <span className="text-xs font-semibold text-gray-600 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="fonctionnalités" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">Fonctionnalités</span>
            <h2 className="text-4xl font-black text-gray-900 mt-3 mb-4 tracking-tight">
              Tout ce dont votre université a besoin
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base">
              SIGUVH réunit en une seule plateforme tout ce dont votre université a besoin —
              de l'inscription à la diplomation, du présentiel au distanciel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, bg, iconColor }) => (
              <div key={title}
                className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all group cursor-default">
                <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rôles ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">Gestion des accès</span>
              <h2 className="text-4xl font-black text-gray-900 mt-3 mb-4 tracking-tight">
                Un espace dédié<br />pour chaque acteur
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                13 rôles distincts avec des permissions granulaires. Chaque utilisateur
                voit uniquement ce dont il a besoin, avec son propre dashboard personnalisé.
              </p>
              <div className="space-y-3">
                {[
                  'Dashboard personnalisé par rôle',
                  'Navigation filtrée selon les permissions',
                  'Pages dédiées par acteur',
                  'Journalisation de toutes les actions',
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/login')}
                className="mt-8 flex items-center gap-2 bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-800 transition-all text-sm shadow-lg shadow-gray-900/20">
                Tester les rôles <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(({ name, desc, color }) => (
                <div key={name} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-white hover:shadow-md transition-all">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2 ${color}`}>
                    {name}
                  </span>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture ── */}
      <section id="architecture" className="py-24 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-primary-400 uppercase tracking-widest">Stack technique</span>
            <h2 className="text-4xl font-black text-white mt-3 mb-4 tracking-tight">
              Architecture niveau Master
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Stack moderne et robuste, conçue pour la scalabilité et la maintenabilité à long terme.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {TECH_STACK.map(({ tech, value, icon }) => (
              <div key={tech} className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-5 hover:bg-white/[0.08] transition-colors">
                <span className="text-2xl mb-3 block">{icon}</span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{tech}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Mock dashboard */}
          <div className="max-w-2xl mx-auto bg-white/[0.04] border border-white/[0.1] rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900 px-5 py-3.5 flex items-center gap-3 border-b border-white/[0.08]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-slate-400 text-xs font-mono ml-2">SIGUVH — Tableau de bord</span>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Étudiants inscrits', value: '100', pct: 80, color: 'bg-primary-500' },
                { label: 'Taux de collecte', value: '50%', pct: 50, color: 'bg-emerald-500' },
                { label: 'Espaces de cours actifs', value: '8', pct: 65, color: 'bg-violet-500' },
                { label: 'Moyenne générale', value: '11.8/20', pct: 59, color: 'bg-amber-500' },
              ].map(({ label, value, pct, color }) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="text-slate-400 text-xs w-44 flex-shrink-0">{label}</span>
                  <div className="flex-1 bg-white/[0.06] rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-white text-xs font-bold w-16 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-violet-50" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 rounded-full px-4 py-1.5 text-xs font-bold mb-6">
            <Star className="w-3.5 h-3.5" /> Projet de soutenance — Master Informatique
          </div>
          <h2 className="text-5xl font-black text-gray-900 mb-5 tracking-tight">
            Prêt à explorer<br />
            <span className="bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent">
              la plateforme ?
            </span>
          </h2>
          <p className="text-gray-500 mb-10 text-lg max-w-xl mx-auto">
            Connectez-vous avec l'un des comptes de démonstration et découvrez
            l'expérience complète selon votre rôle.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-2xl shadow-gray-900/20 active:scale-95 text-base">
              <Zap className="w-5 h-5 text-primary-400" />
              Accéder à la plateforme
              <ArrowRight className="w-5 h-5" />
            </button>
            <a href="/api/docs/" target="_blank" rel="noreferrer"
              className="flex items-center gap-2 border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 font-bold px-8 py-4 rounded-2xl transition-all text-base">
              <Globe className="w-4 h-4" /> API Swagger
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 py-12 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-violet-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-white font-black">SIGUVH</span>
                <span className="text-slate-600 text-xs ml-2">v1.0.0</span>
              </div>
            </div>
            <p className="text-slate-600 text-sm text-center">
              © {new Date().getFullYear()} Système Intégré de Gestion d'Université Virtuelle Hybride
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Sécurisé</span>
              <span>·</span>
              <span>Django + React</span>
              <span>·</span>
              <span>TypeScript</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
