// lib/poster-download.ts

export interface SavedPoster {
  id: string
  businessName: string
  reviewUrl: string
  bgColor: string
  bgPattern: string
  keywords: string[]
  placeId: string | null
  createdAt: string
  updatedAt: string
}

// Helper function to get pattern SVG - matching preview styles
const getPatternSVG = (pattern: string, color: string): string => {
  const patterns: Record<string, string> = {
    dots: `<div style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; background-color: ${color};"><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" opacity="0.15" /></pattern></defs><rect width="100%" height="100%" fill="url(#dots-pattern)" /></svg></div>`,
    grid: `<div style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; background-color: ${color};"><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" stroke-width="1" opacity="0.15" /></pattern></defs><rect width="100%" height="100%" fill="url(#grid-pattern)" /></svg></div>`,
    diagonal: `<div style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; background-color: ${color};"><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="diagonal-pattern" width="10" height="10" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="10" y2="10" stroke="white" stroke-width="1" opacity="0.15" /></pattern></defs><rect width="100%" height="100%" fill="url(#diagonal-pattern)" /></svg></div>`,
    waves: `<div style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; background-color: ${color};"><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="waves-pattern" width="40" height="20" patternUnits="userSpaceOnUse"><path d="M 0 10 Q 10 5, 20 10 T 40 10" stroke="white" stroke-width="1" opacity="0.15" fill="none" /></pattern></defs><rect width="100%" height="100%" fill="url(#waves-pattern)" /></svg></div>`,
    circles: `<div style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; background-color: ${color};"><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="circles-pattern" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="15" fill="none" stroke="white" stroke-width="1" opacity="0.15" /></pattern></defs><rect width="100%" height="100%" fill="url(#circles-pattern)" /></svg></div>`,
    lines: `<div style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; background-color: ${color};"><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="lines-pattern" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 0 10 L 10 0" stroke="white" stroke-width="1" opacity="0.15" /></pattern></defs><rect width="100%" height="100%" fill="url(#lines-pattern)" /></svg></div>`,
    zigzag: `<div style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; background-color: ${color};"><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="zigzag-pattern" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 0 10 L 10 0 L 20 10 L 30 0" stroke="white" stroke-width="2" opacity="0.15" fill="none" /></pattern></defs><rect width="100%" height="100%" fill="url(#zigzag-pattern)" /></svg></div>`,
    none: `<div style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; background-color: ${color};"></div>`
  }
  return patterns[pattern] || patterns.none
}

// Helper function to generate QR code
const generateQRCodeUrl = async (reviewUrl: string): Promise<string> => {
  try {
    const response = await fetch(
      `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(reviewUrl)}&bgcolor=ffffff&color=000000`
    )
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error generating QR code:', error)
    return ''
  }
}

// Main download function
export const downloadPosterAsPDF = async (poster: SavedPoster): Promise<void> => {
  try {
    // Create a hidden iframe to render the poster
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.top = '-10000px'
    iframe.style.left = '-10000px'
    iframe.style.width = '1080px'
    iframe.style.height = '1920px'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      throw new Error('Could not access iframe document')
    }

    // Build the poster HTML with inline styles matching preview
    const posterHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; 
            background: ${poster.bgColor};
          }
        </style>
      </head>
      <body>
        <div id="poster-content"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      </body>
      </html>
    `

    iframeDoc.open()
    iframeDoc.write(posterHTML)
    iframeDoc.close()

    // Wait for iframe to load
    await new Promise(resolve => {
      if (iframe.contentWindow) {
        iframe.contentWindow.onload = resolve
      }
    })

    // Generate QR code
    const qrUrl = await generateQRCodeUrl(poster.reviewUrl)
    const keywordList = poster.keywords

    // Create the poster content in iframe - matching preview styling exactly
    const posterContent = iframeDoc.getElementById('poster-content')
    if (posterContent) {
      posterContent.innerHTML = `
        <div style="width: 1080px; min-height: 1080px; position: relative; overflow: hidden; background-color: ${poster.bgColor};">
          ${getPatternSVG(poster.bgPattern, poster.bgColor)}
          
          <!-- Main Content -->
          <div style="position: relative; z-index: 10; display: flex; flex-direction: column; min-height: 1080px;">
            <!-- Top Section -->
            <div style="flex: 1; padding: 48px 48px 32px; color: white;">
              <div style="text-align: center; margin-bottom: 40px;">
<h1 style="font-size: 68px; font-weight: 700; margin-bottom: 24px; letter-spacing: -0.02em; line-height: 1.2;">
  Share Your Experience
</h1>
<p style="font-size: 24px; opacity: 0.9; max-width: 800px; margin: 0 auto; line-height: 1.6; font-weight: 300;">
  Leave us a Google review and help others discover what makes us special
</p>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; margin-top: 40px;">
                <!-- Left Column - Steps -->
                <div style="display: flex; flex-direction: column; gap: 28px;">
                  ${[
                    { num: "1", text: "Open your camera app" },
                    { num: "2", text: "Gently scan the QR code" },
                    { num: "3", text: "Please share your review" }
                  ].map(step => `
                    <div style="display: flex; align-items: center; gap: 16px;">
                      <div style="width: 52px; height: 52px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 22px; color: ${poster.bgColor}; flex-shrink: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        ${step.num}
                      </div>
                      <div style="flex: 1;">
                        <p style="font-size: 22px; font-weight: 600; line-height: 1.3;">${step.text}</p>
                      </div>
                    </div>
                  `).join('')}

                <div style="margin-top: 32px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.3);">
  <div style="display: flex; flex-direction: column;">
    <p style="font-size: 20px; font-weight: 600; opacity: 0.95; margin-bottom: 12px;">Or visit directly:</p>
    <p style="font-family: monospace; font-size: 18px; font-weight: 500; word-break: break-all; line-height: 1.5; background: rgba(0,0,0,0.5); padding: 16px 18px; border-radius: 12px;">
      ${poster.reviewUrl}
    </p>
  </div>
</div>

                </div>

<!-- Right Column - Phone Mockup -->
<div style="display: flex; align-items: center; justify-content: flex-end;">
  <div style="position: relative;">
    <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 50%, #1f2937 100%); border-radius: 48px; padding: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); width: 260px; height: 500px;">
      <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 150px; height: 30px; background: black; border-radius: 0 0 28px 28px; z-index: 20;"></div>
      <div style="width: 100%; height: 100%; background: white; border-radius: 36px; display: flex; align-items: center; justify-content: center; padding: 16px;">
        <img src="${qrUrl}" alt="QR Code" style="width: 210px; height: 210px; object-fit: contain;" />
      </div>
    </div>
  </div>
</div>

              </div>
            </div>

            <!-- Middle Card Section -->
            <div style="margin: 0 48px 32px; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="display: flex; gap: 16px; margin-bottom: 20px; align-items: flex-start;">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex-shrink: 0;">
                  <span style="color: white; font-weight: 700; font-size: 28px;">G</span>
                </div>
                <div style="flex: 1;">
                  <h3 style="font-weight: 700; color: #111827; font-size: 24px; margin-bottom: 6px;">${poster.businessName}</h3>
                  <p style="font-size: 16px; color: #6b7280;">Highly rated on Google</p>
                </div>
              </div>

              ${keywordList.length > 0 ? `
                <div>
                  <p style="font-size: 14px; font-weight: 600; color: #6b7280; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
                    Feel free to include these in your review:
                  </p>
                  <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${keywordList.slice(0, 8).map(keyword => `
                      <span style="font-size: 14px; font-weight: 500; color: #1e40af; background: #eff6ff; padding: 8px 14px; border-radius: 9999px; border: 1px solid #bfdbfe;">
                        ${keyword}
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Bottom Gradient Section -->
          <div style="background: #111827; color: white; padding: 36px 48px; margin-top: auto;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                <div>
                  <p style="font-weight: 700; font-size: 24px; margin-bottom: 6px;">What would you say about us?</p>
                  <p style="font-size: 16px; opacity: 0.75;">Your feedback helps us improve</p>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); padding: 12px 20px; backdrop-filter: blur(10px); border-radius: 8px;">
                  <div style="width: 28px; height: 28px; background: #3b82f6; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span style="color: white; font-size: 14px; font-weight: 700;">S</span>
                  </div>
                  <span style="font-size: 16px; font-weight: 600;">Rankerly</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Capture with html2canvas
      const html2canvas = iframe.contentWindow?.html2canvas
      if (!html2canvas) {
        throw new Error('html2canvas not loaded')
      }

      const canvas = await html2canvas(posterContent.firstElementChild as HTMLElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: poster.bgColor,
        logging: false,
        width: 1080,
        windowWidth: 1080,
      })

      // Load jsPDF
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      document.head.appendChild(script)

      await new Promise((resolve) => {
        script.onload = resolve
      })

      // Convert canvas to PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const { jsPDF } = (window as any).jspdf
      
      // Calculate dimensions based on canvas aspect ratio
      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      const aspectRatio = canvasHeight / canvasWidth
      
      // Use A4 width and calculate height based on aspect ratio
      const pdfWidth = 210 // A4 width in mm
      const pdfHeight = pdfWidth * aspectRatio
      
      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
        compress: true
      })

      // Add image to fit the entire PDF page
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, '', 'FAST')
      
      // Generate filename
      const filename = `${poster.businessName.replace(/[^a-z0-9]/gi, '_')}-review-poster.pdf`
      pdf.save(filename)
      
      // Clean up QR URL
      URL.revokeObjectURL(qrUrl)
      
      // Clean up script
      document.head.removeChild(script)
    }

    // Cleanup iframe
    document.body.removeChild(iframe)

  } catch (error) {
    console.error('Poster download error:', error)
    throw error
  }
}