'use client'

import { useState, useEffect, FormEvent, useMemo, useRef } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import type { ProductAnalysis } from '@/lib/product-analysis/schema';
import {
  ChatMessage,
  SourcingConversationState,
  buildAnalyzerInputFromConversation,
} from '@/lib/ai/conversationalCopilot';
import { QUICK_CHOICES } from '@/lib/ai/quick-choices';
import { createLeadFromAnalysis } from '@/lib/sample-request/fromAnalysis';
import { logEvent } from '@/lib/analytics/telemetry';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductAnalysisFeedback } from '@/components/product-analysis-feedback';
import { CategoryKnowledgeCards } from '@/components/category-knowledge-cards';
import SignInModal from '@/components/sign-in-modal';

interface ProductAnalyzerChatProps {
  onAnalysisComplete: (analysis: ProductAnalysis) => void;
  source?: string;
}

const initialState: SourcingConversationState = {
  messages: [],
  ready_for_analysis: false,
};

export default function ProductAnalyzerChat({ onAnalysisComplete, source }: ProductAnalyzerChatProps) {
  const [state, setState] = useState<SourcingConversationState>(initialState);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadStatus, setLeadStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { isAuthenticated, isLoading: isAuthLoading, userId } = useAuth();
  const limitHitLoggedRef = useRef(false);

  // Initialize first message - show intro, then wait for user to start
  useEffect(() => {
    if (state.messages.length === 0 && isAuthenticated && !isAuthLoading) {
      setState(prevState => ({
        ...prevState,
        messages: [
          {
            role: 'assistant',
            content: "Hello! I'm the NexSupply Copilot. I'll ask about 3-5 quick questions to help you get a sourcing analysis. What product are you looking to source?"
          }
        ],
        next_focus_field: 'product_idea', // Set initial focus to show that we're waiting for product input
      }));
    }
  }, [state.messages.length, isAuthenticated, isAuthLoading]);

  const progress = useMemo(() => {
    const fields = [
      'product_idea',
      'import_country',
      'sales_channel',
      'volume_plan',
      'timeline',
      'main_risk_concern',
      'certifications_needed',
      'notes_confirmed',
    ];
    const filledCount = fields.filter(field => state[field as keyof SourcingConversationState] !== undefined && state[field as keyof SourcingConversationState] !== null).length;
    return {
      total: fields.length,
      filled: filledCount,
    };
  }, [state]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: message };
    const newMessages: ChatMessage[] = [...state.messages, userMessage];
    
    const currentState: SourcingConversationState = {
        ...state,
        messages: newMessages,
    };

    setState(currentState);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze-product/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: newMessages,
          currentState: state,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setState(data.updatedState);

    } catch (error) {
      console.error('Failed to fetch chat response:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
      const errorState: SourcingConversationState = {
          ...state,
          messages: [...newMessages, { role: 'assistant', content: "I had trouble processing that. Please try again or rephrase your answer." }],
      };
      setState(errorState);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (value: string) => {
    if (state.next_focus_field) {
      logEvent('copilot_choice_selected', {
        field: state.next_focus_field,
        value,
        source: 'conversational_copilot',
      });
    }
    handleSend(value);
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

  const handleCreateReport = async () => {
    setIsLoading(true);
    try {
      const payload = buildAnalyzerInputFromConversation(state);
      const res = await fetch('/api/analyze-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        // Log limit_hit event if quota exceeded
        if (data.error === 'quota_exceeded') {
          if (!limitHitLoggedRef.current) {
            limitHitLoggedRef.current = true;
            const userType = isAuthenticated ? 'user' : 'anonymous';
            const productInput = buildAnalyzerInputFromConversation(state).input;
            fetch('/api/limit-events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'limit_hit',
                reason: data.reason || (isAuthenticated ? 'user_daily_limit' : 'anonymous_daily_limit'),
                userType,
                input: productInput,
              }),
            }).catch((err) => {
              console.error('[ProductAnalyzerChat] Failed to log limit_hit event:', err);
            });
          }
        }
        throw new Error(data.error || 'Analysis failed');
      }
      setAnalysis(data.analysis);
      logEvent('analyzer_conversational_completed', {
        source,
        path: 'conversational',
      });
      // Reset limit hit flag on successful analysis
      limitHitLoggedRef.current = false;
    } catch (err) {
      console.error('Failed to create report', err);
      const errorState: SourcingConversationState = {
        ...state,
        messages: [
          ...state.messages,
          {
            role: 'assistant',
            content: `Sorry, I failed to create the report. Error: ${
              err instanceof Error ? err.message : 'Unknown error'
            }`,
          },
        ],
      };
      setState(errorState);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!analysis) return;

    setLeadStatus('submitting');
    try {
      const analyzerPath = 'conversational';
      const leadSource = `${source || 'direct'}:${analyzerPath}`;

      logEvent('quote_requested', { source: leadSource, path: analyzerPath });
      
      const res = await createLeadFromAnalysis({
        name: leadName,
        email: leadEmail,
        analysis: analysis,
        leadSource,
        userId,
      });

      if (!res.ok) {
        throw new Error(res.error || 'Failed to submit lead');
      }
      setLeadStatus('success');
    } catch (err) {
      setLeadStatus('error');
    }
  };

  const renderSummary = () => {
    const summaryPoints = [
      { label: "Product", value: state.product_idea },
      { label: "Import To", value: state.import_country },
      { label: "Sales Channel", value: state.sales_channel },
      { label: "Volume", value: state.volume_plan },
      { label: "Timeline", value: state.timeline },
      { label: "Concerns", value: state.main_risk_concern },
    ].filter(p => p.value);

    if (summaryPoints.length === 0) return null;

    return (
      <div className="bg-surface border border-subtle-border p-3 rounded-lg text-xs text-muted-foreground">
        <strong className="text-foreground">Summary:</strong>{' '}
        {summaryPoints.map((p, idx) => (
          <span key={p.label}>
            {idx > 0 && ' | '}
            {p.label}: {p.value}
          </span>
        ))}
      </div>
    );
  };
  const renderQuickChoices = () => {
    const field = state.next_focus_field as keyof typeof QUICK_CHOICES;
    if (!field || !QUICK_CHOICES[field]) {
      return null;
    }

    const choices = QUICK_CHOICES[field] || [];

    return (
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 p-4 bg-surface/50 border-2 border-primary/30 rounded-lg mb-3">
        {choices.map((choice) => (
          <Button
            key={choice}
            onClick={() => handleChipClick(choice)}
            variant="outline"
            size="sm"
            className="text-xs h-10 px-4 transition-all duration-150 ease-in-out active:bg-primary/20"
          >
            {choice}
          </Button>
        ))}
      </div>
    );
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        {showSignInModal && <SignInModal onClose={() => setShowSignInModal(false)} />}
        <SignInPrompt onOpenModal={() => setShowSignInModal(true)} />
      </>
    );
  }

  return (
    <>
      {showSignInModal && <SignInModal onClose={() => setShowSignInModal(false)} />}
      <div className="flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="text-center mb-6 pb-6 border-b border-subtle-border">
        <h3 className="card-title mb-2">NexSupply Copilot</h3>
        <p className="helper-text">
          I'll ask a few short questions to prepare a more accurate landed cost and risk report.
        </p>
        <div className="mt-3 text-xs text-muted-foreground">
          Progress: {progress.filled} of {progress.total} key details captured
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-grow overflow-y-auto mb-4 p-4 border border-subtle-border rounded-lg bg-surface min-h-[300px] max-h-[400px]">
        {state.messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            } mb-4`}
          >
            <div
              className={`px-4 py-2 rounded-lg max-w-[85%] sm:max-w-lg ${
                msg.role === 'user'
                  ? 'bg-primary text-black'
                  : 'bg-surface border border-subtle-border text-foreground'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="px-4 py-2 rounded-lg bg-surface border border-subtle-border">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mb-4">{renderSummary()}</div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 text-center text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          {error}
        </div>
      )}

      {/* Report Ready State */}
      {analysis ? (
        <div className="space-y-6">
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
            <div className="mb-6 pb-6 border-t border-subtle-border pt-6">
              <h4 className="text-lg font-semibold text-foreground mb-3">Landed Cost Breakdown</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <p>FOB Price:</p><p className="text-right text-foreground">{analysis.landed_cost_breakdown.fob_price}</p>
                <p>Freight Cost:</p><p className="text-right text-foreground">{analysis.landed_cost_breakdown.freight_cost}</p>
                <p>Duty Rate:</p><p className="text-right text-foreground">{analysis.landed_cost_breakdown.duty_rate}</p>
                <p>Duty Cost:</p><p className="text-right text-foreground">{analysis.landed_cost_breakdown.duty_cost}</p>
                <p className="font-bold text-foreground">Total Landed Cost:</p><p className="text-right font-bold text-primary">{analysis.landed_cost_breakdown.landed_cost}</p>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="mb-6 pb-6 border-t border-subtle-border pt-6">
              <h4 className="text-lg font-semibold text-foreground mb-3">Risk Assessment</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Compliance Risk: <span className={`${getRiskColor(analysis.risk_assessment.compliance_risk)} font-medium`}>{analysis.risk_assessment.compliance_risk}</span></p>
                <p>Supplier Risk: <span className={`${getRiskColor(analysis.risk_assessment.supplier_risk)} font-medium`}>{analysis.risk_assessment.supplier_risk}</span></p>
                <p>Logistics Risk: <span className={`${getRiskColor(analysis.risk_assessment.logistics_risk)} font-medium`}>{analysis.risk_assessment.logistics_risk}</span></p>
                <p className="mt-2 text-foreground">{analysis.risk_assessment.summary}</p>
              </div>
            </div>

            {/* Recommendation */}
            <div className="pt-6 border-t border-subtle-border">
              <h4 className="text-lg font-semibold text-foreground mb-3">Recommendation</h4>
              <p className="text-sm text-muted-foreground">{analysis.recommendation}</p>
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
          <CategoryKnowledgeCards
            complianceHints={analysis.compliance_hints}
            factoryVettingHints={analysis.factory_vetting_hints}
          />

          <ProductAnalysisFeedback analysis={analysis} mode="conversational" source={source} />
        </div>
      ) : state.ready_for_analysis ? (
        <div className="text-center">
          <Button
            onClick={handleCreateReport}
            className="w-full sm:w-auto"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Generating Report...
              </>
            ) : (
              'Generate Landed Cost + Risk Report'
            )}
          </Button>
        </div>
      ) : (
        <>
          {/* Quick Choice Chips - Prominently displayed */}
          {renderQuickChoices()}
          
          {/* Text Input - Secondary control */}
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-11 px-4 border border-subtle-border/50 rounded-lg bg-surface/30 text-foreground placeholder-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Or type a custom response..."
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="sm"
              variant="ghost"
              className="absolute top-1/2 right-2.5 -translate-y-1/2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Send'
              )}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Tap one of the options, or type if you need something custom.
          </p>
        </>
      )}
      </div>
    </>
  );
}

const SignInPrompt = ({ onOpenModal }: { onOpenModal: () => void }) => (
  <div className="text-center min-h-[400px] flex flex-col justify-center items-center">
    <h3 className="card-title mb-4">Copilot requires sign-in</h3>
    <p className="helper-text max-w-sm mb-6">
      To use the Conversational Copilot and save your progress, please sign in.
    </p>
    <Button onClick={onOpenModal} size="lg">
      Sign In to Continue
    </Button>
  </div>
);
