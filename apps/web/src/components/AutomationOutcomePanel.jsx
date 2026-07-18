import { AlertTriangle, CheckCircle2, Clock3, MailCheck } from 'lucide-react'
import { getAutomationOutcome } from '../utils/candidateInsights'

const toneClass = {
  strong: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
  current: 'border-blue-400/25 bg-blue-500/10 text-blue-200',
  review: 'border-amber-400/25 bg-amber-500/10 text-amber-200',
  risk: 'border-red-400/25 bg-red-500/10 text-red-200',
  pending: 'border-white/[0.10] bg-white/[0.04] text-zinc-300',
}

const toneIcon = {
  strong: CheckCircle2,
  current: MailCheck,
  review: Clock3,
  risk: AlertTriangle,
  pending: Clock3,
}

function AutomationOutcomePanel({ applicant, compact = false }) {
  const outcome = getAutomationOutcome(applicant)
  const Icon = toneIcon[outcome.tone] ?? Clock3

  return (
    <section className={`rounded-lg border p-5 shadow-xl shadow-black/20 ${toneClass[outcome.tone] ?? toneClass.pending}`}>
      <div className="flex items-start gap-3">
        <Icon size={22} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">{outcome.title}</h2>
            <span className="rounded-full border border-current/30 px-2.5 py-1 text-xs font-semibold">
              {outcome.status}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-200">{outcome.summary}</p>
          {!compact ? (
            <>
              <p className="mt-3 text-sm font-semibold text-white">Next step: {outcome.nextStep}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {outcome.bullets.map((bullet) => (
                  <span key={bullet} className="rounded-md border border-white/[0.12] bg-black/15 px-3 py-1 text-xs font-semibold">
                    {bullet}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default AutomationOutcomePanel
