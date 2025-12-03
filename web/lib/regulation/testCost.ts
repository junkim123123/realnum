import { ComplianceRule } from '@/lib/types/compliance';

type TestingCost = {
  test: string;
  low: number;
  high: number;
};

const testingCostTable: Record<string, TestingCost> = {
  // CPSIA Tests
  'CPSIA Lead Content': { test: 'CPSIA Lead Content', low: 150, high: 250 },
  'CPSIA Phthalates': { test: 'CPSIA Phthalates', low: 300, high: 450 },
  'CPSIA Tracking Label': {
    test: 'CPSIA Tracking Label Review',
    low: 100,
    high: 200,
  },

  // ASTM F963 Tests
  'ASTM F963 Mechanical': {
    test: 'ASTM F963 Mechanical Hazards',
    low: 180,
    high: 320,
  },
  'ASTM F963 Flammability': {
    test: 'ASTM F963 Flammability',
    low: 120,
    high: 200,
  },
  'ASTM F963 Heavy Metals': {
    test: 'ASTM F963 Heavy Metals',
    low: 250,
    high: 400,
  },

  // FDA Tests
  'FDA 21 CFR Food Grade': {
    test: 'FDA 21 CFR Food-Grade Material Testing',
    low: 400,
    high: 700,
  },
};

const regulationToTestMap: Record<string, string[]> = {
  cpsia: ['CPSIA Lead Content', 'CPSIA Phthalates', 'CPSIA Tracking Label'],
  'astm-f963': [
    'ASTM F963 Mechanical',
    'ASTM F963 Flammability',
    'ASTM F963 Heavy Metals',
  ],
  'fda-21-cfr': ['FDA 21 CFR Food Grade'],
};

export function estimateTestingCost(
  complianceRule: ComplianceRule
): TestingCost[] {
  const requiredTests = new Set<string>();
  const regulationKeys = Object.keys(regulationToTestMap);

  for (const reg of complianceRule.requiredRegulations) {
    const lowerCaseReg = reg.toLowerCase();
    for (const key of regulationKeys) {
      // Check if the regulation string includes the key (e.g., "cpsia", "astm-f963")
      if (lowerCaseReg.includes(key)) {
        const tests = regulationToTestMap[key];
        if (tests) {
          for (const test of tests) {
            requiredTests.add(test);
          }
        }
      }
    }
  }

  const costEstimate: TestingCost[] = [];
  for (const testName of Array.from(requiredTests)) {
    const cost = testingCostTable[testName];
    if (cost) {
      costEstimate.push(cost);
    }
  }

  return costEstimate;
}