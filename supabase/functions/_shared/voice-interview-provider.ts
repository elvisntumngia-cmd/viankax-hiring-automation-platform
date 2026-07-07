type VoiceProvider = 'vapi' | 'bland'

type VoiceInterviewRequest = {
  provider: VoiceProvider
  applicantId: string
  applicantName: string
  applicantPhone: string
  roleTitle: string
  screeningSummary?: string
}

type VoiceInterviewResult = {
  provider: VoiceProvider
  providerCallId: string
  interviewUrl: string
  status: 'sent' | 'scheduled'
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

export async function createVoiceInterview(request: VoiceInterviewRequest): Promise<VoiceInterviewResult> {
  if (request.provider === 'vapi') {
    // TODO: Connect Vapi assistant/call creation here.
    // Required secrets: VAPI_API_KEY, VAPI_ASSISTANT_ID, VAPI_PHONE_NUMBER_ID.
    requiredEnv('VAPI_API_KEY')
    throw new Error('Vapi voice interview integration is scaffolded but not enabled yet.')
  }

  // TODO: Connect Bland AI call creation here.
  // Required secrets: BLAND_API_KEY, BLAND_PHONE_NUMBER_ID.
  requiredEnv('BLAND_API_KEY')
  throw new Error('Bland voice interview integration is scaffolded but not enabled yet.')
}

