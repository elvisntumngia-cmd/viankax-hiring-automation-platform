import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Home,
  ListChecks,
  LayoutDashboard,
  MapPinned,
  Settings,
  UsersRound,
} from 'lucide-react'
import ProtectedRoute from './components/ProtectedRoute'
import AiScreeningPage from './pages/AiScreeningPage'
import ApplicantDetailPage from './pages/ApplicantDetailPage'
import ApplicantsPipelinePage from './pages/ApplicantsPipelinePage'
import ApplicationPage from './pages/ApplicationPage'
import ApplicationSuccessPage from './pages/ApplicationSuccessPage'
import ApplicationStatusPage from './pages/ApplicationStatusPage'
import DashboardJobsPage from './pages/DashboardJobsPage'
import DashboardCalendarPage from './pages/DashboardCalendarPage'
import DashboardPage from './pages/DashboardPage'
import DashboardSettingsPage from './pages/DashboardSettingsPage'
import HomePage from './pages/HomePage'
import JobDetailsPage from './pages/JobDetailsPage'
import JobsPage from './pages/JobsPage'
import LoginPage from './pages/LoginPage'
import OpenShiftsPage from './pages/OpenShiftsPage'
import SitesPage from './pages/SitesPage'
import VoiceInterviewTriggerPage from './pages/VoiceInterviewTriggerPage'

const navigationLinks = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Applicant Portal', to: '/jobs', icon: ClipboardList },
  { label: 'HR Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Applicants', to: '/dashboard/applicants', icon: UsersRound },
  { label: 'Calendar', to: '/dashboard/calendar', icon: CalendarDays },
  { label: 'Jobs', to: '/dashboard/jobs', icon: ListChecks },
  { label: 'Sites', to: '/dashboard/sites', icon: MapPinned },
  { label: 'Open Shifts', to: '/dashboard/shifts', icon: CalendarClock },
  { label: 'Settings', to: '/dashboard/settings', icon: Settings },
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
    <div className="min-h-screen min-w-0 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="min-w-0 border-b border-black/10 bg-[#09090B] px-3 py-3 text-white sm:px-5 lg:min-h-screen lg:border-b-0 lg:border-r lg:py-5">
        <NavLink to="/" className="flex w-fit items-center">
          <img
            src="/viankax-wordmark.png"
            alt="ViankaX"
            className="h-14 w-auto max-w-[150px] object-contain sm:h-20 sm:max-w-[190px] lg:h-[104px] lg:max-w-[220px] xl:h-[114px] xl:max-w-[240px]"
          />
        </NavLink>

        <nav className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-4 lg:mt-6 lg:grid lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
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

      <div className={`min-h-screen min-w-0 overflow-x-hidden ${mainClass}`}>
        <header
          className={`sticky top-0 z-20 border-b backdrop-blur ${
            isDarkShell
              ? 'border-white/[0.08] bg-[#050505]/90'
              : 'border-[#E5E7EB] bg-white/95'
          }`}
        >
          <div className="flex min-w-0 px-3 py-2 sm:px-5 sm:py-3 lg:px-6 xl:px-8">
            <nav
              className={`flex max-w-full min-w-0 gap-1 overflow-x-auto rounded-lg border p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
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

        <main className="min-w-0 overflow-x-hidden px-3 py-5 sm:px-5 sm:py-8 lg:px-6 xl:px-8">{children}</main>
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
        <Route path="/screening/:applicantId" element={<AiScreeningPage />} />
        <Route path="/voice/:applicantId" element={<VoiceInterviewTriggerPage />} />
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
        <Route path="/dashboard/calendar" element={<ProtectedRoute><DashboardCalendarPage /></ProtectedRoute>} />
        <Route path="/dashboard/sites" element={<ProtectedRoute><SitesPage /></ProtectedRoute>} />
        <Route path="/dashboard/shifts" element={<ProtectedRoute><OpenShiftsPage /></ProtectedRoute>} />
        <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardSettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/jobs" replace />} />
      </Routes>
    </AppShell>
  )
}

export default App

