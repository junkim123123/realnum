# Chat-First UX Refactor

## Overview

NexSupply has been refactored to use a **chat-first UX** as the primary entry point. The conversational copilot is now the main way users interact with the product analysis system.

## Architecture Changes

### Primary Experience: `/copilot`

- **Route**: `web/app/copilot/page.tsx`
- **Purpose**: Main chat interface for product analysis
- **Features**:
  - Natural language input
  - Instant analysis results with structured cards
  - Conversation history
  - Graceful limit/error handling within chat
  - Image upload support

### Reusable Components

#### `ProductAnalysisCard`

- **Location**: `web/components/ProductAnalysisCard.tsx`
- **Purpose**: Presentational component for displaying analysis results
- **Usage**: Can be rendered in both chat and non-chat contexts
- **Contents**:
  - Product name and HTS code
  - Landed cost breakdown
  - Risk assessment
  - Recommendation
  - Category knowledge cards (compliance hints, factory vetting, etc.)

This component was extracted from the Quick Scan result UI for reuse.

### Quick Scan (Legacy/Internal Use)

- **Location**: `web/app/(sections)/product-analyzer.tsx`
- **Status**: Still available but de-emphasized
- **Purpose**: Internal QA, quick testing
- **Note**: Can be updated to use `ProductAnalysisCard` component

### Conversational Copilot (Legacy)

- **Location**: `web/app/(sections)/product-analyzer-chat.tsx`
- **Status**: Still functional but replaced by new `/copilot` route
- **Purpose**: Structured Q&A flow for detailed analysis
- **Note**: Different from new chat-first UX - this uses `/api/analyze-product/chat` endpoint

## Message Flow

### New Chat-First UX (`/copilot`)

1. User types natural language input (e.g., "Can I profitably import silicone baby teethers for US Amazon?")
2. System calls `/api/analyze-product` directly with user's text
3. Response handling:
   - **Success**: Shows text summary + `ProductAnalysisCard` in chat
   - **Limit Reached**: Shows friendly message + `LimitReachedCard` in chat
   - **Error**: Shows error message in chat

### Legacy Conversational Copilot

1. User answers structured questions via quick choices/chips
2. System calls `/api/analyze-product/chat` with conversation state
3. Eventually generates full analysis report

## Backend Integration

### API Endpoints

- **`/api/analyze-product`**: Main analysis endpoint
  - Supports both FormData and JSON requests
  - Handles usage limits (anonymous 1/day, authenticated 5/day)
  - Returns `ProductAnalysis` with compliance hints, factory vetting, etc.
  - Automatically logs category usage via `logCategoryUsage()`

- **`/api/analyze-product/chat`**: Conversational copilot endpoint
  - Used by legacy Q&A flow
  - Returns structured conversation state updates

### Analytics & Logging

All analysis requests are logged:

- **Category Usage Logs**: `logs/category-usage.ndjson`
  - Created via `buildCategoryUsageEvent()` and `logCategoryUsage()`
  - Includes: input, product name, HTS code, category ID, regulation tags, risk scores

- **Telemetry Events**: Via `logEvent()`
  - `copilot_viewed`: User views copilot page
  - `copilot_analysis_completed`: Analysis succeeds
  - `analyzer_quick_scan_completed`: Quick Scan succeeds (legacy)

- **Limit Events**: Via `/api/limit-events`
  - `limit_hit`: User hits daily limit
  - `cta_primary_click`: User clicks primary CTA on limit card
  - `cta_secondary_click`: User clicks secondary CTA on limit card

## User Personas & Testing

### 1. Beginner FBA Seller (Kevin)

- Enters 2-3 rough product ideas
- Hits anonymous limit (1/day)
- Sees `LimitReachedCard` inside chat
- Encouraged to sign up

### 2. Advanced Seller (Ashley)

- Logged in (5/day limit)
- Runs 3-5 different product ideas
- Sees clear analysis cards per message
- Can scroll back through chat history

### 3. Highly Regulated Category Seller (Grace)

- Inputs baby/beauty/medical-adjacent items
- Sees detailed `regulation_reasoning` + `testing_cost_estimate` in cards
- Gets category-specific compliance hints

## Future Enhancements

- Move Quick Scan to internal-only route (`/internal/analyze`)
- Fully deprecate old conversational copilot or merge features
- Add chat persistence (localStorage or backend)
- Support multi-turn conversations for refinement
- Add "Compare Products" feature using chat history

## Migration Notes

- Old Quick Scan users will see existing interface (backward compatible)
- Hero CTA now links to `/copilot` instead of scrolling to analyzer
- All new development should use `/copilot` as primary entry point
- Analytics logging remains unchanged and works with both flows

