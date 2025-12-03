/**
 * Regulation Pattern Analytics
 * 
 * Utilities for extracting and analyzing regulation patterns across categories.
 */

import type { CategoryComplianceRule } from '../types/compliance';
import type { CategoryUsageEvent } from './categoryUsage';

export interface RegulationPattern {
  regulation_combo: string[];
  categories_count: number;
  avg_risk_score?: number;
  example_categories: string[];
  common_testing_requirements: string[];
  common_high_risk_flags: string[];
}

export interface HtsPattern {
  hts_prefix: string;
  categories_count: number;
  dominant_regulations: string[];
  avg_risk_score?: number;
  notes?: string;
}

export interface RegulationPatternsData {
  generated_at: string;
  pattern_count: number;
  by_regulation_combo: RegulationPattern[];
  by_hts_prefix: HtsPattern[];
}

/**
 * Extract regulation identifiers from text
 */
export function extractRegulationIdentifiers(text: string): string[] {
  const identifiers = new Set<string>();
  
  // Common regulation patterns
  const patterns = [
    /\bCPSIA\b/gi,
    /\bFDA\b/gi,
    /\bUL\s*\d+/gi,
    /\bEN\s*71\b/gi,
    /\bREACH\b/gi,
    /\bLFGB\b/gi,
    /\bUN38\.3\b/gi,
    /\bUN\s*38\.3\b/gi,
    /\bASTM\s*F\d+/gi,
    /\bFCC\b/gi,
    /\bNRTL\b/gi,
    /\bCE\b/gi,
    /\bRoHS\b/gi,
    /\bProp\s*65\b/gi,
    /\bCA\s*Prop\s*65\b/gi,
    /\bDOE\b/gi,
    /\bTPCH\b/gi,
    /\bISO\s*\d+/gi,
    /\b16\s*CFR\b/gi,
    /\b21\s*CFR\b/gi,
    /\b47\s*CFR\b/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => {
        // Normalize the identifier
        const normalized = m.toUpperCase().replace(/\s+/g, '');
        if (normalized.length > 2) {
          identifiers.add(normalized);
        }
      });
    }
  }
  
  return Array.from(identifiers).sort();
}

/**
 * Extract regulations from a compliance rule
 */
export function extractRegulationsFromRule(rule: CategoryComplianceRule): string[] {
  const regulations = new Set<string>();
  
  // Extract from requiredRegulations
  if (rule.requiredRegulations) {
    for (const reg of rule.requiredRegulations) {
      const ids = extractRegulationIdentifiers(reg);
      ids.forEach(id => regulations.add(id));
    }
  }
  
  // Extract from testingRequirements
  if (rule.testingRequirements) {
    for (const req of rule.testingRequirements) {
      const ids = extractRegulationIdentifiers(req);
      ids.forEach(id => regulations.add(id));
    }
  }
  
  return Array.from(regulations).sort();
}

/**
 * Extract HTS prefix from HTS code (e.g., "9503.00.00" -> "9503")
 */
export function extractHtsPrefix(htsCode: string): string | null {
  const match = htsCode.match(/^(\d{4})/);
  return match ? match[1] : null;
}

