const statusClass = {
  queued: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
  running: 'border-blue-400/25 bg-blue-500/10 text-blue-300',
  completed: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  blocked: 'border-purple-400/25 bg-purple-500/10 text-purple-300',
  failed: 'border-red-400/25 bg-red-500/10 text-red-300',
}

function formatQueueTime(dateValue) {
  if (!dateValue) return 'Not scheduled'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateValue))
}

function AutomationQueuePanel({ jobs = [], title = 'Automation queue', description = 'Queued backend tasks waiting for worker functions or integrations.' }) {
  const sortedJobs = [...jobs].sort((first, second) => {
    if (!first.scheduledFor || !second.scheduledFor) return 0
    return new Date(first.scheduledFor) - new Date(second.scheduledFor)
  })

  const counts = sortedJobs.reduce((summary, job) => {
    summary[job.status] = (summary[job.status] ?? 0) + 1
    return summary
  }, {})

  return (
    <section className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['queued', 'running', 'blocked', 'completed', 'failed'].map((status) => (
            <span key={status} className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[status]}`}>
              {status}: {counts[status] ?? 0}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {sortedJobs.length ? (
          sortedJobs.map((job) => (
            <article key={job.id ?? `${job.type}-${job.scheduledFor}`} className="rounded-md border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{job.label}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{job.type}</p>
                  {job.applicantName ? (
                    <p className="mt-2 text-sm text-zinc-400">
                      {job.applicantName} | {job.role} | {job.applicantStage}
                    </p>
                  ) : null}
                </div>
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[job.status] ?? statusClass.queued}`}>
                  {job.status}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs font-semibold text-zinc-500 sm:grid-cols-3">
                <p>Priority: {job.priority ?? 'n/a'}</p>
                <p>Attempts: {job.attempts ?? 0}</p>
                <p>Scheduled: {formatQueueTime(job.scheduledFor)}</p>
              </div>
              {job.lastError ? (
                <p className="mt-3 rounded-md border border-red-400/25 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
                  {job.lastError}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-zinc-400">
            No automation jobs have been queued yet.
          </div>
        )}
      </div>
    </section>
  )
}

export default AutomationQueuePanel
