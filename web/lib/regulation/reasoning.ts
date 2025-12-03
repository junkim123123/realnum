import { ComplianceRule } from '@/lib/types/compliance';

export async function generateRegulationReasoning(
  productName: string,
  htsCode: string,
  complianceRule: ComplianceRule
): Promise<{ regulation: string; reason: string }[]> {
  // TODO: Build a real prompt for Gemini 2.5 Pro
  console.log(
    `Generating regulation reasoning for ${productName} (${htsCode}) with rule ${complianceRule.rule_id}`
  );

  // Mock response for now
  const reasoning = [
    {
      regulation: 'CPSIA',
      reason:
        'The Consumer Product Safety Improvement Act (CPSIA) applies to all children\'s products, defined as products intended primarily for children 12 years of age or younger. This includes requirements for tracking labels, lead content limits, and phthalate restrictions.',
    },
    {
      regulation: 'ASTM F963',
      reason:
        'ASTM F963 is a mandatory safety standard for toys in the US, referenced by CPSIA. It covers various hazards, including mechanical properties, flammability, and chemical content to ensure toy safety.',
    },
    {
      regulation: 'FDA 21 CFR',
      reason:
        'The FDA regulates materials that come into contact with food. For a baby teether, parts that are intended to be placed in the mouth must be made of food-safe materials as specified under 21 CFR.',
    },
  ];

  return Promise.resolve(reasoning);
}