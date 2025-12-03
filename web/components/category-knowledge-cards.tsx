'use client';

import { Card } from '@/components/ui/card';
import type { CategoryComplianceRule } from '@/lib/types/compliance';
import type { CategoryFactoryVettingHints } from '@/lib/types/factoryVetting';
import type { ProductAnalysis } from '@/lib/product-analysis/schema';
import { ExternalLink, AlertTriangle, CheckCircle2, XCircle, FileText, Shield, Factory, CheckCircle, Info, HelpCircle, DollarSign } from 'lucide-react';

interface CategoryComplianceCardProps {
  compliance: CategoryComplianceRule;
}

interface CategoryFactoryVettingCardProps {
  factoryVetting: CategoryFactoryVettingHints;
}

interface RegulationReasoningCardProps {
  reasoning: ProductAnalysis['regulation_reasoning'];
}

interface TestingCostEstimateCardProps {
  estimate: ProductAnalysis['testing_cost_estimate'];
}

interface InitialOrderCostCardProps {
  cost: ProductAnalysis['initial_order_cost'];
}

export function CategoryComplianceCard({ compliance }: CategoryComplianceCardProps) {
  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="card-title mb-1">Compliance & Regulations</h3>
          <p className="card-subtitle text-xs">{compliance.label}</p>
        </div>
      </div>

      {/* Target Markets */}
      {compliance.targetMarkets && compliance.targetMarkets.length > 0 && (
        <div className="mb-5 pb-5 border-b border-subtle-border">
          <p className="text-xs text-muted-foreground mb-2">Target Markets</p>
          <div className="flex flex-wrap gap-2">
            {compliance.targetMarkets.map((market, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {market}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* HTS Codes */}
      {compliance.typicalHtsCodes && compliance.typicalHtsCodes.length > 0 && (
        <div className="mb-5 pb-5 border-b border-subtle-border">
          <p className="text-xs text-muted-foreground mb-2">Typical HTS Codes</p>
          <div className="flex flex-wrap gap-2">
            {compliance.typicalHtsCodes.map((code, idx) => (
              <code
                key={idx}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-surface border border-subtle-border text-foreground"
              >
                {code}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Required Regulations */}
      {compliance.requiredRegulations && compliance.requiredRegulations.length > 0 && (
        <div className="mb-5 pb-5 border-b border-subtle-border">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Required Regulations
          </p>
          <ul className="space-y-2">
            {compliance.requiredRegulations.map((regulation, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="flex-1">{regulation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Testing Requirements */}
      {compliance.testingRequirements && compliance.testingRequirements.length > 0 && (
        <div className="mb-5 pb-5 border-b border-subtle-border">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Testing Requirements
          </p>
          <ul className="space-y-2">
            {compliance.testingRequirements.map((requirement, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-primary shrink-0 mt-1">•</span>
                <span className="flex-1">{requirement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* High Risk Flags */}
      {compliance.highRiskFlags && compliance.highRiskFlags.length > 0 && (
        <div className="mb-5 pb-5 border-b border-subtle-border">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            High Risk Flags
          </p>
          <ul className="space-y-2">
            {compliance.highRiskFlags.map((flag, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="flex-1">{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reference Links */}
      {compliance.referenceLinks && compliance.referenceLinks.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Reference Links
          </p>
          <ul className="space-y-2">
            {compliance.referenceLinks.map((link, idx) => (
              <li key={idx}>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 hover:underline"
                >
                  <span className="truncate max-w-[calc(100%-24px)]">{link}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function CategoryFactoryVettingCard({ factoryVetting }: CategoryFactoryVettingCardProps) {
  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <Factory className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="card-title mb-1">Factory Vetting Guide</h3>
          <p className="card-subtitle text-xs">{factoryVetting.label}</p>
        </div>
      </div>

      {/* Typical Supplier Types */}
      {factoryVetting.typicalSupplierTypes && factoryVetting.typicalSupplierTypes.length > 0 && (
        <div className="mb-5 pb-5 border-b border-subtle-border">
          <p className="text-xs text-muted-foreground mb-3">Typical Supplier Types</p>
          <ul className="space-y-2">
            {factoryVetting.typicalSupplierTypes.map((type, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="flex-1">{type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Must-Have Certificates */}
      {factoryVetting.mustHaveCertificates && factoryVetting.mustHaveCertificates.length > 0 && (
        <div className="mb-5 pb-5 border-b border-subtle-border">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-primary" />
            Must-Have Certificates
          </p>
          <ul className="space-y-2">
            {factoryVetting.mustHaveCertificates.map((cert, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="flex-1">{cert}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nice-to-Have Certificates */}
      {factoryVetting.niceToHaveCertificates && factoryVetting.niceToHaveCertificates.length > 0 && (
        <div className="mb-5 pb-5 border-b border-subtle-border">
          <p className="text-xs text-muted-foreground mb-3">Nice-to-Have Certificates</p>
          <ul className="space-y-2">
            {factoryVetting.niceToHaveCertificates.map((cert, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-muted-foreground shrink-0 mt-1">•</span>
                <span className="flex-1">{cert}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sample Questions */}
      {factoryVetting.sampleQuestionsToFactory && factoryVetting.sampleQuestionsToFactory.length > 0 && (
        <div className="mb-5 pb-5 border-b border-subtle-border">
          <p className="text-xs text-muted-foreground mb-3">Sample Questions to Ask</p>
          <ul className="space-y-3">
            {factoryVetting.sampleQuestionsToFactory.map((question, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-primary shrink-0 mt-1 font-semibold">{idx + 1}.</span>
                <span className="flex-1">{question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Red Flags */}
      {factoryVetting.commonRedFlags && factoryVetting.commonRedFlags.length > 0 && (
        <div className="mb-5 pb-5 border-b border-subtle-border">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            Common Red Flags
          </p>
          <ul className="space-y-2">
            {factoryVetting.commonRedFlags.map((flag, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="flex-1">{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Alibaba Filters */}
      {factoryVetting.recommendedAlibabaFilters && factoryVetting.recommendedAlibabaFilters.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">Recommended Alibaba Filters</p>
          <div className="flex flex-wrap gap-2">
            {factoryVetting.recommendedAlibabaFilters.map((filter, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface border border-subtle-border text-foreground"
              >
                {filter}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function RegulationReasoningCard({ reasoning }: RegulationReasoningCardProps) {
  if (!reasoning || reasoning.length === 0) return null;

  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="card-title mb-1">Regulation Reasoning</h3>
          <p className="card-subtitle text-xs">Explains why certain regulations apply to this product category.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-subtle-border">
              <th className="py-2 px-4 text-left font-semibold text-muted-foreground w-1/3">Regulation</th>
              <th className="py-2 px-4 text-left font-semibold text-muted-foreground">Reason</th>
            </tr>
          </thead>
          <tbody>
            {reasoning.map((item, idx) => (
              <tr key={idx} className="border-b border-subtle-border last:border-b-0">
                <td className="py-3 px-4 align-top font-medium">{item.regulation}</td>
                <td className="py-3 px-4 text-muted-foreground leading-relaxed">{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function TestingCostEstimateCard({ estimate }: TestingCostEstimateCardProps) {
  if (!estimate || estimate.length === 0) return null;

  const totalLow = estimate.reduce((sum, item) => sum + item.low, 0);
  const totalHigh = estimate.reduce((sum, item) => sum + item.high, 0);

  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="card-title mb-1">Testing Cost Estimate</h3>
          <p className="card-subtitle text-xs">Estimated costs for required third-party lab tests.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-subtle-border">
              <th className="py-2 px-4 text-left font-semibold text-muted-foreground">Test</th>
              <th className="py-2 px-4 text-right font-semibold text-muted-foreground">Low Est.</th>
              <th className="py-2 px-4 text-right font-semibold text-muted-foreground">High Est.</th>
            </tr>
          </thead>
          <tbody>
            {estimate.map((item, idx) => (
              <tr key={idx} className="border-b border-subtle-border last:border-b-0">
                <td className="py-3 px-4 font-medium">{item.test}</td>
                <td className="py-3 px-4 text-right text-muted-foreground">${item.low}</td>
                <td className="py-3 px-4 text-right text-muted-foreground">${item.high}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-subtle-border">
              <td className="py-3 px-4 font-bold">Total Estimated Range</td>
              <td className="py-3 px-4 text-right font-bold">${totalLow}</td>
              <td className="py-3 px-4 text-right font-bold">${totalHigh}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-4 p-3 rounded-lg bg-surface border border-subtle-border">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong>Disclaimer:</strong> These are estimates. Actual costs may vary based on the lab, product complexity, and materials. Always get a formal quote from a CPSC-accepted laboratory.
          </p>
        </div>
      </div>
    </Card>
  );
}


export function InitialOrderCostCard({ cost }: InitialOrderCostCardProps) {
  if (!cost) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="card-title mb-1">Initial Order Cost Estimate</h3>
          <p className="card-subtitle text-xs">Estimated capital required for your first production run (MOQ: {cost.moq} units).</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Unit Cost (Landed)</span>
          <span className="text-sm font-medium">${cost.unitCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Minimum Order Cost ({cost.moq} units)</span>
          <span className="text-sm font-medium">{formatCurrency(cost.minimumOrderCost)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Est. Testing Costs</span>
          <span className="text-sm font-medium">{formatCurrency(cost.testingCostTotal)}</span>
        </div>
        <div className="border-t border-subtle-border my-2"></div>
        <div className="flex justify-between items-center">
          <span className="text-base font-bold">Total Initial Outlay</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(cost.totalInitialCost)}</span>
        </div>
      </div>
    </Card>
  );
}

interface CategoryKnowledgeCardsProps {
  analysis: ProductAnalysis;
}

export function CategoryKnowledgeCards({ analysis }: CategoryKnowledgeCardsProps) {
  const { compliance_hints, factory_vetting_hints, regulation_reasoning, testing_cost_estimate, initial_order_cost } = analysis;

  if (!compliance_hints && !factory_vetting_hints && !regulation_reasoning && !testing_cost_estimate && !initial_order_cost) {
    return null;
  }

  return (
    <div className="space-y-6">
      {initial_order_cost && <InitialOrderCostCard cost={initial_order_cost} />}
      {regulation_reasoning && <RegulationReasoningCard reasoning={regulation_reasoning} />}
      {testing_cost_estimate && <TestingCostEstimateCard estimate={testing_cost_estimate} />}
      {compliance_hints && <CategoryComplianceCard compliance={compliance_hints} />}
      {factory_vetting_hints && <CategoryFactoryVettingCard factoryVetting={factory_vetting_hints} />}
    </div>
  );
}

