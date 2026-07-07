import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AutomationEventsPanel from '../components/AutomationEventsPanel'
import AutomationQueuePanel from '../components/AutomationQueuePanel'
import AiRecommendationPanel from '../components/AiRecommendationPanel'
import AiScreeningPanel from '../components/AiScreeningPanel'
import AutomationTimeline from '../components/AutomationTimeline'
import CandidateScoreCard from '../components/CandidateScoreCard'
import PageHeader from '../components/PageHeader'
import PlacementRecommendationPanel from '../components/PlacementRecommendationPanel'
import StageHistoryPanel from '../components/StageHistoryPanel'
import { applicants as dummyApplicants } from '../data/dummyApplicants'
import { getPlacementRecommendation } from '../data/dummySites'
import useSupabaseData from '../hooks/useSupabaseData'
import { assignApplicantToPlacement, createDocumentSignedUrl, fetchApplicants, updateApplicantDecision } from '../services/supabaseData'
import { getStoredApplications } from '../utils/applicationStorage'
import { getCandidateScores } from '../utils/candidateInsights'

const statusClass = {
  Qualified: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
  Pending: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  Rejected: 'border-red-400/30 bg-red-500/15 text-red-300',
  'In Progress': 'border-blue-400/30 bg-blue-500/15 text-blue-300',
  'Needs Review': 'border-purple-400/30 bg-purple-500/15 text-purple-300',
}

function InfoCard({ title, children }) {
  return (
    <section className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4 text-sm leading-6 text-zinc-300">{children}</div>
    </section>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b sm:flex-row sm:items-start sm:justify-between sm:gap-4 border-white/[0.08] py-2 last:border-b-0">
      <span className="font-medium text-zinc-500">{label}</span>
      <span className="font-semibold text-white sm:text-right">{value}</span>
    </div>
  )
}

const documentRows = [
  ['Resume', 'resume', 'resume'],
  ['License / guard card', 'license', 'license'],
  ['Government ID', 'governmentId', 'government_id'],
  ['CPR certification', 'cpr', 'cpr'],
  ['First aid certification', 'firstAid', 'first_aid'],
  ['Firearms certification', 'firearms', 'firearms'],
]

async function openDocument(document) {
  const signedUrl = await createDocumentSignedUrl(document)
  window.open(signedUrl, '_blank', 'noopener,noreferrer')
}

function getDocumentFile(applicant, documentType) {
  return applicant.documentFiles?.find((document) => document.type === documentType)
}

function isSupabaseRecord(applicant) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicant.id)
}

const screeningAnswerSections = [
  {
    title: 'Eligibility',
    questions: [
      'Are you authorized to work in the United States?',
      'Are you willing to undergo a background check?',
      'Do you currently hold a valid security license or guard card?',
      'What type of license do you currently hold?',
    ],
  },
  {
    title: 'Availability',
    questions: [
      'Which shift types are you available for?',
      'Which days are you available?',
      'Are you available for weekends, holidays, or overtime if needed?',
      'When can you start?',
    ],
  },
  {
    title: 'Transportation & Commute',
    questions: [
      'Do you have reliable transportation?',
      'What is the maximum commute distance you are comfortable with?',
    ],
  },
  {
    title: 'Experience',
    questions: [
      'How many years of security experience do you have?',
      'What security environments have you worked in before?',
      'Have you supervised a team before?',
      'Do you have incident reporting experience?',
      'Are you comfortable using mobile apps or digital reporting tools while on duty?',
    ],
  },
  {
    title: 'Physical & Site Readiness',
    questions: [
      'Are you comfortable standing or walking for long periods?',
      'Are you comfortable working outdoors if required?',
      'Are you comfortable working alone at a site if assigned?',
    ],
  },
  {
    title: 'Short Written Responses',
    questions: [
      'Why are you interested in this security role?',
      'What type of security work do you prefer and why?',
      'What makes you a reliable candidate for this role?',
    ],
  },
]

function groupScreeningAnswers(screeningAnswers = []) {
  const answerMap = new Map(screeningAnswers)
  const grouped = screeningAnswerSections
    .map((section) => ({
      ...section,
      answers: section.questions
        .filter((question) => answerMap.has(question))
        .map((question) => [question, answerMap.get(question)]),
    }))
    .filter((section) => section.answers.length)

  const knownQuestions = new Set(screeningAnswerSections.flatMap((section) => section.questions))
  const otherAnswers = screeningAnswers.filter(([question]) => !knownQuestions.has(question))

  if (otherAnswers.length) {
    grouped.push({ title: 'Application Form Answers', answers: otherAnswers })
  }

  return grouped.length ? grouped : [{ title: 'Screening', answers: [['Screening', 'No screening answers recorded yet.']] }]
}

function ApplicantDetailPage() {
  const { applicantId } = useParams()
  const [actionState, setActionState] = useState({ busy: '', message: '', error: '' })
  const [applicantOverride, setApplicantOverride] = useState(null)
  const { data: backendApplicants, status, error } = useSupabaseData(fetchApplicants, dummyApplicants)
  const applicants = [...backendApplicants, ...getStoredApplications()]
  const selectedApplicant = applicants.find((item) => item.id === applicantId)
  const applicant = selectedApplicant && applicantOverride?.id === selectedApplicant.id
    ? { ...selectedApplicant, ...applicantOverride }
    : selectedApplicant

  async function handleDecision(decision) {
    setActionState({ busy: decision, message: '', error: '' })

    try {
      const result = await updateApplicantDecision(applicant, decision)
      setApplicantOverride({ id: applicant.id, ...result })
      setActionState({
        busy: '',
        message: `${decision} saved. Candidate is now in ${result.stage}.`,
        error: '',
      })
    } catch (decisionError) {
      setActionState({
        busy: '',
        message: '',
        error: decisionError.message,
      })
    }
  }

  async function handleAssignPlacement() {
    const placement = applicant.placementMatches?.[0] ?? applicant.placementRecommendation
    setActionState({ busy: 'Assign', message: '', error: '' })

    try {
      const result = await assignApplicantToPlacement(applicant, placement)
      setApplicantOverride({ id: applicant.id, ...result })
      setActionState({
        busy: '',
        message: `${applicant.name} assigned to ${result.assignedSite?.siteName ?? 'recommended site'} and marked hired.`,
        error: '',
      })
    } catch (assignmentError) {
      setActionState({
        busy: '',
        message: '',
        error: assignmentError.message,
      })
    }
  }

  if (status === 'loading') {
    return (
      <section className="max-w-3xl rounded-lg border border-white/[0.10] bg-[#0B111C] p-6 shadow-xl shadow-black/20">
        <PageHeader
          eyebrow="Applicant profile"
          title="Loading applicant"
          description="Fetching the latest applicant record from Supabase."
          variant="dark"
        />
      </section>
    )
  }

  if (!applicant) {
    return (
      <section className="max-w-3xl rounded-lg border border-white/[0.10] bg-[#0B111C] p-6 shadow-xl shadow-black/20">
        <PageHeader
          eyebrow="Applicant profile"
          title="Applicant not found"
          description={error?.message ?? 'This record may have been removed, filtered out, or not synced from the backend yet.'}
          variant="dark"
        />
        <Link
          to="/dashboard/applicants"
          className="mt-2 inline-flex rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white"
        >
          Back to applicant pipeline
        </Link>
      </section>
    )
  }

  const scores = getCandidateScores(applicant)
  const canUpdateDecision = isSupabaseRecord(applicant)
  const placementRecommendation = applicant.placementRecommendation ?? getPlacementRecommendation(applicant)
  const groupedScreeningAnswers = groupScreeningAnswers(applicant.screeningAnswers)

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          eyebrow="Applicant profile"
          title={applicant.name}
          description={`${applicant.role} | ${applicant.client} | ${applicant.location}`}
          variant="dark"
        />
        <div className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-4 shadow-xl shadow-black/20">
          <p className="mb-2 text-sm font-semibold text-zinc-400">Current status</p>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              statusClass[applicant.status] ?? statusClass['Needs Review']
            }`}
          >
            {applicant.status}
          </span>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Stage', applicant.stage],
          ['Overall score', scores.overallCandidateScore ? `${scores.overallCandidateScore}%` : 'Pending'],
          ['Knockout result', applicant.knockout],
          ['Final decision', applicant.decision],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20"
          >
            <p className="text-sm font-semibold text-zinc-500">{label}</p>
            <p className="mt-2 font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <CandidateScoreCard applicant={applicant} />
        <AiRecommendationPanel applicant={applicant} />
      </div>

      <div className="mb-6">
        <AiScreeningPanel applicant={applicant} />
      </div>

      <div className="mb-6">
        <PlacementRecommendationPanel applicant={applicant} />
      </div>

      <div className="mb-6">
        <AutomationTimeline applicant={applicant} />
      </div>

      <div className="mb-6">
        <AutomationEventsPanel events={applicant.automationEvents} />
      </div>

      <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <AutomationQueuePanel
          jobs={applicant.automationJobs}
          title="Applicant automation queue"
          description="Backend tasks queued for this candidate before real integrations are connected."
        />
        <InfoCard title="Workflow run">
          {applicant.workflowRuns?.length ? (
            <div className="space-y-3">
              {applicant.workflowRuns.map((run) => (
                <div key={run.id} className="rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
                  <DetailRow label="Workflow" value={run.name} />
                  <DetailRow label="Status" value={run.status} />
                  <DetailRow label="Current step" value={run.currentStep ?? 'Pending'} />
                  <DetailRow label="Next action" value={run.metadata?.nextAction ?? run.metadata?.blocker ?? 'Awaiting worker'} />
                </div>
              ))}
            </div>
          ) : (
            <p>No workflow run has been created yet.</p>
          )}
        </InfoCard>
      </div>

      <div className="mb-6">
        <InfoCard title="Notification queue">
          {applicant.notifications?.length ? (
            <div className="space-y-3">
              {applicant.notifications.map((notification) => (
                <div key={notification.id} className="rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
                  <DetailRow label="Channel" value={notification.channel} />
                  <DetailRow label="Recipient" value={notification.recipient} />
                  <DetailRow label="Status" value={notification.status} />
                  <p className="mt-3 rounded-md bg-white/[0.04] p-3">{notification.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No notifications are queued for this applicant yet.</p>
          )}
        </InfoCard>
      </div>

      <div className="mb-6">
        <StageHistoryPanel history={applicant.stageHistory} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <InfoCard title="Profile & contact">
          <DetailRow label="Phone" value={applicant.phone} />
          <DetailRow label="Email" value={applicant.email} />
          <DetailRow label="Applied" value={applicant.appliedAt} />
          <DetailRow label="Job applied for" value={applicant.role} />
        </InfoCard>

        <InfoCard title="Placement context">
          <DetailRow label="Assigned site" value={applicant.assignedSite?.siteName ?? 'Not assigned yet'} />
          <DetailRow label="Assigned shift" value={applicant.assignedShift?.shiftTitle ?? 'Not assigned yet'} />
          <DetailRow label="Recommended site" value={placementRecommendation.bestSite?.siteName ?? 'Not linked yet'} />
          <DetailRow label="Recommended shift" value={placementRecommendation.bestShift?.shiftTitle ?? 'Not linked yet'} />
          <DetailRow label="Required license" value={placementRecommendation.bestShift?.requiredLicenseType ?? 'Pending'} />
          <DetailRow label="Shift type" value={placementRecommendation.bestShift?.shiftType ?? 'Pending'} />
          <DetailRow label="Employment type" value={placementRecommendation.bestShift?.employmentType ?? 'Pending'} />
          <DetailRow label="Open positions" value={placementRecommendation.bestShift?.openPositions ?? 'Pending'} />
          <button
            type="button"
            disabled={Boolean(actionState.busy) || !canUpdateDecision || Boolean(applicant.assignedShift)}
            onClick={handleAssignPlacement}
            className="mt-4 w-full rounded-md bg-[#0084FF] px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionState.busy === 'Assign'
              ? 'Assigning...'
              : applicant.assignedShift
                ? 'Candidate assigned'
                : 'Assign to recommended shift'}
          </button>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Assignment updates the applicant record, marks the candidate hired, and reduces the selected shift count when this is a Supabase placement match.
          </p>
        </InfoCard>

        <InfoCard title="Documents">
          <div className="space-y-2">
            {documentRows.map(([label, key, documentType]) => {
              const documentFile = getDocumentFile(applicant, documentType)
              const documentStatus = applicant.documents?.[key] ?? 'Not Uploaded'

              return (
                <div key={key} className="flex flex-col gap-3 rounded-md border border-white/[0.08] bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{label}</p>
                    <p className="mt-1 text-sm text-zinc-400">Status: {documentStatus}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {documentFile?.fileName ?? 'No storage file attached'}
                    </p>
                  </div>
                  {documentFile ? (
                    <button
                      type="button"
                      onClick={() => openDocument(documentFile)}
                      className="w-fit rounded-md border border-white/[0.12] px-3 py-2 text-sm font-semibold text-white hover:border-[#0084FF] hover:text-[#0084FF]"
                    >
                      View file
                    </button>
                  ) : (
                    <span className="w-fit rounded-md border border-white/[0.08] px-3 py-2 text-sm font-semibold text-zinc-500">
                      No file uploaded
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <DetailRow label="License status" value={applicant.licenseStatus} />
        </InfoCard>

        <InfoCard title="AI resume summary">
          <p>{applicant.aiSummary}</p>
        </InfoCard>

        <InfoCard title="Screening answers">
          <div className="space-y-4">
            {groupedScreeningAnswers.map((section) => (
              <div key={section.title} className="rounded-md border border-white/[0.08] bg-white/[0.03] p-3">
                <p className="font-semibold text-white">{section.title}</p>
                <div className="mt-3 space-y-3">
                  {section.answers.map(([question, answer]) => (
                    <div key={question} className="rounded-md bg-white/[0.04] p-3">
                      <p className="font-semibold text-zinc-100">{question}</p>
                      <p className="mt-1 text-zinc-300">{answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Voice interview">
          <DetailRow
            label="Score"
            value={applicant.voiceInterview.score ?? 'Not available'}
          />
          <DetailRow label="Status" value={applicant.voiceInterview.status ?? applicant.interviewStatus} />
          <DetailRow label="Recording" value={applicant.voiceInterview.recordingUrl ? 'Placeholder recording available' : 'Not available'} />
          <p className="mt-4 rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
            {applicant.voiceInterview.transcript}
          </p>
          <p className="mt-3 font-semibold text-white">
            Recommendation: {applicant.voiceInterview.recommendation}
          </p>
        </InfoCard>

        <InfoCard title="Final in-person interview">
          <DetailRow label="Status" value={applicant.finalInterview?.status ?? 'Not Scheduled'} />
          <DetailRow label="Date/time" value={applicant.interviewTime} />
          <DetailRow label="Provider" value={applicant.finalInterview?.provider ?? 'Calendar placeholder'} />
          <DetailRow label="Interviewer" value={applicant.finalInterview?.interviewerEmail ?? 'Not assigned'} />
          <DetailRow
            label="Duration"
            value={applicant.finalInterview?.interviewDurationMinutes ? `${applicant.finalInterview.interviewDurationMinutes} minutes` : 'Not set'}
          />
          <DetailRow
            label="Buffer"
            value={applicant.finalInterview?.bufferMinutes ? `${applicant.finalInterview.bufferMinutes} minutes` : 'Not set'}
          />
          <DetailRow label="Sync status" value={applicant.finalInterview?.syncStatus ?? 'Not Connected'} />
          {applicant.finalInterview?.schedulingUrl ? (
            <a
              href={applicant.finalInterview.schedulingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-md border border-[#0084FF]/40 bg-[#0084FF]/10 px-4 py-2 font-semibold text-[#7CC0FF] hover:bg-[#0084FF]/20"
            >
              Open scheduling link
            </a>
          ) : (
            <p className="mt-4 rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
              Scheduling link has not synced yet.
            </p>
          )}
        </InfoCard>

        <InfoCard title="Notes & decision controls">
          <p>{applicant.notes}</p>
          {!canUpdateDecision ? (
            <p className="mt-4 rounded-md border border-amber-400/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-300">
              Decision actions are available for Supabase applicant records only. Open a Supabase-loaded applicant from the pipeline after the dashboard finishes loading.
            </p>
          ) : null}
          {actionState.message ? (
            <p className="mt-4 rounded-md border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">
              {actionState.message}
            </p>
          ) : null}
          {actionState.error ? (
            <p className="mt-4 rounded-md border border-red-400/25 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
              {actionState.error}
            </p>
          ) : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {['Advance', 'Hold', 'Reject'].map((decision) => (
              <button
                key={decision}
                type="button"
                disabled={Boolean(actionState.busy) || !canUpdateDecision}
                onClick={() => handleDecision(decision)}
                className="rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 font-semibold text-white hover:border-[#0084FF] hover:text-[#0084FF] disabled:cursor-wait disabled:opacity-60"
              >
                {actionState.busy === decision ? 'Saving...' : decision}
              </button>
            ))}
          </div>
        </InfoCard>
      </div>
    </section>
  )
}

export default ApplicantDetailPage




