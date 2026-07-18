export const automationSteps = [
  'Application Submitted',
  'Resume Screened',
  'Assessment Completed',
  'License Verification',
  'Voice Interview',
  'Interview Scheduling',
]

const stageProgress = {
  'New Applicant': 0,
  'Resume Screened': 1,
  'Assessment Completed': 2,
  'License Pending': 3,
  'License Verified': 3,
  'Voice Interview Complete': 4,
  'Interview Scheduled': 5,
  'Ready for Review': 5,
  Hired: 5,
  Rejected: 0,
}

export function getCandidateScores(applicant) {
  const scores = applicant.scores ?? applicant.scoringPlaceholders ?? {}
  const voiceScore = scores.voiceInterviewScore ?? applicant.voiceInterview?.score ?? null
  const overallScore = scores.overallCandidateScore ?? applicant.score ?? null

  return {
    resumeScore: scores.resumeScore ?? null,
    eligibilityScore: scores.eligibilityScore ?? null,
    screeningScore: scores.screeningScore ?? applicant.score ?? null,
    voiceInterviewScore: voiceScore,
    overallCandidateScore: overallScore,
  }
}

export function formatScore(score) {
  return Number.isFinite(score) ? `${score}%` : 'Pending'
}

export function hasNotificationTemplate(applicant, template) {
  return (applicant.notifications ?? []).some((notification) => notification.metadata?.template === template)
}

export function hasNotificationSubject(applicant, subject) {
  return (applicant.notifications ?? []).some((notification) => notification.subject === subject)
}

export function getScoreTone(score) {
  if (!Number.isFinite(score)) return 'pending'
  if (score >= 85) return 'strong'
  if (score >= 70) return 'review'
  return 'risk'
}

export function getAutomationOutcome(applicant) {
  const scores = getCandidateScores(applicant)
  const voiceStatus = applicant.voiceInterview?.status ?? applicant.interviewStatus
  const voiceRecommendation = applicant.voiceInterview?.recommendation ?? ''
  const finalInterviewScheduled = applicant.finalInterview?.status === 'Scheduled' || applicant.interviewStatus === 'Scheduled'
  const screeningComplete = Number.isFinite(scores.screeningScore) || applicant.aiScreening?.status === 'completed'
  const voiceComplete = voiceStatus === 'Complete' || voiceStatus === 'Completed' || Number.isFinite(scores.voiceInterviewScore)
  const screeningInviteSent = hasNotificationTemplate(applicant, 'application_confirmation_with_screening') ||
    hasNotificationSubject(applicant, 'Your application was received - complete your screening')
  const voiceTriggerSent = hasNotificationTemplate(applicant, 'screening_complete_voice_trigger')
  const followupSent = hasNotificationTemplate(applicant, 'voice_review_followup')
  const finalEmailSent = hasNotificationTemplate(applicant, 'final_interview_scheduled')
  const failedGuardrail = voiceComplete && (
    scores.voiceInterviewScore < 70 ||
    /not recommended|hold|hr review|guardrail/i.test(voiceRecommendation)
  )

  if (finalInterviewScheduled) {
    return {
      tone: 'strong',
      title: 'Automated path complete',
      status: 'Scheduled',
      summary: 'Candidate completed screening and voice interview. The system scheduled a final in-person interview and synced the dashboard.',
      nextStep: 'HR should review the final interview and placement recommendation.',
      bullets: [
        `Screening: ${formatScore(scores.screeningScore)}`,
        `Voice: ${formatScore(scores.voiceInterviewScore)}`,
        finalEmailSent ? 'Candidate final interview email sent' : 'Final candidate email pending',
      ],
    }
  }

  if (failedGuardrail) {
    return {
      tone: 'risk',
      title: 'Voice guardrail review',
      status: 'Needs Review',
      summary: 'Voice interview completed, but scoring guardrails blocked automatic scheduling because the transcript needs human review.',
      nextStep: followupSent ? 'Candidate follow-up email was sent. HR can review the transcript.' : 'Send or process candidate follow-up email.',
      bullets: [
        `Voice: ${formatScore(scores.voiceInterviewScore)}`,
        voiceRecommendation || 'Recommendation pending',
        'Final interview was not auto-scheduled',
      ],
    }
  }

  if (voiceComplete) {
    return {
      tone: 'review',
      title: 'Voice interview complete',
      status: 'Scheduling Pending',
      summary: 'Candidate completed voice interview. Scheduling is waiting for automation, calendar sync, or HR review.',
      nextStep: 'Confirm scheduling job and calendar status.',
      bullets: [
        `Voice: ${formatScore(scores.voiceInterviewScore)}`,
        voiceRecommendation || 'Recommendation pending',
      ],
    }
  }

  if (voiceTriggerSent) {
    return {
      tone: 'current',
      title: 'Voice interview ready',
      status: 'Waiting on Candidate',
      summary: 'AI screening is complete and the candidate has received the voice interview trigger link.',
      nextStep: 'Candidate should click the voice link and answer the Vapi call.',
      bullets: [
        `Screening: ${formatScore(scores.screeningScore)}`,
        'Voice trigger email sent',
      ],
    }
  }

  if (screeningComplete) {
    return {
      tone: 'review',
      title: 'Screening complete',
      status: 'Next Email Pending',
      summary: 'Structured AI screening data is available. The next candidate email should provide the voice interview trigger or HR-review follow-up.',
      nextStep: 'Process screening completion email.',
      bullets: [
        `Screening: ${formatScore(scores.screeningScore)}`,
        applicant.aiScreening?.recommendation ?? 'Recommendation pending',
      ],
    }
  }

  if (screeningInviteSent) {
    return {
      tone: 'current',
      title: 'Screening invite sent',
      status: 'Waiting on Candidate',
      summary: 'Candidate received the combined application confirmation and AI screening link.',
      nextStep: 'Candidate should complete AI screening.',
      bullets: ['Email 1 sent', 'AI screening pending'],
    }
  }

  return {
    tone: 'pending',
    title: 'Workflow starting',
    status: 'Pending',
    summary: 'Application was received and the automation engine is preparing the first candidate communication.',
    nextStep: 'Send application confirmation and screening link.',
    bullets: ['Application received', 'Screening invite pending'],
  }
}

export function getAutomationTimeline(applicant) {
  if (applicant.automationEvents?.length) {
    return applicant.automationEvents.map((event) => ({
      label: event.label,
      state: event.status === 'complete'
        ? 'complete'
        : event.status === 'current'
          ? 'current'
          : 'pending',
      description: event.description,
      createdAt: event.createdAt,
    }))
  }

  if (applicant.automationTimeline?.length) return applicant.automationTimeline

  const progress = stageProgress[applicant.stage] ?? 0

  return automationSteps.map((label, index) => ({
    label,
    state: index < progress ? 'complete' : index === progress ? 'current' : 'pending',
  }))
}

export function getAiRecommendation(applicant) {
  const scores = getCandidateScores(applicant)
  const overall = scores.overallCandidateScore
  const fallbackRecommendation = Number.isFinite(overall) && overall >= 85
    ? 'Strong Candidate'
    : applicant.status === 'Rejected'
      ? 'Do Not Advance'
      : 'Needs Review'

  return {
    label: applicant.aiRecommendation?.label ?? fallbackRecommendation,
    confidence: applicant.aiRecommendation?.confidence ?? overall ?? null,
    summary: applicant.aiRecommendation?.summary ?? applicant.aiSummary,
  }
}

export const pipelineFilterPresets = {
  'new-applicant': {
    label: 'New Applicants',
    match: (applicant) => applicant.stage === 'New Applicant',
  },
  'pending-ai-review': {
    label: 'Pending AI Review',
    match: (applicant) => !Number.isFinite(getCandidateScores(applicant).screeningScore),
  },
  'ai-screened': {
    label: 'AI Screened',
    match: (applicant) => Number.isFinite(getCandidateScores(applicant).screeningScore),
  },
  'license-verified': {
    label: 'License Verified',
    match: (applicant) => applicant.licenseStatus === 'Verified',
  },
  'pending-compliance-review': {
    label: 'Pending Compliance Review',
    match: (applicant) =>
      ['Pending Upload', 'Needs Review', 'Pending', 'Not Provided', 'Missing'].includes(applicant.licenseStatus) ||
      ['Pending', 'Missing', 'Not Uploaded'].includes(applicant.documents?.license),
  },
  'pending-interviews': {
    label: 'Pending Interviews',
    match: (applicant) =>
      ['Ready for Voice Interview', 'Not Started', 'Blocked'].includes(applicant.interviewStatus) ||
      applicant.stage === 'Voice Interview Complete',
  },
  'strong-candidates': {
    label: 'Strong Candidates',
    match: (applicant) => {
      const score = getCandidateScores(applicant).overallCandidateScore
      return Number.isFinite(score) && score >= 85
    },
  },
  'ready-placement-review': {
    label: 'Ready for Placement Review',
    match: (applicant) => applicant.stage === 'Ready for Review' || Boolean(applicant.placementRecommendation),
  },
}

export function matchesPipelinePreset(applicant, presetKey) {
  if (!presetKey || presetKey === 'all') return true
  return pipelineFilterPresets[presetKey]?.match(applicant) ?? true
}

export function getRecentApplicantActivity(applicants) {
  return applicants.slice(0, 6).map((applicant) => {
    if (applicant.stage === 'Interview Scheduled') {
      return {
        title: `Interview scheduled for ${applicant.name}`,
        time: applicant.appliedAt,
        status: 'Scheduled',
      }
    }

    if (applicant.stage === 'License Verified') {
      return {
        title: `License verified for ${applicant.name}`,
        time: applicant.appliedAt,
        status: 'Verified',
      }
    }

    if (applicant.stage === 'Assessment Completed') {
      return {
        title: `AI screening completed for ${applicant.name}`,
        time: applicant.appliedAt,
        status: 'Qualified',
      }
    }

    if (applicant.stage === 'Voice Interview Complete') {
      return {
        title: `Voice interview completed for ${applicant.name}`,
        time: applicant.appliedAt,
        status: 'Completed',
      }
    }

    return {
      title: `${applicant.name} applied for ${applicant.role}`,
      time: applicant.appliedAt,
      status: applicant.stage,
    }
  })
}
