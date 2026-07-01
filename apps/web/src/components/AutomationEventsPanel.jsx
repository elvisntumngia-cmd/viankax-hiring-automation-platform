const stateClass = {
  complete: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  current: 'border-blue-400/25 bg-blue-500/10 text-blue-300',
  pending: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
  failed: 'border-red-400/25 bg-red-500/10 text-red-300',
}

function formatEventTime(dateValue) {
  if (!dateValue) return 'No timestamp'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateValue))
}

function AutomationEventsPanel({ events = [] }) {
  const sortedEvents = [...events].sort((first, second) => {
    if (!first.createdAt || !second.createdAt) return 0
    return new Date(second.createdAt) - new Date(first.createdAt)
  })

  return (
    <section className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Automation events</h2>
          <p className="mt-1 text-sm text-zinc-500">Raw workflow log from the automation engine.</p>
        </div>
        <span className="w-fit rounded-full border border-white/[0.10] px-3 py-1 text-xs font-semibold text-zinc-400">
          {sortedEvents.length} events
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {sortedEvents.length ? (
          sortedEvents.map((event) => (
            <article key={`${event.type}-${event.createdAt ?? event.label}`} className="rounded-md border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{event.label}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{event.type}</p>
                </div>
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${stateClass[event.status] ?? stateClass.pending}`}>
                  {event.status}
                </span>
              </div>
              {event.description ? (
                <p className="mt-3 text-sm leading-6 text-zinc-300">{event.description}</p>
              ) : null}
              <p className="mt-3 text-xs font-semibold text-zinc-500">{formatEventTime(event.createdAt)}</p>
            </article>
          ))
        ) : (
          <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-zinc-400">
            No automation events have been recorded yet.
          </div>
        )}
      </div>
    </section>
  )
}

export default AutomationEventsPanel
