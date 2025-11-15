"use client"

import { useRef, useEffect, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ReviewPosterDisplayProps {
  businessName: string
  reviewUrl: string
  bgColor: string
  bgPattern: string
  keywords: string
  fullWidth?: boolean
}

const PatternOverlay = ({ pattern, color }: { pattern: string; color: string }) => {
  if (pattern === "none") return null;

  const patterns = {
    dots: (
      <div className="w-full h-full" style={{ backgroundColor: color }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="white" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-pattern)" />
        </svg>
      </div>
    ),
    grid: (
      <div className="w-full h-full" style={{ backgroundColor: color }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="1" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </div>
    ),
    lines: (
      <div className="w-full h-full" style={{ backgroundColor: color }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="lines-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 0 10 L 10 0" stroke="white" strokeWidth="1" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#lines-pattern)" />
        </svg>
      </div>
    ),
    zigzag: (
      <div className="w-full h-full" style={{ backgroundColor: color }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="zigzag-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0 10 L 10 0 L 20 10 L 30 0" stroke="white" strokeWidth="2" opacity="0.15" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#zigzag-pattern)" />
        </svg>
      </div>
    ),
    circles: (
      <div className="w-full h-full" style={{ backgroundColor: color }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="circles-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="15" fill="none" stroke="white" strokeWidth="1" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circles-pattern)" />
        </svg>
      </div>
    ),
    diagonal: (
      <div className="w-full h-full" style={{ backgroundColor: color }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="diagonal-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="10" y2="10" stroke="white" strokeWidth="1" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagonal-pattern)" />
        </svg>
      </div>
    ),
    waves: (
      <div className="w-full h-full" style={{ backgroundColor: color }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="waves-pattern" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0 10 Q 10 5, 20 10 T 40 10" stroke="white" strokeWidth="1" opacity="0.15" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#waves-pattern)" />
        </svg>
      </div>
    )
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {patterns[pattern as keyof typeof patterns] || null}
    </div>
  );
};

export default function ReviewPosterDisplay({
  businessName,
  reviewUrl,
  bgColor,
  bgPattern,
  keywords,
  fullWidth = false
}: ReviewPosterDisplayProps) {
  const posterRef = useRef<HTMLDivElement>(null)
  const [qrCode, setQrCode] = useState<string>("")

  useEffect(() => {
    const generateQR = async () => {
      try {
        const response = await fetch(
          `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(reviewUrl)}&bgcolor=ffffff&color=000000`,
        )
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setQrCode(url)
      } catch (error) {
        console.error("Error generating QR code:", error)
      }
    }
    generateQR()
  }, [reviewUrl])

  const keywordList = keywords
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k)

  const handleDownload = () => {
    if (posterRef.current) {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
      script.onload = () => {
        const html2canvas = (window as any).html2canvas
        html2canvas(posterRef.current, {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        }).then((canvas: HTMLCanvasElement) => {
          const link = document.createElement("a")
          link.href = canvas.toDataURL("image/png", 1.0)
          link.download = `${businessName}-review-poster.png`
          link.click()
        })
      }
      document.head.appendChild(script)
    }
  }

  return (
    <div
      className={"w-full flex flex-col items-center justify-center min-h-screen"}>
      {fullWidth && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <PatternOverlay pattern={bgPattern} color={bgColor} />
        </div>
      )}

      {/* Poster Content Container */}
      <div
        ref={posterRef}
        className={`overflow-hidden relative ${fullWidth
          ? "w-[1080px] shadow-none rounded-t-3xl"
          : "w-full max-w-4xl shadow-2xl rounded-2xl"
          }`}
        style={{
          backgroundColor: fullWidth ? 'transparent' : bgColor,
        }}
      >
        {!fullWidth && (
          <PatternOverlay pattern={bgPattern} color={bgColor} />
        )}

        {/* Main Content */}
        <div className="w-full h-full flex flex-col relative z-10">
          <div className="flex-1 px-8 md:px-12 pt-12 pb-8 text-white">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight leading-tight">
                Share Your Experience
              </h1>
              <p className="text-lg md:text-xl opacity-90 font-light max-w-2xl mx-auto leading-relaxed">
                Leave us a Google review and help others discover what makes us special
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mt-10">
              <div className="space-y-6">
                <div className="space-y-5">
                  {[
                    { num: "1", text: "Open your camera app", icon: "📱" },
                    { num: "2", text: "Gently scan the QR code", icon: "📸" },
                    { num: "3", text: "Please share your review", icon: "✍️" },
                  ].map((step) => (
                    <div key={step.num} className="flex items-center gap-4 group">
                      <div
                        className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-lg transition-transform"
                        style={{ color: bgColor }}
                      >
                        {step.num}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-base md:text-lg font-semibold leading-tight">{step.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t border-white/30">
                  <div className="flex items-start">
                    <div className="flex-1">
                      <p className="text-sm font-semibold opacity-95 mb-2">Or visit directly:</p>
                      <p className="font-mono text-xs opacity-80 break-all leading-relaxed bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                        {reviewUrl}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="relative flex items-center justify-end h-full">
                <div className="relative z-10">
                  <div
                    className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-[2.5rem] p-3 shadow-2xl"
                    style={{ width: "200px", height: "380px" }}
                  >
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-20"></div>
                    {/* Screen */}
                    <div className="w-full h-full bg-white rounded-[2rem] flex items-center justify-center relative overflow-hidden p-2">
                      {qrCode ? (
                        <img
                          src={qrCode || "/placeholder.svg"}
                          alt="QR Code"
                          className="w-40 h-40 object-contain"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-40 h-40 bg-gray-100 animate-pulse rounded-lg" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-8 md:mx-12 mb-8 bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-2xl">G</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-xl mb-1 truncate">{businessName}</h3>
                <p className="text-sm text-gray-600">Highly rated on Google</p>
              </div>
            </div>

            {keywordList.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Feel free to include these in your review:</p>
                <div className="flex flex-wrap gap-2">
                  {keywordList.slice(0, 8).map((keyword, i) => (
                    <span
                      key={i}
                      className="text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 leading-none hover:bg-blue-100 transition-colors"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom section */}
          <div
            className={`bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white px-8 md:px-12 py-8 ${fullWidth ? "rounded-t-3xl" : ""}`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-lg md:text-xl mb-1">What would you say about us?</p>
                <p className="text-sm opacity-75">Your feedback helps us improve</p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2.5 backdrop-blur-sm whitespace-nowrap">
                <div className="w-6 h-6 bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <span className="text-sm font-semibold">SEO Samurai</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}