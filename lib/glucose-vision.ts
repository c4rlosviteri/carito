'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function extractGlucoseValue(base64Image: string, mimeType: string): Promise<number | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set')
    return null
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
      'This is a photo of a glucose meter display. Read the main glucose value shown on the LCD screen. Reply with ONLY the number (e.g. "298"). If you cannot read it, reply "null".',
    ])

    const text = result.response.text().trim()
    const value = Number.parseInt(text, 10)

    if (Number.isFinite(value) && value >= 20 && value <= 600) {
      return value
    }

    return null
  } catch (error) {
    console.error('Gemini glucose detection error:', error)
    return null
  }
}
