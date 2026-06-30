import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

function mapJob(row) {
  return {
    id: row.id,
    title: row.title,
    client: row.clients?.name ?? 'ViankaX Client',
    location: row.location,
    type: row.status === 'open' ? 'Open role' : row.status,
    pay: row.pay_range ?? 'Pay range pending',
    shifts: row.shift_options ?? [],
    licenseRequired: row.license_requirements?.[0] ?? 'License requirements pending',
    requirements: row.requirements ?? [],
    responsibilities: row.responsibilities ?? [],
  }
}

function documentsFromRows(rows = []) {
  const documents = {
    resume: 'Not Uploaded',
    license: 'Not Uploaded',
    governmentId: 'Not Uploaded',
    cpr: 'Not Uploaded',
    firstAid: 'Not Uploaded',
    firearms: 'Not Uploaded',
  }

  rows.forEach((document) => {
    const value = document.status ?? 'Uploaded'
    if (document.document_type === 'resume') documents.resume = value
    if (document.document_type === 'license') documents.license = value
    if (document.document_type === 'government_id') documents.governmentId = value
    if (document.document_type === 'cpr') documents.cpr = value
    if (document.document_type === 'first_aid') documents.firstAid = value
    if (document.document_type === 'firearms') documents.firearms = value
  })

  return documents
}

function mapApplicant(row) {
  const scores = row.candidate_scores?.[0] ?? {}
  const recommendation = row.ai_recommendations?.[0] ?? {}
  const voiceInterview = row.voice_interviews?.[0] ?? {}
  const job = row.jobs ?? {}
  const client = row.clients ?? job.clients ?? {}
  const screeningAnswers = row.screening_answers?.length
    ? row.screening_answers.map((answer) => [answer.question, answer.answer ?? 'Not answered'])
    : [['Screening', 'No screening answers recorded yet.']]

  return {
    id: row.id,
    name: row.full_name,
    role: job.title ?? 'Role pending',
    client: client.name ?? 'ViankaX Client',
    location: row.location ?? job.location ?? 'Location pending',
    phone: row.phone,
    email: row.email,
    stage: row.current_stage,
    status: row.status,
    score: scores.overall_candidate_score ?? null,
    scores: {
      resumeScore: scores.resume_score ?? null,
      eligibilityScore: scores.eligibility_score ?? null,
      screeningScore: scores.screening_score ?? null,
      voiceInterviewScore: scores.voice_interview_score ?? voiceInterview.score ?? null,
      overallCandidateScore: scores.overall_candidate_score ?? null,
    },
    licenseStatus: row.license_status,
    interviewStatus: row.interview_status,
    appliedAt: row.submitted_at
      ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(row.submitted_at))
      : 'Recently submitted',
    documents: documentsFromRows(row.applicant_documents),
    knockout: row.knockout_result,
    knockoutResult: row.knockout_result,
    aiSummary: recommendation.summary ?? 'AI recommendation has not been generated yet.',
    aiRecommendation: {
      label: recommendation.recommendation ?? 'Pending AI Review',
      confidence: recommendation.confidence ?? null,
      summary: recommendation.summary ?? 'AI recommendation has not been generated yet.',
    },
    screeningAnswers,
    voiceInterview: {
      score: voiceInterview.score ?? null,
      transcript: voiceInterview.transcript ?? 'Voice interview has not been triggered yet.',
      recommendation: voiceInterview.recommendation ?? 'Wait for screening and document review.',
    },
    interviewTime: row.interview_schedules?.[0]?.scheduled_for
      ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(row.interview_schedules[0].scheduled_for))
      : 'Not scheduled',
    notes: row.notes ?? 'No notes recorded yet.',
    decision: row.final_decision,
  }
}

export async function fetchJobs() {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('jobs')
    .select('*, clients(name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(mapJob)
}

export async function fetchApplicants() {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('applicants')
    .select(`
      *,
      clients(name),
      jobs(title, location, clients(name)),
      applicant_documents(document_type, status),
      screening_answers(question, answer),
      candidate_scores(
        resume_score,
        eligibility_score,
        screening_score,
        voice_interview_score,
        overall_candidate_score
      ),
      ai_recommendations(recommendation, confidence, summary, risk_flags),
      voice_interviews(score, transcript, recommendation, status),
      interview_schedules(scheduled_for, status)
    `)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return data.map(mapApplicant)
}
