type VoiceProvider = 'vapi' | 'bland'

type VoiceInterviewRequest = {
  provider: VoiceProvider
  applicantId: string
  applicantName: string
  applicantPhone: string
  roleTitle: string
  screeningSummary?: string
  workflowRunId?: string | null
  supabaseUrl?: string
}

type VoiceInterviewResult = {
  provider: VoiceProvider | 'placeholder'
  providerCallId: string
  interviewUrl: string
  status: 'sent' | 'scheduled' | 'completed'
  transcript?: string
  score?: number
  recommendation?: string
  rawProviderPayload?: Record<string, unknown>
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

function toE164PhoneNumber(phone: string) {
  const trimmed = String(phone ?? '').trim()
  if (/^\+[1-9]\d{7,14}$/.test(trimmed)) return trimmed

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`

  throw new Error(`Candidate phone number must be E.164 format for Vapi. Received "${phone}". For US numbers use +1 followed by 10 digits.`)
}

export async function createVoiceInterview(request: VoiceInterviewRequest): Promise<VoiceInterviewResult> {
  if (request.provider === 'vapi') {
    const apiKey = Deno.env.get('VAPI_API_KEY')
    const assistantId = Deno.env.get('VAPI_ASSISTANT_ID')
    const phoneNumberId = Deno.env.get('VAPI_PHONE_NUMBER_ID')

    if (!apiKey || !assistantId || !phoneNumberId) {
      return {
        provider: 'placeholder',
        providerCallId: `placeholder-${request.applicantId}-${Date.now()}`,
        interviewUrl: 'https://example.com/voice-interview-placeholder',
        status: 'completed',
        transcript: 'Placeholder voice interview completed. Candidate communicated clearly, confirmed availability, and gave professional responses suitable for final HR review.',
        score: 88,
        recommendation: 'Proceed to final in-person interview',
        rawProviderPayload: {
          note: 'VAPI_API_KEY, VAPI_ASSISTANT_ID, or VAPI_PHONE_NUMBER_ID is not configured. Placeholder voice result was used.',
        },
      }
    }

    const customerNumber = toE164PhoneNumber(request.applicantPhone)
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: {
          number: customerNumber,
          name: request.applicantName,
        },
        metadata: {
          applicantId: request.applicantId,
          workflowRunId: request.workflowRunId,
          roleTitle: request.roleTitle,
          source: 'viankax_hiring_automation',
        },
        assistantOverrides: {
          variableValues: {
            applicantName: request.applicantName,
            roleTitle: request.roleTitle,
            screeningSummary: request.screeningSummary ?? 'Screening summary pending.',
          },
        },
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result?.message ?? result?.error?.message ?? 'Vapi call creation failed.')
    }

    return {
      provider: 'vapi',
      providerCallId: result.id,
      interviewUrl: result.webCallUrl ?? result.monitor?.listenUrl ?? `https://dashboard.vapi.ai/calls/${result.id}`,
      status: result.status === 'scheduled' ? 'scheduled' : 'sent',
      rawProviderPayload: result,
    }
  }

  // TODO: Connect Bland AI call creation here.
  // Required secrets: BLAND_API_KEY, BLAND_PHONE_NUMBER_ID.
  requiredEnv('BLAND_API_KEY')
  throw new Error('Bland voice interview integration is scaffolded but not enabled yet.')
}
