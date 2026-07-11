import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchApplicantForScreening, submitAiScreeningAssessment } from '../services/supabaseData'

const yesNoOptions = ['Yes', 'No']
const licenseTypes = ['SO', 'SPO', 'Armed', 'Unarmed', 'None', 'Other']
const shiftTypes = ['Day', 'Evening', 'Night', 'Overnight', 'Flexible']
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const commuteOptions = ['10 miles', '20 miles', '30+ miles']
const experienceOptions = ['No experience', 'Less than 1 year', '1-2 years', '3-5 years', '5+ years']
const environments = ['Residential', 'Commercial', 'Retail', 'Construction', 'Events', 'Corporate', 'Mobile Patrol', 'Armed Post', 'None', 'Other']
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const loadingTimeoutMs = 12000

const initialAnswers = {
  authorizedToWork: '',
  backgroundCheck: '',
  hasSecurityLicense: '',
  licenseType: '',
  shiftTypes: [],
  availableDays: [],
  weekendHolidayOvertime: '',
  startDate: '',
  reliableTransportation: '',
  maxCommute: '',
  yearsExperience: '',
  environments: [],
  supervisedTeam: '',
  incidentReporting: '',
  digitalReportingTools: '',
  standingWalking: '',
  outdoorWork: '',
  workingAlone: '',
  interestReason: '',
  preferredSecurityWork: '',
  reliabilityReason: '',
}

const requiredFields = [
  'authorizedToWork',
  'backgroundCheck',
  'hasSecurityLicense',
  'licenseType',
  'shiftTypes',
  'availableDays',
  'weekendHolidayOvertime',
  'startDate',
  'reliableTransportation',
  'maxCommute',
  'yearsExperience',
  'environments',
  'supervisedTeam',
  'incidentReporting',
  'digitalReportingTools',
  'standingWalking',
  'outdoorWork',
  'workingAlone',
  'interestReason',
  'preferredSecurityWork',
  'reliabilityReason',
]

const answerLabels = {
  authorizedToWork: 'Are you authorized to work in the United States?',
  backgroundCheck: 'Are you willing to undergo a background check?',
  hasSecurityLicense: 'Do you currently hold a valid security license or guard card?',
  licenseType: 'What type of license do you currently hold?',
  shiftTypes: 'Which shift types are you available for?',
  availableDays: 'Which days are you available?',
  weekendHolidayOvertime: 'Are you available for weekends, holidays, or overtime if needed?',
  startDate: 'When can you start?',
  reliableTransportation: 'Do you have reliable transportation?',
  maxCommute: 'What is the maximum commute distance you are comfortable with?',
  yearsExperience: 'How many years of security experience do you have?',
  environments: 'What security environments have you worked in before?',
  supervisedTeam: 'Have you supervised a team before?',
  incidentReporting: 'Do you have incident reporting experience?',
  digitalReportingTools: 'Are you comfortable using mobile apps or digital reporting tools while on duty?',
  standingWalking: 'Are you comfortable standing or walking for long periods?',
  outdoorWork: 'Are you comfortable working outdoors if required?',
  workingAlone: 'Are you comfortable working alone at a site if assigned?',
  interestReason: 'Why are you interested in this security role?',
  preferredSecurityWork: 'What type of security work do you prefer and why?',
  reliabilityReason: 'What makes you a reliable candidate for this role?',
}

function isComplete(value) {
  if (Array.isArray(value)) return value.length > 0
  return String(value ?? '').trim().length > 0
}

function OptionGroup({ label, value, options, onChange, multi = false }) {
  function toggle(option) {
    if (!multi) {
      onChange(option)
      return
    }

    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option])
  }

  return (
    <div>
      <p className="text-sm font-semibold text-[#111827]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = multi ? value.includes(option) : value === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                selected
                  ? 'border-[#0084FF] bg-[#0084FF] text-white'
                  : 'border-[#D1D5DB] bg-white text-[#374151] hover:border-[#0084FF] hover:text-[#0084FF]'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TextResponse({ label, value, onChange }) {
  const remaining = 500 - value.length

  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#111827]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 500))}
        rows={3}
        className="mt-2 w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-3 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0084FF] focus:ring-2 focus:ring-[#0084FF]/15"
        placeholder="Short answer..."
      />
      <span className="mt-1 block text-xs font-medium text-[#6B7280]">{remaining} characters remaining</span>
    </label>
  )
}

function Section({ eyebrow, title, children }) {
  return (
    <fieldset className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0084FF]">{eyebrow}</p>
      <legend className="mt-1 text-lg font-semibold text-[#111827]">{title}</legend>
      <div className="mt-5 grid gap-5">{children}</div>
    </fieldset>
  )
}

function AiScreeningPage() {
  const { applicantId } = useParams()
  const [applicant, setApplicant] = useState(null)
  const [answers, setAnswers] = useState(initialAnswers)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [submitState, setSubmitState] = useState({ busy: false, complete: false, result: null, error: '' })

  const progress = useMemo(() => {
    const completed = requiredFields.filter((field) => isComplete(answers[field])).length
    return Math.round((completed / requiredFields.length) * 100)
  }, [answers])

  useEffect(() => {
    let mounted = true

    async function loadApplicant() {
      setStatus('loading')
      setError('')

      try {
        if (!uuidPattern.test(applicantId ?? '')) {
          throw new Error('This screening link is missing a valid applicant ID.')
        }

        const timeout = new Promise((_, reject) => {
          window.setTimeout(() => {
            reject(new Error('The screening page could not reach Supabase. Refresh the page or try again from the desktop app URL.'))
          }, loadingTimeoutMs)
        })
        const result = await Promise.race([fetchApplicantForScreening(applicantId), timeout])

        if (!mounted) return
        setApplicant(result)
        setStatus(result ? 'success' : 'not_found')
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message)
        setStatus('error')
      }
    }

    loadApplicant()

    return () => {
      mounted = false
    }
  }, [applicantId])

  function setAnswer(field, value) {
    setAnswers((current) => ({ ...current, [field]: value }))
  }

  async function submitAssessment(event) {
    event.preventDefault()
    const missingField = requiredFields.find((field) => !isComplete(answers[field]))

    if (missingField) {
      setSubmitState({
        busy: false,
        complete: false,
        result: null,
        error: `Please answer: ${answerLabels[missingField]}`,
      })
      return
    }

    setSubmitState({ busy: true, complete: false, result: null, error: '' })

    try {
      const result = await submitAiScreeningAssessment(applicantId, answers, applicant)
      setSubmitState({ busy: false, complete: true, result, error: '' })
    } catch (submitError) {
      setSubmitState({ busy: false, complete: false, result: null, error: submitError.message })
    }
  }

  if (status === 'loading') {
    return (
      <section className="mx-auto max-w-3xl rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[#0084FF]">AI screening assessment</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#111827]">Loading your screening</h1>
        <p className="mt-3 text-[#6B7280]">Fetching your application details.</p>
      </section>
    )
  }

  if (status === 'error' || status === 'not_found') {
    return (
      <section className="mx-auto max-w-3xl rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-600">Screening unavailable</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#111827]">We could not load this assessment</h1>
        <p className="mt-3 text-[#6B7280]">{error || 'This link may be invalid or expired.'}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white"
          >
            Retry
          </button>
          <Link to="/jobs" className="inline-flex rounded-md border border-[#E5E7EB] bg-white px-5 py-3 font-semibold text-[#111827]">
            Return to jobs
          </Link>
        </div>
      </section>
    )
  }

  if (submitState.complete) {
    return (
      <section className="mx-auto max-w-3xl rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">Assessment submitted</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#111827]">Thank you, {applicant.name}</h1>
        <p className="mt-3 leading-7 text-[#6B7280]">
          Your AI chat screening has been completed. HR can now review your structured qualification data,
          screening score, recommendation, and suggested next step.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <p className="text-sm font-semibold text-[#6B7280]">Screening score</p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{submitState.result.scores.screeningScore}%</p>
          </div>
          <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <p className="text-sm font-semibold text-[#6B7280]">Recommendation</p>
            <p className="mt-2 text-lg font-semibold text-[#111827]">{submitState.result.scores.recommendation}</p>
          </div>
          <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <p className="text-sm font-semibold text-[#6B7280]">Next step</p>
            <p className="mt-2 text-lg font-semibold text-[#111827]">{submitState.result.scores.suggestedNextStep}</p>
          </div>
        </div>
        <Link to="/status" className="mt-6 inline-flex rounded-md border border-[#E5E7EB] bg-white px-5 py-3 font-semibold text-[#111827]">
          View application status
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-[#0084FF]">AI chat screening</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#111827] sm:text-3xl">
          Complete your screening, {applicant.name}
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-[#6B7280]">
          This step collects structured qualification data for hiring review and future site/shift placement matching.
          Longer scenario questions will happen later in the voice interview stage.
        </p>
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm font-semibold text-[#6B7280]">
            <span>{progress}% complete</span>
            <span>{applicant.role}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
            <div className="h-full rounded-full bg-[#0084FF]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <form onSubmit={submitAssessment} className="grid gap-5">
        <Section eyebrow="Section 1" title="Eligibility">
          <OptionGroup label={answerLabels.authorizedToWork} value={answers.authorizedToWork} options={yesNoOptions} onChange={(value) => setAnswer('authorizedToWork', value)} />
          <OptionGroup label={answerLabels.backgroundCheck} value={answers.backgroundCheck} options={yesNoOptions} onChange={(value) => setAnswer('backgroundCheck', value)} />
          <OptionGroup label={answerLabels.hasSecurityLicense} value={answers.hasSecurityLicense} options={yesNoOptions} onChange={(value) => setAnswer('hasSecurityLicense', value)} />
          <OptionGroup label={answerLabels.licenseType} value={answers.licenseType} options={licenseTypes} onChange={(value) => setAnswer('licenseType', value)} />
        </Section>

        <Section eyebrow="Section 2" title="Availability">
          <OptionGroup label={answerLabels.shiftTypes} value={answers.shiftTypes} options={shiftTypes} onChange={(value) => setAnswer('shiftTypes', value)} multi />
          <OptionGroup label={answerLabels.availableDays} value={answers.availableDays} options={weekDays} onChange={(value) => setAnswer('availableDays', value)} multi />
          <OptionGroup label={answerLabels.weekendHolidayOvertime} value={answers.weekendHolidayOvertime} options={yesNoOptions} onChange={(value) => setAnswer('weekendHolidayOvertime', value)} />
          <label className="block">
            <span className="text-sm font-semibold text-[#111827]">{answerLabels.startDate}</span>
            <input
              type="date"
              value={answers.startDate}
              onChange={(event) => setAnswer('startDate', event.target.value)}
              className="mt-2 w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-3 text-[#111827] outline-none focus:border-[#0084FF] focus:ring-2 focus:ring-[#0084FF]/15 sm:max-w-xs"
            />
          </label>
        </Section>

        <Section eyebrow="Section 3" title="Transportation & Commute">
          <OptionGroup label={answerLabels.reliableTransportation} value={answers.reliableTransportation} options={yesNoOptions} onChange={(value) => setAnswer('reliableTransportation', value)} />
          <OptionGroup label={answerLabels.maxCommute} value={answers.maxCommute} options={commuteOptions} onChange={(value) => setAnswer('maxCommute', value)} />
        </Section>

        <Section eyebrow="Section 4" title="Experience">
          <OptionGroup label={answerLabels.yearsExperience} value={answers.yearsExperience} options={experienceOptions} onChange={(value) => setAnswer('yearsExperience', value)} />
          <OptionGroup label={answerLabels.environments} value={answers.environments} options={environments} onChange={(value) => setAnswer('environments', value)} multi />
          <OptionGroup label={answerLabels.supervisedTeam} value={answers.supervisedTeam} options={yesNoOptions} onChange={(value) => setAnswer('supervisedTeam', value)} />
          <OptionGroup label={answerLabels.incidentReporting} value={answers.incidentReporting} options={yesNoOptions} onChange={(value) => setAnswer('incidentReporting', value)} />
          <OptionGroup label={answerLabels.digitalReportingTools} value={answers.digitalReportingTools} options={yesNoOptions} onChange={(value) => setAnswer('digitalReportingTools', value)} />
        </Section>

        <Section eyebrow="Section 5" title="Physical & Site Readiness">
          <OptionGroup label={answerLabels.standingWalking} value={answers.standingWalking} options={yesNoOptions} onChange={(value) => setAnswer('standingWalking', value)} />
          <OptionGroup label={answerLabels.outdoorWork} value={answers.outdoorWork} options={yesNoOptions} onChange={(value) => setAnswer('outdoorWork', value)} />
          <OptionGroup label={answerLabels.workingAlone} value={answers.workingAlone} options={yesNoOptions} onChange={(value) => setAnswer('workingAlone', value)} />
        </Section>

        <Section eyebrow="Section 6" title="Short Written Responses">
          <TextResponse label={answerLabels.interestReason} value={answers.interestReason} onChange={(value) => setAnswer('interestReason', value)} />
          <TextResponse label={answerLabels.preferredSecurityWork} value={answers.preferredSecurityWork} onChange={(value) => setAnswer('preferredSecurityWork', value)} />
          <TextResponse label={answerLabels.reliabilityReason} value={answers.reliabilityReason} onChange={(value) => setAnswer('reliabilityReason', value)} />
        </Section>

        {submitState.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {submitState.error}
          </p>
        ) : null}

        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
          <p className="text-sm leading-6 text-[#6B7280]">
            By submitting, you confirm these responses are accurate and may be used for hiring and placement review.
          </p>
          <button
            type="submit"
            disabled={submitState.busy}
            className="mt-4 w-full rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-70 sm:mt-0 sm:w-auto"
          >
            {submitState.busy ? 'Submitting...' : 'Submit screening'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default AiScreeningPage
