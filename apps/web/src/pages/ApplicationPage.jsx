import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { jobs } from '../data/dummyJobs'
import useSupabaseData from '../hooks/useSupabaseData'
import { fetchJobs, submitApplicationToSupabase } from '../services/supabaseData'
import { formatAppliedAt, saveLastApplication, saveSubmittedApplication } from '../utils/applicationStorage'

const blankJob = {
  companyName: '',
  jobTitle: '',
  startDate: '',
  endDate: '',
  currentlyWorking: false,
}

const blankEducation = {
  highestLevel: '',
  institutionName: '',
  graduationYear: '',
  certifications: '',
}

const initialForm = {
  resume: { fileName: '', skipped: false },
  personal: {
    fullName: '',
    phone: '',
    email: '',
    address: '',
    preferredLocation: '',
  },
  employmentHistory: [{ ...blankJob }],
  educationHistory: [{ ...blankEducation }],
  eligibility: {
    authorizedToWork: '',
    backgroundCheck: '',
    hasSecurityLicense: '',
    licenseState: '',
  },
  logistics: {
    reliableTransportation: '',
  },
  availability: {
    shifts: [],
    days: [],
  },
  compliance: {
    licenseNumber: '',
    stateIssued: '',
    expirationDate: '',
  },
  uploads: {
    resume: '',
    guardCard: '',
    governmentId: '',
    cpr: '',
    firstAid: '',
    firearms: '',
  },
  consents: {
    accurate: false,
    background: false,
    communication: false,
  },
}

const steps = [
  'Resume Upload + AI Extraction',
  'Personal Information',
  'Work Experience & Education',
  'Eligibility, Logistics & Screening',
  'License & Compliance',
  'Final Review & Submit',
]

const educationLevels = ['High School', 'Associate', 'Bachelor\'s', 'Master\'s', 'Other']
const stateOptions = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
]
const shiftOptions = ['Day Shift', 'Evening Shift', 'Night Shift', 'Overnight Shift', 'Flexible']
const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getKnockoutFlags(form) {
  const flags = []
  if (form.eligibility.authorizedToWork === 'No') flags.push('Not authorized to work in the United States.')
  if (form.eligibility.backgroundCheck === 'No') flags.push('Not willing to undergo background check.')
  if (form.logistics.reliableTransportation === 'No') flags.push('No reliable transport.')
  return flags
}

function FormField({ label, error, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#111827]">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-red-600">{error}</span> : null}
    </label>
  )
}

function UploadBox({ label, fileName, onFile, optional = false }) {
  function handleFile(file) {
    if (file) onFile(file)
  }

  return (
    <div>
      <p className="text-sm font-semibold text-[#111827]">
        {label}{optional ? ' (optional)' : ''}
      </p>
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          handleFile(event.dataTransfer.files?.[0])
        }}
        className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-center transition hover:border-[#0084FF] hover:bg-blue-50/40"
      >
        <span className="text-sm font-semibold text-[#111827]">
          {fileName || 'Drag and drop a file here'}
        </span>
        <span className="mt-1 text-xs text-[#6B7280]">PDF, DOC, DOCX or image files for demo</span>
        <span className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#0084FF] shadow-sm">
          Choose file
        </span>
        <input type="file" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
      </label>
    </div>
  )
}

function ApplicationPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { data: availableJobs } = useSupabaseData(fetchJobs, jobs)
  const job = availableJobs.find((item) => item.id === jobId) ?? availableJobs[0]
  const [currentStep, setCurrentStep] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [uploadFiles, setUploadFiles] = useState({})
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const progress = Math.round(((currentStep + 1) / steps.length) * 100)
  const knockoutFlags = useMemo(() => getKnockoutFlags(form), [form])

  const inputClass = (name) =>
    `mt-2 w-full rounded-md border bg-white px-3 py-3 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0084FF] focus:ring-2 focus:ring-[#0084FF]/15 ${
      errors[name] ? 'border-red-400' : 'border-[#D1D5DB]'
    }`

  function setGroup(group, key, value) {
    setForm((current) => ({ ...current, [group]: { ...current[group], [key]: value } }))
    setErrors((current) => ({ ...current, [`${group}.${key}`]: undefined }))
  }

  function setUpload(key, file) {
    setUploadFiles((current) => ({ ...current, [key]: file }))
    setGroup('uploads', key, file.name)
  }

  function toggleArray(group, key, value) {
    setForm((current) => {
      const currentValues = current[group][key]
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value]
      return { ...current, [group]: { ...current[group], [key]: nextValues } }
    })
    setErrors((current) => ({ ...current, [`${group}.${key}`]: undefined }))
  }

  function updateEmployment(index, key, value) {
    setForm((current) => ({
      ...current,
      employmentHistory: current.employmentHistory.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry,
      ),
    }))
    setErrors((current) => ({ ...current, [`employmentHistory.${index}.${key}`]: undefined }))
  }

  function addEmployment() {
    setForm((current) => ({ ...current, employmentHistory: [...current.employmentHistory, { ...blankJob }] }))
  }

  function removeEmployment(index) {
    setForm((current) => ({
      ...current,
      employmentHistory: current.employmentHistory.filter((_, entryIndex) => entryIndex !== index),
    }))
  }

  function updateEducation(index, key, value) {
    setForm((current) => ({
      ...current,
      educationHistory: current.educationHistory.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry,
      ),
    }))
    setErrors((current) => ({ ...current, [`educationHistory.${index}.${key}`]: undefined }))
  }

  function addEducation() {
    setForm((current) => ({ ...current, educationHistory: [...current.educationHistory, { ...blankEducation }] }))
  }

  function removeEducation(index) {
    setForm((current) => ({
      ...current,
      educationHistory: current.educationHistory.filter((_, entryIndex) => entryIndex !== index),
    }))
  }

  function validateStep(index = currentStep) {
    const nextErrors = {}
    const requireField = (path, value) => {
      if (!String(value ?? '').trim()) nextErrors[path] = 'Required field.'
    }

    if (index === 1) {
      Object.entries(form.personal).forEach(([key, value]) => requireField(`personal.${key}`, value))
    }

    if (index === 2) {
      form.employmentHistory.forEach((entry, entryIndex) => {
        requireField(`employmentHistory.${entryIndex}.companyName`, entry.companyName)
        requireField(`employmentHistory.${entryIndex}.jobTitle`, entry.jobTitle)
        requireField(`employmentHistory.${entryIndex}.startDate`, entry.startDate)
        if (!entry.currentlyWorking) requireField(`employmentHistory.${entryIndex}.endDate`, entry.endDate)
      })
      form.educationHistory.forEach((entry, entryIndex) => {
        requireField(`educationHistory.${entryIndex}.highestLevel`, entry.highestLevel)
        requireField(`educationHistory.${entryIndex}.institutionName`, entry.institutionName)
        requireField(`educationHistory.${entryIndex}.graduationYear`, entry.graduationYear)
      })
    }

    if (index === 3) {
      requireField('eligibility.authorizedToWork', form.eligibility.authorizedToWork)
      requireField('eligibility.backgroundCheck', form.eligibility.backgroundCheck)
      requireField('eligibility.hasSecurityLicense', form.eligibility.hasSecurityLicense)
      if (form.eligibility.hasSecurityLicense === 'Yes') {
        requireField('eligibility.licenseState', form.eligibility.licenseState)
      }
      requireField('logistics.reliableTransportation', form.logistics.reliableTransportation)
      if (form.availability.shifts.length === 0) nextErrors['availability.shifts'] = 'Choose at least one shift.'
      if (form.availability.days.length === 0) nextErrors['availability.days'] = 'Choose at least one day.'
    }

    if (index === 4) {
      if (form.eligibility.hasSecurityLicense === 'Yes') {
        requireField('compliance.licenseNumber', form.compliance.licenseNumber)
        requireField('compliance.expirationDate', form.compliance.expirationDate)
        requireField('uploads.guardCard', form.uploads.guardCard)
      }
      requireField('uploads.resume', form.uploads.resume || form.resume.fileName)
      requireField('uploads.governmentId', form.uploads.governmentId)
    }

    if (index === 5) {
      Object.entries(form.consents).forEach(([key, value]) => {
        if (!value) nextErrors[`consents.${key}`] = 'Required before submitting.'
      })
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function goNext() {
    if (!validateStep()) return
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
  }

  function goBack() {
    setCurrentStep((step) => Math.max(step - 1, 0))
  }

  async function submitApplication() {
    if (!validateStep(5)) return
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmitError('')

    const submittedAt = new Date()
    const payload = {
      id: `app-${submittedAt.getTime()}`,
      name: form.personal.fullName,
      applicantName: form.personal.fullName,
      email: form.personal.email,
      phone: form.personal.phone,
      role: job.title,
      jobTitle: job.title,
      jobId: job.id,
      clientId: job.clientId,
      siteId: job.siteId,
      openShiftId: job.openShiftId,
      client: job.client,
      location: job.location,
      stage: 'New Applicant',
      status: knockoutFlags.length ? 'Needs Review' : 'In Progress',
      score: null,
      licenseStatus: form.eligibility.hasSecurityLicense === 'Yes' ? 'Pending Upload' : 'Not Provided',
      interviewStatus: 'Not Started',
      appliedAt: formatAppliedAt(submittedAt),
      documents: {
        resume: form.uploads.resume || form.resume.fileName ? 'Uploaded' : 'Not Uploaded',
        license: form.uploads.guardCard ? 'Uploaded' : 'Pending',
        governmentId: form.uploads.governmentId ? 'Uploaded' : 'Not Uploaded',
        cpr: form.uploads.cpr ? 'Uploaded' : 'Not Uploaded',
        firstAid: form.uploads.firstAid ? 'Uploaded' : 'Not Uploaded',
        firearms: form.uploads.firearms ? 'Uploaded' : 'Not Uploaded',
      },
      knockout: knockoutFlags.length ? 'Needs Review' : 'Passed',
      knockoutResult: knockoutFlags.length ? 'Needs Review' : 'Passed',
      knockoutFlags,
      aiSummary:
        'Newly submitted applicant. Resume, eligibility, screening, and voice interview scoring are pending automation.',
      screeningAnswers: [
        ['Authorized to work', form.eligibility.authorizedToWork || 'Not answered'],
        ['Background check', form.eligibility.backgroundCheck || 'Not answered'],
        ['Reliable transport', form.logistics.reliableTransportation || 'Not answered'],
        ['Shift availability', form.availability.shifts.join(', ') || 'Not provided'],
      ],
      voiceInterview: {
        score: null,
        transcript: 'Voice interview has not been triggered yet.',
        recommendation: 'Wait for screening and document review.',
      },
      interviewTime: 'Not scheduled',
      notes: 'Submitted through Applicant Portal. Awaiting automation review.',
      decision: 'Review',
      scores: {
        resumeScore: null,
        eligibilityScore: knockoutFlags.length ? 65 : 100,
        screeningScore: null,
        voiceInterviewScore: null,
        overallCandidateScore: null,
      },
      automationTimeline: [
        { label: 'Application Submitted', state: 'complete', description: 'Your application has been submitted and added to the hiring workflow.' },
        { label: 'Resume Screened', state: 'current', description: 'Resume parsing and candidate scoring are pending automation review.' },
        { label: 'Assessment Completed', state: 'pending', description: 'AI screening assessment has not been completed yet.' },
        { label: 'License Verification', state: 'pending', description: 'License and compliance documents are waiting for review.' },
        { label: 'Voice Interview', state: 'pending', description: 'Voice interview will trigger after earlier checks.' },
        { label: 'Interview Scheduling', state: 'pending', description: 'Scheduling opens after qualification steps are complete.' },
      ],
      aiRecommendation: {
        label: knockoutFlags.length ? 'Needs Review' : 'Pending AI Review',
        confidence: null,
        summary: 'Newly submitted applicant. Resume parsing, screening assessment, license review, voice interview, and final recommendation are pending automation.',
      },
      submittedAt: submittedAt.toISOString(),
    }

    try {
      const result = await submitApplicationToSupabase(payload, uploadFiles)

      if (result.ok) {
        saveLastApplication({ ...payload, id: result.applicantId, syncedToSupabase: true, syncWarning: result.warning ?? null })
      } else {
        saveSubmittedApplication({ ...payload, syncedToSupabase: false })
      }

      navigate('/success')
    } catch (error) {
      saveSubmittedApplication({ ...payload, syncedToSupabase: false })
      setSubmitError(`Supabase submission failed, so the application was saved locally. ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  function renderText(group, key, label, type = 'text') {
    const name = `${group}.${key}`
    return (
      <FormField key={name} label={label} error={errors[name]}>
        <input type={type} value={form[group][key]} onChange={(event) => setGroup(group, key, event.target.value)} className={inputClass(name)} placeholder={label} />
      </FormField>
    )
  }

  function renderSelect(group, key, label, options) {
    const name = `${group}.${key}`
    return (
      <FormField key={name} label={label} error={errors[name]}>
        <select value={form[group][key]} onChange={(event) => setGroup(group, key, event.target.value)} className={inputClass(name)}>
          <option value="">Select answer</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </FormField>
    )
  }

  function renderYesNo(group, key, label) {
    return renderSelect(group, key, label, ['Yes', 'No'])
  }

  function renderMultiSelect(group, key, label, options) {
    const name = `${group}.${key}`
    return (
      <div>
        <p className="text-sm font-semibold text-[#111827]">{label}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((option) => {
            const selected = form[group][key].includes(option)
            return (
              <button
                type="button"
                key={option}
                onClick={() => toggleArray(group, key, option)}
                className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                  selected
                    ? 'border-[#0084FF] bg-blue-50 text-[#0084FF]'
                    : 'border-[#D1D5DB] bg-white text-[#374151]'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>
        {errors[name] ? <span className="mt-1 block text-sm text-red-600">{errors[name]}</span> : null}
      </div>
    )
  }

  function renderConsent(key, label) {
    const name = `consents.${key}`
    return (
      <label className="flex gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4">
        <input type="checkbox" checked={form.consents[key]} onChange={(event) => setGroup('consents', key, event.target.checked)} className="mt-1 h-4 w-4 accent-[#0084FF]" />
        <span>
          <span className="block text-sm font-semibold text-[#111827]">{label}</span>
          {errors[name] ? <span className="mt-1 block text-sm text-red-600">{errors[name]}</span> : null}
        </span>
      </label>
    )
  }

  function renderStep() {
    if (currentStep === 0) {
      return (
        <div className="grid gap-5">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-5 text-center sm:p-8">
            <h3 className="text-xl font-semibold text-[#111827]">Upload your resume to begin your application.</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
              Future AI extraction will pre-fill your name, contact details, work history,
              education, skills, and certifications. For now, this is frontend only.
            </p>
            <div className="mx-auto mt-6 max-w-xl">
              <UploadBox
                label="Resume"
                fileName={form.resume.fileName}
                onFile={(file) => {
                  setUploadFiles((current) => ({ ...current, resume: file }))
                  setForm((current) => ({ ...current, resume: { fileName: file.name, skipped: false }, uploads: { ...current.uploads, resume: file.name } }))
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm((current) => ({ ...current, resume: { fileName: '', skipped: true } }))
              setCurrentStep(1)
            }}
            className="w-full rounded-md border border-[#D1D5DB] bg-white px-5 py-3 font-semibold text-[#111827] sm:w-fit"
          >
            Skip & Continue
          </button>
        </div>
      )
    }

    if (currentStep === 1) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {renderText('personal', 'fullName', 'Full Name')}
          {renderText('personal', 'phone', 'Phone Number', 'tel')}
          {renderText('personal', 'email', 'Email Address', 'email')}
          {renderText('personal', 'address', 'Current Address / City / State')}
          {renderText('personal', 'preferredLocation', 'Preferred Work Location')}
        </div>
      )
    }

    if (currentStep === 2) {
      return (
        <div className="grid gap-6">
          <section>
            <h3 className="text-lg font-semibold text-[#111827]">Employment History</h3>
            <div className="mt-4 grid gap-4">
              {form.employmentHistory.map((entry, index) => (
                <div key={index} className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#111827]">Job {index + 1}</p>
                    {form.employmentHistory.length > 1 ? (
                      <button type="button" onClick={() => removeEmployment(index)} className="text-sm font-semibold text-red-600 hover:text-red-700">
                        Delete
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Company Name" error={errors[`employmentHistory.${index}.companyName`]}>
                      <input className={inputClass(`employmentHistory.${index}.companyName`)} value={entry.companyName} onChange={(event) => updateEmployment(index, 'companyName', event.target.value)} />
                    </FormField>
                    <FormField label="Position / Job Title" error={errors[`employmentHistory.${index}.jobTitle`]}>
                      <input className={inputClass(`employmentHistory.${index}.jobTitle`)} value={entry.jobTitle} onChange={(event) => updateEmployment(index, 'jobTitle', event.target.value)} />
                    </FormField>
                    <FormField label="Start Date" error={errors[`employmentHistory.${index}.startDate`]}>
                      <input type="date" className={inputClass(`employmentHistory.${index}.startDate`)} value={entry.startDate} onChange={(event) => updateEmployment(index, 'startDate', event.target.value)} />
                    </FormField>
                    <FormField label="End Date" error={errors[`employmentHistory.${index}.endDate`]}>
                      <input type="date" disabled={entry.currentlyWorking} className={inputClass(`employmentHistory.${index}.endDate`)} value={entry.endDate} onChange={(event) => updateEmployment(index, 'endDate', event.target.value)} />
                    </FormField>
                  </div>
                  <label className="mt-4 flex gap-3 text-sm font-semibold text-[#111827]">
                    <input type="checkbox" checked={entry.currentlyWorking} onChange={(event) => updateEmployment(index, 'currentlyWorking', event.target.checked)} className="accent-[#0084FF]" />
                    Currently Working Here
                  </label>
                </div>
              ))}
            </div>
            <button type="button" onClick={addEmployment} className="mt-4 rounded-md border border-[#D1D5DB] bg-white px-4 py-2 font-semibold text-[#111827]">
              Add Another Job
            </button>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-[#111827]">Education</h3>
            <div className="mt-4 grid gap-4">
              {form.educationHistory.map((entry, index) => (
                <div key={index} className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#111827]">Education {index + 1}</p>
                    {form.educationHistory.length > 1 ? (
                      <button type="button" onClick={() => removeEducation(index)} className="text-sm font-semibold text-red-600 hover:text-red-700">
                        Delete
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Highest Education Level" error={errors[`educationHistory.${index}.highestLevel`]}>
                      <select className={inputClass(`educationHistory.${index}.highestLevel`)} value={entry.highestLevel} onChange={(event) => updateEducation(index, 'highestLevel', event.target.value)}>
                        <option value="">Select answer</option>
                        {educationLevels.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Institution Name" error={errors[`educationHistory.${index}.institutionName`]}>
                      <input className={inputClass(`educationHistory.${index}.institutionName`)} value={entry.institutionName} onChange={(event) => updateEducation(index, 'institutionName', event.target.value)} />
                    </FormField>
                    <FormField label="Graduation Year" error={errors[`educationHistory.${index}.graduationYear`]}>
                      <input className={inputClass(`educationHistory.${index}.graduationYear`)} value={entry.graduationYear} onChange={(event) => updateEducation(index, 'graduationYear', event.target.value)} />
                    </FormField>
                    <FormField label="Relevant Certifications">
                      <input className={inputClass(`educationHistory.${index}.certifications`)} value={entry.certifications} onChange={(event) => updateEducation(index, 'certifications', event.target.value)} />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addEducation} className="mt-4 rounded-md border border-[#D1D5DB] bg-white px-4 py-2 font-semibold text-[#111827]">
              Add Another Education
            </button>
          </section>
        </div>
      )
    }

    if (currentStep === 3) {
      return (
        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-3">
            {renderYesNo('eligibility', 'authorizedToWork', 'Are you authorized to work in the United States?')}
            {renderYesNo('eligibility', 'backgroundCheck', 'Are you willing to undergo background check?')}
            {renderYesNo('eligibility', 'hasSecurityLicense', 'Do you hold a valid security license / guard card?')}
          </section>
          {form.eligibility.hasSecurityLicense === 'Yes' ? (
            <section className="grid gap-4 sm:grid-cols-2">
              {renderSelect('eligibility', 'licenseState', 'Issuing State', stateOptions)}
            </section>
          ) : null}
          <section className="grid gap-4 sm:grid-cols-2">
            {renderYesNo('logistics', 'reliableTransportation', 'Do you have reliable transport?')}
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            {renderMultiSelect('availability', 'shifts', 'Shift Types', shiftOptions)}
            {renderMultiSelect('availability', 'days', 'Available Days', dayOptions)}
          </section>
          {knockoutFlags.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold">HR review flags detected</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {knockoutFlags.map((flag) => <li key={flag}>{flag}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      )
    }

    if (currentStep === 4) {
      return (
        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-3">
            {renderText('compliance', 'licenseNumber', 'Security License / Guard Card Number')}
            {renderSelect('compliance', 'stateIssued', 'State Issued', stateOptions)}
            {renderText('compliance', 'expirationDate', 'Expiration Date', 'date')}
          </section>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <UploadBox label="Resume" fileName={form.uploads.resume || form.resume.fileName} onFile={(file) => setUpload('resume', file)} />
            <UploadBox label="Guard Card / License" fileName={form.uploads.guardCard} onFile={(file) => setUpload('guardCard', file)} />
            <UploadBox label="Government ID" fileName={form.uploads.governmentId} onFile={(file) => setUpload('governmentId', file)} />
            <UploadBox label="CPR Certification" optional fileName={form.uploads.cpr} onFile={(file) => setUpload('cpr', file)} />
            <UploadBox label="First Aid Certification" optional fileName={form.uploads.firstAid} onFile={(file) => setUpload('firstAid', file)} />
            <UploadBox label="Firearms Certification" optional fileName={form.uploads.firearms} onFile={(file) => setUpload('firearms', file)} />
          </section>
          {['uploads.resume', 'uploads.guardCard', 'uploads.governmentId'].map((name) =>
            errors[name] ? <p key={name} className="text-sm text-red-600">{errors[name]}</p> : null,
          )}
        </div>
      )
    }

    return (
      <div className="grid gap-5">
        <section className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-4">
          <h3 className="font-semibold text-[#111827]">Application Summary</h3>
          <div className="mt-3 grid gap-2 text-sm text-[#4B5563] sm:grid-cols-2">
            <p><span className="font-semibold text-[#111827]">Name:</span> {form.personal.fullName || 'Not provided'}</p>
            <p><span className="font-semibold text-[#111827]">Email:</span> {form.personal.email || 'Not provided'}</p>
            <p><span className="font-semibold text-[#111827]">Preferred location:</span> {form.personal.preferredLocation || 'Not provided'}</p>
            <p><span className="font-semibold text-[#111827]">Work history:</span> {form.employmentHistory.length} entr{form.employmentHistory.length === 1 ? 'y' : 'ies'}</p>
            <p><span className="font-semibold text-[#111827]">Education:</span> {form.educationHistory.length} entr{form.educationHistory.length === 1 ? 'y' : 'ies'}</p>
            <p><span className="font-semibold text-[#111827]">Availability:</span> {form.availability.shifts.join(', ') || 'Not provided'}</p>
            <p><span className="font-semibold text-[#111827]">Documents:</span> {[form.uploads.resume || form.resume.fileName, form.uploads.guardCard, form.uploads.governmentId].filter(Boolean).length} uploaded</p>
          </div>
        </section>
        {knockoutFlags.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Needs HR review before advancing</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {knockoutFlags.map((flag) => <li key={flag}>{flag}</li>)}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
            Eligibility and logistics screening passed.
          </div>
        )}
        {renderConsent('accurate', 'I certify all information is accurate')}
        {renderConsent('background', 'I consent to background screening')}
        {renderConsent('communication', 'I consent to email/SMS communication')}
      </div>
    )
  }

  return (
    <section>
      <div className="mb-6 grid gap-4 sm:mb-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:gap-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#0084FF] sm:text-sm">Applicant intake</p>
          <h1 className="text-2xl font-semibold leading-tight text-[#111827] sm:text-3xl lg:text-5xl">Apply for {job.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#6B7280] sm:text-base sm:leading-7">
            A structured, mobile-friendly application flow designed for resume-assisted
            intake, eligibility screening, compliance review, and future scoring automation.
          </p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-medium text-[#6B7280]">Client</p>
          <p className="font-semibold text-[#111827]">{job.client}</p>
          <p className="mt-3 text-sm font-medium text-[#6B7280]">Location</p>
          <p className="font-semibold text-[#111827]">{job.location}</p>
          <p className="mt-3 text-sm font-medium text-[#6B7280]">Pipeline entry</p>
          <p className="font-semibold text-[#0084FF]">New Applicant</p>
        </div>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0084FF]">Step {currentStep} of {steps.length - 1}</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111827]">{steps[currentStep]}</h2>
          </div>
          <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0084FF]">{progress}% complete</span>
        </div>
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div className="h-full rounded-full bg-[#0084FF] transition-all" style={{ width: `${progress}%` }} />
        </div>
        {renderStep()}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        {submitError ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {submitError}
          </p>
        ) : null}
        <button type="button" onClick={goBack} disabled={currentStep === 0} className="rounded-md border border-[#D1D5DB] bg-white px-5 py-3 font-semibold text-[#111827] disabled:cursor-not-allowed disabled:opacity-40">
          Back
        </button>
        {currentStep < steps.length - 1 ? (
          <button type="button" onClick={goNext} className="rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white">
            {currentStep === 0 && !form.resume.fileName ? 'Continue' : 'Next step'}
          </button>
        ) : (
          <button type="button" onClick={submitApplication} disabled={isSubmitting} className="rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-70">
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        )}
      </div>
    </section>
  )
}

export default ApplicationPage




