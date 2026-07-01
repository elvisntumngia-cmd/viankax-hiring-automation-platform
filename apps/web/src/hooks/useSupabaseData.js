import { useCallback, useEffect, useState } from 'react'

function useSupabaseData(loader, fallbackData = []) {
  const [data, setData] = useState(fallbackData)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    setStatus('loading')
    setError(null)

    try {
      const result = await loader()
      setData(result)
      setStatus('success')
    } catch (loadError) {
      setError(loadError)
      setStatus('error')
    }
  }, [loader])

  useEffect(() => {
    let isMounted = true

    async function loadMountedData() {
      setStatus('loading')
      setError(null)

      try {
        const result = await loader()
        if (isMounted) {
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

    loadMountedData()

    return () => {
      isMounted = false
    }
  }, [loader])

  return { data, status, error, reload: loadData }
}

export default useSupabaseData
