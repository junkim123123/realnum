/**
 * Dev-only script to generate first-draft category compliance and factory vetting hints
 * using Gemini 2.5 Pro.
 * 
 * Usage:
 *   npx tsx scripts/generate-category-hints.ts "baby teether"
 *   npx tsx scripts/generate-category-hints.ts "stainless steel water bottle"
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing modules that use them
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CategoryComplianceRule } from "../lib/types/compliance";
import type { CategoryFactoryVettingHints } from "../lib/types/factoryVetting";

async function getApiKey(): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured. Please set it in your .env.local file.");
  }
  return process.env.GEMINI_API_KEY;
}

const SYSTEM_PROMPT = `You are a Senior Sourcing and Compliance Expert at NexSupply. Your job is to generate comprehensive category knowledge data for product categories, including compliance rules and factory vetting hints.

You will receive a product/category description and must generate two structured JSON objects:

1. **CategoryComplianceRule**: Compliance and regulatory requirements
2. **CategoryFactoryVettingHints**: Factory vetting guidance

CRITICAL REQUIREMENTS:
- Research quality: Use your knowledge of real regulations (CPSIA, FDA, UL, etc.), HTS codes, and sourcing best practices
- Be specific: Provide concrete examples, not generic advice
- Be thorough: Fill in all required fields with realistic, helpful content
- Format: Return ONLY valid JSON, no markdown, no explanations

OUTPUT FORMAT:
You must return a single JSON object with this exact structure:
{
  "compliance": { ... CategoryComplianceRule ... },
  "factory": { ... CategoryFactoryVettingHints ... }
}

The "id" field in both objects must be the same (use snake_case, e.g., "baby_teether", "stainless_steel_tumbler").

IMPORTANT FIELD GUIDELINES:

For Compliance Rule:
- id: snake_case identifier (e.g., "baby_teether")
- label: Human-readable name
- exampleProducts: 3-5 example product names
- targetMarkets: Common import markets (e.g., ["United States", "European Union", "Canada"])
- typicalHtsCodes: 2-4 realistic HTS/HS codes for this category
- requiredRegulations: Specific regulations (e.g., ["CPSIA", "FDA Food Contact Regulations", "ASTM F963"])
- testingRequirements: 4-6 specific testing requirements as short bullet points
- highRiskFlags: 4-6 common compliance pitfalls
- referenceLinks: 2-4 URLs to official documentation (use real URLs if possible, or placeholder if unsure)

For Factory Vetting:
- id: Must match compliance.id exactly
- label: Should match compliance.label
- typicalSupplierTypes: 2-3 supplier types (e.g., ["OEM", "ODM", "Specialized silicone molding factories"])
- mustHaveCertificates: 3-5 essential certificates (e.g., ["ISO 9001", "BSCI", "CPSIA Testing Lab Certificate"])
- niceToHaveCertificates: 2-4 additional certificates
- sampleQuestionsToFactory: 5-7 specific questions buyers should ask
- commonRedFlags: 5-7 warning signs to watch for
- recommendedAlibabaFilters: 4-6 practical search filters

Remember: This is a first draft. A human should review and fact-check before using in production.`;

async function generateCategoryHints(categoryDescription: string): Promise<{
  compliance: CategoryComplianceRule;
  factory: CategoryFactoryVettingHints;
}> {
  const apiKey = await getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3, // Lower temperature for more factual, consistent output
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const userPrompt = `Generate category knowledge data for this product/category:

"${categoryDescription}"

Return the JSON object with "compliance" and "factory" fields as specified.`;

  console.log(`[GenerateCategoryHints] Generating hints for: "${categoryDescription}"...`);
  console.log(`[GenerateCategoryHints] This may take 30-60 seconds...\n`);

  try {
    const result = await model.generateContent(userPrompt);
    let text = result.response.text();
    
    // Clean up markdown code blocks if present
    text = text.replace(/```json|```/g, "").trim();
    
    // Parse the JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (parseError: any) {
      throw new Error(`Failed to parse JSON response: ${parseError.message}\n\nRaw response:\n${text}`);
    }
    
    // Validate structure
    if (!parsed.compliance || !parsed.factory) {
      throw new Error(`Response missing "compliance" or "factory" fields.\n\nParsed structure:\n${JSON.stringify(Object.keys(parsed), null, 2)}\n\nFull response:\n${text}`);
    }

    // Ensure IDs match
    if (parsed.compliance.id !== parsed.factory.id) {
      console.warn(`[GenerateCategoryHints] Warning: ID mismatch. Using compliance.id: ${parsed.compliance.id}`);
      parsed.factory.id = parsed.compliance.id;
    }

    return {
      compliance: parsed.compliance as CategoryComplianceRule,
      factory: parsed.factory as CategoryFactoryVettingHints,
    };
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to parse JSON')) {
      // Already formatted error
      throw error;
    }
    throw new Error(`Error generating category hints: ${error.message || error}`);
  }
}

function formatOutput(data: {
  compliance: CategoryComplianceRule;
  factory: CategoryFactoryVettingHints;
}): string {
  return JSON.stringify(data, null, 2);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Error: Category description is required.');
    console.error('\nUsage:');
    console.error('  npx tsx scripts/generate-category-hints.ts "baby teether"');
    console.error('  npx tsx scripts/generate-category-hints.ts "stainless steel water bottle"');
    process.exit(1);
  }

  const categoryDescription = args.join(' ');

  try {
    const hints = await generateCategoryHints(categoryDescription);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Generated Category Hints');
    console.log('='.repeat(80) + '\n');
    console.log(formatOutput(hints));
    console.log('\n' + '='.repeat(80));
    console.log('📝 Next steps:');
    console.log('1. Review and fact-check the generated data');
    console.log('2. Add it to the appropriate JSON files:');
    console.log('   - web/data/compliance/category_rules.json (add to "categories" array)');
    console.log('   - web/data/factory/category_vetting.json (add to "categories" array)');
    console.log('3. Ensure the "id" fields match in both files');
    console.log('='.repeat(80) + '\n');
    
  } catch (error: any) {
    console.error('\n❌ Error generating category hints:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

