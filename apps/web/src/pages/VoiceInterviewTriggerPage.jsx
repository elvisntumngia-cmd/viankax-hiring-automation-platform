import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PhoneCall, ShieldCheck } from 'lucide-react'
import { fetchApplicantForScreening, triggerVoiceInterview } from '../services/supabaseData'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function VoiceInterviewTriggerPage() {
  const { applicantId } = useParams()
  const [applicant, setApplicant] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [actionState, setActionState] = useState({ busy: false, complete: false, error: '', result: null })

  useEffect(() => {
    let mounted = true

    async function loadApplicant() {
      try {
        if (!uuidPattern.test(applicantId ?? '')) {
          throw new Error('This voice interview link is missing a valid applicant ID.')
        }

        const result = await fetchApplicantForScreening(applicantId)
        if (!mounted) return
        setApplicant(result)
        setStatus(result ? 'success' : 'not_found')
      } catch (error) {
        if (!mounted) return
        setMessage(error.message)
        setStatus('error')
      }
    }

    loadApplicant()

    return () => {
      mounted = false
    }
  }, [applicantId])

  async function startVoiceInterview() {
    setActionState({ busy: true, complete: false, error: '', result: null })

    try {
      const result = await triggerVoiceInterview(applicantId)
      setActionState({ busy: false, complete: true, error: result.ok ? '' : result.message, result })
    } catch (error) {
      setActionState({ busy: false, complete: false, error: error.message, result: null })
    }
  }

  if (status === 'loading') {
    return (
      <section className="mx-auto max-w-2xl rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[#0084FF]">Voice interview</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#111827]">Loading your interview link</h1>
        <p className="mt-3 text-[#6B7280]">Checking your application record.</p>
      </section>
    )
  }

  if (status === 'error' || status === 'not_found') {
    return (
      <section className="mx-auto max-w-2xl rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-600">Voice interview unavailable</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#111827]">We could not load this interview</h1>
        <p className="mt-3 text-[#6B7280]">{message || 'This link may be invalid or expired.'}</p>
        <Link to="/jobs" className="mt-5 inline-flex rounded-md border border-[#E5E7EB] bg-white px-5 py-3 font-semibold text-[#111827]">
          Return to jobs
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0084FF]/10 text-[#0084FF]">
        <PhoneCall size={24} />
      </div>
      <p className="mt-5 text-sm font-semibold text-[#0084FF]">Voice interview</p>
      <h1 className="mt-2 text-2xl font-semibold text-[#111827]">Start your voice interview, {applicant.name}</h1>
      <p className="mt-3 leading-7 text-[#6B7280]">
        Click the button below when you are ready. ViankaX will place one automated interview call to the phone
        number on your application. Please answer in a quiet place and speak clearly.
      </p>

      <div className="mt-5 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={20} />
          <div>
            <p className="font-semibold text-[#111827]">{applicant.role}</p>
            <p className="mt-1 text-sm text-[#6B7280]">The call will update your HR profile after Vapi completes the interview callback.</p>
          </div>
        </div>
      </div>

      {actionState.error ? (
        <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {actionState.error}
        </p>
      ) : null}

      {actionState.complete && !actionState.error ? (
        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {actionState.result?.message ?? 'Voice interview call requested. Please keep your phone nearby.'}
        </div>
      ) : null}

      <button
        type="button"
        onClick={startVoiceInterview}
        disabled={actionState.busy || actionState.complete}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        <PhoneCall size={18} />
        {actionState.busy ? 'Starting call...' : actionState.complete ? 'Call requested' : 'Trigger voice interview'}
      </button>
    </section>
  )
}

export default VoiceInterviewTriggerPage
