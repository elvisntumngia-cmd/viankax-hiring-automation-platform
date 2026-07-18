import { Link } from 'react-router-dom'
import { ArrowRight, BrainCircuit, ClipboardCheck, Workflow } from 'lucide-react'

function HomePage() {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-10">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#0084FF] sm:text-sm">
          ViankaX Technologies
        </p>
        <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
          Hiring command center for teams that recruit every day.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#A1A1AA] sm:text-lg sm:leading-8">
          One platform for applicant intake, screening automation, document
          review, AI interview readiness, scheduling status, and HR pipeline
          decisions.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            to="/jobs"
            className="inline-flex justify-center items-center gap-2 rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white shadow-[0_0_30px_rgba(0,132,255,0.25)]"
          >
            Open applicant portal <ArrowRight size={18} />
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex justify-center items-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.03] px-5 py-3 font-semibold text-white hover:bg-white/[0.06]"
          >
            Open HR dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {[
          ['Applicant Portal', 'Candidates view jobs, answer knockout questions, upload documents, and submit applications.', ClipboardCheck],
          ['Automation Engine', 'Applications move through screening, scoring, license checks, interview triggers, and scheduling updates.', Workflow],
          ['HR/Admin Dashboard', 'Operations teams review pipeline status, applicant profiles, screening outputs, notes, and final decisions.', BrainCircuit],
        ].map(([title, copy, Icon]) => (
          <div
            key={title}
            className="rounded-lg border border-white/[0.08] bg-[#09090B] p-5 shadow-2xl shadow-black/30 sm:p-6"
          >
            <Icon className="mb-4 text-[#0084FF]" size={28} />
            <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#A1A1AA] sm:text-base">{copy}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default HomePage
