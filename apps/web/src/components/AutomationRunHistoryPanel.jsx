const statusClass = {
  complete: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  current: 'border-blue-400/25 bg-blue-500/10 text-blue-300',
  pending: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
  failed: 'border-red-400/25 bg-red-500/10 text-red-300',
}

function formatHistoryTime(dateValue) {
  if (!dateValue) return 'No timestamp'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateValue))
}

function AutomationRunHistoryPanel({ history = [] }) {
  return (
    <section className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Automation run history</h2>
          <p className="mt-1 text-sm text-zinc-500">Recent processor events, provider markers, and applicant workflow activity.</p>
        </div>
        <span className="w-fit rounded-full border border-white/[0.10] px-3 py-1 text-xs font-semibold text-zinc-400">
          {history.length} records
        </span>
      </div>

      <div className="mt-5 divide-y divide-white/[0.08] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03]">
        {history.length ? (
          history.map((event) => (
            <article key={event.id} className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{event.label}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {event.applicantName} | {event.role} | {event.applicantStage}
                  </p>
                  {event.description ? (
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{event.description}</p>
                  ) : null}
                </div>
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[event.status] ?? statusClass.pending}`}>
                  {event.status}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs font-semibold text-zinc-500 sm:grid-cols-3">
                <p>Processor: {event.processor}</p>
                <p>Provider: {event.provider}</p>
                <p>Time: {formatHistoryTime(event.createdAt)}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="p-4 text-sm text-zinc-400">No automation run history is available yet.</div>
        )}
      </div>
    </section>
  )
}

export default AutomationRunHistoryPanel
