import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { jobs } from '../data/dummyJobs'

function BulletList({ title, items, accent = '#0084FF' }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-[#111827]">{title}</h2>
      <ul className="mt-4 space-y-3 text-[#4B5563]">
        {items.map((item) => (
          <li key={item} className="flex gap-3 leading-6">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function JobDetailsPage() {
  const { jobId } = useParams()
  const job = jobs.find((item) => item.id === jobId) ?? jobs[0]

  return (
    <section>
      <PageHeader
        eyebrow={job.client}
        title={job.title}
        description={`${job.location} | ${job.type} | ${job.pay}`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="space-y-4">
          <BulletList title="Requirements" items={job.requirements} />
          <BulletList
            title="Responsibilities"
            items={job.responsibilities}
            accent="#7C3AED"
          />
        </div>

        <aside className="h-fit rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#111827]">Apply now</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[#6B7280]">
            <p>
              <span className="font-semibold text-[#111827]">Shift options:</span>{' '}
              {job.shifts.join(', ')}
            </p>
            <p>
              <span className="font-semibold text-[#111827]">License:</span>{' '}
              {job.licenseRequired}
            </p>
            <p>
              Application includes knockout screening, document upload fields,
              and basic screening questions.
            </p>
          </div>
          <Link
            to={`/apply/${job.id}`}
            className="mt-6 inline-flex w-full justify-center rounded-md bg-[#0084FF] px-4 py-3 font-semibold text-white"
          >
            Start application
          </Link>
          <Link
            to="/jobs"
            className="mt-3 inline-flex w-full justify-center rounded-md border border-[#E5E7EB] bg-white px-4 py-3 font-semibold text-[#111827]"
          >
            Back to jobs
          </Link>
        </aside>
      </div>
    </section>
  )
}

export default JobDetailsPage

