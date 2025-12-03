/**
 * Full Automated Category Knowledge Builder (Gemini Only)
 * 
 * Research → Verify → JSON Generate → Merge → Commit
 * 
 * Usage:
 *   pnpm tsx scripts/autoCategory.ts "US baby teether toy (silicone)"
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing modules that use them
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CategoryComplianceRule, ComplianceRulesData } from '../lib/types/compliance';
import type { CategoryFactoryVettingHints, FactoryVettingData } from '../lib/types/factoryVetting';
import fs from 'fs/promises';
import { execSync } from 'child_process';

const COMPLIANCE_FILE_PATH = path.join(__dirname, '..', 'data', 'compliance', 'category_rules.json');
const FACTORY_FILE_PATH = path.join(__dirname, '..', 'data', 'factory', 'category_vetting.json');
const COMPLIANCE_SAMPLE_PATH = path.join(__dirname, '..', 'data', 'compliance', 'category_rules.sample.json');
const FACTORY_SAMPLE_PATH = path.join(__dirname, '..', 'data', 'factory', 'category_vetting.sample.json');

interface ResearchData {
  compliance: {
    typicalHtsCodes?: string[];
    requiredRegulations?: string[];
    testingRequirements?: string[];
    highRiskFlags?: string[];
    referenceLinks?: string[];
    exampleProducts?: string[];
  };
  factory: {
    typicalSupplierTypes?: string[];
    mustHaveCertificates?: string[];
    niceToHaveCertificates?: string[];
    sampleQuestionsToFactory?: string[];
    commonRedFlags?: string[];
    recommendedAlibabaFilters?: string[];
  };
}

interface ParsedInput {
  category_id: string;
  category_label: string;
  targetMarket: string;
  exampleProducts: string[];
  probableHtsCodes: string[];
  relatedCategories?: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getApiKey(): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Please set it in your .env.local file.');
  }
  return process.env.GEMINI_API_KEY;
}

async function callGeminiJSON(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = await getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelConfig: any = {
    model: 'gemini-2.5-pro',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3, // Lower temperature for more factual, consistent output
    },
  };
  
  if (systemInstruction) {
    modelConfig.systemInstruction = systemInstruction;
  }
  
  const model = genAI.getGenerativeModel(modelConfig);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Clean up markdown code blocks if present
  const cleaned = text.replace(/```json|```/g, '').trim();
  return cleaned;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // Remove text in parentheses
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]+/g, '')
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

// ============================================================================
// Step 1: Input Handling
// ============================================================================

async function parseInput(inputText: string): Promise<ParsedInput> {
  console.log('  → Deriving category information from input...');
  
  const category_id = slugify(inputText);
  
  const prompt = `
Based on the user input: "${inputText}"

Generate a JSON object with the following fields:
- "label": Human-readable category label (e.g., "Silicone Baby Teether Toy" for "US baby teether toy (silicone)")
- "exampleProducts": Array of 3-5 example product names that match this category
- "probableHtsCodes": Array of 2-4 probable HTS codes for US imports (format: "XXXX.XX.XX")
- "targetMarket": Default target market (default to "United States" unless specified)

Return ONLY a valid JSON object. Example:
{
  "label": "Silicone Baby Teether Toy",
  "exampleProducts": ["silicone teether ring", "fruit-shaped silicone teether", "baby teething mitt"],
  "probableHtsCodes": ["9503.00.00", "3924.90.56"],
  "targetMarket": "United States"
}
`;

  const result = await callGeminiJSON(prompt);
  const parsed = JSON.parse(result);
  
  return {
    category_id,
    category_label: parsed.label || inputText,
    targetMarket: parsed.targetMarket || 'United States',
    exampleProducts: parsed.exampleProducts || [parsed.label || inputText],
    probableHtsCodes: parsed.probableHtsCodes || [],
    relatedCategories: parsed.relatedCategories || [],
  };
}

// ============================================================================
// Step 2: Research Pipeline (Gemini Only)
// ============================================================================

async function researchWithGemini(
  inputText: string,
  parsedInput: ParsedInput
): Promise<ResearchData> {
  console.log('  → Researching regulations, compliance, and factory vetting...');
  
  const researchPrompt = `
You are a world-class expert in US consumer product safety, compliance, customs regulations, and international supply chain management.

Conduct comprehensive research for this product category: "${inputText}"

**Category Context:**
- Label: ${parsedInput.category_label}
- Target Market: ${parsedInput.targetMarket}
- Example Products: ${parsedInput.exampleProducts.join(', ')}

**Research Requirements:**

A. **Regulations & Compliance:**
Research ALL applicable US regulations:
- CPSIA (Consumer Product Safety Improvement Act) - specific parts that apply
- ASTM standards (e.g., ASTM F963 for toys)
- CPSC small parts rules (16 CFR Part 1501)
- Lead/Phthalates limits (16 CFR Part 1303, 16 CFR Part 1307)
- FDA compliance (21 CFR 177.x for food contact materials if applicable)
- Tracking label requirements
- Recent recalls or known issues for similar products
- State-specific regulations (CA Prop 65, etc.)

B. **Required Testing:**
Detail ALL mandatory testing requirements:
- CPSIA third-party testing requirements
- ASTM performance testing (specific tests)
- FDA extraction testing (if food contact)
- Mechanical/chemical test items
- Age grading rules
- Specific testing labs/standards

C. **Factory Vetting:**
Research supplier requirements:
- Typical supplier types (OEM, ODM, specialized factories)
- Must-have certificates (ISO 9001, BSCI, SMETA, etc.)
- Nice-to-have certificates
- Quality control processes specific to this category
- Common red flags when sourcing this product
- Effective Alibaba filter recommendations

**Output Format:**
Return a single JSON object with this exact structure:
{
  "compliance": {
    "typicalHtsCodes": ["XXXX.XX.XX", "YYYY.YY.YY"],
    "requiredRegulations": ["Specific regulation 1", "Specific regulation 2"],
    "testingRequirements": ["Test requirement 1", "Test requirement 2"],
    "highRiskFlags": ["Risk flag 1", "Risk flag 2"],
    "referenceLinks": ["https://official-link.gov/...", "https://official-link.org/..."],
    "exampleProducts": ["example 1", "example 2"]
  },
  "factory": {
    "typicalSupplierTypes": ["Supplier type 1", "Supplier type 2"],
    "mustHaveCertificates": ["Certificate 1", "Certificate 2"],
    "niceToHaveCertificates": ["Certificate 1", "Certificate 2"],
    "sampleQuestionsToFactory": ["Question 1?", "Question 2?"],
    "commonRedFlags": ["Red flag 1", "Red flag 2"],
    "recommendedAlibabaFilters": ["Filter 1", "Filter 2"]
  }
}

**CRITICAL:** Be specific and factual. Use real regulation numbers, real testing standards, real certificate names. Provide official reference links (.gov, .org sites only).
`;

  const systemInstruction = `You are a meticulous compliance and sourcing research expert. Provide accurate, specific, and actionable information based on real US regulations and industry standards. Always cite official sources.`;

  const result = await callGeminiJSON(researchPrompt, systemInstruction);
  return JSON.parse(result) as ResearchData;
}

// ============================================================================
// Step 3: Verification (Gemini Self-Check)
// ============================================================================

async function verifyWithGemini(researchData: ResearchData, categoryLabel: string): Promise<ResearchData> {
  console.log('  → Verifying and fact-checking research data...');
  
  const verificationPrompt = `
You are a verification and fact-checking specialist for US import compliance.

Review the following research data for the category: "${categoryLabel}"

**Your task:** Verify, correct, and enhance the data. Remove hallucinations and inaccuracies.

**Verification Checklist:**

1. **Regulations:**
   - Verify every CFR part number exists (e.g., 16 CFR Part 1303, 21 CFR 177.2600)
   - Remove any incorrect or non-existent regulations
   - Add any critical missing regulations
   - Ensure regulation names match official government terminology

2. **HTS Codes:**
   - Validate that HTS codes are plausible for this product category and US imports
   - Format should be "XXXX.XX.XX" (4 digits, 2 digits, 2 digits)
   - Remove any obviously incorrect codes

3. **Testing Requirements:**
   - Ensure testing requirements accurately reflect CPSIA, ASTM, FDA language
   - Remove generic or vague requirements
   - Ensure specific test names and standards are correct

4. **Reference Links:**
   - Verify all links point to official government (.gov) or standards organization (.org) websites
   - Remove broken, placeholder, or non-official links
   - Add missing critical official links

5. **Factory Vetting:**
   - Confirm certificates are real and relevant (ISO 9001, BSCI, SMETA are real)
   - Ensure questions are specific and actionable
   - Remove generic or irrelevant advice

6. **High Risk Flags:**
   - Ensure all risk flags are specific to this product category
   - Remove generic warnings

**Input Data to Verify:**
\`\`\`json
${JSON.stringify(researchData, null, 2)}
\`\`\`

**Output Format:**
Return the corrected JSON object with the EXACT same structure. Only include verified, factual information. Do not add commentary or explanations.
`;

  const systemInstruction = `You are a strict fact-checker. Remove all hallucinations, incorrect information, and generic advice. Only output verified facts.`;

  const result = await callGeminiJSON(verificationPrompt, systemInstruction);
  return JSON.parse(result) as ResearchData;
}

// ============================================================================
// Step 4: JSON Generation
// ============================================================================

function buildComplianceJson(parsedInput: ParsedInput, verifiedData: ResearchData): CategoryComplianceRule {
  return {
    id: parsedInput.category_id,
    label: parsedInput.category_label,
    exampleProducts: verifiedData.compliance.exampleProducts || parsedInput.exampleProducts,
    targetMarkets: [parsedInput.targetMarket],
    typicalHtsCodes: verifiedData.compliance.typicalHtsCodes || parsedInput.probableHtsCodes,
    requiredRegulations: verifiedData.compliance.requiredRegulations || [],
    testingRequirements: verifiedData.compliance.testingRequirements || [],
    highRiskFlags: verifiedData.compliance.highRiskFlags || [],
    referenceLinks: verifiedData.compliance.referenceLinks || [],
  };
}

function buildFactoryJson(parsedInput: ParsedInput, verifiedData: ResearchData): CategoryFactoryVettingHints {
  return {
    id: parsedInput.category_id,
    label: parsedInput.category_label,
    typicalSupplierTypes: verifiedData.factory.typicalSupplierTypes || [],
    mustHaveCertificates: verifiedData.factory.mustHaveCertificates || [],
    niceToHaveCertificates: verifiedData.factory.niceToHaveCertificates || [],
    sampleQuestionsToFactory: verifiedData.factory.sampleQuestionsToFactory || [],
    commonRedFlags: verifiedData.factory.commonRedFlags || [],
    recommendedAlibabaFilters: verifiedData.factory.recommendedAlibabaFilters || [],
  };
}

// ============================================================================
// Step 5: Auto-Merge into JSON Files
// ============================================================================

async function ensureFileExists(filePath: string, samplePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    // File doesn't exist, create from sample
    console.log(`  → Creating ${filePath} from sample...`);
    const sampleContent = await fs.readFile(samplePath, 'utf-8');
    const sampleData = JSON.parse(sampleContent);
    // Clear categories array for new file
    const newData = {
      ...sampleData,
      categories: [],
      $comment: sampleData.$comment?.replace('sample', 'actual') || '',
    };
    await fs.writeFile(filePath, JSON.stringify(newData, null, 2) + '\n', 'utf-8');
  }
}

async function mergeIntoFiles(
  complianceJson: CategoryComplianceRule,
  factoryJson: CategoryFactoryVettingHints
): Promise<{ compliance: string; factory: string; compliancePath: string; factoryPath: string }> {
  // Ensure files exist
  await ensureFileExists(COMPLIANCE_FILE_PATH, COMPLIANCE_SAMPLE_PATH);
  await ensureFileExists(FACTORY_FILE_PATH, FACTORY_SAMPLE_PATH);

  // Read and parse compliance file
  const complianceContent = await fs.readFile(COMPLIANCE_FILE_PATH, 'utf-8');
  const complianceData: ComplianceRulesData = JSON.parse(complianceContent);
  
  // Check if category exists and update or add
  const complianceIndex = complianceData.categories.findIndex(c => c.id === complianceJson.id);
  let complianceStatus = 'created';
  if (complianceIndex >= 0) {
    complianceData.categories[complianceIndex] = complianceJson;
    complianceStatus = 'updated';
  } else {
    complianceData.categories.push(complianceJson);
  }
  
  // Write compliance file
  await fs.writeFile(
    COMPLIANCE_FILE_PATH,
    JSON.stringify(complianceData, null, 2) + '\n',
    'utf-8'
  );

  // Read and parse factory file
  const factoryContent = await fs.readFile(FACTORY_FILE_PATH, 'utf-8');
  const factoryData: FactoryVettingData = JSON.parse(factoryContent);
  
  // Check if category exists and update or add
  const factoryIndex = factoryData.categories.findIndex(c => c.id === factoryJson.id);
  let factoryStatus = 'created';
  if (factoryIndex >= 0) {
    factoryData.categories[factoryIndex] = factoryJson;
    factoryStatus = 'updated';
  } else {
    factoryData.categories.push(factoryJson);
  }
  
  // Write factory file
  await fs.writeFile(
    FACTORY_FILE_PATH,
    JSON.stringify(factoryData, null, 2) + '\n',
    'utf-8'
  );

  return {
    compliance: complianceStatus,
    factory: factoryStatus,
    compliancePath: COMPLIANCE_FILE_PATH,
    factoryPath: FACTORY_FILE_PATH,
  };
}

// ============================================================================
// Step 6: Summary Print
// ============================================================================

function printSummary(
  parsedInput: ParsedInput,
  complianceJson: CategoryComplianceRule,
  factoryJson: CategoryFactoryVettingHints,
  statuses: { compliance: string; factory: string; compliancePath: string; factoryPath: string }
): void {
  console.log('\n' + '='.repeat(80));
  console.log('✅ Category Knowledge Generation Complete');
  console.log('='.repeat(80));
  console.log(`\nCategory ID:       ${parsedInput.category_id}`);
  console.log(`Label:             ${parsedInput.category_label}`);
  console.log(`Target Market:     ${parsedInput.targetMarket}`);
  console.log('\n--- Compliance Data ---');
  console.log(`Regulations:       ${complianceJson.requiredRegulations.length} found`);
  console.log(`HTS Codes:         ${complianceJson.typicalHtsCodes.join(', ') || 'None'}`);
  console.log(`Testing Reqs:      ${complianceJson.testingRequirements.length} items`);
  console.log(`Risk Flags:        ${complianceJson.highRiskFlags.length} items`);
  console.log(`Reference Links:   ${complianceJson.referenceLinks.length} links`);
  console.log('\n--- Factory Vetting Data ---');
  console.log(`Supplier Types:    ${factoryJson.typicalSupplierTypes.length} types`);
  console.log(`Must-Have Certs:   ${factoryJson.mustHaveCertificates.length} certificates`);
  console.log(`Nice-to-Have:      ${factoryJson.niceToHaveCertificates.length} certificates`);
  console.log(`Sample Questions:  ${factoryJson.sampleQuestionsToFactory.length} questions`);
  console.log(`Red Flags:         ${factoryJson.commonRedFlags.length} flags`);
  console.log(`Alibaba Filters:   ${factoryJson.recommendedAlibabaFilters.length} filters`);
  console.log('\n--- File Status ---');
  console.log(`Compliance File:   ${statuses.compliance} → ${statuses.compliancePath}`);
  console.log(`Factory File:      ${statuses.factory} → ${statuses.factoryPath}`);
  console.log('\n' + '='.repeat(80) + '\n');
}

// ============================================================================
// Step 7: Git Automation
// ============================================================================

function runGitAutomation(categoryId: string, compliancePath: string, factoryPath: string): void {
  try {
    console.log('🤖 Running Git automation...');
    
    // Use relative paths for git commands
    const complianceRelPath = path.relative(process.cwd(), compliancePath);
    const factoryRelPath = path.relative(process.cwd(), factoryPath);
    
    execSync(`git add "${complianceRelPath}"`, { stdio: 'inherit' });
    execSync(`git add "${factoryRelPath}"`, { stdio: 'inherit' });
    execSync(`git commit -m "Auto-update category knowledge: ${categoryId}"`, { stdio: 'inherit' });
    
    console.log('✅ Git commit successful.\n');
  } catch (error: any) {
    console.error('⚠️  Git automation failed. This is not critical.');
    console.error('   You can commit changes manually if needed.\n');
  }
}

// ============================================================================
// ============================================================================
// Core Logic Export
// ============================================================================

export async function generateCategoryKnowledge(inputText: string): Promise<{ compliance: CategoryComplianceRule, factory: CategoryFactoryVettingHints }> {
  // Step 1: Input Handling
  const parsedInput = await parseInput(inputText);

  // Step 2: Research Pipeline
  const initialResearch = await researchWithGemini(inputText, parsedInput);

  // Step 3: Verification
  const verifiedResearch = await verifyWithGemini(initialResearch, parsedInput.category_label);

  // Step 4: JSON Generation
  const complianceJson = buildComplianceJson(parsedInput, verifiedResearch);
  const factoryJson = buildFactoryJson(parsedInput, verifiedResearch);

  return { compliance: complianceJson, factory: factoryJson };
}


// ============================================================================
// Main Function (for CLI execution)
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const inputText = args.join(' ');

  if (!inputText) {
    console.error('Error: Category description is required.');
    console.error('\nUsage:');
    console.error('  pnpm tsx scripts/autoCategory.ts "US baby teether toy (silicone)"');
    console.error('  pnpm tsx scripts/autoCategory.ts "stainless steel water bottle"');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🚀 Full Automated Category Knowledge Builder');
  console.log('='.repeat(80));
  console.log(`\nInput: "${inputText}"\n`);

  try {
    const { compliance, factory } = await generateCategoryKnowledge(inputText);
    
    // Step 5: Auto-Merge
    console.log('\nStep 5: Merging data into JSON files...');
    const statuses = await mergeIntoFiles(compliance, factory);
    console.log(`  ✓ Compliance file: ${statuses.compliance}`);
    console.log(`  ✓ Factory file: ${statuses.factory}`);

    // This is a bit awkward as we need parsedInput, but it's generated inside generateCategoryKnowledge
    // For the CLI summary, we can regenerate it or modify the return type. For now, let's regenerate it for simplicity.
    const parsedInput = await parseInput(inputText);

    // Step 6: Summary
    printSummary(parsedInput, compliance, factory, statuses);

    // Step 7: Git Automation
    runGitAutomation(parsedInput.category_id, statuses.compliancePath, statuses.factoryPath);

    console.log('🎉 All steps completed successfully!\n');
    
    // For programmatic use, output the final JSON
    if (require.main !== module) {
        console.log(JSON.stringify({ compliance, factory }));
    }

  } catch (error: any) {
    console.error('\n❌ Error during automated category knowledge build:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly from command line
if (require.main === module) {
  main();
}