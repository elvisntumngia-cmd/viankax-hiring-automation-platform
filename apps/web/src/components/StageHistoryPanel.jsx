function formatHistoryTime(dateValue) {
  if (!dateValue) return 'No timestamp'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateValue))
}

function StageHistoryPanel({ history = [] }) {
  const sortedHistory = [...history].sort((first, second) => {
    if (!first.createdAt || !second.createdAt) return 0
    return new Date(second.createdAt) - new Date(first.createdAt)
  })

  return (
    <section className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Pipeline stage history</h2>
          <p className="mt-1 text-sm text-zinc-500">Audit trail for HR and automation stage movement.</p>
        </div>
        <span className="w-fit rounded-full border border-white/[0.10] px-3 py-1 text-xs font-semibold text-zinc-400">
          {sortedHistory.length} changes
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {sortedHistory.length ? (
          sortedHistory.map((entry) => (
            <article key={`${entry.fromStage}-${entry.toStage}-${entry.createdAt}`} className="rounded-md border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-white">
                    {entry.fromStage || 'Start'} to {entry.toStage}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Changed by {entry.changedBy || 'system'}
                  </p>
                </div>
                <p className="text-xs font-semibold text-zinc-500">{formatHistoryTime(entry.createdAt)}</p>
              </div>
              {entry.reason ? (
                <p className="mt-3 text-sm leading-6 text-zinc-300">{entry.reason}</p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-zinc-400">
            No pipeline stage changes have been recorded yet.
          </div>
        )}
      </div>
    </section>
  )
}

export default StageHistoryPanel
