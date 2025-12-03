/**
 * Helper functions for accessing category factory vetting hints.
 * 
 * During alpha, vetting hints are stored in JSON files.
 * Eventually, these may be moved to a database or admin UI.
 */

import type { CategoryFactoryVettingHints, FactoryVettingData } from './types/factoryVetting';

// Lazy load the factory vetting data
let factoryVettingCache: FactoryVettingData | null = null;

function loadFactoryVettingData(): FactoryVettingData {
  if (factoryVettingCache) {
    return factoryVettingCache;
  }

  try {
    // Try to load the actual rules file, fall back to sample if not found
    const vettingModule = require('@/data/factory/category_vetting.json');
    factoryVettingCache = vettingModule as FactoryVettingData;
  } catch (error) {
    // If the file doesn't exist yet, return empty structure
    console.warn('[FactoryVetting] category_vetting.json not found. Using empty hints. Create the file from category_vetting.sample.json');
    factoryVettingCache = { categories: [] };
  }

  return factoryVettingCache;
}

/**
 * Get factory vetting hints for a specific category by ID.
 * 
 * @param categoryId - The category identifier (e.g., "baby_teether")
 * @returns The factory vetting hints for the category, or undefined if not found
 */
export function getFactoryVettingByCategory(
  categoryId: string
): CategoryFactoryVettingHints | undefined {
  const data = loadFactoryVettingData();
  return data.categories.find(cat => cat.id === categoryId);
}

