const statusClass = {
  completed: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  queued: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
  blocked: 'border-purple-400/25 bg-purple-500/10 text-purple-300',
  failed: 'border-red-400/25 bg-red-500/10 text-red-300',
  not_started: 'border-white/[0.08] bg-white/[0.03] text-zinc-400',
}

function scoreValue(value) {
  return Number.isFinite(value) ? `${value}%` : 'Pending'
}

function AiScreeningPanel({ applicant }) {
  const screening = applicant.aiScreening ?? {}
  const categoryScores = screening.candidateContext?.categoryScores ?? {}
  const strengths = screening.candidateContext?.strengths ?? []
  const concerns = screening.candidateContext?.concerns ?? screening.riskFlags ?? []
  const suggestedNextStep = screening.candidateContext?.suggestedNextStep ?? 'Pending AI screening'
  const scores = [
    ['Eligibility', categoryScores.eligibility],
    ['Availability', categoryScores.availability ?? screening.availabilityScore],
    ['Transportation', categoryScores.transportation],
    ['Experience', categoryScores.experience ?? screening.roleFitScore],
    ['Site readiness', categoryScores.siteReadiness ?? screening.professionalismScore],
    ['Communication', screening.communicationScore],
  ]

  return (
    <section className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">AI screening assessment</h2>
          <p className="mt-1 text-sm text-zinc-500">{screening.templateName ?? 'Structured candidate scoring'}</p>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[screening.status] ?? statusClass.not_started}`}>
          {screening.status ?? 'not_started'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {scores.map(([label, value]) => (
          <div key={label} className="rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{scoreValue(value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-md border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="text-sm font-semibold text-zinc-500">AI summary</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          {screening.summary ?? 'AI screening has not generated a summary yet.'}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-4">
          <p className="text-sm font-semibold text-zinc-500">Recommendation</p>
          <p className="mt-2 font-semibold text-white">{screening.recommendation ?? 'Pending AI Screening'}</p>
        </div>
        <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-4">
          <p className="text-sm font-semibold text-zinc-500">Suggested next step</p>
          <p className="mt-2 font-semibold text-white">{suggestedNextStep}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-emerald-400/20 bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-emerald-200">Strengths</p>
          <p className="mt-2 text-sm leading-6 text-emerald-50">
            {strengths.length ? strengths.join(', ') : 'None recorded yet'}
          </p>
        </div>
        <div className="rounded-md border border-amber-400/20 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-200">Concerns</p>
          <p className="mt-2 text-sm leading-6 text-amber-50">
            {concerns.length ? concerns.join(', ') : 'None recorded'}
          </p>
        </div>
      </div>
    </section>
  )
}

export default AiScreeningPanel
