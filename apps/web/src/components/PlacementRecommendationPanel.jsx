import { getPlacementRecommendation } from '../data/dummySites'

function PlacementRecommendationPanel({ applicant }) {
  const recommendation = getPlacementRecommendation(applicant)

  return (
    <section className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">AI placement recommendation</h2>
          <p className="mt-1 text-sm text-zinc-500">Best-fit site and shift matching layer</p>
        </div>
        <div className="w-fit rounded-md border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-300">
          {recommendation.matchScore}% match
        </div>
      </div>

      <div className="mt-5 rounded-md border border-[#0084FF]/20 bg-[#0084FF]/10 p-4">
        <p className="text-sm font-semibold text-blue-200">Best match</p>
        <p className="mt-2 text-xl font-semibold text-white">{recommendation.bestSite?.siteName ?? 'Site pending'}</p>
        <p className="mt-1 text-sm text-zinc-300">{recommendation.bestShift?.shiftTitle ?? 'Shift pending'}</p>
        <p className="mt-3 text-sm leading-6 text-zinc-300">{recommendation.reason}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-zinc-500">Match strengths</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommendation.strengths.map((strength) => (
              <span key={strength} className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                {strength}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-500">Review concerns</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommendation.concerns.map((concern) => (
              <span key={concern} className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                {concern}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-zinc-500">Alternative matches</p>
        <div className="mt-3 grid gap-3">
          {recommendation.alternatives.map((alternative) => (
            <div key={alternative.shiftId} className="flex flex-col gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-white">{alternative.site?.siteName ?? 'Site pending'}</p>
                <p className="mt-1 text-sm text-zinc-400">{alternative.shift?.shiftTitle ?? 'Shift pending'}</p>
              </div>
              <span className="w-fit rounded-full border border-white/[0.10] bg-white/[0.06] px-3 py-1 text-xs font-semibold text-zinc-200">
                {alternative.score}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PlacementRecommendationPanel
