import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 })
    }

    // Read PDF file
    const buffer = await file.arrayBuffer()
    const pdfBuffer = Buffer.from(buffer)
    
    let pdfText = ''
    try {
      const pdfData = await pdfParse(pdfBuffer)
      pdfText = pdfData.text || ''
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError)
      return NextResponse.json(
        { error: 'Could not extract text from PDF', details: 'The PDF file may be corrupted or encrypted' },
        { status: 400 }
      )
    }

    if (!pdfText.trim()) {
      return NextResponse.json(
        { error: 'No text found in PDF', details: 'The PDF may be image-based or encrypted' },
        { status: 400 }
      )
    }

    // Use Groq to extract lab values
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      console.error('GROQ_API_KEY not set')
      return NextResponse.json(
        {
          error: 'API Key Missing',
          details: 'Please add GROQ_API_KEY to your .env.local file. Get your free key from https://console.groq.com/keys'
        },
        { status: 500 }
      )
    }

    const client = new Groq({ apiKey })
    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: `You are a medical data extraction expert specializing in chronic disease management. Extract disease-specific information from medical reports.

Focus on these conditions:
1. DIABETES: HbA1c, fasting glucose, random glucose, diabetes type, severity
2. HYPERTENSION: Systolic/Diastolic BP, BP readings, medication list
3. CKD (Chronic Kidney Disease): eGFR, creatinine, UACR, potassium, phosphorus, CKD stage
4. HEART DISEASE: Ejection fraction, cardiac troponin, BNP, heart condition details

Return ONLY a valid JSON object:
{
  "conditions": {
    "diabetes": {
      "detected": boolean,
      "hbA1c": number or null,
      "fastingGlucose": number or null,
      "randomGlucose": number or null,
      "type": "Type 1" | "Type 2" | "Gestational" | null,
      "severity": "Controlled" | "Uncontrolled" | "Insulin-dependent" | null
    },
    "hypertension": {
      "detected": boolean,
      "bpSystolic": number or null,
      "bpDiastolic": number or null,
      "severity": "Stage 1" | "Stage 2" | "Controlled" | null
    },
    "ckd": {
      "detected": boolean,
      "stage": null | 3 | 4 | 5,
      "eGFR": number or null,
      "creatinine": number or null,
      "uacr": number or null,
      "potassium": number or null,
      "phosphorus": number or null
    },
    "heartDisease": {
      "detected": boolean,
      "ejectionFraction": number or null,
      "troponin": number or null,
      "bnp": number or null,
      "condition": string or null,
      "severity": "Mild" | "Moderate" | "Severe" | null
    }
  },
  "labValues": {
    "hbA1c": number or null,
    "bpSystolic": number or null,
    "bpDiastolic": number or null,
    "eGFR": number or null,
    "creatinine": number or null,
    "potassium": number or null,
    "phosphorus": number or null,
    "cholesterol": number or null
  },
  "extractedInfo": "Brief summary of extracted health information"
}`,
        },
        {
          role: 'user',
          content: `Extract disease-specific health information from this medical report:\n\n${pdfText.substring(0, 3000)}`,
        },
      ],
    })

    let extractedData = {
      conditions: {
        diabetes: {
          detected: false,
          hbA1c: null,
          fastingGlucose: null,
          randomGlucose: null,
          type: null,
          severity: null,
        },
        hypertension: {
          detected: false,
          bpSystolic: null,
          bpDiastolic: null,
          severity: null,
        },
        ckd: {
          detected: false,
          stage: null,
          eGFR: null,
          creatinine: null,
          uacr: null,
          potassium: null,
          phosphorus: null,
        },
        heartDisease: {
          detected: false,
          ejectionFraction: null,
          troponin: null,
          bnp: null,
          condition: null,
          severity: null,
        },
      },
      labValues: {
        hbA1c: null,
        bpSystolic: null,
        bpDiastolic: null,
        eGFR: null,
        creatinine: null,
        potassium: null,
        phosphorus: null,
        cholesterol: null,
      },
      extractedInfo: '',
    }

    const responseText = response.choices?.[0]?.message?.content || ''
    if (responseText) {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0])
        }
      } catch (parseError) {
        console.error('Error parsing extracted data:', parseError)
      }
    }

    return NextResponse.json({ success: true, data: extractedData })
  } catch (error) {
    console.error('Error parsing PDF:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to parse PDF', details: errorMessage },
      { status: 500 }
    )
  }
}
