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

export function getScoreTone(score) {
  if (!Number.isFinite(score)) return 'pending'
  if (score >= 85) return 'strong'
  if (score >= 70) return 'review'
  return 'risk'
}

export function getAutomationTimeline(applicant) {
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
