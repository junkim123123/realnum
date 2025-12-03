import 'server-only';

async function getApiKey(): Promise<string> {
  if (typeof process === 'undefined' || !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in your .env.local file.');
  }
  return process.env.GEMINI_API_KEY;
}

/**
 * Calls the Gemini 2.5 Pro model with a specific prompt to get a JSON response.
 * This is a server-side only function.
 * @param prompt The prompt to send to the model.
 * @returns A promise that resolves to the raw JSON string from the model.
 */
export async function callGeminiJSON(prompt: string): Promise<string> {
  try {
    const apiKey = await getApiKey();
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // The model should return raw JSON, but clean it just in case
    const cleaned = text.replace(/```json|```/g, '').trim();
    return cleaned;
  } catch (error) {
    console.error('[GeminiClient] Failed to generate JSON from prompt', error);
    // Attach the raw response to the error if possible for better debugging
    const newError = new Error('Failed to get a valid response from the AI model.');
    // @ts-ignore
    newError.cause = { rawResponse: error?.response?.text() };
    throw newError;
  }
}