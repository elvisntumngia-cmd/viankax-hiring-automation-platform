import { ArrowRight, Brain, CalendarCheck, CheckCircle2, FileWarning, ShieldAlert, ShieldCheck, Star, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { applicants as dummyApplicants } from '../data/dummyApplicants'
import useSupabaseData from '../hooks/useSupabaseData'
import { fetchApplicants } from '../services/supabaseData'
import { getStoredApplications } from '../utils/applicationStorage'
import { getRecentApplicantActivity, matchesPipelinePreset } from '../utils/candidateInsights'

function DashboardPage() {
  const { data: backendApplicants, status, error } = useSupabaseData(fetchApplicants, dummyApplicants)
  const applicants = [...getStoredApplications(), ...backendApplicants]
  const pendingAiReview = applicants.filter((applicant) => matchesPipelinePreset(applicant, 'pending-ai-review')).length
  const pendingComplianceReview = applicants.filter((applicant) => matchesPipelinePreset(applicant, 'pending-compliance-review')).length
  const pendingInterviews = applicants.filter((applicant) => matchesPipelinePreset(applicant, 'pending-interviews')).length
  const strongCandidates = applicants.filter((applicant) => matchesPipelinePreset(applicant, 'strong-candidates')).length
  const recentActivity = getRecentApplicantActivity(applicants)
  const metricCards = [
    ['New Applicant', applicants.filter((applicant) => matchesPipelinePreset(applicant, 'new-applicant')).length, 'from active campaigns', 'from-slate-800 to-slate-900', UserPlus, 'new-applicant'],
    ['Pending AI Review', pendingAiReview, 'resume and screening automation', 'from-violet-900 to-violet-700', Brain, 'pending-ai-review'],
    ['Pending Compliance Review', pendingComplianceReview, 'license and document checks', 'from-blue-900 to-blue-700', ShieldAlert, 'pending-compliance-review'],
    ['Pending Interviews', pendingInterviews, 'voice or manager interviews', 'from-emerald-950 to-emerald-800', CalendarCheck, 'pending-interviews'],
    ['Strong Candidates', strongCandidates, '85+ overall score', 'from-teal-950 to-zinc-900', Star, 'strong-candidates'],
  ]

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-start md:justify-between">
        <PageHeader
          eyebrow="HR command center"
          title="Hiring Pipeline Overview"
          description="Monitor screening, license verification, interviews, and ready-to-hire candidates from one operations dashboard."
          variant="dark"
        />
        <Link
          to="/dashboard/applicants"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-violet-300 hover:text-white"
        >
          View Full Dashboard <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map(([label, value, helper, gradient, Icon, filterKey]) => (
          <Link
            key={label}
            to={`/dashboard/applicants?filter=${filterKey}`}
            className={`rounded-lg border border-white/[0.10] bg-gradient-to-br ${gradient} p-4 shadow-2xl shadow-black/25 sm:p-5`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold leading-6 text-white sm:text-base">{label}</h2>
              <Icon size={24} className="shrink-0 text-white/70" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-white sm:mt-5 sm:text-4xl">{value}</p>
            <p className="mt-2 text-xs font-semibold text-emerald-300">{helper}</p>
          </Link>
        ))}
      </div>

      {status === 'error' ? (
        <div className="mt-5 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Supabase applicants could not load, so fallback records are showing. {error?.message}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] sm:mt-8">
        <section className="min-w-0 rounded-lg border border-white/[0.10] bg-[#0B111C] p-4 shadow-2xl shadow-black/25 sm:p-5">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Recent Activity</h2>
          <div className="mt-4 divide-y divide-white/[0.08] overflow-hidden rounded-lg border border-white/[0.08] bg-[#0D1522]">
            {recentActivity.map(({ title, time, status }) => (
              <div key={title} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-300/40 text-emerald-300">
                  <CheckCircle2 size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm text-zinc-400">{time}</p>
                </div>
                <span className="w-fit rounded-md bg-[#0E3A2D] px-3 py-1 text-sm font-semibold text-emerald-300">
                  {status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[360px] rounded-[2rem] border-[8px] border-black bg-[#101827] p-4 shadow-2xl shadow-black/50 sm:p-5 xl:mx-0">
          <div className="rounded-[1.4rem] border border-white/[0.08] bg-[#0B111C] p-4">
            <p className="text-sm font-semibold text-white">ViankaX Hiring System</p>
            <p className="mt-3 text-xs text-zinc-500">Today 10:24 AM</p>
            <div className="mt-5 rounded-2xl bg-[#1F2937] p-4 text-sm leading-6 text-white">
              Thank you for applying. Your application has been received. Our
              team will review your information and be in touch soon.
            </div>
            <div className="mt-4 flex justify-end">
              <span className="rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white">
                Thank you!
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 sm:mt-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Automation engine queue</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {applicants.length} applicants are loaded into the HR pipeline, including local demo submissions.
              {status === 'success' ? ' Supabase is connected.' : ''}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['AI Review', pendingAiReview, FileWarning],
              ['Compliance', pendingComplianceReview, ShieldCheck],
              ['Interviews', pendingInterviews, CalendarCheck],
              ['85+ Score', strongCandidates, Star],
            ].map(([label, value, Icon]) => (
              <div key={label} className="rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
                <Icon size={18} className="text-blue-300" />
                <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                <p className="text-xs font-semibold text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default DashboardPage



