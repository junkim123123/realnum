import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { analyzeProduct } from "@/lib/ai/productAnalysis";
import { incrementUsage } from "@/lib/usage/limit";
import { headers } from "next/headers";
import { getComplianceByHtsCode, getComplianceByProductName } from "@/lib/compliance";
import { getFactoryVettingByCategory } from "@/lib/factoryVetting";
import { generateRegulationReasoning } from "@/lib/regulation/reasoning";
import { estimateTestingCost } from "@/lib/regulation/testCost";
import { estimateInitialOrderCost } from "@/lib/analysis/orderCost";
import { logCategoryUsage, buildCategoryUsageEvent } from "@/lib/analytics/categoryUsage";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const isAuthenticated = !!session?.user;
    
    let identifier: string;
    if (isAuthenticated) {
      identifier = session.user!.email!;
    } else {
      const ip = headers().get('x-forwarded-for') || 'unknown';
      const userAgent = headers().get('user-agent') || 'unknown';
      identifier = `${ip}-${userAgent}`;
    }

    const { count, limit } = incrementUsage(identifier, isAuthenticated);
    if (count > limit) {
      const reason = isAuthenticated ? 'user_daily_limit' : 'anonymous_daily_limit';
      const message = isAuthenticated
        ? "You have reached today's free analysis limit for your account."
        : "You have exceeded the number of free analyses for today.";
      
      return NextResponse.json(
        {
          ok: false,
          error: "quota_exceeded",
          reason,
          message,
        },
        { status: 429 }
      );
    }
    
    // Support both FormData and JSON requests
    const contentType = req.headers.get('content-type') || '';
    let input: string;
    let imageBase64: string | undefined = undefined;

    if (contentType.includes('application/json')) {
      // JSON request (from Conversational Copilot)
      const json = await req.json();
      input = json.input || json.text || '';
      if (json.image) {
        imageBase64 = json.image;
      }
    } else {
      // FormData request (from Quick Scan)
      const formData = await req.formData();
      input = formData.get('input') as string;
      const imageFile = formData.get('image') as File | null;
      
      if (imageFile) {
        const buffer = await imageFile.arrayBuffer();
        imageBase64 = Buffer.from(buffer).toString('base64');
      }
    }

    if (!input) {
      return NextResponse.json(
        { ok: false, error: "Input is required." },
        { status: 400 }
      );
    }

    console.log("[AnalyzeProduct] Incoming request for:", input.substring(0, 50) + "...");

    const analysis = await analyzeProduct(input, imageBase64);

    // Try to find category compliance and factory vetting hints
    // First, try by HTS code (more reliable)
    let complianceHints = getComplianceByHtsCode(analysis.hts_code);
    let categoryId: string | undefined;
    
    // If not found by HTS code, try by product name
    if (!complianceHints) {
      complianceHints = getComplianceByProductName(analysis.product_name);
    }
    
    // Extract category ID from compliance hints if found
    if (complianceHints) {
      categoryId = complianceHints.id;
    }
    // Get factory vetting hints if we have a category ID
    const factoryVettingHints = categoryId ? getFactoryVettingByCategory(categoryId) : undefined;

    // Generate regulation reasoning and testing cost estimate if compliance rules are found
    let regulationReasoning;
    let testingCostEstimate;

    if (complianceHints) {
      regulationReasoning = await generateRegulationReasoning(
        analysis.product_name,
        analysis.hts_code,
        complianceHints
      );
      testingCostEstimate = estimateTestingCost(complianceHints);
    }
// Add hints to analysis result
let analysisWithHints = {
  ...analysis,
  ...(complianceHints && { compliance_hints: complianceHints }),
  ...(factoryVettingHints && { factory_vetting_hints: factoryVettingHints }),
  ...(regulationReasoning && { regulation_reasoning: regulationReasoning }),
  ...(testingCostEstimate && { testing_cost_estimate: testingCostEstimate }),
};

// Estimate initial order cost
const initialOrderCost = estimateInitialOrderCost(analysisWithHints);
analysisWithHints = {
  ...analysisWithHints,
  initial_order_cost: initialOrderCost,
};

    // Log category usage for analytics (fire-and-forget)
    const usageEvent = buildCategoryUsageEvent(input, analysisWithHints, categoryId);
    logCategoryUsage(usageEvent).catch(err => {
      console.error('[AnalyzeProduct] Failed to log category usage:', err);
    });

    return NextResponse.json(
      {
        ok: true,
        analysis: analysisWithHints,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[AnalyzeProduct] Unexpected server error", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage || "Something went wrong while analyzing the product.",
      },
      { status: 500 }
    );
  }
}