import { CalendarDays, CheckCircle2, LockKeyhole, PhoneCall, ShieldCheck, Workflow } from 'lucide-react'
import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import useSupabaseData from '../hooks/useSupabaseData'
import { defaultCalendarSettings, fetchCalendarSettings, saveCalendarSettings } from '../services/supabaseData'

const readinessItems = [
  {
    title: 'Automation runner',
    status: 'Enabled',
    description: 'New applications and completed AI screenings kick the Supabase automation runner automatically.',
    icon: Workflow,
  },
  {
    title: 'Voice calls',
    status: 'Immediate',
    description: 'Vapi calls can run immediately after qualifying AI screening. Duplicate calls are still blocked.',
    icon: PhoneCall,
  },
  {
    title: 'Calendar sync',
    status: 'Integration-ready',
    description: 'Final interviews can sync to Google Calendar after OAuth is connected and pending events are ready.',
    icon: CalendarDays,
  },
  {
    title: 'Production security',
    status: 'Planned',
    description: 'Demo policies are documented separately so we can tighten RLS without breaking the live demo flow.',
    icon: ShieldCheck,
  },
]

function DashboardSettingsPage() {
  const [settingsDraft, setSettingsDraft] = useState(null)
  const [saveState, setSaveState] = useState({ busy: false, message: '', error: '' })
  const {
    data: savedSettings,
    status,
    error,
    reload,
  } = useSupabaseData(fetchCalendarSettings, defaultCalendarSettings)
  const settings = settingsDraft ?? savedSettings

  function updateSetting(key, value) {
    setSettingsDraft((current) => ({
      ...(current ?? settings),
      [key]: value,
    }))
  }

  async function handleSave() {
    setSaveState({ busy: true, message: '', error: '' })

    try {
      const saved = await saveCalendarSettings(settings)
      setSettingsDraft(saved)
      await reload()
      setSaveState({ busy: false, message: 'Settings saved.', error: '' })
    } catch (saveError) {
      setSaveState({ busy: false, message: '', error: saveError.message })
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Admin settings"
        title="Platform Settings"
        description="Control the hiring automation defaults HR can safely manage before deeper production integrations are connected."
        variant="dark"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {readinessItems.map((item) => {
          const Icon = item.icon

          return (
            <article key={item.title} className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
              <Icon size={22} className="text-[#7CC0FF]" />
              <p className="mt-4 font-semibold text-white">{item.title}</p>
              <p className="mt-2 w-fit rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                {item.status}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{item.description}</p>
            </article>
          )
        })}
      </div>

      <section className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-blue-500/15 p-2 text-blue-300">
              <CalendarDays size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Final interview scheduling defaults</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                These settings feed the automated final interview schedule after voice interview completion.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Calendar provider</span>
              <select
                value={settings.provider}
                onChange={(event) => updateSetting('provider', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm font-medium text-white outline-none focus:border-[#0084FF]"
              >
                <option>Internal calendar</option>
                <option>Google Calendar</option>
                <option>Microsoft Outlook</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Interviewer email</span>
              <input
                value={settings.interviewerEmail}
                onChange={(event) => updateSetting('interviewerEmail', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm text-white outline-none focus:border-[#0084FF]"
                placeholder="hr@viankax.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Interview duration</span>
              <select
                value={settings.interviewDuration}
                onChange={(event) => updateSetting('interviewDuration', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm font-medium text-white outline-none focus:border-[#0084FF]"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Buffer time</span>
              <select
                value={settings.bufferTime}
                onChange={(event) => updateSetting('bufferTime', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm font-medium text-white outline-none focus:border-[#0084FF]"
              >
                <option value="0">No buffer</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-zinc-300">Scheduling rule</span>
              <input
                value={settings.schedulingWindow}
                onChange={(event) => updateSetting('schedulingWindow', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.10] bg-[#080D14] px-4 py-3 text-sm text-white outline-none focus:border-[#0084FF]"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-400">
              {status === 'loading' ? 'Loading settings...' : 'Settings are saved in Supabase calendar_settings.'}
              {error ? <span className="block text-amber-200">Using defaults until settings load successfully.</span> : null}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState.busy}
              className="inline-flex w-fit items-center justify-center rounded-md bg-[#0084FF] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70"
            >
              {saveState.busy ? 'Saving...' : 'Save settings'}
            </button>
          </div>

          {(saveState.message || saveState.error) ? (
            <div className={`mt-4 rounded-lg border p-4 text-sm font-semibold ${
              saveState.error
                ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
            }`}
            >
              {saveState.error || saveState.message}
            </div>
          ) : null}
        </div>

        <aside className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-violet-500/15 p-2 text-violet-300">
              <LockKeyhole size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Production controls</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Sensitive keys stay in Supabase/Vercel secrets. The frontend only uses public Supabase values.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {[
              ['Supabase Auth', 'HR access is protected behind login routes.'],
              ['Vapi', 'Private API key is only read by Edge Functions.'],
              ['OpenAI', 'Screening evaluation runs server-side.'],
              ['Resend', 'Email sending stays behind Edge Function secrets.'],
              ['Storage', 'Document policies should be tightened before customer launch.'],
            ].map(([label, description]) => (
              <div key={label} className="rounded-md border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-300" />
                  <p className="font-semibold text-white">{label}</p>
                </div>
                <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </section>
  )
}

export default DashboardSettingsPage
