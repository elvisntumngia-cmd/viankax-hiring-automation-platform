import { CheckCircle2, Eye, PauseCircle, Search, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { applicants as dummyApplicants, pipelineStages } from '../data/dummyApplicants'
import useSupabaseData from '../hooks/useSupabaseData'
import { fetchApplicants, updateApplicantDecision } from '../services/supabaseData'
import { getStoredApplications } from '../utils/applicationStorage'
import { formatScore, getCandidateScores, matchesPipelinePreset, pipelineFilterPresets } from '../utils/candidateInsights'

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

function formatLastUpdated(dateValue) {
  if (!dateValue) return 'Not updated'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateValue))
}

function isSupabaseRecord(applicant) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicant.id)
}

function mergeApplicantUpdates(applicant, overrides) {
  return overrides[applicant.id] ? { ...applicant, ...overrides[applicant.id] } : applicant
}

function ApplicantsPipelinePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [applicantOverrides, setApplicantOverrides] = useState({})
  const [actionState, setActionState] = useState({ busyKey: '', message: '', error: '' })
  const { data: backendApplicants, status, error } = useSupabaseData(fetchApplicants, dummyApplicants)
  const applicants = [...backendApplicants, ...getStoredApplications()].map((applicant) =>
    mergeApplicantUpdates(applicant, applicantOverrides),
  )
  const searchQuery = searchParams.get('q') ?? ''
  const stageFilter = searchParams.get('stage') ?? 'All Stages'
  const presetFilter = searchParams.get('filter') ?? 'all'
  const activePresetLabel = pipelineFilterPresets[presetFilter]?.label
  const filteredApplicants = applicants.filter((applicant) => {
    const searchableText = [
      applicant.name,
      applicant.role,
      applicant.client,
      applicant.location,
      applicant.email,
      applicant.phone,
      applicant.stage,
      applicant.licenseStatus,
      applicant.interviewStatus,
    ].join(' ').toLowerCase()
    const matchesSearch = searchableText.includes(searchQuery.trim().toLowerCase())
    const matchesStage = stageFilter === 'All Stages' || applicant.stage === stageFilter

    return matchesSearch && matchesStage && matchesPipelinePreset(applicant, presetFilter)
  })

  function updateParam(key, value) {
    const nextParams = new URLSearchParams(searchParams)

    if (!value || value === 'All Stages' || value === 'all') {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }

    setSearchParams(nextParams)
  }

  function handleStageChange(event) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('filter')

    if (event.target.value === 'All Stages') {
      nextParams.delete('stage')
    } else {
      nextParams.set('stage', event.target.value)
    }

    setSearchParams(nextParams)
  }

  function clearFilters() {
    setSearchParams({})
  }

  async function handleQuickDecision(applicant, decision) {
    const busyKey = `${applicant.id}-${decision}`
    setActionState({ busyKey, message: '', error: '' })

    try {
      const result = await updateApplicantDecision(applicant, decision)
      setApplicantOverrides((current) => ({
        ...current,
        [applicant.id]: result,
      }))
      setActionState({
        busyKey: '',
        message: `${decision} saved for ${applicant.name}. Candidate is now in ${result.stage}.`,
        error: '',
      })
    } catch (decisionError) {
      setActionState({
        busyKey: '',
        message: '',
        error: decisionError.message,
      })
    }
  }

  const metricCards = [
    ['New Applicants', applicants.filter((applicant) => applicant.stage === 'New Applicant').length, 'awaiting automation', 'text-fuchsia-300', 'new-applicant'],
    ['AI Screened', applicants.filter((applicant) => Number.isFinite(getCandidateScores(applicant).screeningScore)).length, 'screening score available', 'text-sky-300', 'ai-screened'],
    ['License Verified', applicants.filter((applicant) => applicant.licenseStatus === 'Verified').length, 'compliance cleared', 'text-emerald-300', 'license-verified'],
    ['Interviews Scheduled', applicants.filter((applicant) => applicant.stage === 'Interview Scheduled').length, 'calendar step active', 'text-blue-300', 'Interview Scheduled'],
    ['Ready for Placement Review', applicants.filter((applicant) => applicant.stage === 'Ready for Review' || applicant.placementRecommendation).length, 'matches generated', 'text-purple-300', 'ready-placement-review'],
    ['Strong Candidates', applicants.filter((applicant) => {
      const score = getCandidateScores(applicant).overallCandidateScore
      return Number.isFinite(score) && score >= 85
    }).length, '85+ overall score', 'text-green-300', 'strong-candidates'],
  ]

  return (
    <section>
      <PageHeader
        eyebrow="Applicant pipeline"
        title="Applicant Pipeline"
        description="Search, filter, review, and open applicant records from the HR command center."
        variant="dark"
      />

      {status === 'error' ? (
        <div className="mb-5 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Supabase applicants could not load, so fallback records are showing. {error?.message}
        </div>
      ) : null}
      {status === 'loading' ? (
        <div className="mb-5 rounded-lg border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-200">
          Loading Supabase applicants...
        </div>
      ) : null}
      {actionState.message ? (
        <div className="mb-5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-200">
          {actionState.message}
        </div>
      ) : null}
      {actionState.error ? (
        <div className="mb-5 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200">
          {actionState.error}
        </div>
      ) : null}

      <div className="rounded-xl border border-white/[0.10] bg-[#0B111C] shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] p-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Applicant Pipeline</h2>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] lg:flex lg:flex-row">
            <label className="relative block min-w-0 lg:min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                value={searchQuery}
                onChange={(event) => updateParam('q', event.target.value)}
                className="w-full rounded-lg border border-white/[0.10] bg-[#080D14] py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#0084FF]"
                placeholder="Search applicants..."
              />
            </label>
            <select
              value={stageFilter}
              onChange={handleStageChange}
              className="w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm font-medium text-zinc-300 outline-none focus:border-[#0084FF]"
            >
              <option>All Stages</option>
              {pipelineStages.map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>
          </div>
        </div>

        {(activePresetLabel || searchQuery || stageFilter !== 'All Stages') ? (
          <div className="flex flex-col gap-3 border-b border-white/[0.08] px-4 py-3 text-sm text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing <span className="font-semibold text-white">{filteredApplicants.length}</span> of{' '}
              <span className="font-semibold text-white">{applicants.length}</span> applicants
              {activePresetLabel ? ` for ${activePresetLabel}` : ''}
              {stageFilter !== 'All Stages' ? ` in ${stageFilter}` : ''}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="w-fit rounded-md border border-white/[0.10] px-3 py-2 font-semibold text-white hover:border-[#0084FF] hover:text-[#0084FF]"
            >
              Clear filters
            </button>
          </div>
        ) : null}

        <div className="grid gap-3 p-4 md:hidden">
          {filteredApplicants.map((applicant) => (
            <article key={applicant.id} className="rounded-lg border border-white/[0.08] bg-[#080D14] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">{applicant.name}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{applicant.role}</p>
                </div>
                <span className="rounded-md bg-blue-500/15 px-2 py-1 text-sm font-semibold text-blue-300">
                  {formatScore(getCandidateScores(applicant).overallCandidateScore)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-zinc-300">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Stage</p>
                  <StagePill stage={applicant.stage} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">AI screening</p>
                    <p className="mt-1">{formatScore(getCandidateScores(applicant).screeningScore)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Voice interview</p>
                    <p className="mt-1">{formatScore(getCandidateScores(applicant).voiceInterviewScore)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Compliance</p>
                    <p className="mt-1">{applicant.licenseStatus}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Final interview</p>
                    <p className="mt-1">{applicant.finalInterview?.status ?? applicant.interviewStatus}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Latest activity</p>
                  <p className="mt-1">{applicant.latestEvent?.label ?? 'No event recorded'}</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatLastUpdated(applicant.lastUpdatedAt)}</p>
                </div>
              </div>
              <Link
                to={`/dashboard/applicants/${applicant.id}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/[0.10] bg-white/[0.04] px-3 py-2 font-semibold text-white"
              >
                <Eye size={17} /> View applicant
              </Link>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ['Advance', CheckCircle2],
                  ['Hold', PauseCircle],
                  ['Reject', XCircle],
                ].map(([decision, Icon]) => (
                  <button
                    key={decision}
                    type="button"
                    disabled={!isSupabaseRecord(applicant) || Boolean(actionState.busyKey)}
                    onClick={() => handleQuickDecision(applicant, decision)}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.10] bg-white/[0.04] px-2 py-2 text-xs font-semibold text-zinc-200 hover:border-[#0084FF] hover:text-[#0084FF] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Icon size={14} />
                    {actionState.busyKey === `${applicant.id}-${decision}` ? 'Saving' : decision}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="text-zinc-400">
              <tr className="border-b border-white/[0.08]">
                {['Applicant', 'Position', 'Stage', 'Overall Score', 'AI Screening', 'Voice Interview', 'Final Interview', 'Latest Activity', 'Updated', 'Actions'].map((head) => (
                  <th key={head} className="px-4 py-4 font-semibold lg:px-5">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08] text-zinc-200">
              {filteredApplicants.map((applicant) => (
                <tr key={applicant.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-4 font-semibold text-white lg:px-5">{applicant.name}</td>
                  <td className="px-4 py-4 lg:px-5">{applicant.role}</td>
                  <td className="px-4 py-4 lg:px-5">
                    <StagePill stage={applicant.stage} />
                  </td>
                  <td className="px-4 py-4 font-semibold lg:px-5">
                    {formatScore(getCandidateScores(applicant).overallCandidateScore)}
                  </td>
                  <td className="px-4 py-4 lg:px-5">{formatScore(getCandidateScores(applicant).screeningScore)}</td>
                  <td className="px-4 py-4 lg:px-5">{formatScore(getCandidateScores(applicant).voiceInterviewScore)}</td>
                  <td className="px-4 py-4 lg:px-5">
                    <p className="font-semibold text-zinc-200">{applicant.finalInterview?.status ?? applicant.interviewStatus}</p>
                    <p className="mt-1 text-xs text-zinc-500">{applicant.interviewTime}</p>
                  </td>
                  <td className="px-4 py-4 lg:px-5">
                    <p className="font-semibold text-zinc-200">{applicant.latestEvent?.label ?? 'No event recorded'}</p>
                    <p className="mt-1 text-xs text-zinc-500">{applicant.licenseStatus}</p>
                  </td>
                  <td className="px-4 py-4 lg:px-5">{formatLastUpdated(applicant.lastUpdatedAt)}</td>
                  <td className="px-4 py-4 lg:px-5">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Link
                        to={`/dashboard/applicants/${applicant.id}`}
                        aria-label={`View ${applicant.name}`}
                        className="rounded-md border border-white/[0.10] p-2 hover:border-[#0084FF] hover:text-[#0084FF]"
                      >
                        <Eye size={18} />
                      </Link>
                      {[
                        ['Advance', CheckCircle2],
                        ['Hold', PauseCircle],
                        ['Reject', XCircle],
                      ].map(([decision, Icon]) => (
                        <button
                          key={decision}
                          type="button"
                          title={isSupabaseRecord(applicant) ? decision : 'Supabase record required'}
                          aria-label={`${decision} ${applicant.name}`}
                          disabled={!isSupabaseRecord(applicant) || Boolean(actionState.busyKey)}
                          onClick={() => handleQuickDecision(applicant, decision)}
                          className="rounded-md border border-white/[0.10] p-2 hover:border-[#0084FF] hover:text-[#0084FF] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Icon size={17} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredApplicants.length === 0 ? (
          <div className="border-t border-white/[0.08] p-8 text-center">
            <p className="font-semibold text-white">No applicants match this filter.</p>
            <p className="mt-2 text-sm text-zinc-400">Try another stage, search term, or clear the active filters.</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards.map(([label, value, change, color, filterKey]) => (
          <button
            type="button"
            key={label}
            onClick={() => {
              if (pipelineFilterPresets[filterKey]) updateParam('filter', filterKey)
              else updateParam('stage', filterKey)
            }}
            className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-4 text-left shadow-xl shadow-black/20 transition hover:border-[#0084FF]/50 hover:bg-[#101827] sm:p-5"
          >
            <p className={`font-semibold ${color}`}>{label}</p>
            <p className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{value}</p>
            <p className="mt-2 text-sm font-semibold text-emerald-300">{change}</p>
          </button>
        ))}
      </div>
    </section>
  )
}

export default ApplicantsPipelinePage



