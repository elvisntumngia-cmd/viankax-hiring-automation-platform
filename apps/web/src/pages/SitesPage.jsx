import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { jobSites } from '../data/dummySites'
import useSupabaseData from '../hooks/useSupabaseData'
import { fetchClients, fetchJobSites, saveJobSite } from '../services/supabaseData'

const blankSite = {
  id: '',
  clientId: '',
  siteName: '',
  clientCustomerName: '',
  location: '',
  address: '',
  city: '',
  state: '',
  requiredLicenseType: 'SO',
  requiredTraits: '',
  preferredTraits: '',
  siteNotes: '',
  status: 'Active',
}

const statusClass = {
  Active: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
  Inactive: 'border-zinc-400/30 bg-zinc-500/15 text-zinc-300',
}

function siteToForm(site) {
  return {
    id: site.id,
    clientId: site.clientId ?? '',
    siteName: site.siteName,
    clientCustomerName: site.clientCustomerName ?? '',
    location: site.location,
    address: site.address ?? '',
    city: site.city ?? '',
    state: site.state ?? '',
    requiredLicenseType: site.requiredLicenseType ?? 'SO',
    requiredTraits: site.requiredTraits?.join(', ') ?? '',
    preferredTraits: site.preferredTraits?.join(', ') ?? '',
    siteNotes: site.siteNotes ?? '',
    status: site.status ?? 'Active',
  }
}

function SitesPage() {
  const { data: sites, status, error } = useSupabaseData(fetchJobSites, jobSites)
  const { data: clients } = useSupabaseData(fetchClients, [])
  const [savedSites, setSavedSites] = useState([])
  const [form, setForm] = useState(blankSite)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)
  const managedSites = [
    ...savedSites,
    ...sites.filter((site) => !savedSites.some((savedSite) => savedSite.id === site.id)),
  ]

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submitSite(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setSaveError('')

    try {
      const savedSite = await saveJobSite(form)
      setSavedSites((current) => [
        savedSite,
        ...current.filter((site) => site.id !== savedSite.id),
      ])
      setForm(blankSite)
      setMessage(`${savedSite.siteName} saved.`)
    } catch (siteError) {
      setSaveError(siteError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Workforce placement"
        title="Client sites"
        description="Create and manage real client locations and contract posts that open shifts and public job postings are built from."
        variant="dark"
      />

      {status === 'error' ? (
        <div className="mb-5 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Site tables are not available yet, so demo sites are showing. {error?.message}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
        <form onSubmit={submitSite} className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
          <h2 className="text-lg font-semibold text-white">{form.id ? 'Edit site' : 'Create site'}</h2>
          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-white">Client</span>
              <select value={form.clientId} onChange={(event) => setField('clientId', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                <option value="">No client selected</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
            {[
              ['siteName', 'Site name', true],
              ['clientCustomerName', 'Client/customer name', false],
              ['location', 'Location display', true],
              ['address', 'Address', false],
              ['city', 'City', false],
              ['state', 'State', false],
            ].map(([key, label, required]) => (
              <label key={key} className="block">
                <span className="text-sm font-semibold text-white">{label}</span>
                <input value={form[key]} onChange={(event) => setField(key, event.target.value)} required={required} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" />
              </label>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-white">Required license</span>
                <select value={form.requiredLicenseType} onChange={(event) => setField('requiredLicenseType', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                  {['SO', 'SPO', 'Armed', 'Unarmed', 'None'].map((license) => <option key={license} value={license}>{license}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-white">Status</span>
                <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-white">Required traits, comma separated</span>
              <input value={form.requiredTraits} onChange={(event) => setField('requiredTraits', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Preferred traits, comma separated</span>
              <input value={form.preferredTraits} onChange={(event) => setField('preferredTraits', event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Site notes</span>
              <textarea value={form.siteNotes} onChange={(event) => setField('siteNotes', event.target.value)} rows={4} className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]" />
            </label>
          </div>
          {message ? <p className="mt-4 rounded-md border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
          {saveError ? <p className="mt-4 rounded-md border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-300">{saveError}</p> : null}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={busy} className="rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-70">
              {busy ? 'Saving...' : 'Save site'}
            </button>
            {form.id ? (
              <button type="button" onClick={() => setForm(blankSite)} className="rounded-md border border-white/[0.12] px-5 py-3 font-semibold text-white">
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="grid gap-4">
          {managedSites.map((site) => (
            <article key={site.id} className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0084FF]">{site.clientCustomerName}</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{site.siteName}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{site.address} - {site.location}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[site.status] ?? statusClass.Inactive}`}>
                    {site.status}
                  </span>
                  <button type="button" onClick={() => setForm(siteToForm(site))} className="w-fit rounded-md border border-white/[0.12] px-3 py-2 text-sm font-semibold text-white hover:border-[#0084FF] hover:text-[#0084FF]">
                    Edit
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
                  <p className="text-xs font-semibold uppercase text-zinc-500">License</p>
                  <p className="mt-2 font-semibold text-white">{site.requiredLicenseType}</p>
                </div>
                <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
                  <p className="text-xs font-semibold uppercase text-zinc-500">Open shifts</p>
                  <p className="mt-2 font-semibold text-white">{site.openShiftsCount}</p>
                </div>
                <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
                  <p className="text-xs font-semibold uppercase text-zinc-500">State</p>
                  <p className="mt-2 font-semibold text-white">{site.state || 'Not set'}</p>
                </div>
              </div>

              <p className="mt-5 rounded-md border border-white/[0.08] bg-white/[0.04] p-3 text-sm leading-6 text-zinc-300">
                {site.siteNotes || 'No site notes yet.'}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default SitesPage
