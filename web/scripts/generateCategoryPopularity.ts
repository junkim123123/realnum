/**
 * Category Popularity Ranking Generator
 * 
 * Analyzes category usage logs and generates popularity rankings.
 * 
 * Usage:
 *   npx tsx scripts/generateCategoryPopularity.ts
 */

import fs from 'fs/promises';
import path from 'path';
import type { CategoryUsageEvent } from '../lib/analytics/categoryUsage';
import type { ComplianceRulesData } from '../lib/types/compliance';

const LOG_FILE = path.join(process.cwd(), 'logs', 'category-usage.ndjson');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'analytics', 'category_popularity.json');
const COMPLIANCE_RULES_FILE = path.join(process.cwd(), 'data', 'compliance', 'category_rules.json');

interface CategoryPopularityItem {
  category_id: string;
  label: string;
  total_count: number;
  first_seen_at: string;
  last_seen_at: string;
  average_risk_score?: number;
  average_feasibility_score?: number;
  top_regulations: string[];
}

interface CategoryPopularityData {
  generated_at: string;
  total_categories: number;
  items: CategoryPopularityItem[];
}

/**
 * Load category labels from compliance rules
 */
async function loadCategoryLabels(): Promise<Map<string, string>> {
  const labelMap = new Map<string, string>();
  
  try {
    const content = await fs.readFile(COMPLIANCE_RULES_FILE, 'utf-8');
    const data: ComplianceRulesData = JSON.parse(content);
    
    for (const category of data.categories) {
      labelMap.set(category.id, category.label);
    }
  } catch (error) {
    console.warn(`[CategoryPopularity] Could not load category labels: ${error}`);
  }
  
  return labelMap;
}

/**
 * Read and parse NDJSON log file
 */
async function readUsageLogs(): Promise<CategoryUsageEvent[]> {
  const events: CategoryUsageEvent[] = [];
  
  try {
    const content = await fs.readFile(LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const event = JSON.parse(line) as CategoryUsageEvent;
        // Validate required fields
        if (event.timestamp && event.raw_input) {
          events.push(event);
        } else {
          console.error(`[CategoryPopularity] Skipping malformed event at line ${i + 1}: missing required fields`);
        }
      } catch (parseError) {
        console.error(`[CategoryPopularity] Skipping malformed JSON at line ${i + 1}: ${parseError}`);
      }
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`[CategoryPopularity] Log file not found: ${LOG_FILE}`);
      console.warn('  This is normal if no category usage has been logged yet.');
      return [];
    }
    throw error;
  }
  
  return events;
}

/**
 * Aggregate events by category_id
 */
function aggregateByCategory(events: CategoryUsageEvent[]): Map<string, {
  count: number;
  firstSeen: string;
  lastSeen: string;
  riskScores: number[];
  feasibilityScores: number[];
  regulations: Map<string, number>;
}> {
  const aggregates = new Map<string, {
    count: number;
    firstSeen: string;
    lastSeen: string;
    riskScores: number[];
    feasibilityScores: number[];
    regulations: Map<string, number>;
  }>();
  
  for (const event of events) {
    // Skip events without category_id
    if (!event.category_id) continue;
    
    const categoryId = event.category_id;
    let agg = aggregates.get(categoryId);
    
    if (!agg) {
      agg = {
        count: 0,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        riskScores: [],
        feasibilityScores: [],
        regulations: new Map<string, number>(),
      };
      aggregates.set(categoryId, agg);
    }
    
    agg.count++;
    
    // Update timestamps
    if (event.timestamp < agg.firstSeen) {
      agg.firstSeen = event.timestamp;
    }
    if (event.timestamp > agg.lastSeen) {
      agg.lastSeen = event.timestamp;
    }
    
    // Collect scores
    if (event.risk_score !== undefined) {
      agg.riskScores.push(event.risk_score);
    }
    if (event.feasibility_score !== undefined) {
      agg.feasibilityScores.push(event.feasibility_score);
    }
    
    // Collect regulations
    if (event.regulation_tags) {
      for (const reg of event.regulation_tags) {
        agg.regulations.set(reg, (agg.regulations.get(reg) || 0) + 1);
      }
    }
  }
  
  return aggregates;
}

/**
 * Generate popularity ranking
 */
async function generatePopularityRanking(): Promise<CategoryPopularityData> {
  console.log('📊 Generating category popularity ranking...\n');
  
  // Load events
  console.log('  → Reading usage logs...');
  const events = await readUsageLogs();
  console.log(`  ✓ Found ${events.length} usage events`);
  
  if (events.length === 0) {
    console.log('\n⚠️  No usage events found. Returning empty ranking.');
    return {
      generated_at: new Date().toISOString(),
      total_categories: 0,
      items: [],
    };
  }
  
  // Load category labels
  console.log('  → Loading category labels...');
  const labelMap = await loadCategoryLabels();
  console.log(`  ✓ Loaded ${labelMap.size} category labels`);
  
  // Aggregate by category
  console.log('  → Aggregating events by category...');
  const aggregates = aggregateByCategory(events);
  console.log(`  ✓ Found ${aggregates.size} unique categories`);
  
  // Build popularity items
  console.log('  → Building popularity ranking...');
  const items: CategoryPopularityItem[] = [];
  
  for (const [categoryId, agg] of aggregates.entries()) {
    // Calculate averages
    const avgRiskScore = agg.riskScores.length > 0
      ? agg.riskScores.reduce((a, b) => a + b, 0) / agg.riskScores.length
      : undefined;
    
    const avgFeasibilityScore = agg.feasibilityScores.length > 0
      ? agg.feasibilityScores.reduce((a, b) => a + b, 0) / agg.feasibilityScores.length
      : undefined;
    
    // Get top 5 regulations
    const topRegulations = Array.from(agg.regulations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reg]) => reg);
    
    // Get label from map or use category_id as fallback
    const label = labelMap.get(categoryId) || categoryId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    items.push({
      category_id: categoryId,
      label,
      total_count: agg.count,
      first_seen_at: agg.firstSeen,
      last_seen_at: agg.lastSeen,
      average_risk_score: avgRiskScore,
      average_feasibility_score: avgFeasibilityScore,
      top_regulations: topRegulations,
    });
  }
  
  // Sort: by total_count DESC, then by last_seen_at DESC
  items.sort((a, b) => {
    if (b.total_count !== a.total_count) {
      return b.total_count - a.total_count;
    }
    return b.last_seen_at.localeCompare(a.last_seen_at);
  });
  
  const result: CategoryPopularityData = {
    generated_at: new Date().toISOString(),
    total_categories: items.length,
    items,
  };
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  await fs.mkdir(outputDir, { recursive: true });
  
  // Write output
  console.log(`  → Writing to ${OUTPUT_FILE}...`);
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  console.log('  ✓ Popularity ranking generated successfully\n');
  
  return result;
}

/**
 * Print summary
 */
function printSummary(data: CategoryPopularityData): void {
  console.log('='.repeat(80));
  console.log('✅ Category Popularity Ranking Generated');
  console.log('='.repeat(80));
  console.log(`\nGenerated at:     ${data.generated_at}`);
  console.log(`Total categories:  ${data.total_categories}`);
  
  if (data.items.length > 0) {
    console.log('\n--- Top 10 Categories ---');
    data.items.slice(0, 10).forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.label} (${item.category_id})`);
      console.log(`   Count: ${item.total_count}`);
      console.log(`   Last seen: ${new Date(item.last_seen_at).toLocaleString()}`);
      if (item.average_risk_score !== undefined) {
        console.log(`   Avg Risk Score: ${item.average_risk_score.toFixed(1)}`);
      }
      if (item.top_regulations.length > 0) {
        console.log(`   Top Regulations: ${item.top_regulations.join(', ')}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Main function
 */
async function main() {
  try {
    const data = await generatePopularityRanking();
    printSummary(data);
  } catch (error: any) {
    console.error('\n❌ Error generating category popularity ranking:');
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

