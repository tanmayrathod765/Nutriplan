'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Upload, CheckCircle } from 'lucide-react'
import { useAppState } from '@/components/AppStateProvider'
import Step1Form from '@/components/forms/Step1Form'
import Step2Form from '@/components/forms/Step2Form'
import Step3Form from '@/components/forms/Step3Form'
import DemoProfiles from '@/components/DemoProfiles'
import PDFUploader from '@/components/PDFUploader'
import { resolveConflicts } from '@/lib/nutritionTargets'
import { UserProfile } from '@/lib/types'

export default function Home() {
  const { state, dispatch } = useAppState()
  const router = useRouter()
  const [showPDFSection, setShowPDFSection] = useState(false)
  const [pdfProcessing, setPdfProcessing] = useState(false)
  const [pdfSuccess, setPdfSuccess] = useState(false)

  const currentStep = state.currentStep

  const handleNext = () => {
    if (currentStep < 2) {
      dispatch({ type: 'SET_STEP', payload: currentStep + 1 })
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      dispatch({ type: 'SET_STEP', payload: currentStep - 1 })
    }
  }

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!state.userProfile.fullName || !state.userProfile.conditions?.length) {
        dispatch({ type: 'SET_ERROR', payload: 'Please fill in all required fields' })
        return
      }

      // Resolve nutritional envelope
      const { envelope, conflicts } = resolveConflicts(
        state.userProfile.conditions as any[],
        state.userProfile
      )
      dispatch({
        type: 'SET_ENVELOPE',
        payload: { envelope, conflicts },
      })

      // Navigate to preview
      router.push('/preview')
    } catch (error) {
      console.error('Error submitting form:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to process form' })
    }
  }

  const handlePDFUpload = async (file: File, extractedData: any) => {
    setPdfProcessing(true)
    try {
      const existingConditions = [...(state.userProfile.conditions || [])]
      const existingSeverities = { ...(state.userProfile.conditionSeverities || {}) }

      const updates: any = {
        labValues: { ...state.userProfile.labValues },
        conditions: [],
        conditionSeverities: {},
      }

      // Extract and set lab values
      if (extractedData.labValues) {
        updates.labValues = {
          ...updates.labValues,
          ...(extractedData.labValues.hbA1c && { hbA1c: extractedData.labValues.hbA1c }),
          ...(extractedData.labValues.bpSystolic && { bpSystolic: extractedData.labValues.bpSystolic }),
          ...(extractedData.labValues.bpDiastolic && { bpDiastolic: extractedData.labValues.bpDiastolic }),
          ...(extractedData.labValues.eGFR && { eGFR: extractedData.labValues.eGFR }),
        }
      }

      // Use only PDF-detected conditions when report is uploaded
      const pdfConditions: string[] = []
      const pdfSeverities: Record<string, string> = {}

      if (extractedData.conditions?.diabetes?.detected) {
        pdfConditions.push('DIABETES')
        if (extractedData.conditions.diabetes.severity) {
          pdfSeverities['DIABETES'] = extractedData.conditions.diabetes.severity
        }
      }

      if (extractedData.conditions?.hypertension?.detected) {
        pdfConditions.push('HYPERTENSION')
        if (extractedData.conditions.hypertension.severity) {
          pdfSeverities['HYPERTENSION'] = extractedData.conditions.hypertension.severity
        }
      }

      if (extractedData.conditions?.ckd?.detected) {
        const ckdStage = extractedData.conditions.ckd.stage
        if (ckdStage === 3) {
          pdfConditions.push('CKD_STAGE_3')
          pdfSeverities['CKD_STAGE_3'] = 'Stage 3'
        } else if (ckdStage === 4) {
          pdfConditions.push('CKD_STAGE_4')
          pdfSeverities['CKD_STAGE_4'] = 'Stage 4'
        }
      }

      if (extractedData.conditions?.heartDisease?.detected) {
        pdfConditions.push('HEART_DISEASE')
        if (extractedData.conditions.heartDisease.severity) {
          pdfSeverities['HEART_DISEASE'] = extractedData.conditions.heartDisease.severity
        }
      }

      // If PDF does not detect any condition, keep previously selected conditions
      if (pdfConditions.length > 0) {
        updates.conditions = pdfConditions
        updates.conditionSeverities = pdfSeverities
      } else {
        updates.conditions = existingConditions
        updates.conditionSeverities = existingSeverities
      }

      dispatch({
        type: 'UPDATE_PROFILE',
        payload: updates,
      })

      setPdfSuccess(true)
      setTimeout(() => setPdfProcessing(false), 2000)
    } catch (error) {
      console.error('Error processing PDF:', error)
      setPdfProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-green-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-2 gradient-text">NutriPlan AI</h1>
          <p className="text-gray-600">Personalised Chronic Disease Dietary Planner</p>
        </div>

        {currentStep === 0 && (
          <DemoProfiles />
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {currentStep + 1} of 3</span>
            <span className="text-sm text-gray-500">{Math.round(((currentStep + 1) / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Content */}
        <div className="card p-8 mb-8">
          {currentStep === 0 && (
            <Step1Form
              profile={state.userProfile}
              onUpdate={(updates) => dispatch({ type: 'UPDATE_PROFILE', payload: updates })}
            />
          )}

          {currentStep === 1 && (
            <Step2Form
              profile={state.userProfile}
              onUpdate={(updates) => dispatch({ type: 'UPDATE_PROFILE', payload: updates })}
            />
          )}

          {currentStep === 2 && (
            <div>
              <Step3Form
                profile={state.userProfile}
                onUpdate={(updates) => dispatch({ type: 'UPDATE_PROFILE', payload: updates })}
              />

              {/* PDF Upload Section */}
              {!showPDFSection && (
                <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                  <h3 className="text-lg font-semibold mb-2 text-blue-900">Medical Report Upload (Recommended)</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Upload your medical report for better results. Blood tests, HbA1c reports,
                    or kidney function tests are all supported. Your data is used only for this session.
                  </p>
                  <button
                    onClick={() => setShowPDFSection(true)}
                    className="btn btn-primary gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload PDF (Recommended)
                  </button>
                </div>
              )}

              {showPDFSection && (
                <div className="mt-12">
                  <PDFUploader
                    onUpload={handlePDFUpload}
                    isProcessing={pdfProcessing}
                    isSuccess={pdfSuccess}
                  />
                  <button
                    onClick={() => setShowPDFSection(false)}
                    className="btn btn-outline w-full mt-4"
                  >
                    Continue Without PDF
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {currentStep > 0 && (
            <button onClick={handleBack} className="btn btn-secondary gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {currentStep < 2 ? (
            <button onClick={handleNext} className="btn btn-primary gap-2 ml-auto">
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} className="btn btn-primary gap-2 ml-auto">
              Create Plan
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">{state.error}</div>
        )}
      </div>
    </div>
  )
}
