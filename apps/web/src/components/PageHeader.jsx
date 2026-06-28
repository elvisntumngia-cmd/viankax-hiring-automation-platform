function PageHeader({ eyebrow, title, description, variant = 'light' }) {
  const isDark = variant === 'dark'

  return (
    <div className="mb-6 max-w-4xl sm:mb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#0084FF] sm:text-sm">
        {eyebrow}
      </p>
      <h1
        className={`text-2xl font-semibold leading-tight sm:text-3xl lg:text-5xl ${
          isDark ? 'text-white' : 'text-[#111827]'
        }`}
      >
        {title}
      </h1>
      {description ? (
        <p
          className={`mt-3 max-w-3xl text-sm leading-6 sm:mt-4 sm:text-base sm:leading-7 ${
            isDark ? 'text-[#A1A1AA]' : 'text-[#6B7280]'
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}

export default PageHeader
