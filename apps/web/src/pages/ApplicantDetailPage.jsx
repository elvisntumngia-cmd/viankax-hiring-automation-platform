import { useParams } from 'react-router-dom'
import AiRecommendationPanel from '../components/AiRecommendationPanel'
import AutomationTimeline from '../components/AutomationTimeline'
import CandidateScoreCard from '../components/CandidateScoreCard'
import PageHeader from '../components/PageHeader'
import { applicants as dummyApplicants } from '../data/dummyApplicants'
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

function ApplicantDetailPage() {
  const { applicantId } = useParams()
  const applicants = [...getStoredApplications(), ...dummyApplicants]
  const applicant =
    applicants.find((item) => item.id === applicantId) ?? applicants[0]
  const scores = getCandidateScores(applicant)

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
        <AutomationTimeline applicant={applicant} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <InfoCard title="Profile & contact">
          <DetailRow label="Phone" value={applicant.phone} />
          <DetailRow label="Email" value={applicant.email} />
          <DetailRow label="Applied" value={applicant.appliedAt} />
          <DetailRow label="Job applied for" value={applicant.role} />
        </InfoCard>

        <InfoCard title="Documents">
          <DetailRow label="Resume" value={applicant.documents.resume} />
          <DetailRow label="License / guard card" value={applicant.documents.license} />
          <DetailRow label="Government ID" value={applicant.documents.governmentId} />
          <DetailRow label="License status" value={applicant.licenseStatus} />
        </InfoCard>

        <InfoCard title="AI resume summary">
          <p>{applicant.aiSummary}</p>
        </InfoCard>

        <InfoCard title="Screening answers">
          <div className="space-y-3">
            {applicant.screeningAnswers.map(([question, answer]) => (
              <div key={question} className="rounded-md bg-white/[0.04] p-3">
                <p className="font-semibold text-white">{question}</p>
                <p className="mt-1">{answer}</p>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Voice interview">
          <DetailRow
            label="Score"
            value={applicant.voiceInterview.score ?? 'Not available'}
          />
          <DetailRow label="Status" value={applicant.interviewStatus} />
          <DetailRow label="Interview date/time" value={applicant.interviewTime} />
          <p className="mt-4 rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
            {applicant.voiceInterview.transcript}
          </p>
          <p className="mt-3 font-semibold text-white">
            Recommendation: {applicant.voiceInterview.recommendation}
          </p>
        </InfoCard>

        <InfoCard title="Notes & decision controls">
          <p>{applicant.notes}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {['Advance', 'Hold', 'Reject'].map((decision) => (
              <button
                key={decision}
                type="button"
                className="rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 font-semibold text-white hover:border-[#0084FF] hover:text-[#0084FF]"
              >
                {decision}
              </button>
            ))}
          </div>
        </InfoCard>
      </div>
    </section>
  )
}

export default ApplicantDetailPage




