import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { jobs } from '../data/dummyJobs'
import { getJobSiteContext } from '../data/dummySites'
import useSupabaseData from '../hooks/useSupabaseData'
import { fetchJobs } from '../services/supabaseData'

function JobsPage() {
  const { data: availableJobs, status, error } = useSupabaseData(fetchJobs, jobs)

  return (
    <section>
      <PageHeader
        eyebrow="Applicant portal"
        title="Open roles"
        description="Browse current openings and start a structured application. These listings can be embedded into a client career page or linked from job boards, QR codes, referrals, SMS, and email campaigns."
      />

      {status === 'error' ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Supabase jobs could not load, so demo jobs are showing. {error?.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {availableJobs.map((job) => {
          const { site, shift } = getJobSiteContext(job)

          return (
            <article
              key={job.id}
              className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5"
            >
              <p className="text-sm font-semibold text-[#0084FF]">{job.client}</p>
              <h2 className="mt-2 text-xl font-semibold text-[#111827]">
                {job.title}
              </h2>
              <div className="mt-4 space-y-2 text-sm leading-6 text-[#6B7280]">
                <p>{job.location}</p>
                <p>{job.type}</p>
                <p>{job.pay}</p>
                <p>{job.licenseRequired}</p>
                {site ? <p><span className="font-semibold text-[#111827]">Site:</span> {site.siteName}</p> : null}
                {shift ? <p><span className="font-semibold text-[#111827]">Shift:</span> {shift.shiftType} · {shift.employmentType}</p> : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {job.shifts.map((shiftOption) => (
                  <span
                    key={shiftOption}
                    className="rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#6B7280]"
                  >
                    {shiftOption}
                  </span>
                ))}
              </div>
              <Link
                to={`/jobs/${job.id}`}
                className="mt-5 inline-flex rounded-md bg-[#0084FF] px-4 py-2 text-sm font-semibold text-white"
              >
                View details
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default JobsPage

