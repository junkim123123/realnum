/**
 * Helper functions for accessing category compliance rules.
 * 
 * During alpha, compliance rules are stored in JSON files.
 * Eventually, these may be moved to a database or admin UI.
 */

import type { CategoryComplianceRule, ComplianceRulesData } from './types/compliance';

// Lazy load the compliance rules data
let complianceRulesCache: ComplianceRulesData | null = null;

function loadComplianceRules(): ComplianceRulesData {
  if (complianceRulesCache) {
    return complianceRulesCache;
  }

  try {
    // Try to load the actual rules file, fall back to sample if not found
    const rulesModule = require('@/data/compliance/category_rules.json');
    complianceRulesCache = rulesModule as ComplianceRulesData;
  } catch (error) {
    // If the file doesn't exist yet, return empty structure
    console.warn('[Compliance] category_rules.json not found. Using empty rules. Create the file from category_rules.sample.json');
    complianceRulesCache = { categories: [] };
  }

  return complianceRulesCache;
}

/**
 * Get compliance rules for a specific category by ID.
 * 
 * @param categoryId - The category identifier (e.g., "baby_teether")
 * @param market - Optional target market to filter by
 * @returns The compliance rule for the category, or undefined if not found
 */
export function getComplianceByCategory(
  categoryId: string,
  market?: string
): CategoryComplianceRule | undefined {
  const rules = loadComplianceRules();
  const rule = rules.categories.find(cat => cat.id === categoryId);

  if (!rule) {
    return undefined;
  }

  // If market is specified, filter to ensure this rule applies to that market
  if (market && rule.targetMarkets.length > 0) {
    const marketNormalized = market.toLowerCase();
    const matches = rule.targetMarkets.some(
      targetMarket => targetMarket.toLowerCase().includes(marketNormalized) ||
                      marketNormalized.includes(targetMarket.toLowerCase())
    );
    if (!matches) {
      // Rule exists but doesn't apply to this market - return undefined
      return undefined;
    }
  }

  return rule;
}

/**
 * Find compliance rules by HTS code.
 * This is a simple lookup - returns the first category that lists this HTS code.
 * 
 * @param htsCode - HTS/HS code to search for
 * @param market - Optional target market to filter by
 * @returns The compliance rule, or undefined if not found
 */
export function getComplianceByHtsCode(
  htsCode: string,
  market?: string
): CategoryComplianceRule | undefined {
  const rules = loadComplianceRules();
  const normalizedHtsCode = htsCode.replace(/[^0-9.]/g, ''); // Remove non-numeric characters

  for (const category of rules.categories) {
    const matches = category.typicalHtsCodes.some(code => {
      const normalizedCategoryCode = code.replace(/[^0-9.]/g, '');
      return normalizedHtsCode.startsWith(normalizedCategoryCode) ||
             normalizedCategoryCode.startsWith(normalizedHtsCode);
    });

    if (matches) {
      // Found a match, now check market if specified
      if (market && category.targetMarkets.length > 0) {
        const marketNormalized = market.toLowerCase();
        const marketMatches = category.targetMarkets.some(
          targetMarket => targetMarket.toLowerCase().includes(marketNormalized) ||
                          marketNormalized.includes(targetMarket.toLowerCase())
        );
        if (!marketMatches) {
          continue; // Try next category
        }
      }
      return category;
    }
  }

  return undefined;
}

/**
 * Find compliance rules by product name/description using keyword matching.
 * This is a simple keyword search - returns the first category whose example products
 * or label match the search terms.
 * 
 * @param productName - Product name or description to search for
 * @param market - Optional target market to filter by
 * @returns The compliance rule, or undefined if not found
 */
export function getComplianceByProductName(
  productName: string,
  market?: string
): CategoryComplianceRule | undefined {
  const rules = loadComplianceRules();
  const searchTerms = productName.toLowerCase().split(/\s+/);

  for (const category of rules.categories) {
    // Check if any search term matches the category label or example products
    const labelLower = category.label.toLowerCase();
    const examplesLower = category.exampleProducts.join(' ').toLowerCase();
    const allText = `${labelLower} ${examplesLower}`;

    const matches = searchTerms.some(term => {
      return allText.includes(term) && term.length > 2; // Ignore very short terms
    });

    if (matches) {
      // Found a match, now check market if specified
      if (market && category.targetMarkets.length > 0) {
        const marketNormalized = market.toLowerCase();
        const marketMatches = category.targetMarkets.some(
          targetMarket => targetMarket.toLowerCase().includes(marketNormalized) ||
                          marketNormalized.includes(targetMarket.toLowerCase())
        );
        if (!marketMatches) {
          continue; // Try next category
        }
      }
      return category;
    }
  }

  return undefined;
}

