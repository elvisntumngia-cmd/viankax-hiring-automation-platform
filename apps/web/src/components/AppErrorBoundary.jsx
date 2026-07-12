import { Component } from 'react'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-[#F8FAFC] px-5 py-8 text-[#111827]">
          <section className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-red-600">ViankaX app error</p>
            <h1 className="mt-2 text-2xl font-semibold">The app could not finish loading.</h1>
            <p className="mt-3 leading-7 text-[#6B7280]">
              This usually means a production environment variable or deployment setting needs attention.
            </p>
            <pre className="mt-4 overflow-auto rounded-md bg-[#111827] p-4 text-sm text-white">
              {this.state.error.message}
            </pre>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}

export default AppErrorBoundary
