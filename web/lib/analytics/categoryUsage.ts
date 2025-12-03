/**
 * Category Usage Analytics
 * 
 * Logs category usage events for analytics and auto-reinforcement.
 * Uses NDJSON format (newline-delimited JSON) for efficient appending.
 */

import fs from 'fs/promises';
import path from 'path';

export interface CategoryUsageEvent {
  timestamp: string; // ISO8601
  raw_input: string; // original user input
  product_name?: string; // from analysis
  hts_code?: string; // from analysis
  category_id?: string; // from autoCategory result (if available)
  market?: string; // if we have target market info
  channel?: string; // FBA / DTC / etc. if available
  regulation_tags?: string[]; // e.g. ["CPSIA", "EN71", "UN38.3"]
  risk_score?: number; // overall_score from analysis
  feasibility_score?: number; // if you have it
}

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'category-usage.ndjson');

/**
 * Ensure the logs directory exists
 */
async function ensureLogDirectory(): Promise<void> {
  try {
    await fs.access(LOG_DIR);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(LOG_DIR, { recursive: true });
  }
}

/**
 * Extract regulation tags from various sources in the analysis result
 */
function extractRegulationTags(analysis: any): string[] {
  const tags = new Set<string>();

  // Extract from compliance_hints
  if (analysis.compliance_hints?.requiredRegulations) {
    for (const reg of analysis.compliance_hints.requiredRegulations) {
      // Extract common regulation identifiers
      const matches = reg.match(/\b(CPSIA|FDA|UL|EN71|REACH|LFGB|UN38\.3|ASTM|FCC|NRTL|CE|RoHS|Prop\s*65|CA\s*Prop\s*65|DOE|TPCH)\b/gi);
      if (matches) {
        matches.forEach(m => tags.add(m.toUpperCase().replace(/\s+/g, '')));
      }
    }
  }

  // Extract from regulation_reasoning
  if (analysis.regulation_reasoning) {
    for (const item of analysis.regulation_reasoning) {
      const matches = item.regulation?.match(/\b(CPSIA|FDA|UL|EN71|REACH|LFGB|UN38\.3|ASTM|FCC|NRTL|CE|RoHS|Prop\s*65|CA\s*Prop\s*65|DOE|TPCH)\b/gi);
      if (matches) {
        matches.forEach(m => tags.add(m.toUpperCase().replace(/\s+/g, '')));
      }
    }
  }

  // Extract from testing requirements
  if (analysis.compliance_hints?.testingRequirements) {
    for (const req of analysis.compliance_hints.testingRequirements) {
      const matches = req.match(/\b(CPSIA|FDA|UL|EN71|REACH|LFGB|UN38\.3|ASTM|FCC|NRTL|CE|RoHS|Prop\s*65|CA\s*Prop\s*65|DOE|TPCH)\b/gi);
      if (matches) {
        matches.forEach(m => tags.add(m.toUpperCase().replace(/\s+/g, '')));
      }
    }
  }

  return Array.from(tags).sort();
}

/**
 * Log a category usage event to NDJSON file
 * This is fire-and-forget and should not block the API response
 */
export async function logCategoryUsage(event: CategoryUsageEvent): Promise<void> {
  try {
    await ensureLogDirectory();
    
    // Create the log entry as a single JSON line
    const logLine = JSON.stringify(event) + '\n';
    
    // Append to file (async, non-blocking)
    await fs.appendFile(LOG_FILE, logLine, 'utf-8');
  } catch (error) {
    // Log error but don't throw - we don't want to break the API response
    console.error('[CategoryUsage] Failed to log category usage:', error);
  }
}

/**
 * Build a CategoryUsageEvent from analysis result and input
 */
export function buildCategoryUsageEvent(
  rawInput: string,
  analysis: any,
  categoryId?: string
): CategoryUsageEvent {
  const event: CategoryUsageEvent = {
    timestamp: new Date().toISOString(),
    raw_input: rawInput,
    product_name: analysis.product_name,
    hts_code: analysis.hts_code,
    category_id: categoryId,
    risk_score: analysis.risk_assessment?.overall_score,
    feasibility_score: analysis.estimate_confidence,
  };

  // Extract market from compliance_hints if available
  if (analysis.compliance_hints?.targetMarkets?.length > 0) {
    event.market = analysis.compliance_hints.targetMarkets[0];
  }

  // Extract regulation tags
  const regulationTags = extractRegulationTags(analysis);
  if (regulationTags.length > 0) {
    event.regulation_tags = regulationTags;
  }

  return event;
}

