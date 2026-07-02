import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { getJobSiteContext } from '../data/dummySites'
import useSupabaseData from '../hooks/useSupabaseData'
import { fetchAllJobs, fetchClients, fetchJobSites, fetchOpenShifts, saveJob } from '../services/supabaseData'

const blankJob = {
  id: '',
  clientId: '',
  siteId: '',
  openShiftId: '',
  title: '',
  location: '',
  pay: '',
  shifts: '',
  licenseRequired: '',
  requirements: '',
  responsibilities: '',
  publicApplySlug: '',
  publicApplyUrl: '',
  status: 'open',
}

function jobToForm(job) {
  return {
    id: job.id,
    clientId: job.clientId ?? '',
    siteId: job.siteId ?? '',
    openShiftId: job.openShiftId ?? '',
    title: job.title,
    location: job.location,
    pay: job.pay,
    shifts: job.shifts?.join(', ') ?? '',
    licenseRequired: job.licenseRequired ?? '',
    requirements: job.requirements?.join(', ') ?? '',
    responsibilities: job.responsibilities?.join(', ') ?? '',
    publicApplySlug: job.publicApplySlug ?? '',
    publicApplyUrl: job.publicApplyUrl ?? `/apply/${job.id}`,
    status: job.type === 'Open role' ? 'open' : job.type,
  }
}

function DashboardJobsPage() {
  const { data: jobs, status, error } = useSupabaseData(fetchAllJobs, [])
  const { data: clients } = useSupabaseData(fetchClients, [])
  const { data: sites } = useSupabaseData(fetchJobSites, [])
  const { data: shifts } = useSupabaseData(fetchOpenShifts, [])
  const [savedJobs, setSavedJobs] = useState([])
  const [form, setForm] = useState(blankJob)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)
  const managedJobs = [
    ...savedJobs,
    ...jobs.filter((job) => !savedJobs.some((savedJob) => savedJob.id === job.id)),
  ]

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function applyShift(shiftId) {
    const shift = shifts.find((item) => item.id === shiftId)
    const site = shift ? sites.find((item) => item.id === shift.siteId) : null

    setForm((current) => ({
      ...current,
      openShiftId: shiftId,
      siteId: shift?.siteId ?? current.siteId,
      title: current.title || shift?.shiftTitle || '',
      location: current.location || site?.location || '',
      shifts: current.shifts || shift?.shiftType || '',
      licenseRequired: current.licenseRequired || shift?.requiredLicenseType || '',
      requirements: current.requirements || [
        shift?.minimumExperience,
        ...(shift?.requiredTraits ?? []),
      ].filter(Boolean).join(', '),
      publicApplySlug: current.publicApplySlug || shift?.shiftTitle?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '',
    }))
  }

  async function submitJob(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setSaveError('')

    try {
      const savedJob = await saveJob(form)
      setSavedJobs((current) => [
        savedJob,
        ...current.filter((job) => job.id !== savedJob.id),
      ])
      setForm(blankJob)
      setMessage(`${savedJob.title} saved.`)
    } catch (jobError) {
      setSaveError(jobError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Job management"
        title="Jobs"
        description="Create, edit, close, and reopen job entry points that feed the applicant portal and automation engine."
        variant="dark"
      />

      {status === 'error' ? (
        <div className="mb-5 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Jobs could not load from Supabase. {error?.message}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
        <form onSubmit={submitJob} className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
          <h2 className="text-lg font-semibold text-white">{form.id ? 'Edit job' : 'Create job'}</h2>
          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-white">Client</span>
              <select value={form.clientId} onChange={(event) => setField('clientId', event.target.value)} required className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                <option value="">Select client</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Linked site</span>
              <select value={form.siteId} onChange={(event) => setField('siteId', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                <option value="">Not linked</option>
                {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Create from open shift</span>
              <select value={form.openShiftId} onChange={(event) => applyShift(event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                <option value="">Not linked</option>
                {shifts
                  .filter((shift) => !form.siteId || shift.siteId === form.siteId)
                  .map((shift) => <option key={shift.id} value={shift.id}>{shift.shiftTitle} - {shift.siteName}</option>)}
              </select>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Selecting a shift links this public job posting to the staffing need and can prefill the posting fields.
              </p>
            </label>
            {[
              ['title', 'Job title'],
              ['location', 'Location'],
              ['pay', 'Pay range'],
              ['shifts', 'Shift options, comma separated'],
              ['licenseRequired', 'License requirements, comma separated'],
              ['requirements', 'Requirements, comma separated'],
              ['responsibilities', 'Responsibilities, comma separated'],
              ['publicApplySlug', 'Public apply slug'],
              ['publicApplyUrl', 'Public apply URL'],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-sm font-semibold text-white">{label}</span>
                <input value={form[key]} onChange={(event) => setField(key, event.target.value)} required={['title', 'location'].includes(key)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" />
              </label>
            ))}
            <label className="block">
              <span className="text-sm font-semibold text-white">Status</span>
              <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          </div>
          {message ? <p className="mt-4 rounded-md border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
          {saveError ? <p className="mt-4 rounded-md border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-300">{saveError}</p> : null}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={busy} className="rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-70">
              {busy ? 'Saving...' : 'Save job'}
            </button>
            {form.id ? (
              <button type="button" onClick={() => setForm(blankJob)} className="rounded-md border border-white/[0.12] px-5 py-3 font-semibold text-white">
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
          <h2 className="text-lg font-semibold text-white">Managed jobs</h2>
          <div className="mt-4 grid gap-3">
            {managedJobs.map((job) => (
              <JobRow key={job.id} job={job} onEdit={() => setForm(jobToForm(job))} />
            ))}
            {!managedJobs.length ? (
              <p className="rounded-md border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-zinc-400">No jobs found.</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function JobRow({ job, onEdit }) {
  const { site, shift } = getJobSiteContext(job)

  return (
    <article className="rounded-md border border-white/[0.08] bg-white/[0.04] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-white">{job.title}</p>
          <p className="mt-1 text-sm text-zinc-400">{job.client} | {job.location}</p>
          <p className="mt-1 text-sm text-zinc-500">{job.pay}</p>
        </div>
        <button type="button" onClick={onEdit} className="w-fit rounded-md border border-white/[0.12] px-3 py-2 text-sm font-semibold text-white hover:border-[#0084FF] hover:text-[#0084FF]">
          Edit
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-white/[0.08] bg-[#080D14] p-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">Linked site</p>
          <p className="mt-2 text-sm font-semibold text-white">{site?.siteName ?? 'Not linked yet'}</p>
        </div>
        <div className="rounded-md border border-white/[0.08] bg-[#080D14] p-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">Open shift</p>
          <p className="mt-2 text-sm font-semibold text-white">{shift?.shiftTitle ?? 'Not linked yet'}</p>
        </div>
        <div className="rounded-md border border-white/[0.08] bg-[#080D14] p-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">Apply link</p>
          <p className="mt-2 break-all text-sm font-semibold text-white">/apply/{job.id}</p>
        </div>
      </div>
    </article>
  )
}

export default DashboardJobsPage
