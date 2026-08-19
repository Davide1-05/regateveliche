import { useRef, useState, useEffect } from 'react'

interface ESignatureCanvasProps {
  documentTitle: string
  onSignatureComplete?: (signatureData: string) => void
  required?: boolean
}

export function ESignatureCanvas({ 
  documentTitle, 
  onSignatureComplete,
  required = true 
}: ESignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = 150
    
    // Configure drawing style
    ctx.strokeStyle = '#0891b2'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Add placeholder text
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '16px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Sign here', canvas.width / 2, canvas.height / 2 + 6)
  }, [])

  const getCanvasCoordinates = (event: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    
    let clientX, clientY
    
    if ('touches' in event) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else {
      clientX = (event as React.MouseEvent).clientX
      clientY = (event as React.MouseEvent).clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    
    // Clear placeholder on first draw
    if (canvas && ctx && !hasSignature) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasSignature(true)
    }

    setIsDrawing(true)
    ctx?.beginPath()
    ctx?.moveTo(coords.x, coords.y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()

    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const ctx = canvasRef.current?.getContext('2d')
    ctx?.lineTo(coords.x, coords.y)
    ctx?.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      const ctx = canvasRef.current?.getContext('2d')
      ctx?.closePath()
      
      // Notify parent of signature completion
      if (hasSignature && onSignatureComplete) {
        const dataUrl = canvasRef.current?.toDataURL('image/png')
        if (dataUrl) {
          onSignatureComplete(dataUrl)
        }
      }
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
      setError(null)
      
      // Redraw placeholder
      ctx.fillStyle = '#cbd5e1'
      ctx.font = '16px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Sign here', canvas.width / 2, canvas.height / 2 + 6)
    }
  }

  const validateSignature = () => {
    if (!hasSignature && required) {
      setError(`Please provide your signature for ${documentTitle}`)
      return false
    }
    setError(null)
    return true
  }

  return (
    <div className="border-2 border-gray-300 rounded-xl p-4 bg-white">
      <div className="flex justify-between items-center mb-3">
        <label className="font-medium text-gray-900 flex items-center gap-2">
          ✍️ {documentTitle}
          {required && <span className="text-red-500">*</span>}
        </label>
        
        {hasSignature && (
          <button
            type="button"
            onClick={clearSignature}
            className="text-sm text-gray-500 hover:text-cyan-600 transition-colors flex items-center gap-1"
          >
            ↺ Clear & Re-sign
          </button>
        )}
      </div>

      <div 
        className={`relative border ${error ? 'border-red-300 bg-red-50' : 'border-gray-200'} rounded-lg overflow-hidden`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      >
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ height: '150px' }}
        />
        
        {/* Mobile-friendly overlay hint */}
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-sm bg-white/80 px-3 py-1 rounded-full">
              Draw your signature above
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          ⚠️ {error}
        </p>
      )}

      {!error && hasSignature && (
        <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
          ✓ Signature captured
        </p>
      )}

      {/* Legal notice */}
      <p className="mt-3 text-xs text-gray-500 italic">
        By providing your electronic signature, you acknowledge that this signature 
        has the same legal effect as a handwritten signature under applicable e-signature laws.
      </p>

      <input type="hidden" name={`signature_validated`} value={validateSignature().toString()} />
    </div>
  )
}

export default ESignatureCanvas