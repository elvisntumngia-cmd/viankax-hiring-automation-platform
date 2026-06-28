import { Eye, MoreVertical, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { applicants as dummyApplicants } from '../data/dummyApplicants'
import { getStoredApplications } from '../utils/applicationStorage'

const stageClass = {
  'New Applicant': 'bg-slate-700/70 text-slate-100',
  'Resume Screened': 'bg-violet-600/80 text-white',
  'Assessment Completed': 'bg-violet-600/80 text-white',
  'License Pending': 'bg-amber-500/20 text-amber-300',
  'License Verified': 'bg-emerald-500/20 text-emerald-300',
  'Voice Interview Complete': 'bg-teal-500/20 text-teal-300',
  'Interview Scheduled': 'bg-blue-500/25 text-blue-300',
  'Ready for Review': 'bg-purple-500/20 text-purple-300',
  Hired: 'bg-green-500/20 text-green-300',
  Rejected: 'bg-red-500/20 text-red-300',
}

const metricCards = [
  ['New Applicants', 24, '+12% this week', 'text-fuchsia-300'],
  ['AI Screened', 18, '+8% this week', 'text-sky-300'],
  ['License Verified', 12, '+15% this week', 'text-emerald-300'],
  ['Interviews Scheduled', 7, '+5% this week', 'text-blue-300'],
  ['Ready for Hire', 5, '+20% this week', 'text-green-300'],
]

function StagePill({ stage }) {
  return (
    <span
      className={`inline-flex w-fit rounded-md px-3 py-1 text-xs font-semibold ${
        stageClass[stage] ?? 'bg-slate-700/70 text-slate-100'
      }`}
    >
      {stage}
    </span>
  )
}

function ApplicantsPipelinePage() {
  const applicants = [...getStoredApplications(), ...dummyApplicants]

  return (
    <section>
      <PageHeader
        eyebrow="Applicant pipeline"
        title="Applicant Pipeline"
        description="Search, filter, review, and open applicant records from the HR command center."
        variant="dark"
      />

      <div className="rounded-xl border border-white/[0.10] bg-[#0B111C] shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] p-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Applicant Pipeline</h2>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] lg:flex lg:flex-row">
            <label className="relative block min-w-0 lg:min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                className="w-full rounded-lg border border-white/[0.10] bg-[#080D14] py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#0084FF]"
                placeholder="Search applicants..."
              />
            </label>
            <select className="w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm font-medium text-zinc-300 outline-none focus:border-[#0084FF]">
              <option>All Stages</option>
              <option>AI Screening</option>
              <option>License Verified</option>
              <option>Interview Scheduled</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:hidden">
          {applicants.map((applicant) => (
            <article
              key={applicant.id}
              className="rounded-lg border border-white/[0.08] bg-[#080D14] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">{applicant.name}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{applicant.role}</p>
                </div>
                <span className="rounded-md bg-blue-500/15 px-2 py-1 text-sm font-semibold text-blue-300">
                  {applicant.score ? `${applicant.score}%` : '-'}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-zinc-300">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Stage</p>
                  <StagePill stage={applicant.stage} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Interview</p>
                    <p className="mt-1">{applicant.interviewTime === 'Not scheduled' ? '-' : applicant.interviewTime}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Applied</p>
                    <p className="mt-1">{applicant.appliedAt}</p>
                  </div>
                </div>
              </div>
              <Link
                to={`/dashboard/applicants/${applicant.id}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/[0.10] bg-white/[0.04] px-3 py-2 font-semibold text-white"
              >
                <Eye size={17} /> View applicant
              </Link>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="text-zinc-400">
              <tr className="border-b border-white/[0.08]">
                {['Applicant', 'Position', 'Stage', 'Score', 'Interview', 'Applied', 'Actions'].map((head) => (
                  <th key={head} className="px-4 py-4 font-semibold lg:px-5">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08] text-zinc-200">
              {applicants.map((applicant) => (
                <tr key={applicant.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-4 font-semibold text-white lg:px-5">{applicant.name}</td>
                  <td className="px-4 py-4 lg:px-5">{applicant.role}</td>
                  <td className="px-4 py-4 lg:px-5">
                    <StagePill stage={applicant.stage} />
                  </td>
                  <td className="px-4 py-4 font-semibold lg:px-5">
                    {applicant.score ? `${applicant.score}%` : '-'}
                  </td>
                  <td className="px-4 py-4 lg:px-5">{applicant.interviewTime === 'Not scheduled' ? '-' : applicant.interviewTime}</td>
                  <td className="px-4 py-4 lg:px-5">{applicant.appliedAt}</td>
                  <td className="px-4 py-4 lg:px-5">
                    <div className="flex items-center gap-3 text-zinc-400">
                      <Link to={`/dashboard/applicants/${applicant.id}`} aria-label={`View ${applicant.name}`}>
                        <Eye size={18} />
                      </Link>
                      <button type="button" aria-label="More actions">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map(([label, value, change, color]) => (
          <article
            key={label}
            className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-4 shadow-xl shadow-black/20 sm:p-5"
          >
            <p className={`font-semibold ${color}`}>{label}</p>
            <p className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{value}</p>
            <p className="mt-2 text-sm font-semibold text-emerald-300">{change}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default ApplicantsPipelinePage



