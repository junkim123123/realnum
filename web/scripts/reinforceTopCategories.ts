/**
 * Top-N Category Auto-Reinforcement Engine
 * 
 * Automatically re-runs the autoCategory pipeline for the most popular categories
 * to strengthen their compliance and factory vetting data.
 * 
 * Usage:
 *   npx tsx scripts/reinforceTopCategories.ts [N]
 * 
 * Where N is the number of top categories to reinforce (default: 50)
 */

import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';

const POPULARITY_FILE = path.join(process.cwd(), 'data', 'analytics', 'category_popularity.json');
const LOG_FILE = path.join(process.cwd(), 'logs', 'category-reinforce.log');

interface CategoryPopularityItem {
  category_id: string;
  label: string;
  total_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

interface CategoryPopularityData {
  generated_at: string;
  total_categories: number;
  items: CategoryPopularityItem[];
}

interface ReinforcementResult {
  category_id: string;
  label: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

/**
 * Ensure log directory exists
 */
async function ensureLogDirectory(): Promise<void> {
  const logDir = path.dirname(LOG_FILE);
  try {
    await fs.access(logDir);
  } catch {
    await fs.mkdir(logDir, { recursive: true });
  }
}

/**
 * Append log entry
 */
async function appendLog(message: string): Promise<void> {
  try {
    await ensureLogDirectory();
    const timestamp = new Date().toISOString();
    await fs.appendFile(LOG_FILE, `[${timestamp}] ${message}\n`, 'utf-8');
  } catch (error) {
    console.error(`[ReinforceTopCategories] Failed to write log: ${error}`);
  }
}

/**
 * Load popularity ranking
 */
async function loadPopularityRanking(): Promise<CategoryPopularityData> {
  try {
    const content = await fs.readFile(POPULARITY_FILE, 'utf-8');
    return JSON.parse(content) as CategoryPopularityData;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Popularity file not found: ${POPULARITY_FILE}\n  Run 'pnpm generate:category-popularity' first.`);
    }
    throw error;
  }
}

/**
 * Build seed string for autoCategory script
 */
function buildSeedString(item: CategoryPopularityItem): string {
  // Use label if available, otherwise use category_id
  const name = item.label || item.category_id.replace(/_/g, ' ');
  return `${name} (${item.category_id})`;
}

/**
 * Run autoCategory for a single category
 */
async function reinforceCategory(
  item: CategoryPopularityItem,
  delayMs: number = 0
): Promise<ReinforcementResult> {
  // Delay before processing
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  const seed = buildSeedString(item);
  const timestamp = new Date().toISOString();
  
  try {
    await appendLog(`Starting reinforcement for: ${item.category_id} (${item.label})`);
    
    // Run autoCategory script
    const result = await execa('npx', ['tsx', 'scripts/autoCategory.ts', seed], {
      cwd: process.cwd(),
      timeout: 180000, // 3 minute timeout per category
    });
    
    if (result.exitCode === 0) {
      await appendLog(`✓ Successfully reinforced: ${item.category_id}`);
      return {
        category_id: item.category_id,
        label: item.label,
        success: true,
        timestamp,
      };
    } else {
      const errorMsg = `Script exited with code ${result.exitCode}`;
      await appendLog(`✗ Failed to reinforce ${item.category_id}: ${errorMsg}`);
      return {
        category_id: item.category_id,
        label: item.label,
        success: false,
        error: errorMsg,
        timestamp,
      };
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    await appendLog(`✗ Error reinforcing ${item.category_id}: ${errorMsg}`);
    return {
      category_id: item.category_id,
      label: item.label,
      success: false,
      error: errorMsg,
      timestamp,
    };
  }
}

/**
 * Process categories with concurrency control
 */
async function processCategoriesWithConcurrency(
  items: CategoryPopularityItem[],
  concurrency: number = 2,
  delayBetweenCalls: number = 500
): Promise<ReinforcementResult[]> {
  const results: ReinforcementResult[] = [];
  const queue = [...items];
  let activePromises: Promise<void>[] = [];
  
  while (queue.length > 0 || activePromises.length > 0) {
    // Start new promises up to concurrency limit
    while (activePromises.length < concurrency && queue.length > 0) {
      const item = queue.shift()!;
      const promise = reinforceCategory(item, delayBetweenCalls)
        .then(result => {
          results.push(result);
          // Remove this promise from active list
          const index = activePromises.indexOf(promise);
          if (index > -1) {
            activePromises.splice(index, 1);
          }
        });
      
      activePromises.push(promise);
    }
    
    // Wait for at least one promise to complete
    if (activePromises.length > 0) {
      await Promise.race(activePromises);
    }
  }
  
  // Wait for all remaining promises
  await Promise.all(activePromises);
  
  return results;
}

/**
 * Retry failed categories
 */
async function retryFailedCategories(
  failedResults: ReinforcementResult[],
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<ReinforcementResult[]> {
  const retryResults: ReinforcementResult[] = [];
  
  for (const result of failedResults) {
    if (result.success) continue;
    
    let lastError = result.error;
    let attempts = 0;
    
    while (attempts < maxRetries) {
      attempts++;
      await appendLog(`Retry attempt ${attempts}/${maxRetries} for: ${result.category_id}`);
      
      // Build item from result
      const item: CategoryPopularityItem = {
        category_id: result.category_id,
        label: result.label,
        total_count: 0,
        first_seen_at: result.timestamp,
        last_seen_at: result.timestamp,
      };
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delayMs * attempts));
      
      const retryResult = await reinforceCategory(item, 0);
      retryResults.push(retryResult);
      
      if (retryResult.success) {
        await appendLog(`✓ Retry succeeded for: ${result.category_id}`);
        break;
      }
      
      lastError = retryResult.error;
    }
    
    if (attempts >= maxRetries && lastError) {
      await appendLog(`✗ All retries failed for: ${result.category_id} - ${lastError}`);
    }
  }
  
  return retryResults;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const topN = args[0] ? parseInt(args[0], 10) : 50;
  
  if (isNaN(topN) || topN <= 0) {
    console.error('Error: N must be a positive number');
    console.error('\nUsage:');
    console.error('  npx tsx scripts/reinforceTopCategories.ts [N]');
    console.error('  npx tsx scripts/reinforceTopCategories.ts 50  # Reinforce top 50 categories');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🚀 Top-N Category Auto-Reinforcement Engine');
  console.log('='.repeat(80));
  console.log(`\nTarget: Top ${topN} categories\n`);
  
  try {
    // Load popularity ranking
    console.log('  → Loading category popularity ranking...');
    const popularityData = await loadPopularityRanking();
    console.log(`  ✓ Loaded ${popularityData.total_categories} categories`);
    
    if (popularityData.items.length === 0) {
      console.log('\n⚠️  No categories found in popularity ranking.');
      console.log('  Run "pnpm generate:category-popularity" first to generate the ranking.');
      process.exit(0);
    }
    
    // Select top N categories
    const topCategories = popularityData.items.slice(0, topN);
    console.log(`  → Selected top ${topCategories.length} categories for reinforcement\n`);
    
    // Log start
    await appendLog(`\n=== Starting reinforcement for ${topCategories.length} categories ===`);
    await appendLog(`Top N: ${topN}`);
    
    // Process with concurrency
    console.log('  → Processing categories (2 concurrent, 500ms delay)...');
    const results = await processCategoriesWithConcurrency(
      topCategories,
      2, // concurrency
      500 // delay between calls
    );
    
    // Separate successful and failed
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\n  ✓ Completed: ${successful.length} succeeded, ${failed.length} failed`);
    
    // Retry failed categories
    if (failed.length > 0) {
      console.log(`\n  → Retrying ${failed.length} failed categories (max 2 retries)...`);
      const retryResults = await retryFailedCategories(failed, 2, 1000);
      
      // Update counts
      const retrySuccessful = retryResults.filter(r => r.success);
      successful.push(...retrySuccessful);
      failed.splice(0, failed.length, ...retryResults.filter(r => !r.success));
      
      console.log(`  ✓ Retry completed: ${retrySuccessful.length} succeeded, ${failed.length} still failed`);
    }
    
    // Log summary
    await appendLog(`\n=== Reinforcement Summary ===`);
    await appendLog(`Total processed: ${results.length}`);
    await appendLog(`Successful: ${successful.length}`);
    await appendLog(`Failed: ${failed.length}`);
    
    if (failed.length > 0) {
      await appendLog('\nFailed categories:');
      for (const result of failed) {
        await appendLog(`  - ${result.category_id}: ${result.error}`);
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ Category Reinforcement Complete');
    console.log('='.repeat(80));
    console.log(`\nTotal processed:  ${results.length}`);
    console.log(`Successful:       ${successful.length}`);
    console.log(`Failed:           ${failed.length}`);
    console.log(`\nLog file:         ${LOG_FILE}`);
    console.log('\n' + '='.repeat(80) + '\n');
    
    if (failed.length > 0) {
      console.log('⚠️  Some categories failed. Check the log file for details.\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Error during category reinforcement:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    await appendLog(`\n=== ERROR ===\n${error.message}\n${error.stack || ''}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

