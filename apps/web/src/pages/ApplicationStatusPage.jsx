import { Link } from 'react-router-dom'
import AutomationTimeline from '../components/AutomationTimeline'
import PageHeader from '../components/PageHeader'
import { getLastApplication } from '../utils/applicationStorage'

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
          <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-800">
            Automation engine: dashboard sync complete. AI screening, license review,
            voice interview, and scheduling updates will appear here as they run.
          </div>
        </aside>

        <AutomationTimeline applicant={application} variant="light" />
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
