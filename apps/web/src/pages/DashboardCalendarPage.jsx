import { CalendarCheck, CalendarDays, Clock, ExternalLink, Link as LinkIcon, Mail, RefreshCcw, Search, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { applicants as dummyApplicants } from '../data/dummyApplicants'
import useSupabaseData from '../hooks/useSupabaseData'
import { fetchApplicants } from '../services/supabaseData'
import { getStoredApplications } from '../utils/applicationStorage'
import { getCandidateScores } from '../utils/candidateInsights'

function formatCalendarDate(dateValue) {
  if (!dateValue) return 'Date/time pending sync'

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateValue))
}

function getCalendarDateKey(dateValue) {
  if (!dateValue) return 'Pending date'

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateValue))
}

function getSyncBadge(interview) {
  if (interview?.externalEventId) return 'Synced'
  if (interview?.syncStatus && interview.syncStatus !== 'Not Connected') return interview.syncStatus
  return 'Ready to sync'
}

function DashboardCalendarPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState('All Providers')
  const [calendarSettings, setCalendarSettings] = useState({
    provider: 'Internal calendar',
    interviewerEmail: 'hr@viankax.com',
    interviewDuration: '30',
    bufferTime: '15',
    schedulingWindow: '3 business days after voice interview',
  })
  const { data: backendApplicants, status, error } = useSupabaseData(fetchApplicants, dummyApplicants)
  const applicants = useMemo(() => [...backendApplicants, ...getStoredApplications()], [backendApplicants])

  function updateCalendarSetting(key, value) {
    setCalendarSettings((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const scheduledApplicants = useMemo(() => applicants
    .filter((applicant) => applicant.finalInterview?.status === 'Scheduled' || applicant.interviewStatus === 'Scheduled')
    .filter((applicant) => {
      const interview = applicant.finalInterview ?? {}
      const searchableText = [
        applicant.name,
        applicant.role,
        applicant.email,
        applicant.phone,
        applicant.placementRecommendation?.bestMatch,
        applicant.interviewTime,
        interview.provider,
        interview.externalCalendarProvider,
      ].join(' ').toLowerCase()
      const matchesSearch = searchableText.includes(searchQuery.trim().toLowerCase())
      const providerName = interview.externalCalendarProvider ?? interview.provider ?? 'Calendar placeholder'
      const matchesProvider = providerFilter === 'All Providers' || providerName === providerFilter

      return matchesSearch && matchesProvider
    })
    .sort((first, second) => {
      const firstTime = first.finalInterview?.scheduledFor ? new Date(first.finalInterview.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER
      const secondTime = second.finalInterview?.scheduledFor ? new Date(second.finalInterview.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER

      return firstTime - secondTime
    }), [applicants, providerFilter, searchQuery])

  const providerOptions = Array.from(new Set(applicants
    .filter((applicant) => applicant.finalInterview?.status === 'Scheduled' || applicant.interviewStatus === 'Scheduled')
    .map((applicant) => applicant.finalInterview?.externalCalendarProvider ?? applicant.finalInterview?.provider ?? 'Calendar placeholder')))

  const groupedInterviews = scheduledApplicants.reduce((groups, applicant) => {
    const key = getCalendarDateKey(applicant.finalInterview?.scheduledFor)
    return {
      ...groups,
      [key]: [...(groups[key] ?? []), applicant],
    }
  }, {})

  const syncedCount = scheduledApplicants.filter((applicant) => applicant.finalInterview?.externalEventId).length
  const readyToSyncCount = scheduledApplicants.length - syncedCount

  return (
    <section>
      <PageHeader
        eyebrow="Interview calendar"
        title="Final Interview Calendar"
        description="Track scheduled final interviews now, with a sync-ready structure for Google Calendar and Microsoft Outlook."
        variant="dark"
      />

      {status === 'error' ? (
        <div className="mb-5 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Supabase applicants could not load, so fallback records are showing. {error?.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Scheduled interviews', scheduledApplicants.length, CalendarCheck, 'text-blue-300'],
          ['Ready for calendar sync', readyToSyncCount, RefreshCcw, 'text-violet-300'],
          ['Synced events', syncedCount, LinkIcon, 'text-emerald-300'],
        ].map(([label, value, Icon, color]) => (
          <div key={label} className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5">
            <Icon size={22} className={color} />
            <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
            <p className="mt-1 text-sm font-semibold text-zinc-400">{label}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-lg border border-white/[0.10] bg-[#0B111C] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Calendar sync setup</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Current mode uses internal scheduling. Google and Microsoft can later write provider IDs back to each interview.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-400"
            >
              <CalendarDays size={16} />
              Connect Google later
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-400"
            >
              <Mail size={16} />
              Connect Microsoft later
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-blue-500/15 p-2 text-blue-300">
              <Settings size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Scheduling defaults</h2>
              <p className="mt-2 text-sm text-zinc-400">
                These settings define how ViankaX should create calendar events once Google or Microsoft is connected.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Default provider</span>
              <select
                value={calendarSettings.provider}
                onChange={(event) => updateCalendarSetting('provider', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm font-medium text-white outline-none focus:border-[#0084FF]"
              >
                <option>Internal calendar</option>
                <option>Google Calendar</option>
                <option>Microsoft Outlook</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Default interviewer email</span>
              <input
                value={calendarSettings.interviewerEmail}
                onChange={(event) => updateCalendarSetting('interviewerEmail', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#0084FF]"
                placeholder="hr@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Interview duration</span>
              <select
                value={calendarSettings.interviewDuration}
                onChange={(event) => updateCalendarSetting('interviewDuration', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm font-medium text-white outline-none focus:border-[#0084FF]"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Buffer time</span>
              <select
                value={calendarSettings.bufferTime}
                onChange={(event) => updateCalendarSetting('bufferTime', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm font-medium text-white outline-none focus:border-[#0084FF]"
              >
                <option value="0">No buffer</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-zinc-300">Automation scheduling rule</span>
              <input
                value={calendarSettings.schedulingWindow}
                onChange={(event) => updateCalendarSetting('schedulingWindow', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#0084FF]"
              />
            </label>
          </div>

          <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            Settings are staged in the UI for now. The next backend pass will persist them to Supabase and use them when creating Google or Microsoft calendar events.
          </div>
        </div>

        <aside className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-violet-500/15 p-2 text-violet-300">
              <Clock size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Integration readiness</h2>
              <p className="mt-2 text-sm text-zinc-400">Data fields prepared for external calendar sync.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {[
              ['External provider', 'Google or Microsoft account name'],
              ['External event ID', 'Provider event identifier'],
              ['Sync status', 'Not Connected, Ready, Synced, Failed'],
              ['Sync error', 'Provider error message if sync fails'],
              ['Synced at', 'Last successful sync timestamp'],
            ].map(([label, helper]) => (
              <div key={label} className="rounded-md border border-white/[0.08] bg-white/[0.03] p-3">
                <p className="font-semibold text-white">{label}</p>
                <p className="mt-1 text-sm text-zinc-400">{helper}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded-lg border border-white/[0.10] bg-[#0B111C] shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] p-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-white">Scheduled final interviews</h2>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px] lg:min-w-[520px]">
            <label className="relative block min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-white/[0.10] bg-[#080D14] py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#0084FF]"
                placeholder="Search interviews..."
              />
            </label>
            <select
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
              className="w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm font-medium text-zinc-300 outline-none focus:border-[#0084FF]"
            >
              <option>All Providers</option>
              {providerOptions.map((provider) => (
                <option key={provider}>{provider}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:p-5">
          {Object.entries(groupedInterviews).map(([dateLabel, interviews]) => (
            <div key={dateLabel}>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{dateLabel}</p>
              <div className="grid gap-3">
                {interviews.map((applicant) => {
                  const interview = applicant.finalInterview ?? {}
                  const scores = getCandidateScores(applicant)

                  return (
                    <article
                      key={applicant.id}
                      className="grid gap-4 rounded-lg border border-white/[0.08] bg-[#080D14] p-4 lg:grid-cols-[160px_minmax(0,1fr)_220px] lg:items-center"
                    >
                      <div>
                        <p className="text-sm font-semibold text-blue-300">{formatCalendarDate(interview.scheduledFor)}</p>
                        <p className="mt-2 w-fit rounded-md bg-blue-500/15 px-2 py-1 text-xs font-semibold text-blue-300">
                          {interview.status ?? 'Scheduled'}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/dashboard/applicants/${applicant.id}`}
                          className="text-lg font-semibold text-white hover:text-[#0084FF]"
                        >
                          {applicant.name}
                        </Link>
                        <p className="mt-1 text-sm text-zinc-400">{applicant.role}</p>
                        <div className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-3">
                          <p>Overall: <span className="font-semibold text-white">{Number.isFinite(scores.overallCandidateScore) ? `${scores.overallCandidateScore}%` : 'Pending'}</span></p>
                          <p>Voice: <span className="font-semibold text-white">{Number.isFinite(scores.voiceInterviewScore) ? `${scores.voiceInterviewScore}%` : 'Pending'}</span></p>
                          <p>Match: <span className="font-semibold text-white">{Number.isFinite(applicant.placementRecommendation?.matchScore) ? `${applicant.placementRecommendation.matchScore}%` : 'Pending'}</span></p>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-emerald-300">
                          {applicant.placementRecommendation?.bestMatch ?? 'Placement match pending'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Calendar integration</p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {interview.externalCalendarProvider ?? interview.provider ?? 'Calendar placeholder'}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">{getSyncBadge(interview)}</p>
                        {interview.schedulingUrl ? (
                          <a
                            href={interview.schedulingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0084FF] hover:text-blue-300"
                          >
                            Open scheduling link <ExternalLink size={14} />
                          </a>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          ))}

          {scheduledApplicants.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-[#080D14] p-8 text-center">
              <p className="font-semibold text-white">No scheduled interviews found.</p>
              <p className="mt-2 text-sm text-zinc-400">
                Completed automation will add candidates here after voice interview and scheduling.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </section>
  )
}

export default DashboardCalendarPage
