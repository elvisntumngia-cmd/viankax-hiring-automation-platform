import { CheckCircle2, Clock, FileCheck2, Mic, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { getLastApplication } from '../utils/applicationStorage'

const statusSteps = [
  {
    label: 'Application received',
    description: 'Your application has been submitted and added to the hiring pipeline.',
    icon: CheckCircle2,
    state: 'complete',
  },
  {
    label: 'Resume review',
    description: 'The hiring team or future AI screening layer reviews your resume and application details.',
    icon: FileCheck2,
    state: 'current',
  },
  {
    label: 'AI screening assessment',
    description: 'If selected, you may receive a link for additional screening questions.',
    icon: Clock,
    state: 'pending',
  },
  {
    label: 'Voice interview',
    description: 'Future voice interview automation will assess communication and role fit.',
    icon: Mic,
    state: 'pending',
  },
  {
    label: 'Interview scheduling',
    description: 'Qualified candidates receive scheduling instructions for the next interview step.',
    icon: CalendarDays,
    state: 'pending',
  },
]

function stepClasses(state) {
  if (state === 'complete') return 'border-green-200 bg-green-50 text-green-700'
  if (state === 'current') return 'border-blue-200 bg-blue-50 text-[#0084FF]'
  return 'border-[#E5E7EB] bg-white text-[#6B7280]'
}

function ApplicationStatusPage() {
  const application = getLastApplication()

  if (!application) {
    return (
      <section className="max-w-3xl">
        <PageHeader
          eyebrow="Application status"
          title="No application found"
          description="Submit an application first, then return here to view the latest saved status on this device."
        />
        <Link
          to="/jobs"
          className="inline-flex rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white"
        >
          Browse jobs
        </Link>
      </section>
    )
  }

  return (
    <section className="max-w-5xl">
      <PageHeader
        eyebrow="Application status"
        title="Your application progress"
        description="This is a candidate-facing status view for the latest application saved on this device. Login-based status tracking will come later."
      />

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Application summary</h2>
          <div className="mt-4 grid gap-3 text-sm text-[#4B5563]">
            <p><span className="font-semibold text-[#111827]">Applicant:</span> {application.applicantName || application.name}</p>
            <p><span className="font-semibold text-[#111827]">Job:</span> {application.jobTitle || application.role}</p>
            <p><span className="font-semibold text-[#111827]">Client:</span> {application.client}</p>
            <p><span className="font-semibold text-[#111827]">Stage:</span> {application.stage}</p>
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
        </aside>

        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Next steps</h2>
          <div className="mt-5 grid gap-3">
            {statusSteps.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.label}
                  className={`flex gap-4 rounded-lg border p-4 ${stepClasses(step.state)}`}
                >
                  <span className="mt-1 shrink-0">
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="font-semibold">{step.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[#6B7280]">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
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
    </section>
  )
}

export default ApplicationStatusPage
