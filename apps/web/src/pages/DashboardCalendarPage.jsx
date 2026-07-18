import { Ban, CalendarCheck, CalendarDays, Clock, ExternalLink, Link as LinkIcon, Mail, RefreshCcw, RotateCcw, Search, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { applicants as dummyApplicants } from '../data/dummyApplicants'
import useSupabaseData from '../hooks/useSupabaseData'
import { defaultCalendarSettings, disconnectCalendarProvider, fetchApplicants, fetchCalendarSettings, saveCalendarSettings, startCalendarOAuth, syncPendingCalendarEvents, updateInterviewSchedule } from '../services/supabaseData'
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
  const [calendarSettingsDraft, setCalendarSettingsDraft] = useState(null)
  const [settingsState, setSettingsState] = useState({ busy: false, message: '', error: '' })
  const [scheduleActionState, setScheduleActionState] = useState({ busyKey: '', message: '', error: '' })
  const [providerActionState, setProviderActionState] = useState({ busyKey: '', message: '', error: '' })
  const { data: backendApplicants, status, error } = useSupabaseData(fetchApplicants, dummyApplicants)
  const {
    data: savedCalendarSettings,
    status: settingsStatus,
    error: settingsError,
    reload: reloadCalendarSettings,
  } = useSupabaseData(fetchCalendarSettings, defaultCalendarSettings)
  const applicants = useMemo(() => [...backendApplicants, ...getStoredApplications()], [backendApplicants])
  const calendarSettings = calendarSettingsDraft ?? savedCalendarSettings

  function updateCalendarSetting(key, value) {
    setCalendarSettingsDraft((current) => ({
      ...(current ?? calendarSettings),
      [key]: value,
    }))
  }

  async function handleSaveCalendarSettings() {
    setSettingsState({ busy: true, message: '', error: '' })

    try {
      const savedSettings = await saveCalendarSettings(calendarSettings)
      setCalendarSettingsDraft(savedSettings)
      await reloadCalendarSettings()
      setSettingsState({
        busy: false,
        message: 'Calendar settings saved.',
        error: '',
      })
    } catch (saveError) {
      setSettingsState({
        busy: false,
        message: '',
        error: saveError.message?.includes('calendar_settings')
          ? 'Calendar settings table is not ready. Run docs/supabase-calendar-settings.sql in Supabase, then save again.'
          : saveError.message,
      })
    }
  }

  async function handleScheduleAction(applicant, action) {
    const busyKey = `${applicant.id}-${action}`
    setScheduleActionState({ busyKey, message: '', error: '' })

    try {
      const currentDate = applicant.finalInterview?.scheduledFor
        ? new Date(applicant.finalInterview.scheduledFor)
        : new Date()
      const nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
      const isCancel = action === 'cancel'

      await updateInterviewSchedule(applicant.id, {
        status: isCancel ? 'Canceled' : 'Rescheduled',
        scheduledFor: isCancel ? applicant.finalInterview?.scheduledFor : nextDate.toISOString(),
        syncStatus: isCancel ? 'Cancel Ready to Sync' : 'Update Ready to Sync',
        provider: applicant.finalInterview?.provider,
        message: isCancel
          ? 'Final interview canceled from HR calendar.'
          : 'Final interview rescheduled by one day from HR calendar.',
      })
      setScheduleActionState({
        busyKey: '',
        message: isCancel ? `${applicant.name}'s interview was canceled.` : `${applicant.name}'s interview was rescheduled.`,
        error: '',
      })
    } catch (actionError) {
      setScheduleActionState({
        busyKey: '',
        message: '',
        error: actionError.message?.includes('calendar_sync_logs')
          ? 'Schedule updated, but sync log table is not ready. Run the calendar wrap-up SQL and try again.'
          : actionError.message,
      })
    }
  }

  async function handleProviderAction(provider) {
    setProviderActionState({ busyKey: provider, message: '', error: '' })

    try {
      const result = await startCalendarOAuth(provider)
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl)
        return
      }

      setProviderActionState({
        busyKey: '',
        message: result.message,
        error: '',
      })
    } catch (providerError) {
      setProviderActionState({
        busyKey: '',
        message: '',
        error: providerError.message,
      })
    }
  }

  async function handleProviderDisconnect(provider) {
    setProviderActionState({ busyKey: `${provider}-disconnect`, message: '', error: '' })

    try {
      const result = await disconnectCalendarProvider(provider)
      await reloadCalendarSettings()
      setProviderActionState({
        busyKey: '',
        message: result.message,
        error: '',
      })
    } catch (disconnectError) {
      setProviderActionState({
        busyKey: '',
        message: '',
        error: disconnectError.message,
      })
    }
  }

  async function handleSyncPendingEvents() {
    setProviderActionState({ busyKey: 'sync', message: '', error: '' })

    try {
      const result = await syncPendingCalendarEvents()
      setProviderActionState({
        busyKey: '',
        message: result.message ?? 'Calendar sync completed.',
        error: '',
      })
    } catch (syncError) {
      setProviderActionState({
        busyKey: '',
        message: '',
        error: syncError.message,
      })
    }
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
            {[
              ['google', 'Google', calendarSettings.googleConnectionStatus, CalendarDays],
              ['microsoft', 'Microsoft', calendarSettings.microsoftConnectionStatus, Mail],
            ].map(([provider, label, connectionStatus, Icon]) => (
              <div key={provider} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <button
                  type="button"
                  onClick={() => handleProviderAction(provider)}
                  disabled={Boolean(providerActionState.busyKey)}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-[#0084FF] hover:text-[#0084FF]"
                >
                  <Icon size={16} />
                  {providerActionState.busyKey === provider ? `Preparing ${label}...` : `${label}: ${connectionStatus}`}
                </button>
                {connectionStatus === 'Connected' ? (
                  <button
                    type="button"
                    onClick={() => handleProviderDisconnect(provider)}
                    disabled={Boolean(providerActionState.busyKey)}
                    className="rounded-md border border-red-400/20 px-3 py-2 text-sm font-semibold text-red-300 hover:border-red-300 disabled:cursor-wait disabled:opacity-70"
                  >
                    Disconnect
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            OAuth is server-side only. Buttons call Supabase Edge Functions and will activate after provider secrets are configured.
          </p>
          <button
            type="button"
            onClick={handleSyncPendingEvents}
            disabled={Boolean(providerActionState.busyKey)}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-md bg-[#0084FF] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCcw size={15} />
            {providerActionState.busyKey === 'sync' ? 'Syncing...' : 'Sync pending events'}
          </button>
        </div>
        {(providerActionState.message || providerActionState.error) ? (
          <div className={`mt-4 rounded-lg border p-4 text-sm font-semibold ${
            providerActionState.error
              ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
              : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
          }`}
          >
            {providerActionState.error || providerActionState.message}
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
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

            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Business hours start</span>
              <input
                type="time"
                value={calendarSettings.businessHoursStart}
                onChange={(event) => updateCalendarSetting('businessHoursStart', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm text-white outline-none focus:border-[#0084FF]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Business hours end</span>
              <input
                type="time"
                value={calendarSettings.businessHoursEnd}
                onChange={(event) => updateCalendarSetting('businessHoursEnd', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm text-white outline-none focus:border-[#0084FF]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Max interviews per day</span>
              <input
                type="number"
                min="1"
                max="20"
                value={calendarSettings.maxInterviewsPerDay}
                onChange={(event) => updateCalendarSetting('maxInterviewsPerDay', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm text-white outline-none focus:border-[#0084FF]"
              />
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3">
              <input
                type="checkbox"
                checked={calendarSettings.allowWeekends}
                onChange={(event) => updateCalendarSetting('allowWeekends', event.target.checked)}
                className="h-4 w-4 accent-[#0084FF]"
              />
              <span className="text-sm font-semibold text-zinc-300">Allow weekend interviews</span>
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-400">
              {settingsStatus === 'loading' ? 'Loading saved settings...' : 'Settings are saved to Supabase when the calendar settings table is installed.'}
              {settingsError ? (
                <span className="block text-amber-200">
                  Using defaults until the settings table is available.
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleSaveCalendarSettings}
              disabled={settingsState.busy}
              className="inline-flex w-fit items-center justify-center rounded-md bg-[#0084FF] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70"
            >
              {settingsState.busy ? 'Saving...' : 'Save settings'}
            </button>
          </div>

          {settingsState.message ? (
            <div className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-200">
              {settingsState.message}
            </div>
          ) : null}

          {settingsState.error ? (
            <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200">
              {settingsState.error}
            </div>
          ) : null}
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

      {(scheduleActionState.message || scheduleActionState.error) ? (
        <div className={`mt-6 rounded-lg border p-4 text-sm font-semibold ${
          scheduleActionState.error
            ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
            : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
        }`}
        >
          {scheduleActionState.error || scheduleActionState.message}
        </div>
      ) : null}

      <section className="mt-6 rounded-lg border border-white/[0.10] bg-[#0B111C] shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] p-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-white">Scheduled final interviews</h2>
          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(150px,190px)] lg:min-w-0">
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
                      className="grid min-w-0 gap-4 rounded-lg border border-white/[0.08] bg-[#080D14] p-4 lg:grid-cols-[minmax(120px,160px)_minmax(0,1fr)_minmax(180px,220px)] lg:items-center"
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
                        <div className="mt-3 grid gap-2 text-sm text-zinc-400 sm:grid-cols-3">
                          <p>Interviewer: <span className="font-semibold text-zinc-200">{interview.interviewerEmail ?? calendarSettings.interviewerEmail}</span></p>
                          <p>Duration: <span className="font-semibold text-zinc-200">{interview.interviewDurationMinutes ?? calendarSettings.interviewDuration} min</span></p>
                          <p>Buffer: <span className="font-semibold text-zinc-200">{interview.bufferMinutes ?? calendarSettings.bufferTime} min</span></p>
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
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={Boolean(scheduleActionState.busyKey)}
                            onClick={() => handleScheduleAction(applicant, 'reschedule')}
                            className="inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.10] px-2 py-2 text-xs font-semibold text-zinc-200 hover:border-[#0084FF] hover:text-[#0084FF] disabled:cursor-wait disabled:opacity-60"
                          >
                            <RotateCcw size={13} />
                            {scheduleActionState.busyKey === `${applicant.id}-reschedule` ? 'Saving' : 'Reschedule'}
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(scheduleActionState.busyKey)}
                            onClick={() => handleScheduleAction(applicant, 'cancel')}
                            className="inline-flex items-center justify-center gap-1 rounded-md border border-red-400/20 px-2 py-2 text-xs font-semibold text-red-300 hover:border-red-300 disabled:cursor-wait disabled:opacity-60"
                          >
                            <Ban size={13} />
                            {scheduleActionState.busyKey === `${applicant.id}-cancel` ? 'Saving' : 'Cancel'}
                          </button>
                        </div>
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
