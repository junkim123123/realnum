import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing modules that use them
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CategoryComplianceRule } from '../lib/types/compliance';
import type { CategoryFactoryVettingHints } from '../lib/types/factoryVetting';

// Get category description from command line arguments
const args = process.argv.slice(2);
const CATEGORY_DESCRIPTION_ARG = args.join(' ');

if (!CATEGORY_DESCRIPTION_ARG) {
  console.error('Error: Category description is required.');
  console.error('\nUsage:');
  console.error('  npx tsx scripts/generateCategoryKnowledge.ts "US baby teether toy"');
  console.error('  npx tsx scripts/generateCategoryKnowledge.ts "stainless steel water bottle"');
  process.exit(1);
}

async function getApiKey(): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Please set it in your .env.local file.');
  }
  return process.env.GEMINI_API_KEY;
}

async function callGeminiJSON(prompt: string): Promise<string> {
  const apiKey = await getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Clean up markdown code blocks if present
  const cleaned = text.replace(/```json|```/g, '').trim();
  return cleaned;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]+/g, '');
}

async function main() {
  console.log(
    `Generating category knowledge for: "${CATEGORY_DESCRIPTION_ARG}"...`
  );

  const prompt = `
    Role: You are an expert in customs, product safety, and factory vetting for consumer goods imported into the United States and European Union.
    
    Task: Generate a single JSON object based on the user's category description. The JSON object must contain two keys: "compliance" and "factory".

    User's Category Description: "${CATEGORY_DESCRIPTION_ARG}"

    Schema Requirements:
    - The "compliance" key must be a valid CategoryComplianceRule object.
    - The "factory" key must be a valid CategoryFactoryVettingHints object.

    Output Rules:
    1.  **RAW JSON ONLY.** Do not include any comments, explanations, or markdown fences (like \`\`\`json). The entire output must be a single, parsable JSON object.
    2.  The final structure must be exactly: { "compliance": { ... }, "factory": { ... } }
    3.  For the 'id' field in both objects, generate a slug from the user's description (e.g., "baby_teether_us").
    4.  For the 'label' field in both objects, create a natural, human-readable category name.

    Here are the TypeScript interfaces for your reference:

    interface CategoryComplianceRule {
      id: string;
      label: string;
      exampleProducts: string[];
      targetMarkets: string[];
      typicalHtsCodes: string[];
      requiredRegulations: string[];
      testingRequirements: string[];
      highRiskFlags: string[];
      referenceLinks: string[];
    }

    interface CategoryFactoryVettingHints {
      id: string;
      label: string;
      typicalSupplierTypes: string[];
      mustHaveCertificates: string[];
      niceToHaveCertificates: string[];
      sampleQuestionsToFactory: string[];
      commonRedFlags: string[];
      recommendedAlibabaFilters: string[];
    }
  `;

  try {
    const rawJsonResponse = await callGeminiJSON(prompt);
    
    // The response should be a clean JSON string, but we parse and stringify
    // to ensure it's valid and to apply pretty-printing.
    const parsed = JSON.parse(rawJsonResponse) as {
      compliance: CategoryComplianceRule;
      factory: CategoryFactoryVettingHints;
    };

    // Basic validation
    if (!parsed.compliance || !parsed.factory || !parsed.compliance.id || !parsed.factory.id) {
        throw new Error('Generated JSON is missing required root properties.');
    }

    console.log('\n//- Add the "compliance" object to: web/data/compliance/category_rules.json');
    console.log('//- Add the "factory" object to: web/data/factory/category_vetting.json\n');
    
    console.log(JSON.stringify(parsed, null, 2));

  } catch (error) {
    console.error('\n--- Failed to generate or parse category knowledge ---');
    if (error instanceof Error) {
        console.error('Error:', error.message);
    }
    // @ts-ignore
    if (error.cause && error.cause.rawResponse) {
        // If the helper function attached the raw response
        // @ts-ignore
        console.error('\nRaw AI Response:\n', error.cause.rawResponse);
    }
    console.error('-----------------------------------------------------\n');
    process.exit(1);
  }
}

main();