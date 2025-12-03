import type { ProductAnalysis } from '@/lib/product-analysis/schema';

// Helper to parse currency strings like '$1.38' into numbers
function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]+/g, ''));
}

// Define the structure for the initial order cost
export interface InitialOrderCost {
  testingCostTotal: number;
  unitCost: number;
  moq: number;
  minimumOrderCost: number;
  totalInitialCost: number;
}

/**
 * Estimates the total initial cost for a minimum order quantity (MOQ).
 * This includes the cost of goods plus estimated testing costs.
 *
 * @param analysis The completed product analysis object.
 * @returns An object with a breakdown of the initial order cost.
 */
export function estimateInitialOrderCost(
  analysis: ProductAnalysis
): InitialOrderCost {
  // 1. Calculate total testing cost (use the high-end estimate)
  const testingCostTotal =
    analysis.testing_cost_estimate?.reduce(
      (sum, item) => sum + item.high,
      0
    ) ?? 0;

  // 2. Get the landed unit cost
  const unitCost = parseCurrency(analysis.landed_cost_breakdown.landed_cost);

  // 3. Assume a typical Minimum Order Quantity (MOQ)
  // TODO: This could be made more sophisticated later
  const moq = 500;

  // 4. Calculate the cost for the minimum order
  const minimumOrderCost = unitCost * moq;

  // 5. Calculate the total initial outlay
  const totalInitialCost = minimumOrderCost + testingCostTotal;

  return {
    testingCostTotal,
    unitCost,
    moq,
    minimumOrderCost,
    totalInitialCost,
  };
}