/**
 * Regulation Pattern Extraction Model
 * 
 * Analyzes category rules and usage logs to discover frequent regulation
 * combinations and risk clusters.
 * 
 * Usage:
 *   npx tsx scripts/generateRegulationPatterns.ts
 */

import fs from 'fs/promises';
import path from 'path';
import type { ComplianceRulesData } from '../lib/types/compliance';
import type { CategoryUsageEvent } from '../lib/analytics/categoryUsage';
import type { RegulationPatternsData, RegulationPattern, HtsPattern } from '../lib/analytics/regulationPatterns';
import { extractRegulationsFromRule, extractHtsPrefix } from '../lib/analytics/regulationPatterns';

const COMPLIANCE_RULES_FILE = path.join(process.cwd(), 'data', 'compliance', 'category_rules.json');
const LOG_FILE = path.join(process.cwd(), 'logs', 'category-usage.ndjson');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'analytics', 'regulation_patterns.json');

interface CategoryFeatures {
  category_id: string;
  base_regulations: string[];
  testing_requirements: string[];
  high_risk_flags: string[];
  usage_count: number;
  average_risk_score?: number;
  hts_prefixes: Set<string>;
}

/**
 * Read usage logs
 */
async function readUsageLogs(): Promise<CategoryUsageEvent[]> {
  const events: CategoryUsageEvent[] = [];
  
  try {
    const content = await fs.readFile(LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as CategoryUsageEvent;
        if (event.timestamp && event.raw_input) {
          events.push(event);
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.warn(`[RegulationPatterns] Could not read usage logs: ${error.message}`);
    }
  }
  
  return events;
}

/**
 * Load compliance rules
 */
async function loadComplianceRules(): Promise<ComplianceRulesData> {
  const content = await fs.readFile(COMPLIANCE_RULES_FILE, 'utf-8');
  return JSON.parse(content) as ComplianceRulesData;
}

/**
 * Build category features from rules and usage logs
 */
function buildCategoryFeatures(
  rules: ComplianceRulesData,
  usageEvents: CategoryUsageEvent[]
): Map<string, CategoryFeatures> {
  const featuresMap = new Map<string, CategoryFeatures>();
  
  // Initialize from rules
  for (const category of rules.categories) {
    const regulations = extractRegulationsFromRule(category);
    
    featuresMap.set(category.id, {
      category_id: category.id,
      base_regulations: regulations,
      testing_requirements: category.testingRequirements || [],
      high_risk_flags: category.highRiskFlags || [],
      usage_count: 0,
      hts_prefixes: new Set<string>(),
    });
  }
  
  // Enhance with usage data
  const categoryUsage = new Map<string, { count: number; riskScores: number[] }>();
  const categoryHtsCodes = new Map<string, Set<string>>();
  
  for (const event of usageEvents) {
    if (!event.category_id) continue;
    
    // Track usage count
    const usage = categoryUsage.get(event.category_id) || { count: 0, riskScores: [] };
    usage.count++;
    if (event.risk_score !== undefined) {
      usage.riskScores.push(event.risk_score);
    }
    categoryUsage.set(event.category_id, usage);
    
    // Track HTS codes
    if (event.hts_code) {
      const prefix = extractHtsPrefix(event.hts_code);
      if (prefix) {
        const htsSet = categoryHtsCodes.get(event.category_id) || new Set<string>();
        htsSet.add(prefix);
        categoryHtsCodes.set(event.category_id, htsSet);
      }
    }
  }
  
  // Merge usage data into features
  for (const [categoryId, usage] of categoryUsage.entries()) {
    const features = featuresMap.get(categoryId);
    if (features) {
      features.usage_count = usage.count;
      if (usage.riskScores.length > 0) {
        features.average_risk_score = usage.riskScores.reduce((a, b) => a + b, 0) / usage.riskScores.length;
      }
    }
  }
  
  // Merge HTS prefixes
  for (const [categoryId, htsSet] of categoryHtsCodes.entries()) {
    const features = featuresMap.get(categoryId);
    if (features) {
      htsSet.forEach(prefix => features.hts_prefixes.add(prefix));
    }
  }
  
  return featuresMap;
}

/**
 * Generate regulation combination patterns
 */
function generateRegulationPatterns(
  featuresMap: Map<string, CategoryFeatures>,
  minFrequency: number = 5
): RegulationPattern[] {
  const comboMap = new Map<string, {
    categories: Set<string>;
    riskScores: number[];
    testingReqs: Map<string, number>;
    riskFlags: Map<string, number>;
  }>();
  
  // Group categories by regulation combinations
  for (const [categoryId, features] of featuresMap.entries()) {
    if (features.base_regulations.length === 0) continue;
    
    // Create sorted combo key
    const comboKey = features.base_regulations.sort().join('|');
    
    let combo = comboMap.get(comboKey);
    if (!combo) {
      combo = {
        categories: new Set(),
        riskScores: [],
        testingReqs: new Map(),
        riskFlags: new Map(),
      };
      comboMap.set(comboKey, combo);
    }
    
    combo.categories.add(categoryId);
    
    if (features.average_risk_score !== undefined) {
      combo.riskScores.push(features.average_risk_score);
    }
    
    // Aggregate testing requirements
    for (const req of features.testing_requirements) {
      const key = req.substring(0, 100); // Limit length
      combo.testingReqs.set(key, (combo.testingReqs.get(key) || 0) + 1);
    }
    
    // Aggregate risk flags
    for (const flag of features.high_risk_flags) {
      const key = flag.substring(0, 100);
      combo.riskFlags.set(key, (combo.riskFlags.get(key) || 0) + 1);
    }
  }
  
  // Convert to patterns (filter by frequency)
  const patterns: RegulationPattern[] = [];
  
  for (const [comboKey, combo] of comboMap.entries()) {
    if (combo.categories.size < minFrequency) continue;
    
    const regulations = comboKey.split('|');
    
    // Get top 5 testing requirements
    const topTestingReqs = Array.from(combo.testingReqs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([req]) => req);
    
    // Get top 5 risk flags
    const topRiskFlags = Array.from(combo.riskFlags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([flag]) => flag);
    
    // Calculate average risk score
    const avgRiskScore = combo.riskScores.length > 0
      ? combo.riskScores.reduce((a, b) => a + b, 0) / combo.riskScores.length
      : undefined;
    
    patterns.push({
      regulation_combo: regulations,
      categories_count: combo.categories.size,
      avg_risk_score: avgRiskScore,
      example_categories: Array.from(combo.categories).slice(0, 5),
      common_testing_requirements: topTestingReqs,
      common_high_risk_flags: topRiskFlags,
    });
  }
  
  // Sort by categories_count DESC
  patterns.sort((a, b) => b.categories_count - a.categories_count);
  
  return patterns;
}

/**
 * Generate HTS prefix patterns
 */
function generateHtsPatterns(
  featuresMap: Map<string, CategoryFeatures>
): HtsPattern[] {
  const prefixMap = new Map<string, {
    categories: Set<string>;
    regulations: Map<string, number>;
    riskScores: number[];
  }>();
  
  // Group by HTS prefix
  for (const [categoryId, features] of featuresMap.entries()) {
    for (const prefix of features.hts_prefixes) {
      let prefixData = prefixMap.get(prefix);
      if (!prefixData) {
        prefixData = {
          categories: new Set(),
          regulations: new Map(),
          riskScores: [],
        };
        prefixMap.set(prefix, prefixData);
      }
      
      prefixData.categories.add(categoryId);
      
      // Track regulations
      for (const reg of features.base_regulations) {
        prefixData.regulations.set(reg, (prefixData.regulations.get(reg) || 0) + 1);
      }
      
      if (features.average_risk_score !== undefined) {
        prefixData.riskScores.push(features.average_risk_score);
      }
    }
  }
  
  // Convert to patterns
  const patterns: HtsPattern[] = [];
  
  for (const [prefix, data] of prefixMap.entries()) {
    if (data.categories.size === 0) continue;
    
    // Get dominant regulations (top 3)
    const dominantRegs = Array.from(data.regulations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reg]) => reg);
    
    // Calculate average risk score
    const avgRiskScore = data.riskScores.length > 0
      ? data.riskScores.reduce((a, b) => a + b, 0) / data.riskScores.length
      : undefined;
    
    // Generate notes
    let notes: string | undefined;
    if (prefix === '9503') {
      notes = 'Toys and children\'s products frequently require CPSIA + EN71 testing.';
    } else if (prefix === '7323') {
      notes = 'Stainless steel household articles often require FDA food contact regulations.';
    } else if (prefix === '8516') {
      notes = 'Electric heating appliances typically require UL/ETL certification and FCC compliance.';
    }
    
    patterns.push({
      hts_prefix: prefix,
      categories_count: data.categories.size,
      dominant_regulations: dominantRegs,
      avg_risk_score: avgRiskScore,
      notes,
    });
  }
  
  // Sort by categories_count DESC
  patterns.sort((a, b) => b.categories_count - a.categories_count);
  
  return patterns;
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Regulation Pattern Extraction Model');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Load compliance rules
    console.log('  → Loading compliance rules...');
    const rules = await loadComplianceRules();
    console.log(`  ✓ Loaded ${rules.categories.length} categories`);
    
    // Load usage logs
    console.log('  → Loading usage logs...');
    const usageEvents = await readUsageLogs();
    console.log(`  ✓ Loaded ${usageEvents.length} usage events`);
    
    // Build category features
    console.log('  → Building category features...');
    const featuresMap = buildCategoryFeatures(rules, usageEvents);
    console.log(`  ✓ Built features for ${featuresMap.size} categories`);
    
    // Generate regulation patterns
    console.log('  → Generating regulation combination patterns...');
    const regulationPatterns = generateRegulationPatterns(featuresMap, 2); // Min 2 categories
    console.log(`  ✓ Found ${regulationPatterns.length} regulation patterns`);
    
    // Generate HTS patterns
    console.log('  → Generating HTS prefix patterns...');
    const htsPatterns = generateHtsPatterns(featuresMap);
    console.log(`  ✓ Found ${htsPatterns.length} HTS prefix patterns`);
    
    // Build output data
    const output: RegulationPatternsData = {
      generated_at: new Date().toISOString(),
      pattern_count: regulationPatterns.length + htsPatterns.length,
      by_regulation_combo: regulationPatterns,
      by_hts_prefix: htsPatterns,
    };
    
    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write output
    console.log(`  → Writing to ${OUTPUT_FILE}...`);
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n', 'utf-8');
    console.log('  ✓ Regulation patterns generated successfully\n');
    
    // Print summary
    console.log('='.repeat(80));
    console.log('✅ Regulation Pattern Extraction Complete');
    console.log('='.repeat(80));
    console.log(`\nGenerated at:          ${output.generated_at}`);
    console.log(`Total patterns:        ${output.pattern_count}`);
    console.log(`Regulation combos:     ${regulationPatterns.length}`);
    console.log(`HTS prefix patterns:   ${htsPatterns.length}`);
    
    if (regulationPatterns.length > 0) {
      console.log('\n--- Top 5 Regulation Combinations ---');
      regulationPatterns.slice(0, 5).forEach((pattern, idx) => {
        console.log(`\n${idx + 1}. ${pattern.regulation_combo.join(' + ')}`);
        console.log(`   Categories: ${pattern.categories_count}`);
        if (pattern.avg_risk_score !== undefined) {
          console.log(`   Avg Risk Score: ${pattern.avg_risk_score.toFixed(1)}`);
        }
        console.log(`   Examples: ${pattern.example_categories.join(', ')}`);
      });
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error: any) {
    console.error('\n❌ Error generating regulation patterns:');
    console.error(error.message);
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

