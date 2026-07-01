import { useState } from 'react'
import { Link } from 'react-router-dom'
import AutomationTimeline from '../components/AutomationTimeline'
import PageHeader from '../components/PageHeader'
import { lookupApplicationStatus } from '../services/supabaseData'
import { getLastApplication } from '../utils/applicationStorage'

function ApplicationStatusPage() {
  const lastApplication = getLastApplication()
  const [form, setForm] = useState({ email: '', phone: '' })
  const [application, setApplication] = useState(lastApplication)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

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
        </>
      )}
    </section>
  )
}

export default ApplicationStatusPage
