import { CalendarCheck, CheckCircle2, Mail, PhoneCall, ServerCog, Workflow, AlertTriangle } from 'lucide-react'

function getToneClasses(tone) {
  const tones = {
    good: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
    pending: 'border-blue-400/25 bg-blue-500/10 text-blue-300',
    issue: 'border-red-400/25 bg-red-500/10 text-red-300',
  }

  return tones[tone] ?? tones.pending
}

function StatusItem({ label, status, detail, icon: Icon, tone }) {
  return (
    <div className={`rounded-lg border p-4 ${getToneClasses(tone)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="mt-2 text-xl font-semibold">{status}</p>
        </div>
        <Icon size={22} className="shrink-0" />
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{detail}</p>
    </div>
  )
}

function countNotifications(applicants, predicate) {
  return applicants.reduce((total, applicant) => total + (applicant.notifications ?? []).filter(predicate).length, 0)
}

function DemoHealthPanel({ applicants = [], applicantStatus, applicantError, queueStatus, queueError, calendarSettings }) {
  const sentEmails = countNotifications(applicants, (notification) =>
    notification.channel === 'email' && notification.status === 'sent',
  )
  const queuedEmails = countNotifications(applicants, (notification) =>
    notification.channel === 'email' && notification.status === 'queued',
  )
  const vapiCalls = applicants.filter((applicant) => applicant.voiceInterview?.providerCallId).length
  const completedVoice = applicants.filter((applicant) =>
    ['Complete', 'Completed'].includes(applicant.voiceInterview?.status) || Number.isFinite(applicant.voiceInterview?.score),
  ).length
  const scheduledInterviews = applicants.filter((applicant) => applicant.finalInterview?.status === 'Scheduled').length
  const syncedCalendarEvents = applicants.filter((applicant) => applicant.finalInterview?.externalEventId).length
  const googleConnected = calendarSettings?.googleConnectionStatus === 'Connected'
  const microsoftConnected = calendarSettings?.microsoftConnectionStatus === 'Connected'

  const items = [
    {
      label: 'Supabase data',
      status: applicantStatus === 'error' ? 'Needs attention' : applicantStatus === 'loading' ? 'Loading' : 'Connected',
      detail: applicantStatus === 'error'
        ? applicantError?.message ?? 'Applicant records could not load.'
        : `${applicants.length} applicant records loaded into the dashboard.`,
      icon: ServerCog,
      tone: applicantStatus === 'error' ? 'issue' : applicantStatus === 'loading' ? 'pending' : 'good',
    },
    {
      label: 'Candidate email',
      status: sentEmails ? 'Sending' : queuedEmails ? 'Queued' : 'Ready',
      detail: sentEmails
        ? `${sentEmails} sent email notifications found. ${queuedEmails} still queued.`
        : queuedEmails
          ? `${queuedEmails} candidate emails are waiting for automation processing.`
          : 'Resend is handled by the automation Edge Function.',
      icon: Mail,
      tone: sentEmails ? 'good' : queuedEmails ? 'warning' : 'pending',
    },
    {
      label: 'Voice interview',
      status: vapiCalls ? 'Active' : 'Ready',
      detail: vapiCalls
        ? `${vapiCalls} Vapi calls created. ${completedVoice} completed voice reports are visible.`
        : 'Vapi calls trigger after qualified screening and candidate action.',
      icon: PhoneCall,
      tone: completedVoice ? 'good' : vapiCalls ? 'warning' : 'pending',
    },
    {
      label: 'Calendar',
      status: googleConnected || microsoftConnected ? 'Connected' : scheduledInterviews ? 'Internal' : 'Ready',
      detail: googleConnected || microsoftConnected
        ? `${syncedCalendarEvents} events synced to external calendar.`
        : scheduledInterviews
          ? `${scheduledInterviews} interviews scheduled with internal calendar metadata.`
          : 'Google/Microsoft calendar sync is available from the Calendar page.',
      icon: CalendarCheck,
      tone: googleConnected || microsoftConnected || scheduledInterviews ? 'good' : 'pending',
    },
    {
      label: 'Automation queue',
      status: queueStatus === 'error' ? 'Needs attention' : queueStatus === 'loading' ? 'Loading' : 'Operational',
      detail: queueStatus === 'error'
        ? queueError?.message ?? 'Automation queue could not load.'
        : 'Workflow jobs, notifications, screening, Vapi, and scheduling are visible to HR.',
      icon: queueStatus === 'error' ? AlertTriangle : Workflow,
      tone: queueStatus === 'error' ? 'issue' : queueStatus === 'loading' ? 'pending' : 'good',
    },
  ]

  return (
    <section className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-2xl shadow-black/25">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">Demo health</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Integration readiness</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Live status signals for the current hiring automation demo.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
          <CheckCircle2 size={16} />
          Demo monitor
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <StatusItem key={item.label} {...item} />
        ))}
      </div>
    </section>
  )
}

export default DemoHealthPanel
