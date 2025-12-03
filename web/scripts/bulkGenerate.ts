import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import type { CategoryComplianceRule, ComplianceRulesData } from '../lib/types/compliance';
import type { CategoryFactoryVettingHints, FactoryVettingData } from '../lib/types/factoryVetting';

// --- Configuration ---
const DEFAULT_CATEGORIES_FILE = 'categories.txt';
const LOG_DIR = path.join(process.cwd(), 'logs');
const FAILED_CATEGORIES_FILE = path.join(process.cwd(), 'failed.txt');
const DATA_DIR = path.join(process.cwd(), 'data');
const COMPLIANCE_RULES_FILE = path.join(DATA_DIR, 'compliance', 'category_rules.json');
const FACTORY_VETTING_FILE = path.join(DATA_DIR, 'factory', 'category_vetting.json');
const COMMIT_BATCH_SIZE = 5;
const MAX_RETRIES = 3;
const CONCURRENCY = 3;
const DELAY_BETWEEN_TASKS_MS = 2000; // 2 seconds

// --- State ---
let logStream: fs.FileHandle;

// --- Helper Functions ---
async function setup() {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFilePath = path.join(LOG_DIR, `bulkRun-${timestamp}.log`);
  logStream = await fs.open(logFilePath, 'a');
  log(`Bulk generation started. Log file: ${logFilePath}`);
}

async function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  await logStream.write(logMessage);
  console.log(message);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCategories(inputFile: string): Promise<string[]> {
  try {
    const content = await fs.readFile(inputFile, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
  } catch (error) {
    await log(`Error reading categories file: ${inputFile}`);
    return [];
  }
}

async function mergeJson(
  filePath: string,
  newData: CategoryComplianceRule | CategoryFactoryVettingHints
) {
  let data: ComplianceRulesData | FactoryVettingData;
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    data = JSON.parse(content);
  } catch (error) {
    data = { categories: [] };
  }

  const index = data.categories.findIndex(c => c.id === newData.id);
  if (index >= 0) {
    data.categories[index] = newData as any;
  } else {
    data.categories.push(newData as any);
  }

  data.categories.sort((a, b) => a.id.localeCompare(b.id));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

async function commitChanges(categoryId: string) {
  try {
    const { stdout } = await execAsync('git status --porcelain');
    if (stdout.trim().length > 0) {
      await execAsync('git add .');
      await execAsync(`git commit -m "bulk: add category ${categoryId}"`);
      await log(`DONE: ${categoryId} (committed)`);
    } else {
      await log(`DONE: ${categoryId} (no changes to commit)`);
    }
  } catch (error: any) {
    await log(`Git commit failed for ${categoryId}: ${error.message}`);
  }
}

// --- Main Logic ---
async function processCategory(category: string, attempt = 1): Promise<boolean> {
  try {
    const { stdout, stderr } = await execAsync(`npx tsx scripts/autoCategory.ts "${category}"`);
    const output = stdout + stderr;
    await log(`Raw output for "${category}":\n${output}`);

    const jsonOutputMatch = output.match(/({.*})/s);
    if (!jsonOutputMatch) {
      throw new Error("No JSON output found from autoCategory.ts");
    }
    
    const { compliance, factory } = JSON.parse(jsonOutputMatch);

    await mergeJson(COMPLIANCE_RULES_FILE, compliance);
    await mergeJson(FACTORY_VETTING_FILE, factory);

    return true;
  } catch (error: any) {
    await log(`FAIL: ${category} (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);
    if (attempt < MAX_RETRIES) {
      await log(`RETRYING: ${category} (attempt ${attempt + 1}/${MAX_RETRIES})`);
      return processCategory(category, attempt + 1);
    } else {
      await fs.appendFile(FAILED_CATEGORIES_FILE, `${category}\n`);
      return false;
    }
  }
}

async function main() {
  await setup();
  const inputFile = process.argv || DEFAULT_CATEGORIES_FILE;
  const categories = await getCategories(inputFile);

  if (categories.length === 0) {
    await log("No categories to process. Exiting.");
    return;
  }

  const queue = [...categories];
  let successCount = 0;
  let failedCount = 0;
  let processedCount = 0;

  async function worker() {
    while (queue.length > 0) {
      const category = queue.shift();
      if (!category) continue;

      console.log(`Processing ${processedCount + 1}/${categories.length}: ${category}`);
      const success = await processCategory(category);
      processedCount++;

      if (success) {
        successCount++;
        if (successCount % COMMIT_BATCH_SIZE === 0) {
          await commitChanges(`${COMMIT_BATCH_SIZE} categories`);
        }
      } else {
        failedCount++;
      }
      await sleep(DELAY_BETWEEN_TASKS_MS);
    }
  }

  const workers = Array(CONCURRENCY).fill(null).map(worker);
  await Promise.all(workers);

  await commitChanges("Final bulk update");

  await log("\n--- Bulk Generation Summary ---");
  await log(`Success: ${successCount}`);
  await log(`Failed: ${failedCount}`);
  await log(`Completed file: ${inputFile}`);
  
  await logStream.close();
}

main().catch(async (err) => {
    if (logStream) {
        await log(`FATAL ERROR: ${err.message}`);
        await logStream.close();
    }
    console.error(err);
    process.exit(1);
});