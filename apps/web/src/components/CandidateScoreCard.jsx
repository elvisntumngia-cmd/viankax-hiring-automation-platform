import { formatScore, getCandidateScores, getScoreTone } from '../utils/candidateInsights'

const scoreLabels = [
  ['resumeScore', 'Resume'],
  ['eligibilityScore', 'Eligibility'],
  ['screeningScore', 'Screening'],
  ['voiceInterviewScore', 'Voice'],
]

const toneClasses = {
  strong: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
  review: 'bg-blue-500/15 text-blue-300 border-blue-400/25',
  risk: 'bg-red-500/15 text-red-300 border-red-400/25',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
}

function CandidateScoreCard({ applicant, compact = false }) {
  const scores = getCandidateScores(applicant)
  const overallTone = getScoreTone(scores.overallCandidateScore)

  return (
    <section className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-500">Overall candidate score</p>
          <p className="mt-2 text-4xl font-semibold text-white">
            {formatScore(scores.overallCandidateScore)}
          </p>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[overallTone]}`}>
          {overallTone === 'strong' ? 'Strong Candidate' : overallTone === 'risk' ? 'Risk Flag' : overallTone === 'pending' ? 'Pending Automation' : 'Review'}
        </span>
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-4'}`}>
        {scoreLabels.map(([key, label]) => {
          const tone = getScoreTone(scores[key])
          return (
            <div key={key} className="rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
              <p className={`mt-2 text-lg font-semibold ${toneClasses[tone].split(' ')[1]}`}>
                {formatScore(scores[key])}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default CandidateScoreCard
