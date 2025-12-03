import { z } from "zod";
import type { CategoryComplianceRule } from '../types/compliance';
import type { CategoryFactoryVettingHints } from '../types/factoryVetting';
import type { InitialOrderCost } from '../analysis/orderCost';

export const LandedCostBreakdownSchema = z.object({
  fob_price: z.string().describe("Estimated FOB price per unit (e.g., '$5.00')"),
  freight_cost: z.string().describe("Estimated freight cost per unit (e.g., '$1.50')"),
  duty_rate: z.string().describe("Estimated duty rate percentage (e.g., '25%')"),
  duty_cost: z.string().describe("Estimated duty cost per unit (e.g., '$1.25')"),
  landed_cost: z.string().describe("Total estimated landed cost per unit (e.g., '$7.75')"),
});

export const RiskAssessmentSchema = z.object({
  overall_score: z.number().min(0).max(100).describe("Overall risk score (0-100, where 100 is safest)"),
  compliance_risk: z.enum(["Low", "Medium", "High"]).describe("Risk related to regulations, certifications, etc."),
  supplier_risk: z.enum(["Low", "Medium", "High"]).describe("Risk related to supplier reliability, quality, etc."),
  logistics_risk: z.enum(["Low", "Medium", "High"]).describe("Risk related to shipping, delays, etc."),
  summary: z.string().describe("Short summary of the risk profile"),
});

export const ProductAnalysisSchema = z.object({
  product_name: z.string().describe("Identified product name"),
  hts_code: z.string().describe("Estimated HTS/HS Code"),
  landed_cost_breakdown: LandedCostBreakdownSchema,
  risk_assessment: RiskAssessmentSchema,
  recommendation: z.string().describe("A short 'Should you proceed?' summary (e.g., 'Proceed with caution. Margins are tight due to high tariffs.')"),
  estimate_confidence: z.number().min(0).max(100).optional().describe("Confidence score of the estimate (0-100)"),
  missing_info: z.array(z.string()).optional().describe("List of key information that is missing"),
  assumptions: z.array(z.string()).optional().describe("List of assumptions made for the analysis"),
});

export type LandedCostBreakdown = z.infer<typeof LandedCostBreakdownSchema>;
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

// Extended ProductAnalysis type with optional compliance and factory vetting hints
export type ProductAnalysis = z.infer<typeof ProductAnalysisSchema> & {
  compliance_hints?: CategoryComplianceRule;
  factory_vetting_hints?: CategoryFactoryVettingHints;
  regulation_reasoning?: { regulation: string; reason: string }[];
  testing_cost_estimate?: { test: string; low: number; high: number }[];
  initial_order_cost?: InitialOrderCost;
};

export const AnalyzeProductRequestSchema = z.object({
  input: z.string().min(1, "Product link or description is required"),
  inputType: z.enum(["text", "image"]).default("text"), // Future proofing for image upload
  image: z.string().optional(), // Base64 encoded image
});

export type AnalyzeProductRequest = z.infer<typeof AnalyzeProductRequestSchema>;