import { useState } from 'react'
import { Link } from 'react-router-dom'
import AutomationTimeline from '../components/AutomationTimeline'
import PageHeader from '../components/PageHeader'
import { lookupApplicationStatus } from '../services/supabaseData'
import { formatScore, getCandidateScores } from '../utils/candidateInsights'
import { getLastApplication } from '../utils/applicationStorage'

function getScreeningStatus(application) {
  const scores = getCandidateScores(application)
  const screening = application.aiScreening ?? {}
  const nextStep = screening.candidateContext?.suggestedNextStep ?? application.workflowRuns?.[0]?.metadata?.nextAction ?? 'Next step pending'

  if (Number.isFinite(scores.screeningScore) || screening.status === 'completed') {
    return {
      tone: 'green',
      title: 'AI screening completed',
      description: `${application.aiRecommendation?.label ?? screening.recommendation ?? 'Screening completed'} with screening score ${formatScore(scores.screeningScore)}.`,
      nextStep,
    }
  }

  const inviteSent = application.notifications?.some((notification) =>
    notification.subject === 'Complete your ViankaX screening assessment' &&
    notification.status === 'sent',
  )

  if (inviteSent) {
    return {
      tone: 'blue',
      title: 'AI screening sent',
      description: 'The screening assessment link has been sent to your email.',
      nextStep: 'Complete AI screening assessment',
    }
  }

  return {
    tone: 'amber',
    title: 'AI screening pending',
    description: 'The automation workflow is preparing your AI screening assessment.',
    nextStep: 'Watch your email for the screening link',
  }
}

function getStatusMilestones(application) {
  const scores = getCandidateScores(application)
  const notificationSubjects = new Set((application.notifications ?? []).map((notification) => notification.subject))
  const documentsUploaded = Object.values(application.documents ?? {}).some((status) =>
    ['Uploaded', 'Received', 'Verified'].includes(status),
  )

  return [
    {
      label: 'Application Received',
      state: 'complete',
      description: 'Your application is in the ViankaX hiring workflow.',
    },
    {
      label: 'AI Screening Sent',
      state: notificationSubjects.has('Complete your ViankaX screening assessment') ? 'complete' : 'current',
      description: 'Screening link is emailed after the application is accepted by automation.',
    },
    {
      label: 'AI Screening Completed',
      state: Number.isFinite(scores.screeningScore) || application.aiScreening?.status === 'completed' ? 'complete' : 'pending',
      description: `Screening score: ${formatScore(scores.screeningScore)}`,
    },
    {
      label: 'License / Document Review',
      state: application.licenseStatus === 'Verified' ? 'complete' : documentsUploaded ? 'current' : 'pending',
      description: `License status: ${application.licenseStatus ?? 'Pending'}`,
    },
    {
      label: 'Voice Interview',
      state: application.voiceInterview?.status === 'Completed' || Number.isFinite(scores.voiceInterviewScore) ? 'complete' : 'pending',
      description: `Voice score: ${formatScore(scores.voiceInterviewScore)}`,
    },
    {
      label: 'Interview Scheduled',
      state: application.finalInterview?.status === 'Scheduled' ? 'complete' : 'pending',
      description: application.interviewTime ?? 'Not scheduled',
    },
    {
      label: 'Final Decision',
      state: ['Hired', 'Rejected'].includes(application.stage) ||
        (Boolean(application.decision) && application.decision !== 'Pending')
        ? 'complete'
        : 'pending',
      description: application.decision ?? 'Pending',
    },
  ]
}

function ApplicationStatusPage() {
  const lastApplication = getLastApplication()
  const [form, setForm] = useState({ email: '', phone: '' })
  const [application, setApplication] = useState(lastApplication)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const statusMilestones = application ? getStatusMilestones(application) : []

  async function searchStatus(event) {
    event.preventDefault()
    setStatus('loading')
    setError('')

    try {
      const result = await lookupApplicationStatus(form)
      if (!result) {
        setApplication(null)
        setError('No application found for that email and phone combination.')
      } else {
        setApplication(result)
      }
    } catch (lookupError) {
      setError(lookupError.message)
    } finally {
      setStatus('idle')
    }
  }

  return (
    <section className="max-w-5xl">
      <PageHeader
        eyebrow="Application status"
        title="Check your application progress"
        description="Look up your latest application status using the contact information submitted with your application."
      />

      <form onSubmit={searchStatus} className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[#111827]">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="mt-2 w-full rounded-md border border-[#D1D5DB] px-3 py-3 text-[#111827] outline-none focus:border-[#0084FF]"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#111827]">Phone</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className="mt-2 w-full rounded-md border border-[#D1D5DB] px-3 py-3 text-[#111827] outline-none focus:border-[#0084FF]"
              required
            />
          </label>
        </div>
        {error ? <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</p> : null}
        <button type="submit" disabled={status === 'loading'} className="mt-5 rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-70">
          {status === 'loading' ? 'Searching...' : 'Check status'}
        </button>
      </form>

      {!application ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">No application selected</h2>
          <p className="mt-2 text-sm text-[#6B7280]">Search above or submit an application first.</p>
          <Link to="/jobs" className="mt-4 inline-flex rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white">
            Browse jobs
          </Link>
        </div>
      ) : (
        <>
      {(() => {
        const screeningStatus = getScreeningStatus(application)
        const toneClass = {
          green: 'border-green-200 bg-green-50 text-green-800',
          blue: 'border-blue-200 bg-blue-50 text-blue-800',
          amber: 'border-amber-200 bg-amber-50 text-amber-800',
        }[screeningStatus.tone]

        return (
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#6B7280]">Current stage</p>
              <p className="mt-2 text-xl font-semibold text-[#111827]">{application.stage}</p>
            </div>
            <div className={`rounded-lg border p-5 shadow-sm ${toneClass}`}>
              <p className="text-sm font-semibold">{screeningStatus.title}</p>
              <p className="mt-2 text-sm leading-6">{screeningStatus.description}</p>
            </div>
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#6B7280]">Next step</p>
              <p className="mt-2 text-lg font-semibold text-[#111827]">{screeningStatus.nextStep}</p>
            </div>
          </div>
        )
      })()}

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Application summary</h2>
          <div className="mt-4 grid gap-3 text-sm text-[#4B5563]">
            <p><span className="font-semibold text-[#111827]">Applicant:</span> {application.applicantName || application.name}</p>
            <p><span className="font-semibold text-[#111827]">Job:</span> {application.jobTitle || application.role}</p>
            <p><span className="font-semibold text-[#111827]">Client:</span> {application.client}</p>
            <p><span className="font-semibold text-[#111827]">Stage:</span> {application.stage}</p>
            <p><span className="font-semibold text-[#111827]">Voice interview:</span> {application.interviewStatus}</p>
            <p><span className="font-semibold text-[#111827]">Final interview:</span> {application.interviewTime}</p>
            <p><span className="font-semibold text-[#111827]">Submitted:</span> {application.appliedAt || 'Recently submitted'}</p>
          </div>
          <div
            className={`mt-4 rounded-md border p-3 text-sm font-semibold ${
              application.knockoutResult === 'Passed'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            Basic screening: {application.knockoutResult}
          </div>
          <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-800">
            Automation engine: dashboard sync complete. AI screening, license review,
            voice interview, placement matching, and scheduling updates will appear here as they run.
          </div>
          {application.finalInterview?.status === 'Scheduled' ? (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm leading-6 text-green-800">
              <p className="font-semibold">Final interview scheduled</p>
              <p>{application.interviewTime}</p>
              <p>Interviewer: {application.finalInterview.interviewerEmail ?? 'Hiring team'}</p>
            </div>
          ) : null}
        </aside>

        <div className="space-y-5">
          <section className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">Candidate workflow</h2>
            <div className="mt-4 grid gap-3">
              {statusMilestones.map((milestone) => (
                <div key={milestone.label} className="flex gap-3 rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                  <span
                    className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                      milestone.state === 'complete'
                        ? 'bg-green-500'
                        : milestone.state === 'current'
                          ? 'bg-blue-500'
                          : 'bg-[#CBD5E1]'
                    }`}
                  />
                  <div>
                    <p className="font-semibold text-[#111827]">{milestone.label}</p>
                    <p className="mt-1 text-sm text-[#6B7280]">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <AutomationTimeline applicant={application} variant="light" />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/jobs"
          className="inline-flex justify-center rounded-md border border-[#D1D5DB] bg-white px-5 py-3 font-semibold text-[#111827]"
        >
          Return to jobs
        </Link>
        <Link
          to="/success"
          className="inline-flex justify-center rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white"
        >
          Back to confirmation
        </Link>
      </div>
        </>
      )}
    </section>
  )
}

export default ApplicationStatusPage
