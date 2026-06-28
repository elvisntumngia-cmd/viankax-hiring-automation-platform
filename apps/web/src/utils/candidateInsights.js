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
