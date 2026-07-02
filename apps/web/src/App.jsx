import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  BriefcaseBusiness,
  CalendarClock,
  ClipboardList,
  Home,
  ListChecks,
  LayoutDashboard,
  MapPinned,
  UsersRound,
} from 'lucide-react'
import ProtectedRoute from './components/ProtectedRoute'
import ApplicantDetailPage from './pages/ApplicantDetailPage'
import ApplicantsPipelinePage from './pages/ApplicantsPipelinePage'
import ApplicationPage from './pages/ApplicationPage'
import ApplicationSuccessPage from './pages/ApplicationSuccessPage'
import ApplicationStatusPage from './pages/ApplicationStatusPage'
import DashboardJobsPage from './pages/DashboardJobsPage'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import JobDetailsPage from './pages/JobDetailsPage'
import JobsPage from './pages/JobsPage'
import LoginPage from './pages/LoginPage'
import OpenShiftsPage from './pages/OpenShiftsPage'
import SitesPage from './pages/SitesPage'

const navigationLinks = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Applicant Portal', to: '/jobs', icon: ClipboardList },
  { label: 'HR Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Applicants', to: '/dashboard/applicants', icon: UsersRound },
  { label: 'Jobs', to: '/dashboard/jobs', icon: ListChecks },
  { label: 'Sites', to: '/dashboard/sites', icon: MapPinned },
  { label: 'Open Shifts', to: '/dashboard/shifts', icon: CalendarClock },
]

function AppShell({ children }) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isDashboard = location.pathname.startsWith('/dashboard')
  const isDarkShell = isHome || isDashboard || location.pathname === '/login'

  const sidebarLinkClass = ({ isActive }) =>
    `flex min-w-fit items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${
      isActive
        ? 'bg-[#0084FF] text-white'
        : 'text-zinc-300 hover:bg-white/10 hover:text-white'
    }`

  const topLinkClass = ({ isActive }) =>
    `min-w-fit rounded-md px-3 py-2 text-sm font-semibold transition ${
      isActive
        ? 'bg-[#0084FF] text-white'
        : isDarkShell
          ? 'text-zinc-300 hover:bg-white/10 hover:text-white'
          : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
    }`

  const mainClass = isDarkShell
    ? 'bg-[#050505] text-white'
    : 'bg-[#F8FAFC] text-[#111827]'

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-b border-black/10 bg-[#09090B] px-4 py-4 text-white sm:px-5 lg:min-h-screen lg:border-b-0 lg:border-r lg:py-5">
        <NavLink to="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0084FF] text-white">
            <BriefcaseBusiness size={21} />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold">ViankaX</span>
            <span className="block truncate text-xs uppercase tracking-wide text-zinc-400">
              Hiring automation
            </span>
          </span>
        </NavLink>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-6 lg:grid lg:overflow-visible lg:pb-0">
          {navigationLinks.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={sidebarLinkClass}
                end={link.end}
              >
                <Icon size={18} className="shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-6 hidden rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300 lg:block">
          <p className="font-semibold text-white">Platform flow</p>
          <p className="mt-2 leading-6">
            Applicant Portal to Automation Engine to HR Dashboard.
          </p>
        </div>
      </aside>

      <div className={`min-h-screen min-w-0 ${mainClass}`}>
        <header
          className={`sticky top-0 z-20 border-b backdrop-blur ${
            isDarkShell
              ? 'border-white/[0.08] bg-[#050505]/90'
              : 'border-[#E5E7EB] bg-white/95'
          }`}
        >
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between lg:px-8">
            <NavLink to="/" className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isDarkShell ? 'bg-[#09090B] text-[#0084FF]' : 'bg-[#0084FF] text-white'
                }`}
              >
                <BriefcaseBusiness size={21} />
              </span>
              <span className="min-w-0">
                <span
                  className={`block truncate text-base font-semibold sm:text-lg ${
                    isDarkShell ? 'text-white' : 'text-[#111827]'
                  }`}
                >
                  ViankaX Hiring Automation Platform
                </span>
                <span
                  className={`hidden text-xs font-medium uppercase tracking-wide sm:block ${
                    isDarkShell ? 'text-[#71717A]' : 'text-[#6B7280]'
                  }`}
                >
                  Applicant Portal + Automation Engine + HR Dashboard
                </span>
              </span>
            </NavLink>

            <nav
              className={`flex max-w-full gap-1 overflow-x-auto rounded-lg border p-1 ${
                isDarkShell
                  ? 'border-white/[0.10] bg-[#09090B]'
                  : 'border-[#E5E7EB] bg-white'
              }`}
            >
              {navigationLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={topLinkClass}
                  end={link.end}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="min-w-0 px-4 py-6 sm:px-5 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
        <Route path="/apply/:jobId" element={<ApplicationPage />} />
        <Route path="/success" element={<ApplicationSuccessPage />} />
        <Route path="/status" element={<ApplicationStatusPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard/applicants" element={<ProtectedRoute><ApplicantsPipelinePage /></ProtectedRoute>} />
        <Route
          path="/dashboard/applicants/:applicantId"
          element={<ProtectedRoute><ApplicantDetailPage /></ProtectedRoute>}
        />
        <Route path="/dashboard/jobs" element={<ProtectedRoute><DashboardJobsPage /></ProtectedRoute>} />
        <Route path="/dashboard/sites" element={<ProtectedRoute><SitesPage /></ProtectedRoute>} />
        <Route path="/dashboard/shifts" element={<ProtectedRoute><OpenShiftsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/jobs" replace />} />
      </Routes>
    </AppShell>
  )
}

export default App

