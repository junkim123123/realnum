/**
 * Type definitions for category factory vetting hints.
 * These types match the structure in web/data/factory/category_vetting.json
 */

export interface CategoryFactoryVettingHints {
  /** Unique identifier for the category (e.g., "baby_teether", "stainless_steel_tumbler") */
  id: string;
  
  /** Human-readable label for the category */
  label: string;
  
  /** Typical supplier types for this category (e.g., OEM, ODM, trading company) */
  typicalSupplierTypes: string[];
  
  /** Must-have certificates for suppliers in this category */
  mustHaveCertificates: string[];
  
  /** Nice-to-have certificates that add credibility */
  niceToHaveCertificates: string[];
  
  /** Example questions the buyer should ask the factory */
  sampleQuestionsToFactory: string[];
  
  /** Common red flags to watch out for */
  commonRedFlags: string[];
  
  /** Recommended filters to use when searching on Alibaba */
  recommendedAlibabaFilters: string[];
}

export interface FactoryVettingData {
  categories: CategoryFactoryVettingHints[];
}

