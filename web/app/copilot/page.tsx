/**
 * NexSupply Copilot - Primary Entry Point
 * 
 * This is now the primary entrypoint for NexSupply. All product analysis flows
 * should be anchored in this chat UI.
 * 
 * The chat-first UX allows users to:
 * - Type natural language product descriptions
 * - Get instant analysis with structured cards
 * - See multiple analyses in conversation history
 * - Handle limits and errors gracefully within chat
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, Send, AlertTriangle, Camera } from 'lucide-react';
import type { ProductAnalysis } from '@/lib/product-analysis/schema';
import { ProductAnalysisCard } from '@/components/ProductAnalysisCard';
import LimitReachedCard from '@/components/LimitReachedCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import SignInModal from '@/components/sign-in-modal';
import { logEvent } from '@/lib/analytics/telemetry';
import { logCategoryUsage, buildCategoryUsageEvent } from '@/lib/analytics/categoryUsage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;
  analysis?: ProductAnalysis;
  error?: string;
  errorReason?: string;
  isLoading?: boolean;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [productImage, setProductImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { isAuthenticated, isLoading: isAuthLoading, userId } = useAuth();
  const limitHitLoggedRef = useRef(false);

  // Initialize with welcome message
  useEffect(() => {
    if (!isAuthLoading && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm the NexSupply Copilot. I can help you analyze product sourcing opportunities.\n\nJust describe your product idea, paste an Alibaba link, or upload a photo, and I'll give you an instant landed cost and risk analysis.",
      }]);
      logEvent('copilot_viewed', {});
    }
  }, [isAuthLoading, messages.length]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    limitHitLoggedRef.current = false;

    // Add loading message
    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      isLoading: true,
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Prepare request body
      const body = new FormData();
      body.append('input', userMessage.content || '');
      if (productImage) {
        body.append('image', productImage);
        setProductImage(null);
      }

      const res = await fetch('/api/analyze-product', {
        method: 'POST',
        body,
      });

      const data = await res.json();

      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isLoading));

      if (!res.ok) {
        if (data.error === 'quota_exceeded') {
          // Handle limit reached
          const errorReason = data.reason || 'unknown';
          const userType = isAuthenticated ? 'user' : 'anonymous';

          // Log limit hit (only once per attempt)
          if (!limitHitLoggedRef.current) {
            limitHitLoggedRef.current = true;
            fetch('/api/limit-events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'limit_hit',
                reason: errorReason,
                userType,
                input: userMessage.content || '',
              }),
            }).catch((err) => {
              console.error('[Copilot] Failed to log limit_hit event:', err);
            });
          }

          // Add error message and limit card
          setMessages(prev => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: "I've reached my daily analysis limit for today. You can sign up for more analyses or book a consultation.",
            },
            {
              id: `limit-${Date.now()}`,
              role: 'system',
              errorReason,
            },
          ]);
        } else {
          // Other errors
          setMessages(prev => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: "I couldn't complete this analysis. Please try again or adjust your description.",
              error: data.message || data.error || 'Analysis failed',
            },
          ]);
        }
      } else {
        // Success - add analysis summary and card
        const analysis = data.analysis as ProductAnalysis;

        // Extract category ID from compliance hints if available
        const categoryId = analysis.compliance_hints?.id;

        // Log category usage for analytics (fire-and-forget)
        const usageEvent = buildCategoryUsageEvent(
          userMessage.content || '',
          analysis,
          categoryId
        );
        logCategoryUsage(usageEvent).catch(err => {
          console.error('[Copilot] Failed to log category usage:', err);
        });

        // Build summary text
        const summary = buildAnalysisSummary(analysis);

        setMessages(prev => [
          ...prev,
          {
            id: `summary-${Date.now()}`,
            role: 'assistant',
            content: summary,
          },
          {
            id: `analysis-${Date.now()}`,
            role: 'assistant',
            analysis,
          },
        ]);

        // Log event
        logEvent('copilot_analysis_completed', {
          source: 'copilot',
          has_compliance_hints: !!analysis.compliance_hints,
          has_factory_vetting: !!analysis.factory_vetting_hints,
        });
      }
    } catch (err) {
      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isLoading));

      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I encountered an error while analyzing. Please try again.",
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const buildAnalysisSummary = (analysis: ProductAnalysis): string => {
    const parts: string[] = [];

    parts.push(`I've analyzed **${analysis.product_name}** (HTS: ${analysis.hts_code}).`);

    parts.push(`\n**Landed Cost:** ${analysis.landed_cost_breakdown.landed_cost}`);
    parts.push(`**Risk Score:** ${analysis.risk_assessment.overall_score}/100 (${analysis.risk_assessment.overall_score >= 80 ? 'Low' : analysis.risk_assessment.overall_score >= 60 ? 'Medium' : 'High'} Risk)`);

    if (analysis.regulation_reasoning && analysis.regulation_reasoning.length > 0) {
      parts.push(`\n**Key Regulations:** ${analysis.regulation_reasoning.slice(0, 3).map(r => r.regulation).join(', ')}`);
    }

    if (analysis.testing_cost_estimate && analysis.testing_cost_estimate.length > 0) {
      const totalLow = analysis.testing_cost_estimate.reduce((sum, t) => sum + t.low, 0);
      const totalHigh = analysis.testing_cost_estimate.reduce((sum, t) => sum + t.high, 0);
      parts.push(`\n**Estimated Testing Costs:** $${totalLow}-$${totalHigh}`);
    }

    parts.push(`\n${analysis.recommendation}`);

    return parts.join('\n');
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setProductImage(file);
  };

  const handleLimitCardClick = (action: 'primary' | 'secondary', errorReason: string) => {
    const userType = isAuthenticated ? 'user' : 'anonymous';
    const input = messages.find(m => m.role === 'user')?.content || '';

    fetch('/api/limit-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action === 'primary' ? 'cta_primary_click' : 'cta_secondary_click',
        reason: errorReason,
        userType,
        input,
      }),
    }).catch((err) => {
      console.error('[Copilot] Failed to log CTA click:', err);
    });
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        {showSignInModal && <SignInModal onClose={() => setShowSignInModal(false)} />}
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <Card className="max-w-md w-full text-center p-8">
            <h1 className="text-2xl font-bold mb-4">Welcome to NexSupply Copilot</h1>
            <p className="text-muted-foreground mb-6">
              Sign in to start analyzing product sourcing opportunities.
            </p>
            <Button onClick={() => setShowSignInModal(true)} size="lg" className="w-full">
              Sign In to Continue
            </Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      {showSignInModal && <SignInModal onClose={() => setShowSignInModal(false)} />}
      <div className="flex flex-col h-screen max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b border-subtle-border p-4 sm:p-6">
          <h1 className="text-2xl font-bold">NexSupply Copilot</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your AI-powered sourcing analysis assistant
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((message) => {
            if (message.isLoading) {
              return (
                <div key={message.id} className="flex justify-start">
                  <div className="px-4 py-3 rounded-lg bg-surface border border-subtle-border">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              );
            }

            if (message.role === 'user') {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="px-4 py-3 rounded-lg bg-primary text-black max-w-[85%] sm:max-w-lg">
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              );
            }

            if (message.role === 'assistant') {
              return (
                <div key={message.id} className="flex flex-col gap-4">
                  {message.content && (
                    <div className="flex justify-start">
                      <div className="px-4 py-3 rounded-lg bg-surface border border-subtle-border max-w-[85%] sm:max-w-lg">
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.content.split('**').map((part, i) => 
                            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {message.analysis && (
                    <div className="max-w-full">
                      <ProductAnalysisCard analysis={message.analysis} />
                    </div>
                  )}
                  {message.error && (
                    <div className="flex justify-start">
                      <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 max-w-[85%] sm:max-w-lg">
                        <p className="text-sm text-destructive">{message.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            if (message.role === 'system' && message.errorReason) {
              return (
                <div key={message.id} className="max-w-full">
                  <LimitReachedCard
                    variant={message.errorReason === 'anonymous_daily_limit' ? 'anonymous' : 'user'}
                    alphaSignupUrl={process.env.NEXT_PUBLIC_ALPHA_SIGNUP_URL}
                    bookingUrl={process.env.NEXT_PUBLIC_BOOKING_URL}
                    onPrimaryClick={() => handleLimitCardClick('primary', message.errorReason!)}
                    onSecondaryClick={() => handleLimitCardClick('secondary', message.errorReason!)}
                  />
                </div>
              );
            }

            return null;
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-subtle-border p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your product, paste an Alibaba link, or ask a question..."
                className="w-full h-12 pl-12 pr-4 rounded-lg bg-surface border border-subtle-border text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-surface/50 transition-colors"
              >
                <Camera className="h-5 w-5 text-muted-foreground" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
          {productImage && (
            <p className="text-xs text-muted-foreground mt-2">
              Image attached: {productImage.name}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

