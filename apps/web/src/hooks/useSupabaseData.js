import { useEffect, useState } from 'react'

function useSupabaseData(loader, fallbackData = []) {
  const [data, setData] = useState(fallbackData)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      setStatus('loading')
      setError(null)

      try {
        const result = await loader()
        if (isMounted && result.length > 0) {
          setData(result)
        }
        if (isMounted) setStatus('success')
      } catch (loadError) {
        if (isMounted) {
          setError(loadError)
          setStatus('error')
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [loader])

  return { data, status, error }
}

export default useSupabaseData
