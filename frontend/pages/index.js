import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('tf_token') : null
    if (token) {
      router.push('/dashboard')
    } else {
      router.push('/auth')
    }
  }, [router])

  return null
}
