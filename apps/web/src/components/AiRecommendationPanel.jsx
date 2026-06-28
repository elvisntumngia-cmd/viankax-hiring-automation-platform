import { BrainCircuit } from 'lucide-react'
import { getAiRecommendation, formatScore } from '../utils/candidateInsights'

function AiRecommendationPanel({ applicant }) {
  const recommendation = getAiRecommendation(applicant)

  return (
    <section className="rounded-lg border border-violet-400/20 bg-violet-500/10 p-5 shadow-xl shadow-black/20">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-300/25 bg-violet-400/15 text-violet-200">
          <BrainCircuit size={21} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-200">
            AI Recommendation
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{recommendation.label}</h2>
          <p className="mt-1 text-sm font-semibold text-violet-200">
            Confidence: {formatScore(recommendation.confidence)}
          </p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-zinc-200">{recommendation.summary}</p>
    </section>
  )
}

export default AiRecommendationPanel
