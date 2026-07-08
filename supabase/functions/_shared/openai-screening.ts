export type AiScreeningEvaluation = {
  provider: 'openai' | 'placeholder'
  model: string
  eligibilityScore: number
  availabilityScore: number
  transportationScore: number
  experienceScore: number
  siteReadinessScore: number
  communicationScore: number
  overallScreeningScore: number
  screeningRecommendation: 'Strong Candidate' | 'Moderate Candidate' | 'Needs Review' | 'Not Recommended'
  aiSummary: string
  strengths: string[]
  concerns: string[]
  suggestedNextStep: 'Proceed to license verification' | 'Proceed to voice interview' | 'Hold for HR review' | 'Reject'
  riskFlags: string[]
  placementSignals: {
    licenseType: string
    shiftTypes: string[]
    availableDays: string[]
    traits: string[]
    commuteDistance: string
    startDate: string
  }
}

function clampScore(value: unknown, fallback = 75) {
  const score = Number(value)
  if (!Number.isFinite(score)) return fallback
  return Math.max(0, Math.min(100, Math.round(score)))
}

function stringList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 8)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function normalizeEvaluation(value: Record<string, any>, provider: 'openai' | 'placeholder', model: string): AiScreeningEvaluation {
  const overall = clampScore(value.overallScreeningScore ?? value.screeningScore)
  const recommendation = ['Strong Candidate', 'Moderate Candidate', 'Needs Review', 'Not Recommended'].includes(value.screeningRecommendation)
    ? value.screeningRecommendation
    : overall >= 85
      ? 'Strong Candidate'
      : overall >= 72
        ? 'Moderate Candidate'
        : overall >= 55
          ? 'Needs Review'
          : 'Not Recommended'
  const suggestedNextStep = [
    'Proceed to license verification',
    'Proceed to voice interview',
    'Hold for HR review',
    'Reject',
  ].includes(value.suggestedNextStep)
    ? value.suggestedNextStep
    : recommendation === 'Not Recommended'
      ? 'Hold for HR review'
      : 'Proceed to license verification'

  return {
    provider,
    model,
    eligibilityScore: clampScore(value.eligibilityScore, overall),
    availabilityScore: clampScore(value.availabilityScore, overall),
    transportationScore: clampScore(value.transportationScore, overall),
    experienceScore: clampScore(value.experienceScore, overall),
    siteReadinessScore: clampScore(value.siteReadinessScore, overall),
    communicationScore: clampScore(value.communicationScore, overall),
    overallScreeningScore: overall,
    screeningRecommendation: recommendation,
    aiSummary: String(value.aiSummary ?? 'AI screening completed. Review applicant details before final decision.'),
    strengths: stringList(value.strengths),
    concerns: stringList(value.concerns),
    suggestedNextStep,
    riskFlags: stringList(value.riskFlags),
    placementSignals: {
      licenseType: String(value.placementSignals?.licenseType ?? ''),
      shiftTypes: stringList(value.placementSignals?.shiftTypes),
      availableDays: stringList(value.placementSignals?.availableDays),
      traits: stringList(value.placementSignals?.traits),
      commuteDistance: String(value.placementSignals?.commuteDistance ?? ''),
      startDate: String(value.placementSignals?.startDate ?? ''),
    },
  }
}

function placeholderEvaluation(context: Record<string, unknown>, model: string): AiScreeningEvaluation {
  const answers = context.screeningAnswers as Record<string, string> | undefined
  const authorized = answers?.['Are you authorized to work in the United States?'] !== 'No'
  const background = answers?.['Are you willing to undergo a background check?'] !== 'No'
  const transportation = answers?.['Do you have reliable transportation?'] !== 'No'
  const hasKnockoutConcern = !authorized || !background || !transportation
  const overall = hasKnockoutConcern ? 52 : 82

  return normalizeEvaluation({
    eligibilityScore: authorized && background ? 92 : 45,
    availabilityScore: 80,
    transportationScore: transportation ? 90 : 35,
    experienceScore: 78,
    siteReadinessScore: 82,
    communicationScore: 80,
    overallScreeningScore: overall,
    screeningRecommendation: hasKnockoutConcern ? 'Needs Review' : 'Moderate Candidate',
    aiSummary: hasKnockoutConcern
      ? 'Fallback screening found a knockout or logistics concern. HR should review before moving forward.'
      : 'Fallback screening indicates the candidate is viable for HR review, pending compliance and voice interview.',
    strengths: transportation ? ['Reliable transportation', 'Submitted screening answers'] : ['Submitted screening answers'],
    concerns: hasKnockoutConcern ? ['Review eligibility, background check, or transportation concern'] : ['Use live OpenAI evaluation for deeper reasoning'],
    suggestedNextStep: hasKnockoutConcern ? 'Hold for HR review' : 'Proceed to license verification',
    riskFlags: hasKnockoutConcern ? ['knockout_review_needed'] : [],
    placementSignals: {
      licenseType: answers?.['What type of license do you currently hold?'] ?? '',
      shiftTypes: String(answers?.['Which shift types are you available for?'] ?? '').split(',').map((item) => item.trim()).filter(Boolean),
      availableDays: String(answers?.['Which days are you available?'] ?? '').split(',').map((item) => item.trim()).filter(Boolean),
      traits: ['submitted screening'],
      commuteDistance: answers?.['What is the maximum commute distance you are comfortable with?'] ?? '',
      startDate: answers?.['When can you start?'] ?? '',
    },
  }, 'placeholder', model)
}

function extractResponseText(response: Record<string, any>) {
  if (typeof response.output_text === 'string') return response.output_text

  const output = Array.isArray(response.output) ? response.output : []
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : []
    for (const contentItem of content) {
      if (typeof contentItem.text === 'string') return contentItem.text
    }
  }

  throw new Error('OpenAI response did not include structured text output.')
}

export async function evaluateAiScreening(context: Record<string, unknown>): Promise<AiScreeningEvaluation> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini'

  if (!apiKey) {
    return placeholderEvaluation(context, model)
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: 'You evaluate security applicants for ViankaX. Return only structured JSON. Do not automatically reject no-license applicants unless the linked job or shift requires a license. Keep short written answers in the communication score, and reserve long scenario judgment for the later voice interview.',
        },
        {
          role: 'user',
          content: JSON.stringify(context),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'viankax_ai_screening_evaluation',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              eligibilityScore: { type: 'integer', minimum: 0, maximum: 100 },
              availabilityScore: { type: 'integer', minimum: 0, maximum: 100 },
              transportationScore: { type: 'integer', minimum: 0, maximum: 100 },
              experienceScore: { type: 'integer', minimum: 0, maximum: 100 },
              siteReadinessScore: { type: 'integer', minimum: 0, maximum: 100 },
              communicationScore: { type: 'integer', minimum: 0, maximum: 100 },
              overallScreeningScore: { type: 'integer', minimum: 0, maximum: 100 },
              screeningRecommendation: {
                type: 'string',
                enum: ['Strong Candidate', 'Moderate Candidate', 'Needs Review', 'Not Recommended'],
              },
              aiSummary: { type: 'string' },
              strengths: { type: 'array', items: { type: 'string' } },
              concerns: { type: 'array', items: { type: 'string' } },
              suggestedNextStep: {
                type: 'string',
                enum: ['Proceed to license verification', 'Proceed to voice interview', 'Hold for HR review', 'Reject'],
              },
              riskFlags: { type: 'array', items: { type: 'string' } },
              placementSignals: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  licenseType: { type: 'string' },
                  shiftTypes: { type: 'array', items: { type: 'string' } },
                  availableDays: { type: 'array', items: { type: 'string' } },
                  traits: { type: 'array', items: { type: 'string' } },
                  commuteDistance: { type: 'string' },
                  startDate: { type: 'string' },
                },
                required: ['licenseType', 'shiftTypes', 'availableDays', 'traits', 'commuteDistance', 'startDate'],
              },
            },
            required: [
              'eligibilityScore',
              'availabilityScore',
              'transportationScore',
              'experienceScore',
              'siteReadinessScore',
              'communicationScore',
              'overallScreeningScore',
              'screeningRecommendation',
              'aiSummary',
              'strengths',
              'concerns',
              'suggestedNextStep',
              'riskFlags',
              'placementSignals',
            ],
          },
        },
      },
    }),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.error?.message ?? 'OpenAI screening evaluation failed.')
  }

  return normalizeEvaluation(JSON.parse(extractResponseText(result)), 'openai', model)
}

