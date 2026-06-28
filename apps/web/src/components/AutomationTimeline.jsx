import { CheckCircle2, Circle, Clock3 } from 'lucide-react'
import { getAutomationTimeline } from '../utils/candidateInsights'

const stateIcon = {
  complete: CheckCircle2,
  current: Clock3,
  pending: Circle,
}

const darkStateClass = {
  complete: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  current: 'border-blue-400/25 bg-blue-500/10 text-blue-300',
  pending: 'border-white/[0.08] bg-white/[0.03] text-zinc-500',
}

const lightStateClass = {
  complete: 'border-green-200 bg-green-50 text-green-700',
  current: 'border-blue-200 bg-blue-50 text-[#0084FF]',
  pending: 'border-[#E5E7EB] bg-white text-[#6B7280]',
}

function AutomationTimeline({ applicant, variant = 'dark' }) {
  const steps = getAutomationTimeline(applicant)
  const isDark = variant === 'dark'
  const stateClass = isDark ? darkStateClass : lightStateClass

  return (
    <section className={`rounded-lg border p-5 shadow-sm ${
      isDark ? 'border-white/[0.10] bg-[#0B111C] shadow-black/20' : 'border-[#E5E7EB] bg-white'
    }`}>
      <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#111827]'}`}>
        Automation timeline
      </h2>
      <div className="mt-5 grid gap-3">
        {steps.map((step) => {
          const Icon = stateIcon[step.state] ?? Circle
          return (
            <div key={step.label} className={`flex gap-3 rounded-lg border p-4 ${stateClass[step.state]}`}>
              <Icon size={20} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{step.label}</p>
                {step.description ? (
                  <p className={`mt-1 text-sm leading-6 ${isDark ? 'text-zinc-400' : 'text-[#6B7280]'}`}>
                    {step.description}
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default AutomationTimeline
