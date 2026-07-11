import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, BookOpen, Users, BarChart3, Video,
  Shield, Globe, ArrowRight, CheckCircle,
  Building2, Award, Calendar, CreditCard, Zap,
  ChevronRight, Star, Lock, FileText, Briefcase,
  Library, MapPin, Cpu,
} from 'lucide-react'

const FEATURES = [
  { icon: GraduationCap, title: 'Système LMD Complet',    desc: 'Licence, Master, Doctorat — maquettes, UE, EC, crédits, compensations et délibérations.', bg: 'bg-violet-50', iconColor: 'text-violet-600' },
  { icon: BookOpen,      title: 'Campus Virtuel LMS',      desc: 'Espaces de cours, modules, ressources, devoirs, quiz auto-corrigés et suivi de progression.', bg: 'bg-cyan-50', iconColor: 'text-cyan-600' },
  { icon: Video,         title: 'Classes Virtuelles',      desc: 'BBB, Jitsi, Zoom intégrés. Mode hybride natif, enregistrements et présences automatiques.', bg: 'bg-red-50', iconColor: 'text-red-600' },
  { icon: CreditCard,    title: 'Finance & Paiements',     desc: 'Facturation, mobile money, échéanciers, bourses, exonérations et journal de caisse.', bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { icon: BarChart3,     title: 'Analytics & Pilotage',    desc: 'Tableaux de bord KPI, détection précoce du décrochage et scores d\'engagement IA.', bg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { icon: Shield,        title: 'Sécurité & Audit',        desc: 'JWT + RBAC 13 rôles, journalisation complète de toutes les actions sensibles.', bg: 'bg-slate-50', iconColor: 'text-slate-600' },
  { icon: FileText,      title: 'GED & Documents',         desc: 'Génération PDF, QR code de vérification, certificats, relevés et diplômes officiels.', bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  { icon: Briefcase,     title: 'Stages & Mémoires',       desc: 'Suivi des stages, dépôt de mémoires, encadrements, soutenances et archivage.', bg: 'bg-orange-50', iconColor: 'text-orange-600' },
]

const MODULES_GRID = [
  { icon: Building2,    label: 'Structure académique', color: 'text-orange-500' },
  { icon: Users,        label: 'Admissions',           color: 'text-pink-500' },
  { icon: GraduationCap,label: 'Inscriptions',         color: 'text-violet-500' },
  { icon: BookOpen,     label: 'LMS / Cours',          color: 'text-cyan-500' },
  { icon: Award,        label: 'Notes & Résultats',    color: 'text-yellow-500' },
  { icon: Calendar,     label: 'Emploi du temps',      color: 'text-fuchsia-500' },
  { icon: Video,        label: 'Classes virtuelles',   color: 'text-red-500' },
  { icon: BarChart3,    label: 'Analytics',            color: 'text-blue-500' },
  { icon: CreditCard,   label: 'Finance',              color: 'text-green-500' },
  { icon: FileText,     label: 'GED & Documents',      color: 'text-indigo-500' },
  { icon: Library,      label: 'Bibliothèque',         color: 'text-amber-500' },
  { icon: Globe,        label: 'API REST',             color: 'text-teal-500' },
]

const TECH_STACK = [
  { tech: 'Backend',       value: 'Django 5.2 + DRF + JWT',      icon: '🐍' },
  { tech: 'Frontend',      value: 'React 19 + Vite + TypeScript', icon: '⚛️' },
  { tech: 'Base de données',value: 'PostgreSQL + Redis',           icon: '🗄️' },
  { tech: 'Auth',          value: 'JWT + Refresh + RBAC',         icon: '🔐' },
  { tech: 'API Docs',      value: 'OpenAPI 3.0 + Swagger UI',     icon: '📡' },
  { tech: 'Déploiement',   value: 'Render (backend) + Vercel',    icon: '☁️' },
  { tech: 'PWA',           value: 'Progressive Web App',           icon: '📱' },
  { tech: 'Analytics',     value: 'Prédiction IA décrochage',     icon: '🧠' },
]

const ROLES = [
  { name: 'Super Admin',        desc: 'Accès total au système',       color: 'bg-red-100 text-red-700 border-red-200' },
  { name: 'Scolarité',          desc: 'Inscriptions & documents',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { name: 'Finance',            desc: 'Paiements & facturation',      color: 'bg-green-100 text-green-700 border-green-200' },
  { name: 'Resp. Pédagogique',  desc: 'Programmes & résultats',      color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { name: 'Enseignant',         desc: 'Cours & évaluations',          color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { name: 'Étudiant',           desc: 'Espace personnel complet',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { name: 'Bibliothécaire',     desc: 'Fonds documentaire',           color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { name: 'Tuteur',             desc: 'Encadrements & mémoires',     color: 'bg-teal-100 text-teal-700 border-teal-200' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-gray-900 dark:text-gray-50 text-lg tracking-tight">TIRAHOU</span>
              <span className="hidden sm:inline text-gray-400 dark:text-gray-500 text-xs ml-2">Plateforme Universitaire</span>
            </div>
          </div>
          {/* Links */}
          <div className="hidden md:flex items-center gap-7">
            {['Fonctionnalités', 'Modules', 'Architecture'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 font-medium transition-colors">
                {l}
              </a>
            ))}
          </div>
          {/* CTA */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 transition-colors px-3 py-2 hidden sm:block">
              Connexion
            </button>
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95">
              Accéder <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-28 pb-20 relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        {/* Orbs */}
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-5 py-2 mb-8">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase">v1.0 · Opérationnelle</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
              La plateforme<br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                universitaire
              </span>{' '}complète.
            </h1>

            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              <strong className="text-white">TIRAHOU</strong> — de la candidature à la diplomation,
              gérez l'ensemble de votre établissement depuis une seule plateforme intégrée.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button onClick={() => navigate('/login')}
                className="flex items-center gap-2.5 bg-white text-gray-900 dark:text-gray-50 font-bold px-8 py-4 rounded-2xl hover:bg-gray-100 transition-all shadow-2xl shadow-white/10 active:scale-95 text-sm w-full sm:w-auto justify-center">
                <Zap className="w-4 h-4 text-blue-600" />
                Accéder à TIRAHOU
                <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#fonctionnalités"
                className="flex items-center gap-2 border border-white/20 text-white/80 hover:text-white hover:border-white/40 font-semibold px-8 py-4 rounded-2xl transition-all text-sm w-full sm:w-auto justify-center">
                Découvrir les modules
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { value: '19', label: 'Modules Django', icon: Cpu },
                { value: '525', label: 'Endpoints API', icon: Globe },
                { value: '13', label: 'Rôles RBAC', icon: Users },
                { value: '60+', label: 'Écrans UI', icon: CheckCircle },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label} className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-5 hover:bg-white/[0.09] transition-colors">
                  <Icon className="w-5 h-5 text-blue-400 mb-2 mx-auto" />
                  <p className="text-3xl font-black text-white">{value}</p>
                  <p className="text-slate-500 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* ── Modules rapides ── */}
      <section id="modules" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-8">
            19 modules intégrés — couverture 100% du cycle de vie étudiant
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {MODULES_GRID.map(({ icon: Icon, label, color }) => (
              <div key={label}
                className="flex flex-col items-center gap-2.5 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-white hover:shadow-md transition-all cursor-default group">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="fonctionnalités" className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Fonctionnalités</span>
            <h2 className="text-4xl font-black text-gray-900 dark:text-gray-50 mt-3 mb-4 tracking-tight">
              Tout ce dont votre université a besoin
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              TIRAHOU réunit en une seule plateforme tout ce dont votre université a besoin —
              de l'inscription à la diplomation, du présentiel au distanciel.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, bg, iconColor }) => (
              <div key={title}
                className="bg-white p-6 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-blue-100 hover:shadow-xl transition-all group cursor-default">
                <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-50 mb-2 text-sm">{title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
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
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Gestion des accès</span>
              <h2 className="text-4xl font-black text-gray-900 dark:text-gray-50 mt-3 mb-4 tracking-tight">
                Un espace dédié<br />pour chaque acteur
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                13 rôles distincts avec permissions granulaires. Chaque utilisateur dispose de son propre
                dashboard, navigation et fonctionnalités adaptées à son rôle.
              </p>
              <div className="space-y-3">
                {[
                  'Dashboard personnalisé par rôle',
                  'Navigation filtrée selon les permissions',
                  'Pages et vues dédiées par acteur',
                  'Journal d\'audit de toutes les actions',
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/login')}
                className="mt-8 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-lg shadow-blue-500/25">
                Tester les rôles <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(({ name, desc, color }) => (
                <div key={name} className={`p-4 rounded-2xl border ${color} hover:shadow-md transition-all`}>
                  <p className="text-sm font-black mb-1">{name}</p>
                  <p className="text-xs opacity-75">{desc}</p>
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
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Stack technique</span>
            <h2 className="text-4xl font-black text-white mt-3 mb-4 tracking-tight">
              Architecture moderne & robuste
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Stack de niveau production, conçue pour la scalabilité et la maintenabilité à long terme.
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

          {/* Mock dashboard preview */}
          <div className="max-w-2xl mx-auto bg-white/[0.04] border border-white/[0.1] rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900 px-5 py-3.5 flex items-center gap-3 border-b border-white/[0.08]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex items-center gap-2 ml-2">
                <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-3 h-3 text-white" />
                </div>
                <span className="text-slate-400 text-xs font-mono">TIRAHOU — Dashboard Admin</span>
              </div>
            </div>
            <div className="p-6 space-y-3.5">
              {[
                { label: 'Étudiants inscrits',      value: '1 247',    pct: 85, color: 'bg-blue-500' },
                { label: 'Taux de collecte frais',  value: '78%',      pct: 78, color: 'bg-emerald-500' },
                { label: 'Espaces de cours actifs', value: '42',       pct: 65, color: 'bg-violet-500' },
                { label: 'Moyenne générale',        value: '12.4/20',  pct: 62, color: 'bg-amber-500' },
                { label: 'Taux d\'assiduité',       value: '87%',      pct: 87, color: 'bg-cyan-500' },
              ].map(({ label, value, pct, color }) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="text-slate-400 text-xs w-48 flex-shrink-0 truncate">{label}</span>
                  <div className="flex-1 bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-white text-xs font-bold w-16 text-right tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-violet-50 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-xs font-bold mb-6 border border-blue-200">
            <Star className="w-3.5 h-3.5" /> Projet de soutenance — Master Informatique · 2024-2025
          </div>
          <h2 className="text-5xl font-black text-gray-900 dark:text-gray-50 mb-5 tracking-tight">
            Explorez la plateforme<br />
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              TIRAHOU dès maintenant
            </span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-10 text-lg max-w-xl mx-auto">
            Connectez-vous avec l'un des comptes de démonstration et découvrez
            l'expérience complète selon votre rôle.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-2xl shadow-blue-500/25 active:scale-95 text-base w-full sm:w-auto justify-center">
              <Zap className="w-5 h-5" />
              Accéder à TIRAHOU
              <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => window.open('http://localhost:8000/api/docs/', '_blank')}
              className="flex items-center gap-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold px-8 py-4 rounded-2xl transition-all text-base w-full sm:w-auto justify-center">
              <Globe className="w-4 h-4" /> API Swagger
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 py-12 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white font-black text-lg">TIRAHOU</span>
                <span className="text-slate-600 text-xs ml-2">v1.0.0</span>
              </div>
            </div>
            <p className="text-slate-600 text-sm text-center">
              © {new Date().getFullYear()} TIRAHOU — Plateforme Intégrée de Gestion Universitaire
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> JWT sécurisé</span>
              <span>·</span>
              <span>Django 5.2 + React 19</span>
              <span>·</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Côte d'Ivoire</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
