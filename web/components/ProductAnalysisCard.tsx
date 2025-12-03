/**
 * ProductAnalysisCard
 * 
 * A reusable, presentational component for displaying product analysis results.
 * Can be rendered in both chat and non-chat contexts.
 * 
 * This is now the primary way to display analysis results in NexSupply.
 * Previously embedded in Quick Scan, now extracted for reuse in chat-first UX.
 */

'use client';

import type { ProductAnalysis } from '@/lib/product-analysis/schema';
import { Card } from '@/components/ui/card';
import { CategoryKnowledgeCards } from '@/components/category-knowledge-cards';

interface ProductAnalysisCardProps {
  analysis: ProductAnalysis;
  className?: string;
}

/**
 * Get color for risk score
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get color for risk level
 */
function getRiskColor(risk: string): string {
  if (risk === 'Low') return 'text-green-600 dark:text-green-400';
  if (risk === 'Medium') return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function ProductAnalysisCard({ analysis, className = '' }: ProductAnalysisCardProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex-1">
            <h3 className="card-title">{analysis.product_name}</h3>
            <p className="card-subtitle mt-1">Est. HTS Code: {analysis.hts_code}</p>
          </div>
          <div className="flex flex-col items-start sm:items-end shrink-0">
            <span className="text-badge text-muted-foreground mb-1">Risk Score</span>
            <span className={`text-4xl font-bold ${getScoreColor(analysis.risk_assessment.overall_score)}`}>
              {analysis.risk_assessment.overall_score}
            </span>
          </div>
        </div>

        {/* Landed Cost Breakdown */}
        <div className="mb-6 pb-6 border-b border-subtle-border">
          <h4 className="text-lg font-semibold mb-4">Landed Cost Breakdown</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">FOB Price</p>
              <p className="text-lg font-semibold">{analysis.landed_cost_breakdown.fob_price}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Freight</p>
              <p className="text-lg font-semibold">{analysis.landed_cost_breakdown.freight_cost}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duty Rate</p>
              <p className="text-lg font-semibold">{analysis.landed_cost_breakdown.duty_rate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duty Cost</p>
              <p className="text-lg font-semibold">{analysis.landed_cost_breakdown.duty_cost}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground mb-1">Total Landed Cost</p>
              <p className="text-xl font-bold text-primary">{analysis.landed_cost_breakdown.landed_cost}</p>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="mb-6 pb-6 border-b border-subtle-border">
          <h4 className="text-lg font-semibold mb-4">Risk Assessment</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Compliance Risk</p>
              <p className={`text-base font-semibold ${getRiskColor(analysis.risk_assessment.compliance_risk)}`}>
                {analysis.risk_assessment.compliance_risk}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Supplier Risk</p>
              <p className={`text-base font-semibold ${getRiskColor(analysis.risk_assessment.supplier_risk)}`}>
                {analysis.risk_assessment.supplier_risk}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Logistics Risk</p>
              <p className={`text-base font-semibold ${getRiskColor(analysis.risk_assessment.logistics_risk)}`}>
                {analysis.risk_assessment.logistics_risk}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Risk Summary</p>
            <p className="text-sm text-foreground leading-relaxed">{analysis.risk_assessment.summary}</p>
          </div>
        </div>

        {/* Recommendation */}
        <div>
          <h4 className="text-lg font-semibold mb-2">Recommendation</h4>
          <p className="text-sm text-foreground leading-relaxed">{analysis.recommendation}</p>
        </div>
      </Card>

      {/* Category Knowledge Cards (compliance hints, factory vetting, etc.) */}
      <CategoryKnowledgeCards analysis={analysis} />
    </div>
  );
}

