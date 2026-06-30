import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { getLastApplication } from '../utils/applicationStorage'

function readLastSubmission() {
  return getLastApplication()
}

function ApplicationSuccessPage() {
  const [submission] = useState(readLastSubmission)

  return (
    <section className="max-w-3xl">
      <PageHeader
        eyebrow="Submitted"
        title="Application received"
        description="Your application has been submitted. In the real workflow, the system will send confirmation messages and begin screening steps automatically."
      />

      {submission ? (
        <div className="mb-5 rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Submission summary</h2>
          <div className="mt-4 grid gap-3 text-sm text-[#4B5563] sm:grid-cols-2">
            <p><span className="font-semibold text-[#111827]">Applicant:</span> {submission.applicantName}</p>
            <p><span className="font-semibold text-[#111827]">Job:</span> {submission.jobTitle}</p>
            <p><span className="font-semibold text-[#111827]">Client:</span> {submission.client}</p>
            <p><span className="font-semibold text-[#111827]">Pipeline stage:</span> {submission.stage}</p>
          </div>
          <div
            className={`mt-4 rounded-md border p-3 text-sm font-medium ${
              submission.knockoutResult === 'Passed'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            Knockout screening: {submission.knockoutResult}
          </div>
          <div
            className={`mt-3 rounded-md border p-3 text-sm font-medium ${
              submission.syncedToSupabase
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            Database sync: {submission.syncedToSupabase ? 'Saved to Supabase' : 'Saved locally for demo fallback'}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-6 text-[#4B5563] shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">What happens next</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6">
          {[
            'Confirmation SMS/email is sent to the applicant.',
            'The candidate enters the HR pipeline as New Applicant.',
            'Automation engine syncs the candidate record to the HR dashboard.',
            'AI resume screening, license check, voice interview, and auto-scheduling can be triggered in later phases.',
          ].map((item) => (
            <p key={item} className="rounded-md bg-[#F8FAFC] p-3">
              {item}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/jobs"
          className="inline-flex justify-center rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white"
        >
          Return to jobs
        </Link>
        <Link
          to="/status"
          className="inline-flex justify-center rounded-md border border-[#D1D5DB] bg-white px-5 py-3 font-semibold text-[#111827]"
        >
          View application status
        </Link>
      </div>
    </section>
  )
}

export default ApplicationSuccessPage




