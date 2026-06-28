const statusClasses = {
  Qualified: 'border-green-200 bg-green-50 text-green-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
  'In Progress': 'border-blue-200 bg-blue-50 text-blue-700',
  'Needs Review': 'border-purple-200 bg-purple-50 text-purple-700',
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        statusClasses[status] ?? statusClasses['Needs Review']
      }`}
    >
      {status}
    </span>
  )
}

export default StatusBadge
