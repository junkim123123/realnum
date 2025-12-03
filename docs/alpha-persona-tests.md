# Alpha Persona Tests

## Persona P1 – Kevin

1.  **Scenario**
    *   Quick Scan input used: "pocket size mini blender"
    *   Whether image upload was used: No
    *   Whether Conversational mode was used: No
    *   Whether quote was requested: No. The high compliance risk and duties would make him hesitate.

2.  **Observed flow**
    *   Initial UI test was blocked by browser automation failures. Switched to API-level testing.
    *   The API response was fast and the JSON output was well-structured.
    *   As Kevin, the `landed_cost_breakdown` is the most valuable feature. Seeing the `duty_cost` explicitly is an "aha!" moment that speaks directly to his anxieties.
    *   The `risk_assessment` section is intimidating but appreciated. The "High" compliance risk confirms his fears but also gives him a concrete checklist (UL/ETL, FCC, FDA), which is empowering.
    *   The recommendation to "Proceed with caution" resonates with his anxious personality. He feels the tool is looking out for him.

3.  **Problems and friction**
    *   **CRITICAL:** Browser automation tools (`click`, `type`) failed repeatedly, making UI testing impossible.
    *   The "Start a free analysis" button on the hero section is a scroll link, which wasn't obvious and didn't work with the automation.
    *   An accidental click on an example prompt immediately triggered an analysis. There was no way to cancel or go back, which was disorienting.

4.  **Suggestions**
    *   The browser automation tool failures must be investigated and fixed.
    *   Add a "clear" or "reset" button to the analyzer input so users can easily start a new query after an analysis.
    *   Consider a confirmation step for the example prompts to prevent accidental triggers (e.g., "Analyze 'TikTok Gummy Candy'?").

5.  **Priority tag**
    *   "Must fix before external alpha" - The browser automation issue is a blocker for any real UI testing.

## Persona P2 – Ashley

1.  **Scenario**
    *   Quick Scan input used: "premium yoga mat"
    *   Whether image upload was used: No
    *   Whether Conversational mode was used: No
    *   Whether quote was requested: Yes. The numbers are clear enough to make a quick "go/no-go" decision.

2.  **Observed flow**
    *   Hit the anonymous usage limit after the first test. Temporarily disabled the rate limiter to proceed.
    *   As Ashley, the most important number is `landed_cost`. At $17.65, she can immediately compare that to her target Amazon sale price and determine if the margin is viable.
    *   The `duty_rate` of 29.6% is a huge red flag that she would appreciate seeing upfront.
    *   The "High" `logistics_risk` is a useful, quick insight that she would factor into her decision.
    *   The recommendation to "validate your final landed cost with a freight forwarder" is a clear, actionable next step.

3.  **Problems and friction**
    *   Hitting the anonymous quota after one scan could be frustrating for a serious user. The UI should make it very clear that logging in provides a higher limit.
    *   The JSON output is great for technical testing, but a real UI would need to present this information in a much more scannable, visual way for a time-poor user like Ashley.

4.  **Suggestions**
    *   When the anonymous quota is hit, the UI should prominently feature a "Log in for more scans" call to action.
    *   For the UI, consider a "Key Metrics" section at the very top of the report that shows `landed_cost`, `duty_rate`, and `overall_risk` for quick, at-a-glance decision making.
    *   The temporary fix to the rate limiter should be reverted and a more robust solution for testing authenticated states should be implemented.

5.  **Priority tag**
    *   "Nice to have" - The UI suggestions are for a later stage, but the core API data is valuable for this persona.

## Persona P3 – Daniel

1.  **Scenario**
    *   Quick Scan input used: "Japanese snack box"
    *   Whether image upload was used: No
    *   Whether Conversational mode was used: No
    *   Whether quote was requested: No. The compliance delays are a deal-breaker for a viral product.

2.  **Observed flow**
    *   The low `landed_cost` of $5.50 is initially very exciting for a viral product.
    *   The "High" `compliance_risk` is an immediate show-stopper. For a TikTok seller, the trend could be over by the time the FDA compliance is sorted out.
    *   The report is missing the most critical information for this persona: lead time and MOQ. His first questions would be "When can this reach my warehouse?" and "What's the minimum order?"

3.  **Problems and friction**
    *   The Quick Scan report lacks the key logistical data (lead time, MOQ) that a high-urgency seller like Daniel needs to make a decision.
    *   The compliance warnings, while correct, are presented as a blocker without a clear, fast solution, which would cause him to abandon the idea immediately.

4.  **Suggestions**
    *   Consider adding estimated lead times or production timelines to the analysis, especially for time-sensitive product categories.
    *   The Conversational Copilot might be a better entry point for this persona, as it could ask for his required delivery date and MOQ upfront, providing a more tailored analysis.

5.  **Priority tag**
    *   "Nice to have" - Adding lead time estimates to the Quick Scan is likely a significant data challenge, but it highlights a key information gap for this persona.

## Persona P4 – MJ

1.  **Scenario**
    *   Quick Scan input used: "self-heating coffee mug"
    *   Whether image upload was used: No
    *   Whether Conversational mode was used: No
    *   Whether quote was requested: No. Purely for research.

2.  **Observed flow**
    *   As a student, the `landed_cost_breakdown` is a perfect, real-world example for a business class project. It clearly illustrates concepts like FOB, freight, and duties.
    *   The `risk_assessment` section is a goldmine of information, teaching about UL, FCC, and FDA compliance in a very practical context.
    *   The recommendation to "Proceed with extreme caution" and the mention of "seized goods and significant fines" feels like a well-placed alpha disclaimer, effectively managing expectations and discouraging real orders from unqualified users.

3.  **Problems and friction**
    *   The tool is so useful for research that it might attract a lot of non-commercial traffic. The current rate limit (before it was disabled) is a good first step, but the user experience when the limit is hit needs to be friendly and educational.
    *   There's no clear way to export or save the analysis, which a student like MJ would want to do for a report or presentation.

4.  **Suggestions**
    *   When the rate limit is hit, the message should be friendly and perhaps suggest signing up for an educational account or newsletter for more information.
    *   Consider adding a "Print" or "Save as PDF" feature to the report page. This would be highly valuable for users who want to save the analysis for later.
    *   The tone of the recommendations is excellent for this persona. It's authoritative and educational without being condescending.

5.  **Priority tag**
    *   "Leave as is for now" - The current experience is very good for this persona. The suggestions are enhancements, not critical fixes.

## Persona P5 – Ethan

1.  **Scenario**
    *   Quick Scan input used: "organic olive oil from Italy"
    *   Whether image upload was used: No
    *   Whether Conversational mode was used: No
    *   Whether quote was requested: Yes, but he would need more detail before sending it to his team.

2.  **Observed flow**
    *   The information is professional and well-structured. The mention of "USDA organic certification" is a critical detail that shows the tool has a good understanding of the category.
    *   The `risk_assessment` is valuable, but it's too high-level for a buyer like Ethan. He would need to know *which* FDA regulations are relevant and *what* the specific logistical challenges are.
    *   The report is a good starting point, but it's not "board-ready." He would need to do a lot more research to turn this into a presentation for his management team.

3.  **Problems and friction**
    *   The Quick Scan lacks the depth and detail that a professional buyer needs. It's a good first pass, but it doesn't provide the granular data required for a large purchase order.
    *   There is no mention of supplier stability, quality control processes, or factory certifications (e.g., ISO, GMP), which are critical for a grocery chain.

4.  **Suggestions**
    *   For professional users, consider an "Advanced Analysis" option that goes deeper into the compliance and logistics risks.
    *   The Conversational Copilot could be very valuable for this persona, as it could ask for specific quality and supply chain requirements to create a more detailed, "board-ready" report.
    *   Integrating supplier-level data (e.g., factory certifications, years in business) would be a huge value-add for this persona.

5.  **Priority tag**
    *   "Nice to have" - The core analysis is solid, but the features required to make it "board-ready" are significant enhancements for a later stage.

## Persona P6 – Sofia

1.  **Scenario**
    *   Quick Scan input used: "rose quartz facial roller"
    *   Whether image upload was used: No
    *   Whether Conversational mode was used: No
    *   Whether quote was requested: Yes, if the UI felt simple and trustworthy.

2.  **Observed flow**
    *   The low `landed_cost` of $2.91 is very attractive and gives her a clear idea of her COGS.
    *   The "Low" risk assessment is reassuring and makes the process feel less intimidating.
    *   The recommendation that "Success will depend on strong branding and differentiation" is the most valuable piece of information. It validates her business strategy and helps her focus on what she does best.

3.  **Problems and friction**
    *   As a non-technical user, a JSON output would be completely unusable. The UI design will be critical for this persona. If it looks complex or "engineery," she will drop off immediately.
    *   The report doesn't mention anything about packaging, which is a huge part of her brand. She would be looking for information on custom packaging options and costs.

4.  **Suggestions**
    *   The UI needs to be extremely clean, simple, and visually appealing to build trust with this persona.
    *   The Conversational Copilot could be a great way to engage Sofia. It could ask about her brand, her packaging ideas, and her desired "feel" to provide a more personalized and less intimidating experience.
    *   Consider adding a "Packaging Options" section to the analysis, or at least acknowledging it as a key cost driver for DTC brands.

5.  **Priority tag**
    *   "Must fix before external alpha" - The UI/UX is a critical success factor for this persona. While the API is providing good data, the presentation will determine whether she uses the tool or not.

## Persona P7 – Jake

1.  **Scenario**
    *   Quick Scan input used: "GoPro camera accessories", "wireless phone charger"
    *   Whether image upload was used: No
    *   Whether Conversational mode was used: No
    *   Whether quote was requested: No. He is just exploring.

2.  **Observed flow**
    *   The first anonymous scan was successful.
    *   The second anonymous scan was immediately blocked by the rate limiter. The `quota_exceeded` error was clear and effective.
    *   As Jake, the experience of being "cut off" is expected from a free tool. The key is whether the message feels friendly or hostile. The current JSON error is neutral, but the UI will need to handle this gracefully.

3.  **Problems and friction**
    *   The anonymous limit of one is effective at preventing abuse, but it might be too restrictive for a user who is genuinely trying to compare a couple of different products.
    *   A sophisticated user could bypass the current IP-based rate limit by using a VPN.

4.  **Suggestions**
    *   Consider increasing the anonymous limit to 2 or 3 to allow for some basic product comparison before requiring a sign-up.
    *   The UI message for the rate limit should be friendly and focus on the benefit of signing up (e.g., "Unlock more scans by creating a free account").
    *   For a more robust solution in the future, consider a more sophisticated fingerprinting technique for anonymous users.

5.  **Priority tag**
    *   "Leave as is for now" - The current rate limiter is a reasonable starting point for the alpha. The suggestions are for future refinement.

**Update:** The anonymous rate limiter is now controlled by the `NEXSUPPLY_DISABLE_USAGE_LIMITS` environment flag. When the limit is hit, the UI will now display a "Free daily limit reached" card with CTAs for alpha signup and booking a call.

## Persona P8 – Grace

1.  **Scenario**
    *   Quick Scan input used: "baby teether toy"
    *   Whether image upload was used: No
    *   Whether Conversational mode was used: No
    *   Whether quote was requested: No. Not until she has a full compliance report in hand.

2.  **Observed flow**
    *   The "High" `compliance_risk` is the only thing that matters to her. The low cost is irrelevant if the product is unsafe.
    *   The specific mention of "CPSIA" is a huge credibility builder. It shows the tool is aware of the specific regulations for her category.
    *   The recommendation to "budget for and successfully complete mandatory third-party safety testing" is a clear, actionable, and responsible next step. She would see the tool as a valuable first-pass safety check.

3.  **Problems and friction**
    *   The Quick Scan is a great start, but it's not a substitute for a full compliance review. The tool needs to be very careful not to overstate its capabilities and create a false sense of security.
    *   The report doesn't mention specific material requirements (e.g., BPA-free, food-grade silicone), which are critical for this product category.

4.  **Suggestions**
    *   The UI for the report should have a very prominent "Disclaimer" section that clearly states the analysis is an estimate and not a substitute for legal or professional compliance advice.
    *   For highly regulated categories, the Conversational Copilot could be used to gather more specific information about materials and intended use, which would lead to a more detailed and accurate compliance analysis.
    *   Consider adding links to the relevant regulatory bodies (e.g., CPSC, FDA) in the report to help users like Grace do their own due diligence.

5.  **Priority tag**
    *   "Must fix before external alpha" - The legal disclaimer and the careful management of user expectations are critical for this persona and for the business as a whole.

**Update:** The anonymous rate limiter is now controlled by the `NEXSUPPLY_DISABLE_USAGE_LIMITS` environment flag. When the limit is hit, the UI will now display a "Free daily limit reached" card with CTAs for alpha signup and booking a call.

## v2 Daily Usage Policy

The daily usage policy has been updated to support different limits for anonymous and logged-in users.

*   **Anonymous users:** 1 free analysis per day. Hitting the limit shows the `Daily Limit Reached` card with a sign-up CTA.
*   **Logged-in users:** 5 free analyses per day. Hitting the limit shows the `Daily Limit Reached` card with a consultation CTA.
*   The `NEXSUPPLY_DISABLE_USAGE_LIMITS` environment flag can be used in local development to bypass all limits for testing.

## Alpha Limit Events / Lead Intelligence

As of v2, rate-limit events are automatically logged to the database, turning limit hits into actionable lead intelligence.

### Event Logging

When a user hits a daily limit, the following events are logged:

1. **Limit Hit Event** (`limit_hit`): Fired when the user first hits the daily limit and sees the `LimitReachedCard`.
   - Captures: user type (anonymous/user), reason (anonymous_daily_limit/user_daily_limit), product input, timestamp

2. **CTA Click Events**: Fired when the user clicks on CTAs in the `LimitReachedCard`.
   - `cta_primary_click`: Primary CTA click (e.g., "Unlock More Analysis" for anonymous users, or "Talk to a Sourcing Analyst" for logged-in users)
   - `cta_secondary_click`: Secondary CTA click (e.g., "Talk to a Sourcing Analyst" for anonymous users)

All events are logged via the `/api/limit-events` endpoint and stored in the `LimitEvent` table in the database.

### Admin Lead Console

A simple internal admin page is available at `/admin/limit-events` to view these events during the alpha phase.

**Access Control:**
- Only accessible to users whose email matches `ALPHA_ADMIN_EMAIL` environment variable
- For local development, ensure `ALPHA_ADMIN_EMAIL=your-email@example.com` is set in `.env.local`

**Usage Tips:**
1. Check for users who hit limits and clicked CTAs - these are hot leads
2. Match product inputs with alpha signup forms or booking calendars
3. Prioritize users who analyzed multiple products before hitting the limit
4. Follow up with personalized outreach based on their product interests

**Recommended Daily Workflow:**
- Open `/admin/limit-events` in the morning or evening
- Review today's `limit_hit` events + CTA clicks
- Match with alpha signup forms and booking calendars
- Create a prioritized "hot leads" list for outreach