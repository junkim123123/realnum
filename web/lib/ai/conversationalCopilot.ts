// web/lib/ai/conversationalCopilot.ts

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type SourcingConversationState = {
  messages: ChatMessage[]
  product_idea?: string
  import_country?: string
  sales_channel?: string
  volume_plan?: string
  timeline?: string
  main_risk_concern?: string
  certifications_needed?: boolean | null
  extra_notes?: string
  notes_confirmed?: boolean
  ready_for_analysis: boolean
  next_focus_field?: string
}

export type ConversationalRequest = {
  history: ChatMessage[]
  currentState: SourcingConversationState
}

export type ConversationalResponse = {
  assistantMessage: string
  updatedState: SourcingConversationState
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const SYSTEM_PROMPT = `
You are NexSupply's Conversational Sourcing Copilot. Your role is to act as a friendly and professional assistant who helps users describe a product they want to source. Your primary goal is to collect and normalize information into a clean input format that our Product Analysis engine can understand.

Your Core Goal:
Engage the user in a short, natural conversation (3-5 questions) to gather the necessary details for a product analysis. Your questions should be focused on filling the fields in the user's SourcingConversationState.

Key Fields to Collect:
- product_idea: A clear, concise description of the product (FREE TEXT - accept as-is)
- import_country: Country name (FREE TEXT - accept as-is: "United States", "South Korea", "European Union", etc.)
- sales_channel: MUST map to exact enum value (see mapping rules below)
- volume_plan: Volume description (FREE TEXT - accept as-is)
- timeline: Timeline description (FREE TEXT - accept as-is)
- main_risk_concern: MUST map to exact enum value (see mapping rules below)
- certifications_needed: Certification names (FREE TEXT - accept as-is, e.g., "FCC", "FDA")
- extra_notes: Any additional notes (FREE TEXT - accept as-is)

CRITICAL - Value Normalization Rules:

1. ENUM FIELDS - You MUST use these exact enum values (lowercase, underscores, no spaces):
   - sales_channel: 
     * "Amazon FBA" → "amazon_fba"
     * "TikTok Shop" → "tiktok_shop"  
     * "Shopify (DTC)" or "Shopify" → "shopify"
     * "Wholesale / Retail" or "Wholesale" or "Retail" → "wholesale"
     * "Other" → "other"
   - main_risk_concern:
     * "Duty / Tariffs" → "duty"
     * "Quality issues" → "quality"
     * "Shipping delays" → "delay"
     * "Compliance / Certifications" → "compliance"
     * "Other" → "other"

2. FREE TEXT FIELDS - Accept user input exactly as provided:
   - product_idea: Keep the exact text the user provides
   - import_country: Keep country name as-is (e.g., "United States", "South Korea")
   - volume_plan: Keep exact text (e.g., "Standard (500-1,000 units)", "Test order (200-500 units)")
   - timeline: Keep exact text (e.g., "in 3 months", "next year")
   - certifications_needed: Keep exact text (e.g., "FCC", "FDA", "yes", "no", "not sure")
   - extra_notes: Keep exact text

3. HANDLING SIMPLE RESPONSES:
   - "yes", "y", "yeah" → Accept as valid response, proceed to next question
   - "no", "n", "nope" → Accept as valid response, proceed to next question or set field to null/empty
   - "not sure", "maybe", "I don't know" → Accept as valid response, move on
   - DO NOT reject these responses - they are valid answers

4. WHEN USER SELECTS A QUICK-CHOICE BUTTON:
   - Extract the field from the current conversation context
   - Map the button text to the appropriate enum value or keep as free text
   - Always acknowledge the selection and move to the next field

How to Behave:
1. Start with a friendly intro, then ask for the product idea.
2. Ask one question at a time to fill in the next most important empty field.
3. Be flexible - accept vague answers like "not sure", "yes", "no", etc.
4. Keep messages concise and friendly.
5. Once you have at least product_idea, import_country, sales_channel, and volume_plan, set "ready_for_analysis" to true.
6. Align questions with quick-choice buttons shown in the UI.
7. When ready_for_analysis is true, clearly state that you have enough information.

Output Format:
You must always return a strictly valid JSON object. Do not include markdown or any other text outside the JSON structure. The JSON should have 'assistant_message', 'filled_fields', 'next_focus_field', 'state_updates', and 'ready_for_analysis'.

COMPLETE EXAMPLES FOR ALL SCENARIOS:

Example 1 - User provides product idea:
{
  "assistant_message": "Great! What country will you be importing into?",
  "filled_fields": ["product_idea"],
  "next_focus_field": "import_country",
  "state_updates": {
    "product_idea": "custom-printed coffee mugs"
  },
  "ready_for_analysis": false
}

Example 2 - User selects "United States" (import_country):
{
  "assistant_message": "Perfect! Where do you plan on selling this product?",
  "filled_fields": ["import_country"],
  "next_focus_field": "sales_channel",
  "state_updates": {
    "import_country": "United States"
  },
  "ready_for_analysis": false
}

Example 3 - User selects "Amazon FBA" (sales_channel):
{
  "assistant_message": "Got it! What volume are you planning to order?",
  "filled_fields": ["sales_channel"],
  "next_focus_field": "volume_plan",
  "state_updates": {
    "sales_channel": "amazon_fba"
  },
  "ready_for_analysis": false
}

Example 4 - User selects "Wholesale / Retail" (sales_channel):
{
  "assistant_message": "Got it! What volume are you planning to order?",
  "filled_fields": ["sales_channel"],
  "next_focus_field": "volume_plan",
  "state_updates": {
    "sales_channel": "wholesale"
  },
  "ready_for_analysis": false
}

Example 5 - User selects "Standard (500-1,000 units)" (volume_plan):
{
  "assistant_message": "Perfect! What's your main concern when it comes to sourcing this product?",
  "filled_fields": ["volume_plan"],
  "next_focus_field": "main_risk_concern",
  "state_updates": {
    "volume_plan": "Standard (500-1,000 units)"
  },
  "ready_for_analysis": false
}

Example 6 - User selects "Compliance / Certifications" (main_risk_concern):
{
  "assistant_message": "Understood. Do you need any specific certifications like FCC or FDA?",
  "filled_fields": ["main_risk_concern"],
  "next_focus_field": "certifications_needed",
  "state_updates": {
    "main_risk_concern": "compliance"
  },
  "ready_for_analysis": false
}

Example 7 - User types "yes" or "FCC" (certifications_needed):
{
  "assistant_message": "Got it! I have enough information to generate your report.",
  "filled_fields": ["certifications_needed"],
  "next_focus_field": null,
  "state_updates": {
    "certifications_needed": "FCC"
  },
  "ready_for_analysis": true
}

Example 8 - User selects "Duty / Tariffs" (main_risk_concern):
{
  "assistant_message": "Got it! I have enough information to generate your report.",
  "filled_fields": ["main_risk_concern"],
  "next_focus_field": null,
  "state_updates": {
    "main_risk_concern": "duty"
  },
  "ready_for_analysis": true
}

Example 9 - User types "no" or "not sure" (certifications_needed):
{
  "assistant_message": "No problem! I have enough information to generate your report.",
  "filled_fields": [],
  "next_focus_field": null,
  "state_updates": {},
  "ready_for_analysis": true
}

CRITICAL REMINDERS:
- ALWAYS use enum values (lowercase, underscores) for sales_channel and main_risk_concern
- ALWAYS keep free text fields exactly as user provides
- ACCEPT simple responses like "yes", "no", "not sure" - they are valid
- DO NOT reject or ask for rephrasing of valid responses
`;

const AiResponseSchema = z.object({
  assistant_message: z.string(),
  filled_fields: z.array(z.string()).optional(),
  next_focus_field: z.string().optional(),
  state_updates: z.object({
    product_idea: z.string().optional(),
    import_country: z.string().optional(),
    sales_channel: z.enum(['amazon_fba', 'tiktok_shop', 'shopify', 'wholesale', 'other']).optional(),
    volume_plan: z.string().optional(),
    timeline: z.string().optional(),
    main_risk_concern: z.enum(['duty', 'quality', 'delay', 'compliance', 'other']).optional().nullable(),
    certifications_needed: z.string().optional(),
    extra_notes: z.string().optional(),
  }),
  ready_for_analysis: z.boolean(),
});

async function getApiKey(): Promise<string> {
  if (typeof process === 'undefined' || !process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return process.env.GEMINI_API_KEY;
}

export async function handleAiChat(
  history: ChatMessage[],
  currentState: SourcingConversationState
): Promise<ConversationalResponse> {
  try {
    const apiKey = await getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    const context = {
      history,
      currentState,
    };

    const result = await model.generateContent(JSON.stringify(context));
    const text = result.response.text();
    const parsed = JSON.parse(text);

    const validation = AiResponseSchema.safeParse(parsed);

    if (!validation.success) {
      console.error("[handleAiChat] Invalid AI response schema:", validation.error);
      console.error("[handleAiChat] Raw AI response text:", text);
      console.error("[handleAiChat] Parsed JSON:", JSON.stringify(parsed, null, 2));
      console.error("[handleAiChat] Validation errors:", validation.error.errors);
      
      // Try to recover: extract what we can from the response
      const recoveredState: SourcingConversationState = {
        ...currentState,
        messages: [...history, { 
          role: 'assistant', 
          content: parsed.assistant_message || "I understand. Let me continue gathering information." 
        }],
        ready_for_analysis: parsed.ready_for_analysis || false,
        next_focus_field: parsed.next_focus_field || undefined,
      };
      
      // Try to extract state_updates if present
      if (parsed.state_updates) {
        Object.assign(recoveredState, parsed.state_updates);
      }
      
      return {
        assistantMessage: parsed.assistant_message || "I understand. Let me continue.",
        updatedState: recoveredState,
      };
    }

    const { assistant_message, state_updates, ready_for_analysis, next_focus_field } = validation.data;

    const updatedState: SourcingConversationState = {
      ...currentState,
      ...state_updates,
      messages: [...history, { role: 'assistant', content: assistant_message }],
      ready_for_analysis: ready_for_analysis,
      next_focus_field: next_focus_field,
    };

    return {
      assistantMessage: assistant_message,
      updatedState: updatedState,
    };

  } catch (error) {
    console.error("[handleAiChat] Error processing chat:", error);
    console.error("[handleAiChat] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    // Provide a more helpful error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isApiKeyError = errorMessage.includes('GEMINI_API_KEY');
    
    const errorResponse = isApiKeyError
      ? "I'm having trouble connecting to the AI service. Please check the configuration."
      : "I had trouble processing that. Let's continue - could you try again or rephrase?";
    
    const updatedState: SourcingConversationState = {
        ...currentState,
        messages: [...history, { role: 'assistant', content: errorResponse }],
        ready_for_analysis: false,
    };
    return {
      assistantMessage: errorResponse,
      updatedState,
    };
  }
}
export function buildAnalyzerInputFromConversation(
  state: SourcingConversationState
): { input: string } {
  const {
    product_idea,
    import_country,
    sales_channel,
    volume_plan,
    timeline,
    main_risk_concern,
    certifications_needed,
    extra_notes,
  } = state;

  if (product_idea && !import_country && !sales_channel && !volume_plan) {
    return { input: product_idea };
  }

  const parts = [
    `Product idea: ${product_idea || 'Not specified'}`,
    import_country ? `Importing to: ${import_country}` : '',
    sales_channel ? `Sales channel: ${sales_channel}` : '',
    volume_plan ? `Volume plan: ${volume_plan}` : '',
    timeline ? `Timeline: ${timeline}` : '',
    main_risk_concern ? `Main risk concern: ${main_risk_concern}` : '',
    certifications_needed ? `Certifications needed: ${certifications_needed}` : '',
    extra_notes ? `Extra notes: ${extra_notes}` : '',
  ];

  const inputText = parts.filter(Boolean).join('. ');

  return {
    input: inputText || 'No product description provided.',
  };
}