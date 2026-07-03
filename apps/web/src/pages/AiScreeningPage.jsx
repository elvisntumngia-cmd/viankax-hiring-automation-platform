import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchApplicantForScreening, submitAiScreeningAssessment } from '../services/supabaseData'

const questions = [
  'Why are you interested in this role?',
  'Describe your security experience.',
  'How do you handle difficult situations with the public?',
  'Are you comfortable with incident reporting and following post orders?',
  'How reliable is your availability for assigned shifts?',
]

const initialAnswers = Object.fromEntries(questions.map((question) => [question, '']))

function AiScreeningPage() {
  const { applicantId } = useParams()
  const [applicant, setApplicant] = useState(null)
  const [answers, setAnswers] = useState(initialAnswers)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [submitState, setSubmitState] = useState({ busy: false, complete: false, result: null, error: '' })

  const progress = useMemo(() => {
    const completed = Object.values(answers).filter((answer) => answer.trim().length >= 10).length
    return Math.round((completed / questions.length) * 100)
  }, [answers])

  useEffect(() => {
    let mounted = true

    async function loadApplicant() {
      setStatus('loading')
      setError('')

      try {
        const result = await fetchApplicantForScreening(applicantId)
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

  function setAnswer(question, value) {
    setAnswers((current) => ({ ...current, [question]: value }))
  }

  async function submitAssessment(event) {
    event.preventDefault()
    const missingAnswer = questions.find((question) => answers[question].trim().length < 10)

    if (missingAnswer) {
      setSubmitState({
        busy: false,
        complete: false,
        result: null,
        error: 'Please answer every question with at least one complete sentence.',
      })
      return
    }

    setSubmitState({ busy: true, complete: false, result: null, error: '' })

    try {
      const result = await submitAiScreeningAssessment(applicantId, answers)
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
        <Link to="/jobs" className="mt-5 inline-flex rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white">
          Return to jobs
        </Link>
      </section>
    )
  }

  if (submitState.complete) {
    return (
      <section className="mx-auto max-w-3xl rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">Assessment submitted</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#111827]">Thank you, {applicant.name}</h1>
        <p className="mt-3 leading-7 text-[#6B7280]">
          Your AI screening assessment has been completed and sent to the hiring workflow.
          HR can now review your screening score and recommendation.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <p className="text-sm font-semibold text-[#6B7280]">Screening score</p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{submitState.result.scores.screeningScore}%</p>
          </div>
          <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <p className="text-sm font-semibold text-[#6B7280]">Recommendation</p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{submitState.result.scores.recommendation}</p>
          </div>
        </div>
        <Link to="/status" className="mt-6 inline-flex rounded-md border border-[#E5E7EB] bg-white px-5 py-3 font-semibold text-[#111827]">
          View application status
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-[#0084FF]">AI screening assessment</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#111827] sm:text-3xl">
          Complete your screening, {applicant.name}
        </h1>
        <p className="mt-3 leading-7 text-[#6B7280]">
          These responses help ViankaX evaluate role fit, professionalism, communication,
          availability, and placement readiness for {applicant.role}.
        </p>
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm font-semibold text-[#6B7280]">
            <span>{progress}% complete</span>
            <span>{applicant.client}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
            <div className="h-full rounded-full bg-[#0084FF]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <form onSubmit={submitAssessment} className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5">
          {questions.map((question, index) => (
            <label key={question} className="block">
              <span className="text-sm font-semibold text-[#111827]">
                {index + 1}. {question}
              </span>
              <textarea
                value={answers[question]}
                onChange={(event) => setAnswer(question, event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-3 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0084FF] focus:ring-2 focus:ring-[#0084FF]/15"
                placeholder="Type your answer here..."
              />
            </label>
          ))}
        </div>

        {submitState.error ? (
          <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {submitState.error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[#6B7280]">
            By submitting, you confirm these responses are accurate and may be reviewed by the hiring team.
          </p>
          <button
            type="submit"
            disabled={submitState.busy}
            className="rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-70"
          >
            {submitState.busy ? 'Submitting...' : 'Submit screening'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default AiScreeningPage
