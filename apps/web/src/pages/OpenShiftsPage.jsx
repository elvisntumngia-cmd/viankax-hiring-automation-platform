import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { jobSites, openShifts } from '../data/dummySites'
import useSupabaseData from '../hooks/useSupabaseData'
import { fetchApplicants, fetchJobSites, fetchOpenShifts, saveOpenShift } from '../services/supabaseData'

const blankShift = {
  id: '',
  siteId: '',
  shiftTitle: '',
  shiftType: 'Day',
  employmentType: 'Full-time',
  daysNeeded: '',
  startTime: '',
  endTime: '',
  openPositions: 1,
  requiredLicenseType: 'SO',
  minimumExperience: '',
  requiredTraits: '',
  preferredTraits: '',
  urgency: 'Normal',
  status: 'Open',
}

const urgencyClass = {
  Normal: 'border-blue-400/30 bg-blue-500/15 text-blue-300',
  Urgent: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  Critical: 'border-red-400/30 bg-red-500/15 text-red-300',
}

const statusClass = {
  Open: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
  Filled: 'border-zinc-400/30 bg-zinc-500/15 text-zinc-300',
  Paused: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  Closed: 'border-red-400/30 bg-red-500/15 text-red-300',
}

function shiftToForm(shift) {
  return {
    id: shift.id,
    siteId: shift.siteId ?? '',
    shiftTitle: shift.shiftTitle,
    shiftType: shift.shiftType ?? 'Day',
    employmentType: shift.employmentType ?? 'Full-time',
    daysNeeded: shift.daysNeeded?.join(', ') ?? '',
    startTime: shift.startTime ?? '',
    endTime: shift.endTime ?? '',
    openPositions: shift.openPositions ?? 1,
    requiredLicenseType: shift.requiredLicenseType ?? 'SO',
    minimumExperience: shift.minimumExperience ?? '',
    requiredTraits: shift.requiredTraits?.join(', ') ?? '',
    preferredTraits: shift.preferredTraits?.join(', ') ?? '',
    urgency: shift.urgency ?? 'Normal',
    status: shift.status ?? 'Open',
  }
}

function OpenShiftsPage() {
  const { data: shifts, status, error } = useSupabaseData(fetchOpenShifts, openShifts)
  const { data: sites } = useSupabaseData(fetchJobSites, jobSites)
  const { data: applicants } = useSupabaseData(fetchApplicants, [])
  const [savedShifts, setSavedShifts] = useState([])
  const [form, setForm] = useState(blankShift)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)
  const managedShifts = [
    ...savedShifts,
    ...shifts.filter((shift) => !savedShifts.some((savedShift) => savedShift.id === shift.id)),
  ]

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submitShift(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setSaveError('')

    try {
      const savedShift = await saveOpenShift(form)
      setSavedShifts((current) => [
        savedShift,
        ...current.filter((shift) => shift.id !== savedShift.id),
      ])
      setForm(blankShift)
      setMessage(`${savedShift.shiftTitle} saved.`)
    } catch (shiftError) {
      setSaveError(shiftError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Staffing operations"
        title="Open shifts"
        description="Create and manage actual staffing needs by site, license type, shift, days, urgency, and open positions."
        variant="dark"
      />

      {status === 'error' ? (
        <div className="mb-5 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Open shift tables are not available yet, so demo shifts are showing. {error?.message}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(280px,420px)_minmax(0,1fr)]">
        <form onSubmit={submitShift} className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
          <h2 className="text-lg font-semibold text-white">{form.id ? 'Edit open shift' : 'Create open shift'}</h2>
          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-white">Site</span>
              <select value={form.siteId} onChange={(event) => setField('siteId', event.target.value)} required className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                <option value="">Select site</option>
                {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Shift title</span>
              <input value={form.shiftTitle} onChange={(event) => setField('shiftTitle', event.target.value)} required className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-white">Shift type</span>
                <select value={form.shiftType} onChange={(event) => setField('shiftType', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                  {['Day', 'Evening', 'Night', 'Overnight', 'Flexible'].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-white">Employment type</span>
                <select value={form.employmentType} onChange={(event) => setField('employmentType', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                  {['Full-time', 'Part-time', 'Temporary', 'Contract'].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-white">Days needed, comma separated</span>
              <input value={form.daysNeeded} onChange={(event) => setField('daysNeeded', event.target.value)} required className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" placeholder="Monday, Tuesday, Wednesday" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-white">Start time</span>
                <input value={form.startTime} onChange={(event) => setField('startTime', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" placeholder="7:00 AM" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-white">End time</span>
                <input value={form.endTime} onChange={(event) => setField('endTime', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" placeholder="3:00 PM" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-white">Open positions</span>
                <input type="number" min="1" value={form.openPositions} onChange={(event) => setField('openPositions', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-white">Required license</span>
                <select value={form.requiredLicenseType} onChange={(event) => setField('requiredLicenseType', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                  {['SO', 'SPO', 'Armed', 'Unarmed', 'None'].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-white">Minimum experience</span>
              <input value={form.minimumExperience} onChange={(event) => setField('minimumExperience', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Required traits, comma separated</span>
              <input value={form.requiredTraits} onChange={(event) => setField('requiredTraits', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Preferred traits, comma separated</span>
              <input value={form.preferredTraits} onChange={(event) => setField('preferredTraits', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-white">Urgency</span>
                <select value={form.urgency} onChange={(event) => setField('urgency', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                  {['Normal', 'Urgent', 'Critical'].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-white">Status</span>
                <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                  {['Open', 'Filled', 'Paused', 'Closed'].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>
          </div>
          {message ? <p className="mt-4 rounded-md border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
          {saveError ? <p className="mt-4 rounded-md border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-300">{saveError}</p> : null}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={busy} className="rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-70">
              {busy ? 'Saving...' : 'Save shift'}
            </button>
            {form.id ? (
              <button type="button" onClick={() => setForm(blankShift)} className="rounded-md border border-white/[0.12] px-5 py-3 font-semibold text-white">
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="grid gap-5">
          <div className="overflow-hidden rounded-lg border border-white/[0.10] bg-[#0B111C] shadow-xl shadow-black/20">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm xl:min-w-[980px]">
                <thead className="border-b border-white/[0.10] text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Shift</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">License</th>
                    <th className="px-4 py-3">Positions</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Urgency</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08] text-zinc-300">
                  {managedShifts.map((shift) => {
                    const assignedApplicants = applicants.filter((applicant) => applicant.openShiftId === shift.id)

                    return (
                    <tr key={shift.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">{shift.shiftTitle}</p>
                        <p className="mt-1 text-xs text-zinc-500">{shift.employmentType} - {shift.shiftType}</p>
                      </td>
                      <td className="px-4 py-4">{shift.siteName}</td>
                      <td className="px-4 py-4">
                        <p>{shift.daysNeeded.join(', ')}</p>
                        <p className="mt-1 text-xs text-zinc-500">{shift.startTime} - {shift.endTime}</p>
                      </td>
                      <td className="px-4 py-4">{shift.requiredLicenseType}</td>
                      <td className="px-4 py-4">{shift.openPositions}</td>
                      <td className="px-4 py-4">{assignedApplicants.length}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${urgencyClass[shift.urgency] ?? urgencyClass.Normal}`}>
                          {shift.urgency}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[shift.status] ?? statusClass.Open}`}>
                          {shift.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button type="button" onClick={() => setForm(shiftToForm(shift))} className="rounded-md border border-white/[0.12] px-3 py-2 text-xs font-semibold text-white hover:border-[#0084FF] hover:text-[#0084FF]">
                          Edit
                        </button>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {managedShifts.map((shift) => {
              const assignedApplicants = applicants.filter((applicant) => applicant.openShiftId === shift.id)

              return (
              <article key={`${shift.id}-traits`} className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
                <h2 className="font-semibold text-white">{shift.shiftTitle}</h2>
                <p className="mt-2 text-sm text-zinc-400">{shift.minimumExperience}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-500">Required traits</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shift.requiredTraits.map((trait) => (
                        <span key={trait} className="rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-300">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-500">Preferred traits</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shift.preferredTraits.map((trait) => (
                        <span key={trait} className="rounded-full border border-[#7C3AED]/25 bg-[#7C3AED]/10 px-3 py-1 text-xs font-semibold text-purple-200">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-sm font-semibold text-white">Assigned candidates</p>
                  <div className="mt-3 grid gap-2">
                    {assignedApplicants.length ? assignedApplicants.map((applicant) => (
                      <div key={applicant.id} className="flex flex-col gap-1 rounded-md bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-semibold text-zinc-100">{applicant.name}</span>
                        <span className="text-sm text-zinc-400">{applicant.stage}</span>
                      </div>
                    )) : (
                      <p className="text-sm text-zinc-500">No candidates assigned to this shift yet.</p>
                    )}
                  </div>
                </div>
              </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default OpenShiftsPage
