"use client";

import { useState, useId, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, AlertTriangle, CheckCircle, Camera, MessageSquare } from 'lucide-react';
import type { ProductAnalysis } from '@/lib/product-analysis/schema';
import ProductAnalyzerChat from './product-analyzer-chat';
import { createLeadFromAnalysis } from '@/lib/sample-request/fromAnalysis';
import { logEvent } from '@/lib/analytics/telemetry';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductAnalysisFeedback } from '@/components/product-analysis-feedback';
import { CategoryKnowledgeCards } from '@/components/category-knowledge-cards';
import SignInModal from '@/components/sign-in-modal';
import LimitReachedCard from '@/components/LimitReachedCard';

export default function ProductAnalyzer({ source }: { source?: string }) {
  const [input, setInput] = useState('');
  const [productImage, setProductImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [error, setError] = useState('');
  const [errorReason, setErrorReason] = useState('');
  const [sessionId, setSessionId] = useState('');
  const componentId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPresetSubmitting, setIsPresetSubmitting] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { isAuthenticated, userId } = useAuth();
  const limitHitLoggedRef = useRef(false);

  const presets = [
    "Amazon FBA kids water bottle, 500 units to USA",
    "TikTok Shop viral Korean gummy candy, 2,000 units to USA",
    "Retail chain instant ramen, 1 full container to USA",
  ];

  const handlePresetClick = (preset: string) => {
    setInput(preset);
    setIsPresetSubmitting(true);
  };
  
  // View and Form State
  const [viewMode, setViewMode] = useState<'form' | 'chat'>('form');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadStatus, setLeadStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    logEvent('view_analyzer', { source: source || 'direct' });
  }, [source]);

  useEffect(() => {
    if (isPresetSubmitting) {
      formRef.current?.requestSubmit();
      setIsPresetSubmitting(false);
    }
  }, [isPresetSubmitting]);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setError('');
    setAnalysis(null);
    setShowLeadForm(false);
    setLeadStatus('idle');
    setSessionId(`${componentId}-${Date.now()}`);

    try {
      const body = new FormData();
      body.append('input', input);
      if (productImage) {
        body.append('image', productImage);
      }

      const res = await fetch('/api/analyze-product', {
        method: 'POST',
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'quota_exceeded') {
          setErrorReason(data.reason);
          if (data.reason !== 'anonymous_daily_limit') {
            setShowSignInModal(true);
          }
          // Log limit_hit event (only once per attempt)
          if (!limitHitLoggedRef.current) {
            limitHitLoggedRef.current = true;
            const userType = isAuthenticated ? 'user' : 'anonymous';
            fetch('/api/limit-events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'limit_hit',
                reason: data.reason,
                userType,
                input: input.trim(),
              }),
            }).catch((err) => {
              console.error('[ProductAnalyzer] Failed to log limit_hit event:', err);
            });
          }
        }
        throw new Error(data.message || data.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
      logEvent('analyzer_quick_scan_completed', { source, path: 'quick_scan' });
      // Reset limit hit flag on successful analysis
      limitHitLoggedRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setProductImage(file);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysis) return;

    setLeadStatus('submitting');

    try {
      const analyzerPath = 'quick_scan';
      const leadSource = `${source || 'direct'}:${analyzerPath}`;
      
      logEvent('quote_requested', { source: leadSource, path: analyzerPath });

      const res = await createLeadFromAnalysis({
        name: leadName,
        email: leadEmail,
        analysis: analysis,
        leadSource,
        userId,
      });

      if (!res.ok) throw new Error(res.error || 'Failed to submit lead');

      setLeadStatus('success');
    } catch (err) {
      setLeadStatus('error');
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-green-500';
      case 'Medium': return 'text-yellow-500';
      case 'High': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const renderAnalysisSection = () => {
    if (isLoading) {
      return (
        <Card className="text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4 text-primary" />
          <h3 className="card-title mb-2">Analyzing your product...</h3>
          <p className="helper-text">We are estimating freight, duty, and risks.</p>
        </Card>
      );
    }

    if (error) {
      if (errorReason === 'anonymous_daily_limit' || errorReason === 'user_daily_limit') {
        const handlePrimaryClick = () => {
          const userType = isAuthenticated ? 'user' : 'anonymous';
          fetch('/api/limit-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'cta_primary_click',
              reason: errorReason,
              userType,
              input: input.trim(),
            }),
          }).catch((err) => {
            console.error('[ProductAnalyzer] Failed to log cta_primary_click event:', err);
          });
        };

        const handleSecondaryClick = () => {
          const userType = isAuthenticated ? 'user' : 'anonymous';
          fetch('/api/limit-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'cta_secondary_click',
              reason: errorReason,
              userType,
              input: input.trim(),
            }),
          }).catch((err) => {
            console.error('[ProductAnalyzer] Failed to log cta_secondary_click event:', err);
          });
        };

        return (
          <LimitReachedCard
            variant={errorReason === 'anonymous_daily_limit' ? 'anonymous' : 'user'}
            alphaSignupUrl={process.env.NEXT_PUBLIC_ALPHA_SIGNUP_URL}
            bookingUrl={process.env.NEXT_PUBLIC_BOOKING_URL}
            onPrimaryClick={handlePrimaryClick}
            onSecondaryClick={handleSecondaryClick}
          />
        );
      }
      return (
        <Card className="text-center border-destructive/50">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-4" />
          <h3 className="card-title mb-2">Something went wrong</h3>
          <p className="helper-text mb-6">{error}</p>
          <Button onClick={() => handleAnalyze()}>
            Try Again
          </Button>
        </Card>
      );
    }

    if (analysis) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
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

             {!showLeadForm ? (
            <Button 
                onClick={() => setShowLeadForm(true)}
              className="w-full"
              size="lg"
              >
                Get a Sourcing Quote
            </Button>
            ) : (
            <Card>
              <h3 className="card-title mb-4">Talk to a Sourcing Expert</h3>
                {leadStatus === 'success' ? (
                <div className="text-center text-success">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                  <p className="helper-text">Thanks! We've received your request and will get back to you shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit}>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Your Name"
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                      className="w-full h-12 px-4 rounded-lg bg-surface border border-subtle-border text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Your Email"
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                      className="w-full h-12 px-4 rounded-lg bg-surface border border-subtle-border text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                      />
                    <Button
                        type="submit"
                        disabled={leadStatus === 'submitting'}
                      className="w-full"
                      size="lg"
                      >
                        {leadStatus === 'submitting' ? (
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        ) : (
                          'Request Sourcing Help'
                        )}
                    </Button>
                    </div>
                  {leadStatus === 'error' && (
                    <p className="mt-2 text-sm text-destructive">Something went wrong. Please try again.</p>
                  )}
                  </form>
                )}
            </Card>
            )}

          {/* Category Knowledge Cards */}
          <CategoryKnowledgeCards analysis={analysis} />

          {/* Alpha Disclaimer and Feedback */}
          <ProductAnalysisFeedback analysis={analysis} mode="quick_scan" source={source} />
        </motion.div>
      );
    }

    return (
      <Card className="text-center">
        <h3 className="card-title mb-2">No analysis yet</h3>
        <p className="helper-text">Describe a product or upload a photo, then we will estimate landed cost and risk.</p>
      </Card>
    );
  };

  // Container width constant
  const CONTAINER_MAX_WIDTH = 'max-w-4xl';
  const CONTAINER_PADDING = 'px-4 sm:px-6 lg:px-8';

  return (
    <section id="product-analyzer" className="relative w-full bg-background py-12 sm:py-16 lg:py-20 border-t border-subtle-border">
      {showSignInModal && <SignInModal onClose={() => setShowSignInModal(false)} />}
      <div className={`${CONTAINER_MAX_WIDTH} mx-auto ${CONTAINER_PADDING}`}>
        <AnimatePresence mode="wait">
          {viewMode === 'form' ? (
            <motion.div key="form" className="space-y-12">
              {/* Block 1: Section Header */}
              <div className="text-center">
                <h2 className="section-title">Try the NexSupply Analyzer</h2>
                <p className="section-description">
                  Describe a product, paste an Alibaba link, or upload a photo. We will infer the category, estimate landed cost to your target country, and highlight sourcing risks.
                </p>
              </div>

              {/* Block 2: Product Analyzer Card */}
              <Card className="space-y-6">
                <form onSubmit={handleAnalyze} className="relative" ref={formRef}>
                  <div className="relative flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="e.g. 'Noise-cancelling headphones' or AliExpress URL..."
                      className="w-full h-14 pl-14 pr-32 rounded-full bg-surface border border-subtle-border text-foreground placeholder-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-lg"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute left-2 top-2 bottom-2 aspect-square h-10 w-10 flex items-center justify-center rounded-full bg-surface hover:bg-white/10 transition-colors text-muted-foreground"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    {productImage && (
                      <div className="absolute left-14 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-surface px-2 py-1 rounded-md border border-subtle-border">
                        {productImage.name}
                      </div>
                    )}
                    <Button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="absolute right-2 top-2 bottom-2 rounded-full min-w-[100px]"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          Analyze <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {presets.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetClick(preset)}
                        className="text-xs"
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                  <p className="helper-text">
                    You can paste a product link, describe the item in your own words, or upload a photo.
                  </p>
                </div>

                <div className="text-center pt-4 border-t border-subtle-border">
                  <p className="helper-text mb-3">If your idea is still vague, let our copilot help you structure it.</p>
                  <Button
                    onClick={() => {
                      if (!isAuthenticated) {
                        setShowSignInModal(true);
                        return;
                      }
                      setAnalysis(null);
                      setError('');
                      setViewMode('chat');
                    }}
                    variant="outline"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Describe Product with a Conversation
                  </Button>
                </div>
              </Card>

              {/* Analysis Result */}
              <AnimatePresence mode="wait">
                <motion.div key={isLoading ? 'loading' : error ? 'error' : analysis ? 'analysis' : 'empty'}>
                  {renderAnalysisSection()}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              {/* Block 1: Section Header */}
              <div className="text-center">
                <h2 className="section-title">Try the NexSupply Analyzer</h2>
                <p className="section-description">
                  Describe a product, paste an Alibaba link, or upload a photo. We will infer the category, estimate landed cost to your target country, and highlight sourcing risks.
                </p>
              </div>

              {/* Block 3: Conversational Copilot Card */}
              <Card>
                <ProductAnalyzerChat 
                  source={source} 
                  onAnalysisComplete={(result) => {
                setAnalysis(result);
                setViewMode('form');
                  }} 
                />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
