# Project Overview: StockBeacon
**Domain**: StockBeacon.app  
**Tagline**: "Your beacon in the stock market storm"

You are building a stock signal platform, where beginner users can get signal buy and sell stock without knowing a lot of knowledge or financial term

**DIFFERENTIATION STRATEGY**: Unlike competitors (Motley Fool, Simply Wall St, Finviz), focus on ACTIONABLE SIGNALS rather than data overload. Think "Netflix recommendations for stocks" - simple, personalized, confidence-inspiring.

You will be using Next JS, shadcn, tailwind, Lucid icon

## Key Competitive Advantages to Emphasize:
1. **Simplicity Without Dumbing Down**: Competitors overwhelm beginners with charts/data
2. **All-in-One Signal**: Combine fundamental + technical + sentiment in ONE clear score
3. **Plain English Explanations**: No financial jargon, explain WHY a stock is good
4. **Timing-Focused**: Most platforms analyze, we tell WHEN to act
5. **Confidence Building**: Show success rate of past signals to build user trust

# Core functionalities
1. Stock Screener: Show the list of stock symbols which are identified as a great business & at good time to buy
    
    **STANDOUT FEATURE**: Use a simple "StockBeacon Score" (0-100) that combines all factors below. Competitors show raw data - we show ONE clear number with color coding (Green/Yellow/Red).
    
    Great business when a company has all of these checks
        - Big pecentage of insider ownership **[EXPLAIN: "Management owns skin in the game"]**
        - Long term debt < 3x Net earning (after tax) **[EXPLAIN: "Company isn't drowning in debt"]**
        - Strong moat based on brand loyalty, high switching costs, pricing power (important) **[EXPLAIN: "Has unfair advantages competitors can't copy"]**
        - Consistent growth: Cashflow, Revenue, Profit **[EXPLAIN: "Growing predictably, not just lucky"]**
        - No cyclid & overly volatile **[EXPLAIN: "Steady business, not a roller coaster"]**
        - 12 - 15% ROE & > 7% ROA => This means effective capital use & sustainable profitability **[EXPLAIN: "Makes money efficiently with what they have"]**
    
    **UX INNOVATION**: Show max 10 stocks at a time with "Why Now?" explanations. Competitors show hundreds - we curate quality.

2. Stock Details: Show these information to that screen
    
    **DIFFERENTIATION**: Present as "Investment Health Report" - like a doctor's checkup for stocks. Use visual health indicators (✅❌⚠️) instead of raw numbers.
    
    a/ fundamental checklist **[PRESENT AS: "Business Quality Score"]**
        - Insider ownership **[SHOW AS: Visual bar with "Management Confidence Level"]**
        - Long-term debt (Ideal: < 3 x Net earning) **[SHOW AS: "Debt Safety Rating" with traffic light colors]**
        - Moat (Strong, normal, weak) & explaination based on these factor: brand localty, high switching costs, pricing power **[SHOW AS: "Competitive Advantage Strength" with castle icon metaphor]**
        - Consistent growth (Cashflow, Revenue, Profit) **[SHOW AS: "Growth Consistency Score" with trend arrows]**
        - ROE rating (ideal > 12%) **[SHOW AS: "Profit Efficiency Rating"]**
        - ROA rating (ideal > 7%) **[SHOW AS: "Asset Utilization Rating"]**
        - DCF price (ideal > 25% current stock) **[SHOW AS: "Value Opportunity %" with bargain/expensive labels]**
    
    b/ Support levels **[PRESENT AS: "Price Safety Net" with simple floor metaphor]**
    c/ Trend (uptrend, downtrend, sideway) **[SHOW AS: Momentum arrows with "Current Direction"]**
    d/ Latest news with the tags **[PRESENT AS: "Market Sentiment Radar"]**
        - Positive short term impact **[ICON: 🚀 "Short-term Boost"]**
        - Positive long term impact **[ICON: 📈 "Long-term Strength"]**
        - Neutral **[ICON: ➖ "No Major Impact"]**
        - Negative long term impact **[ICON: 📉 "Long-term Concern"]**
        - Negative short term impact **[ICON: ⚠️ "Short-term Headwind"]**
    
    **KEY INNOVATION**: One-click "Should I Buy?" button that explains the decision in 2-3 sentences. Competitors make users figure it out themselves.

3. Watchlist
    
    **STANDOUT FEATURE**: "Smart Alerts" - not just price alerts, but CONTEXT alerts. Example: "AAPL hit support level + positive earnings news + uptrend confirmed = BUY SIGNAL"
    
    a. Add stocks to watchlist so we can send the signal when to buy
        - Buy entry: Near support level, starting an uptrend, DCF > price **[PRESENT AS: "Perfect Storm Alert" when all 3 align]**
    
    **INNOVATION**: "Why I'm Waiting" explanations for each watchlist stock. Show users exactly what trigger you're waiting for, with progress bars.

4. Portfolio
    
    **MAJOR DIFFERENTIATOR**: "Portfolio Health Monitor" - competitors track performance, we track RISK and suggest actions.
    
    a. Manage existing positions and average price **[SHOW AS: Position cards with current score vs. purchase score]**
    b. Buy power **[SHOW AS: "Opportunity Fund" with suggested allocation per signal strength]**
    c. Signal when to exit a stock **[PRESENT AS: "Exit Radar" with early warning system]**
        - Overvalue **[ALERT: "Price got ahead of fundamentals - consider taking profits"]**
        - Structural deterioration: Loss of competitive advantage, new strong competitor, regulation changes, shift of consumer behavior **[ALERT: "Business fundamentals deteriorating - consider exit"]**
        - Better opportunities **[ALERT: "Found better stocks with your criteria - consider rebalancing"]**
    
    **INNOVATION**: "Portfolio Report Card" - monthly summary showing what went right/wrong with past signals to build confidence and learning.

# Packages/Libraries needed
1. lightweight-charts: for render the chart
2. yahoo-finance2: Fetch stock-data (includes basic news)
3. ~~finnhub: for fetching company-specific news~~ **[OPTIONAL - Can start without this]**

## News Strategy Options:
**MVP Approach**: Use Yahoo Finance's built-in news + simple keyword sentiment
**Premium Approach**: Add Finnhub for professional sentiment analysis later

## Additional Competitive Libraries to Consider:
4. **framer-motion**: Smooth animations to make data changes feel less overwhelming
5. **recharts**: Simple, beautiful charts that beginners can understand quickly
6. **react-hot-toast**: Friendly notifications for buy/sell signals
7. **date-fns**: Human-readable date formatting ("2 days ago" vs "2024-01-15")
8. **@alpacahq/alpaca-trade-api**: For real-time data and future trading features

## Recommended Data Strategy (Updated):
**Free Tier**: Yahoo Finance API via yahoo-finance2
- Perfect for fundamental analysis and long-term signals
- 15-20 minute delay acceptable for value investing approach
- Zero cost allows focus on user growth

**Premium Tier**: Alpaca Markets API  
- Real-time quotes for day traders and active users
- Professional reliability and support
- Path to trading execution features

**Hybrid Benefits**: Best of both worlds - free launch, premium scalability

## Database Choice: Supabase
**Selected**: Supabase for PostgreSQL + built-in features
- **Authentication**: Built-in auth with social providers
- **Real-time**: Live updates for portfolio and alerts
- **Security**: Row Level Security (RLS) for data isolation
- **Serverless**: Edge Functions for background processing
- **Cost**: Generous free tier, scales with usage

## AI-Powered Moat Analysis 🤖
**MAJOR DIFFERENTIATOR**: Unlike competitors who rely on manual moat ratings, we use AI to analyze competitive advantages in real-time.

### AI Moat Analysis Features:
- **Automated Scoring**: AI analyzes company data to score moat strength (0-100)
- **Plain English Explanations**: AI explains WHY a company has strong/weak moats
- **Dynamic Updates**: Moat strength changes as competitive landscape evolves
- **Comparative Analysis**: AI compares moats across industry peers
- **Beginner-Friendly**: Complex competitive analysis made simple

### Data Sources for AI Analysis:
- **10-K/10-Q Filings**: Business model descriptions, risk factors
- **Earnings Call Transcripts**: Management discussions on competitive position
- **Industry Reports**: Competitive landscape analysis
- **Financial Metrics**: Pricing power indicators (gross margins, etc.)
- **Patent Data**: IP protection strength
- **Market Share Data**: Competitive positioning

### AI Moat Analysis Framework:

#### **Moat Types to Analyze:**
1. **Brand Loyalty** (25 points max)
   - Customer retention rates, brand recognition surveys
   - Premium pricing ability vs competitors
   - Marketing efficiency (customer acquisition cost trends)

2. **Switching Costs** (25 points max)
   - Integration complexity, training requirements
   - Data/workflow migration difficulty
   - Contract lengths and renewal rates

3. **Network Effects** (25 points max)
   - Platform user growth correlations
   - Value creation from user interactions
   - Winner-take-all market dynamics

4. **Scale/Cost Advantages** (25 points max)
   - Economies of scale in production/distribution
   - Fixed cost leverage opportunities
   - Supply chain advantages

#### **AI Prompts for Moat Analysis:**

**Primary Analysis Prompt:**
```
Analyze the competitive moat strength for [COMPANY] in the [INDUSTRY] sector.

Company Data:
- Business Description: [10-K BUSINESS SECTION]
- Financial Metrics: Gross Margin [X]%, Operating Margin [X]%, Market Share [X]%
- Recent Developments: [EARNINGS HIGHLIGHTS]

Evaluate on these dimensions (0-25 points each):

1. BRAND LOYALTY: How strong is customer attachment?
   - Evidence of pricing power
   - Customer retention indicators
   - Brand recognition vs competitors

2. SWITCHING COSTS: How difficult/expensive to switch?
   - Technical integration barriers
   - Training and setup costs
   - Data portability challenges

3. NETWORK EFFECTS: Does user growth create value?
   - Platform dynamics
   - User interaction benefits
   - Winner-take-all potential

4. SCALE ADVANTAGES: Cost/operational benefits from size?
   - Production economies of scale
   - Distribution advantages
   - R&D cost spreading

For each dimension:
- Score: X/25 points
- Reasoning: 2-3 sentence explanation
- Evidence: Specific metrics or examples

Final Output:
- Total Moat Score: X/100
- Overall Strength: Strong/Normal/Weak
- Key Competitive Advantage: [1-2 sentences]
- Biggest Vulnerability: [1-2 sentences]
- Beginner Explanation: [Plain English, no jargon]
```

**Secondary Validation Prompt:**
```
Cross-check the moat analysis for [COMPANY] by comparing to industry leaders:

Compare [COMPANY] vs [TOP 3 COMPETITORS]:
1. Who has stronger pricing power? (Evidence: margin trends)
2. Who has higher switching costs? (Evidence: customer churn)
3. Who benefits most from scale? (Evidence: unit economics)
4. Who has the strongest brand? (Evidence: premium pricing)

Validation Questions:
- Is this moat sustainable in 5-10 years?
- What could disrupt this competitive advantage?
- How does this compare to Warren Buffett's moat examples?

Adjust moat score if analysis reveals overvaluation/undervaluation.
```

#### **AI Implementation Technical Specs:**

**AI Service Options:**
1. **OpenAI GPT-4** (Primary choice)
   - Best reasoning for complex analysis
   - Good with financial documents
   - Cost: ~$0.03 per analysis

2. **Claude-3** (Backup)
   - Excellent document analysis
   - Strong reasoning capabilities
   - Good safety features

3. **Local Models** (Future cost optimization)
   - Llama-2/Mistral for basic scoring
   - Fine-tuned on financial analysis

**Data Pipeline:**
```
1. Company Data Collection
   ├── SEC EDGAR API → 10-K/10-Q filings
   ├── Yahoo Finance → Financial metrics
   ├── Earnings call transcripts (manual/premium service)
   └── Industry reports (optional premium)

2. AI Processing
   ├── Document summarization (key business points)
   ├── Competitive analysis (vs industry peers)
   ├── Moat scoring (0-100 with explanations)
   └── Plain English translation for beginners

3. Score Integration
   ├── Replace manual moat ratings in StockBeacon algorithm
   ├── Cache AI analysis (update quarterly)
   ├── Show confidence level based on data quality
   └── Fallback to manual scoring if AI fails
```

**Cost Management:**
- **Cache Analysis**: Update quarterly, not real-time
- **Batch Processing**: Analyze multiple stocks together
- **Fallback System**: Manual scoring if AI unavailable
- **Budget**: Target <$100/month for 1000 stocks analyzed

#### **Competitive Advantage vs Other Platforms:**

**Simply Wall St**: Static moat graphics, no AI analysis
**Motley Fool**: Manual analyst opinions, inconsistent
**Morningstar**: Good moat ratings but no explanations for beginners
**Finviz**: No moat analysis at all

**Your AI Advantage**:
- **Dynamic**: Updates as competitive landscape changes
- **Explained**: AI tells beginners WHY moats exist
- **Consistent**: Same analytical framework for all stocks
- **Scalable**: Can analyze any public company globally

## Smart Email Notification System 📧

**ENGAGEMENT BOOSTER**: Ensure users never miss important signals, even when not actively using the platform.

### Email Notification Strategy:

#### **When to Send Emails:**
1. **User Inactive Trigger**: Send email if user hasn't been active for:
   - **30 minutes**: For urgent buy/sell signals (score changes >10 points)
   - **1 hours**: For moderate signals (score changes 5-10 points)
   - **Daily digest**: If user hasn't logged in for 24+ hours

2. **Signal Priority Levels**:
   - **🚨 URGENT** (immediate email): Perfect Storm alerts, major score drops
   - **⚡ HIGH** (30-min delay): Buy signals, watchlist triggers
   - **📊 MEDIUM** (2-hour delay): Score updates, new recommendations
   - **📰 LOW** (daily digest): News updates, educational content

#### **Email Types & Templates:**

**1. Perfect Storm Alert Email**
```
Subject: 🚨 Perfect Storm: AAPL hit your buy criteria!

Hi [Name],

Great news! Apple (AAPL) just triggered a Perfect Storm alert:

✅ Near support level ($165)
✅ Strong uptrend confirmed  
✅ 15% undervalued vs fair value
✅ StockBeacon Score: 85/100

[BIG CALL-TO-ACTION BUTTON: View Full Analysis]

Why this matters:
All 3 of your buy criteria aligned perfectly. Historical data shows stocks with this combination have averaged 23% returns over 12 months.

This opportunity won't last long.

[View in App] [Manage Alerts]
```

**2. Daily Portfolio Check Email**
```
Subject: Your portfolio update: 2 stocks need attention

Hi [Name],

Here's what happened with your stocks today:

📈 WINNERS:
• MSFT: +2.3% (Score: 78/100) ✅ Still a Buy

⚠️ WATCH LIST:
• TSLA: Score dropped to 45/100 (was 67)
• Reason: Overvaluation concerns
• Action: Consider taking profits

📊 New Opportunities:
• NVDA: Perfect Storm alert triggered
• Score: 82/100 - Strong Buy

[View Full Portfolio] [See New Opportunities]
```

**3. Educational/Engagement Email**
```
Subject: Why did AAPL's moat score increase? (2-min read)

Hi [Name],

You're watching Apple, so thought you'd find this interesting:

Our AI increased AAPL's moat score from 85 to 92 this quarter. Here's why:

🏰 Stronger Switching Costs (+4 points)
New health features make it harder to switch to Android

🌐 Network Effects (+3 points)  
AirDrop, FaceTime, iMessage create stickiness

This is exactly the kind of moat strengthening that leads to long-term outperformance.

[Read Full Analysis] [Add AAPL to Watchlist]
```

#### **Email Service Strategy:**

**Primary: Resend** (Modern, developer-friendly)
- Clean API, great deliverability
- React Email for beautiful templates
- Cost: $20/month for 100K emails

**Backup: SendGrid** (Enterprise reliability)
- Proven deliverability
- Advanced analytics
- Fallback if Resend fails

#### **User Activity Tracking:**

```typescript
interface UserActivity {
  userId: string;
  lastActive: Date;
  isOnline: boolean;
  sessionDuration: number;
  engagementScore: number; // 0-100 based on usage patterns
  emailPreferences: {
    urgentAlerts: boolean;
    dailyDigest: boolean;
    educational: boolean;
    maxEmailsPerDay: number;
  };
}
```

#### **Smart Email Logic:**

```typescript
// Pseudo-code for email decision logic
function shouldSendEmail(alert: Alert, user: UserActivity): boolean {
  // Don't email if user is currently active
  if (user.isOnline && user.lastActive > 5 minutes ago) {
    return false;
  }
  
  // Check email frequency limits
  if (todaysEmailCount >= user.emailPreferences.maxEmailsPerDay) {
    return false;
  }
  
  // Priority-based timing
  const inactiveMinutes = now - user.lastActive;
  
  if (alert.priority === 'URGENT' && inactiveMinutes >= 30) return true;
  if (alert.priority === 'HIGH' && inactiveMinutes >= 120) return true;
  if (alert.priority === 'MEDIUM' && inactiveMinutes >= 480) return true;
  
  return false;
}
```

#### **Email Performance Tracking:**
- **Open rates**: Track to optimize subject lines
- **Click-through rates**: Measure engagement with CTAs
- **Conversion rates**: Did email lead to app usage?
- **Unsubscribe rates**: Monitor for email fatigue

#### **Competitive Advantage:**
- **Robinhood**: Basic price alerts only
- **E*TRADE**: Generic market updates
- **Fidelity**: Complex, overwhelming emails
- **Your Edge**: Personalized, actionable, beautifully designed signals

# Design Principles That Set Us Apart:

## 1. **Confidence-First Design**
- Always show WHY we're confident in a recommendation
- Use progress bars and scores instead of raw numbers
- Green = confident buy, Yellow = wait, Red = avoid (never confuse users)

## 2. **Context Over Data**
- Every number needs an explanation in plain English
- "ROE of 15%" becomes "Makes 15% profit on shareholder money (Excellent)"
- Show trends, not just snapshots

## 3. **Action-Oriented UX**
- Every screen should end with a clear next step
- "Buy", "Wait", "Research More", or "Avoid" - never leave users hanging
- Show consequences: "If you buy $1000 worth and we're right, you could gain $250 in 12 months"

## 4. **Learning Without Overwhelming**
- Optional "Learn More" expandable sections for curious users
- Glossary tooltips for financial terms
- Success/failure examples to build pattern recognition

# Quality Assurance (QA) Process - MANDATORY

## Post-Phase Testing Requirements

**CRITICAL RULE**: After completing ANY development phase, you MUST:

1. **Generate a comprehensive QA document** with test cases covering all implemented features
2. **Execute all test cases independently** without user involvement  
3. **Mark completed tests with checkmarks** (✅)
4. **Only report completion AFTER all tests pass**

### QA Document Structure

Each phase completion MUST include a `PHASE_X_QA.md` file with:

```markdown
# Phase X - Quality Assurance Testing

## Test Environment
- [ ] Development server running
- [ ] Database connected and seeded
- [ ] All dependencies installed
- [ ] Environment variables configured

## Feature Test Cases

### Feature 1: [Feature Name]
#### Test Case 1.1: [Specific Test Description]
**Steps:**
1. Navigate to [specific page/component]
2. Perform [specific action]
3. Verify [expected outcome]

**Expected Result:** [Detailed expected behavior]
**Actual Result:** [What actually happened]
**Status:** ✅ PASSED / ❌ FAILED / ⚠️ PARTIAL
**Screenshot/Evidence:** [If applicable]

### Feature 2: [Feature Name]
[Continue pattern...]

## Integration Tests
- [ ] API endpoints respond correctly
- [ ] Database operations complete successfully
- [ ] Authentication flow works end-to-end
- [ ] Real-time updates function properly

## Performance Tests
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] No memory leaks detected
- [ ] Handles concurrent users appropriately

## Edge Cases & Error Handling
- [ ] Invalid input handling
- [ ] Network failure recovery
- [ ] Empty state displays
- [ ] Error messages are user-friendly

## Browser/Device Compatibility
- [ ] Chrome ✅
- [ ] Firefox ✅
- [ ] Safari ✅
- [ ] Edge ✅
- [ ] Mobile responsive ✅

## Accessibility Checks
- [ ] Keyboard navigation functional
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators visible

## Security Validation
- [ ] Input sanitization working
- [ ] Authentication required for protected routes
- [ ] API rate limiting active
- [ ] No sensitive data exposed

## Test Summary
- Total Tests: X
- Passed: X ✅
- Failed: X ❌
- Partial: X ⚠️
- Pass Rate: X%

## Issues Found & Fixed
1. Issue: [Description]
   - Fix: [What was done]
   - Verification: ✅

## Final Certification
✅ All critical tests passed
✅ No blocking issues remain
✅ Feature ready for production
✅ Documentation updated
```

### Testing Process Workflow

1. **Pre-Testing Setup**
   - Clear browser cache and cookies
   - Reset database to clean state
   - Ensure latest code is deployed
   - Open developer console for monitoring

2. **Systematic Testing**
   - Test each feature in isolation first
   - Then test feature interactions
   - Document any deviations from expected behavior
   - Take screenshots of important states

3. **Issue Resolution**
   - Fix any failing tests immediately
   - Re-test after fixes
   - Update test results
   - Continue until 100% pass rate for critical features

4. **Performance Validation**
   - Use browser DevTools to check:
     - Network requests optimization
     - Console errors/warnings
     - Memory usage
     - Rendering performance

5. **Final Verification**
   - Run through entire user flow as a new user
   - Test with realistic data volumes
   - Verify all UI states and transitions
   - Ensure no regression from previous phases

### Test Case Examples for StockBeacon Features

#### Stock Screener Tests
```
✅ Test 1.1: Display top 10 stocks with scores
✅ Test 1.2: Filter stocks by score range
✅ Test 1.3: Sort by different criteria
✅ Test 1.4: "Why Now?" explanations visible
✅ Test 1.5: Real-time score updates
```

#### Portfolio Management Tests
```
✅ Test 2.1: Add stock to portfolio
✅ Test 2.2: Update average price
✅ Test 2.3: Calculate P&L correctly
✅ Test 2.4: Exit signals trigger appropriately
✅ Test 2.5: Portfolio health score accurate
```

#### Watchlist Tests
```
✅ Test 3.1: Add/remove stocks from watchlist
✅ Test 3.2: Smart alerts configuration
✅ Test 3.3: Perfect Storm notifications
✅ Test 3.4: Progress bars update correctly
✅ Test 3.5: Email notifications sent when inactive
```

### Automated Testing Integration

Where possible, implement automated tests:

```typescript
// Example test structure
describe('StockBeacon Score Calculation', () => {
  it('should calculate score correctly with all factors', () => {
    // Test implementation
  });
  
  it('should handle missing data gracefully', () => {
    // Test implementation
  });
});
```

### DO NOT PROCEED Rules

**DO NOT** report phase completion if:
- ❌ Any critical test fails
- ❌ Performance benchmarks not met
- ❌ Security vulnerabilities detected
- ❌ Accessibility standards violated
- ❌ User flow has blocking issues

**ONLY** report completion when:
- ✅ 100% critical tests pass
- ✅ 95%+ non-critical tests pass
- ✅ All issues documented and resolved
- ✅ QA document fully completed with evidence
- ✅ Phase can be demoed without errors

### QA Communication Protocol

When phase is complete:
1. Present the QA document with all checkmarks
2. Summarize test results and pass rate
3. Highlight any non-critical issues for future improvement
4. Confirm readiness for next phase

Example completion message:
```
Phase X Complete ✅

QA Testing Summary:
- Total Tests Run: 47
- Tests Passed: 47 ✅
- Pass Rate: 100%
- Performance: All benchmarks met
- Security: No vulnerabilities found
- Accessibility: WCAG AA compliant

All test cases documented in PHASE_X_QA.md
Ready to proceed to Phase X+1
```

# Current file structure