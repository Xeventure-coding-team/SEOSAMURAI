"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import axios from "axios"
import { Loader2 } from "lucide-react"
import ReviewPosterDisplay from "@/components/shared-google-review-poster/ReviewPosterDisplay"

interface Poster {
  id: string
  businessName: string
  reviewUrl: string
  bgColor: string
  bgPattern: string
  keywords: string[]
}

export default function PosterViewPage() {
  const { id } = useParams()
  const [poster, setPoster] = useState<Poster | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchPoster()
  }, [id])

  const fetchPoster = async () => {
    try {
      const res = await axios.get(`/api/review-poster/${id}`)
      if (res.data.success) setPoster(res.data.poster)
    } catch (err) {
      console.error("Error fetching poster:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Loading poster...
      </div>
    )
  }

  if (!poster) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Poster not found.
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: poster.bgColor }}>
      <ReviewPosterDisplay
        businessName={poster.businessName}
        reviewUrl={poster.reviewUrl}
        bgColor={poster.bgColor}
        bgPattern={poster.bgPattern}
        keywords={poster.keywords.join(", ")}
        fullWidth={true}
      />
    </div>
  )
}