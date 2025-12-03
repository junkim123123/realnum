/**
 * Type definitions for category compliance rules.
 * These types match the structure in web/data/compliance/category_rules.json
 */

export interface CategoryComplianceRule {
  /** Unique identifier for the category (e.g., "baby_teether", "stainless_steel_tumbler") */
  id: string;
  
  /** Human-readable label for the category */
  label: string;
  
  /** Example product names that match this category */
  exampleProducts: string[];
  
  /** Target markets where these rules apply */
  targetMarkets: string[];
  
  /** Typical HTS/HS codes for products in this category */
  typicalHtsCodes: string[];
  
  /** Required regulations (e.g., CPSIA, FDA, UL, etc.) */
  requiredRegulations: string[];
  
  /** Short bullet texts describing testing requirements */
  testingRequirements: string[];
  
  /** High-risk flags to watch out for */
  highRiskFlags: string[];
  
  /** Reference links to official documentation */
  referenceLinks: string[];
}

export interface ComplianceRulesData {
  categories: CategoryComplianceRule[];
}

