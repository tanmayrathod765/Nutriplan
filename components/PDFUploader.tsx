'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react'

interface PDFUploaderProps {
  onUpload: (file: File, extractedData: any) => void
  isProcessing: boolean
  isSuccess: boolean
}

export default function PDFUploader({ onUpload, isProcessing, isSuccess }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      await processFile(files[0])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0])
    }
  }

  const processFile = async (file: File) => {
    setError(null)

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Please upload a PDF file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to parse PDF')
      }

      setExtractedData(result.data)
      onUpload(file, result.data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process PDF'
      console.error('PDF upload error:', errorMsg)
      setError(errorMsg)
    }
  }

  if (isProcessing) {
    return (
      <div className="p-8 text-center">
        <Loader className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Processing your medical report...</p>
      </div>
    )
  }

  if (isSuccess && extractedData) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-green-900">Medical Report Processed Successfully!</h3>
            <p className="text-sm text-green-700 mt-1">{extractedData.extractedInfo || 'Health information extracted and loaded'}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {/* Diabetes Info */}
          {extractedData.conditions?.diabetes?.detected && (
            <div className="p-2 bg-white border border-green-300 rounded">
              <p className="font-medium text-blue-900">🩺 Diabetes Detected</p>
              <p className="text-xs text-gray-600">
                {extractedData.conditions.diabetes.hbA1c && `HbA1c: ${extractedData.conditions.diabetes.hbA1c}%`}
                {extractedData.conditions.diabetes.severity && ` (${extractedData.conditions.diabetes.severity})`}
              </p>
            </div>
          )}

          {/* Hypertension Info */}
          {extractedData.conditions?.hypertension?.detected && (
            <div className="p-2 bg-white border border-green-300 rounded">
              <p className="font-medium text-blue-900">💉 Hypertension Detected</p>
              <p className="text-xs text-gray-600">
                {extractedData.conditions.hypertension.bpSystolic && `BP: ${extractedData.conditions.hypertension.bpSystolic}/${extractedData.conditions.hypertension.bpDiastolic} mmHg`}
                {extractedData.conditions.hypertension.severity && ` (${extractedData.conditions.hypertension.severity})`}
              </p>
            </div>
          )}

          {/* CKD Info */}
          {extractedData.conditions?.ckd?.detected && (
            <div className="p-2 bg-white border border-green-300 rounded">
              <p className="font-medium text-blue-900">🏥 CKD Stage {extractedData.conditions.ckd.stage} Detected</p>
              <p className="text-xs text-gray-600">
                eGFR: {extractedData.conditions.ckd.eGFR} mL/min
                {extractedData.conditions.ckd.creatinine && `, Creatinine: ${extractedData.conditions.ckd.creatinine}`}
              </p>
            </div>
          )}

          {/* Heart Disease Info */}
          {extractedData.conditions?.heartDisease?.detected && (
            <div className="p-2 bg-white border border-green-300 rounded">
              <p className="font-medium text-blue-900">❤️ Heart Disease Detected</p>
              <p className="text-xs text-gray-600">
                {extractedData.conditions.heartDisease.condition}
                {extractedData.conditions.heartDisease.severity && ` (${extractedData.conditions.heartDisease.severity})`}
              </p>
            </div>
          )}

          {/* Lab Values */}
          {(extractedData.labValues?.hbA1c || extractedData.labValues?.eGFR || extractedData.labValues?.potassium) && (
            <div className="p-2 bg-white border border-green-300 rounded">
              <p className="font-medium text-gray-700 mb-1">Extracted Lab Values:</p>
              <div className="text-xs text-gray-600 space-y-0.5">
                {extractedData.labValues.hbA1c && <p>✓ HbA1c: {extractedData.labValues.hbA1c}%</p>}
                {extractedData.labValues.eGFR && <p>✓ eGFR: {extractedData.labValues.eGFR} mL/min</p>}
                {extractedData.labValues.bpSystolic && extractedData.labValues.bpDiastolic && (
                  <p>✓ BP: {extractedData.labValues.bpSystolic}/{extractedData.labValues.bpDiastolic} mmHg</p>
                )}
                {extractedData.labValues.creatinine && <p>✓ Creatinine: {extractedData.labValues.creatinine}</p>}
                {extractedData.labValues.potassium && <p>✓ Potassium: {extractedData.labValues.potassium} mEq/L</p>}
                {extractedData.labValues.phosphorus && <p>✓ Phosphorus: {extractedData.labValues.phosphorus} mg/dL</p>}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setExtractedData(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
          className="mt-4 btn btn-secondary text-sm"
        >
          Upload Different Report
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Drag and Drop Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-8 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
          isDragging
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <div className="text-center">
          <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-green-600' : 'text-gray-400'}`} />
          <p className="font-medium text-gray-700 mb-1">Drag your PDF here or click to upload</p>
          <p className="text-xs text-gray-500">Blood test reports, HbA1c reports, and kidney function tests are all supported</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 btn btn-primary text-sm"
          >
            Choose File
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

    </div>
  )
}
