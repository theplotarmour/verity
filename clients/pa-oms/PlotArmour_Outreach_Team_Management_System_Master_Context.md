# PlotArmour Studio — Outreach Team Management System
## Master Product Context / Build Brief for Verity

**Status:** Internal system concept — Outreach Teams only  
**Primary users:** Founders' Office, Senior Outreach Officers, Junior Outreach Officers / Client Acquisition Interns  
**Primary purpose:** Run, measure, manage and improve PlotArmour's client-acquisition operation inside Verity instead of relying on disconnected Excel sheets, emails and WhatsApp messages.

---

# 1. EXECUTIVE SUMMARY

PlotArmour currently operates a client-acquisition internship model where interns research potential businesses, conduct LinkedIn/email outreach, follow up, identify opportunities, support meetings/proposals and ultimately help acquire clients.

The operational problem is not simply tracking numbers.

The company needs to know:

- Who is working?
- What are they working on?
- Which businesses are they contacting?
- Who exactly did they contact?
- When did they contact them?
- Through which channel?
- What did they say?
- Did the prospect respond?
- What did the prospect say?
- What problem was identified?
- Is the opportunity for Agency, Verity, or both?
- What happens next?
- Who owns the lead?
- Is the follow-up overdue?
- Which intern is performing?
- Which team is performing?
- Which verticals are working?
- Which outreach approaches are converting?
- Where is the pipeline getting stuck?
- Which opportunities require Founder intervention?
- Which interns are inactive?
- Which targets are being missed?
- Which prospects eventually become closed clients?

The proposed solution is an internal **Outreach Team Management System inside Verity**.

The system should replace the current fragmented workflow:

> Intern → Excel → Daily Email → Senior → Manual Weekly Report → Founders

with:

> **Junior Intern → Verity Activity + Leads → Team Workspace → Senior Team Leader → Company Core → Founders' Direction**

The core philosophy is:

> **One company-wide source of truth, different views based on role.**

The same underlying data powers:

- Junior workspaces
- Team Leader dashboards
- Company Core
- Lead records
- Outreach history
- Targets
- Daily reports
- Weekly reports
- Performance analytics
- Pipeline
- Attribution
- Alerts
- Management decisions

This system is **only for PlotArmour's outreach/client-acquisition teams for now**. Do not expand the scope into HR, engineering, finance, project delivery or general employee management unless explicitly requested later.

---

# 2. CURRENT OPERATING MODEL

## 2.1 Team hierarchy

The current intended structure is:

```text
                    COMPANY CORE
                   FOUNDERS' OFFICE
                         │
             ┌───────────┴───────────┐
             │                       │
       TEAM LEADER A           TEAM LEADER B
        Senior Intern           Senior Intern
             │                       │
        ┌────┼────┐             ┌────┼────┐
        │    │    │             │    │    │
       JR   JR   JR            JR   JR   JR
```

### Company Core

The Founders' Office has company-wide visibility.

It should:

- view all acquisition data
- issue company direction
- establish company-level priorities
- view team performance
- view pipeline
- view individual performance
- identify problems
- identify opportunities
- compare verticals
- compare Agency vs Verity acquisition
- intervene where required

### Team Leader / Senior Outreach Officer

The Senior manages a small team, generally around 4–5 Junior Outreach Officers.

The Senior should:

- receive company direction
- turn company direction into team targets
- distribute targets
- monitor team activity
- review lead quality
- review outreach quality
- monitor follow-ups
- coach team members
- identify weak performance
- help move opportunities forward
- consolidate weekly team reporting
- escalate important opportunities/problems to Company Core

### Junior Outreach Officer / Client Acquisition Intern

The Junior performs the actual prospecting and outreach.

The Junior should:

- research businesses
- identify prospects
- create lead records
- qualify opportunities
- conduct outreach
- record every meaningful outreach
- conduct follow-ups
- update lead status
- record responses
- book meetings
- support discovery
- identify Agency/Verity opportunities
- complete daily check-ins
- complete weekly reflection
- maintain accurate pipeline data

---

# 3. SYSTEM PRINCIPLE

The most important architectural principle is:

> **Do not create separate databases for each team.**

There should be **one company-wide acquisition database**.

Every lead belongs to:

- company
- team
- owner
- creator
- track
- stage
- activity history
- attribution history

Permissions determine what each person can see and change.

This means a Founder can drill down:

> Company → Team → Intern → Lead → Activity

without asking anyone for another spreadsheet.

---

# 4. WHY THIS SYSTEM EXISTS

The system solves five problems.

## 4.1 Accountability

An intern saying:

> “I did 25 outreach messages today”

should correspond to actual lead/activity records.

The company can see:

- the 25 companies
- the people contacted
- the channel
- the date
- the message/context
- the response
- the next action

## 4.2 Management

The Senior should not spend their time collecting spreadsheets.

The system should automatically show:

- who is active
- who is behind
- who has overdue follow-ups
- who has strong opportunities
- who needs coaching

## 4.3 Visibility

Founders should have one place to understand the acquisition operation.

## 4.4 Learning

The company should be able to learn:

- which industries work
- which offers work
- which messages work
- which channels work
- which teams perform
- which interns convert
- where prospects drop off

## 4.5 Direction

Company-level learning should feed back into next week's targets and strategy.

---

# 5. SYSTEM HIERARCHY

The information flow should work in both directions.

## Top-down

```text
FOUNDERS
   ↓
Company Direction
   ↓
Company Targets
   ↓
Team Targets
   ↓
Individual Targets
   ↓
Daily Work
```

## Bottom-up

```text
Daily Activity
   ↓
Leads
   ↓
Outreach
   ↓
Responses
   ↓
Meetings
   ↓
Proposals
   ↓
Pipeline
   ↓
Closed Deals
   ↓
Team Performance
   ↓
Company Intelligence
```

The system therefore becomes a continuous:

> **Direction → Execution → Measurement → Learning → Direction**

loop.

---

# 6. COMPANY CORE

Company Core is the Founders' Office command center.

It should not look like a normal intern CRM.

It should answer:

> **“What is happening across PlotArmour's acquisition operation, and what should we do about it?”**

---

# 7. COMPANY CORE DASHBOARD

## 7.1 Company headline metrics

Display:

- Active teams
- Active interns
- Leads generated this week
- Qualified leads
- Outreach completed
- Follow-ups sent
- Responses
- Meetings booked
- Proposals
- Active pipeline value
- Closed deals
- Estimated/actual revenue where authorized

Metrics should support:

- Today
- This week
- This month
- Custom date range

---

# 8. COMPANY CORE — TEAM PERFORMANCE

Example:

| Team | Leader | Members | Leads | Outreach | Follow-ups | Responses | Meetings | Proposals | Pipeline | Closed |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Alpha | Senior A | 5 | 61 | 142 | 44 | 16 | 7 | 3 | ₹X | 2 |
| Beta | Senior B | 4 | 54 | 130 | 39 | 13 | 6 | 2 | ₹X | 1 |
| Gamma | Senior C | 5 | 71 | 149 | 42 | 13 | 5 | 1 | ₹X | 1 |

Clicking a team should open the Team Leader view.

---

# 9. COMPANY CORE — ATTENTION CENTER

The system should automatically surface exceptions.

## Examples

### Missing activity

> No activity recorded today for 2 interns.

### Missing daily check-in

> 3 daily reports not submitted.

### Low activity

> 2 interns have been below target for 3 consecutive working days.

### Follow-up risk

> 18 follow-ups are overdue.

### Pipeline risk

> 11 active opportunities have no next action.

### Lead quality risk

> 24 new leads have no problem/opportunity description.

### Duplicate risk

> Possible duplicate company detected.

### Attribution conflict

> Lead is being worked by multiple interns.

### Hot opportunity

> High-value prospect has requested a meeting.

The system should prioritize exceptions rather than flooding Founders with every event.

---

# 10. COMPANY CORE — COMPANY DIRECTION

Founders should be able to create a company-wide direction.

Example:

## Company Direction

**Week:** 21–27 September

### Priority vertical

Manufacturing + Distributors

### Primary solution

Verity

### Secondary opportunity

Agency digital systems

### Company prospecting target

150 qualified businesses

### Strategic note

Focus on businesses with fragmented inventory, purchasing, production or reporting workflows.

### Direction status

Active

This direction should automatically become visible to all relevant Team Leaders and, where appropriate, Junior Interns.

---

# 11. TARGET CASCADE

Company direction should cascade.

Example:

```text
COMPANY
150 qualified prospects
        ↓
TEAM ALPHA
50 qualified prospects
        ↓
RAHUL
10 qualified prospects
        ↓
DAILY TARGET
2 qualified prospects/day
```

The system should distinguish between:

- company target
- team target
- individual target
- daily target
- weekly target

---

# 12. TARGET TYPES

Targets can include:

### Prospecting

- new leads
- qualified leads

### Outreach

- first outreach
- follow-ups

### Engagement

- responses
- positive responses

### Meetings

- meetings booked
- meetings completed

### Commercial

- proposals
- qualified opportunities
- closed deals

Avoid making raw activity the only measure of performance.

---

# 13. TEAM LEADER WORKSPACE

The Senior should have a dedicated:

# TEAM COMMAND

view.

The primary question:

> **“Is my team executing the company direction effectively?”**

---

# 14. TEAM LEADER — TOP VIEW

Show:

## Team Alpha

**Leader:** [Name]

**Week:** [Dates]

### Target

Qualified prospects: 150

### Progress

137 / 150

### Team metrics

- Leads: 137
- Outreach: 321
- Follow-ups: 104
- Responses: 39
- Meetings: 12
- Proposals: 6
- Closed: 2
- Pipeline: ₹X

---

# 15. TEAM MEMBER PERFORMANCE

Example:

| Intern | Leads | Outreach | Follow-ups | Responses | Meetings | Proposals | Closed | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Rahul | 24 | 51 | 13 | 6 | 2 | 1 | 0 | 🟢 |
| Ananya | 19 | 42 | 9 | 4 | 1 | 0 | 0 | 🟢 |
| Arjun | 12 | 31 | 7 | 1 | 0 | 0 | 0 | 🟡 |
| Priya | 25 | 48 | 11 | 7 | 3 | 2 | 1 | 🟢 |
| Kabir | 11 | 19 | 3 | 0 | 0 | 0 | 0 | 🔴 |

Status should be based on configurable rules and not merely arbitrary visual labels.

---

# 16. TEAM LEADER RESPONSIBILITIES IN THE SYSTEM

The Senior should be able to:

- view all team leads
- view all team activities
- assign targets
- create team tasks
- view individual performance
- inspect outreach messages
- inspect lead research
- identify overdue follow-ups
- review daily reports
- review weekly reports
- comment/coach
- flag opportunities
- reassign work where authorized
- escalate opportunities
- submit consolidated weekly report

The Senior should not necessarily have authority to:

- modify Founder-level direction
- change company-wide commercial terms
- alter attribution arbitrarily
- delete historical records
- approve unauthorized pricing

---

# 17. JUNIOR INTERN WORKSPACE

The Junior interface should be simple.

It should not expose unnecessary management complexity.

Primary view:

# MY WORKSPACE

---

# 18. JUNIOR — TODAY

Display:

### Today's targets

- New qualified prospects: 10
- Outreach: 15
- Follow-ups: 5

### Progress

- 7 / 10 prospects
- 12 / 15 outreach
- 4 / 5 follow-ups

### Priority tasks

1. Research 3 manufacturers
2. Contact 5 qualified prospects
3. Follow up with 4 leads
4. Update 2 lead records
5. Prepare meeting context

---

# 19. JUNIOR — MY PIPELINE

Show a lightweight pipeline:

```text
NEW
12

QUALIFIED
9

CONTACTED
18

FOLLOW-UP
11

POSITIVE
4

MEETING
2

PROPOSAL
1

CLOSED
0
```

Clicking a stage shows relevant leads.

---

# 20. JUNIOR — DAILY CHECK-IN

At the end of each working day, the Junior submits:

## What did you accomplish?

Free-text summary.

## Numbers

Automatically calculated from Verity where possible:

- Leads generated
- Qualified leads
- Outreach
- Follow-ups
- Responses
- Meetings
- Proposals
- Closed deals

## Best opportunity today

Select a lead.

## What did you learn?

Free-text.

## Blocker

Free-text.

## Tomorrow's priority

Free-text.

Then:

> **SUBMIT DAILY CHECK-IN**

The system should timestamp submission.

---

# 21. DAILY REPORTING

The current Excel system requires:

- daily date
- work done today
- weekly target
- leads generated
- outreach
- follow-ups
- responses
- pitch decks
- business research & analysis
- reports
- closed deals
- remarks

Verity should preserve these concepts but automate as much as possible.

### Important distinction

The system should separate:

**Activity generated automatically from actual records**

from:

**Qualitative explanation entered manually by the intern.**

This prevents people from manually typing fake numbers.

---

# 22. AUTOMATIC DAILY METRICS

For example:

If an intern created 8 leads:

> Leads generated = 8

If they logged 17 outreach activities:

> Outreach = 17

If they logged 6 follow-ups:

> Follow-ups = 6

If 4 prospects responded:

> Responses = 4

The intern should not have to manually enter those counts.

---

# 23. MANUAL DAILY CONTEXT

The intern should still explain:

- what they worked on
- what they learned
- what was difficult
- what opportunity looks strongest
- what they intend to do next

This prevents the system from becoming purely quantitative.

---

# 24. WEEKLY INTERN REPORT

At the end of each week, the system automatically aggregates:

- total leads
- qualified leads
- outreach
- follow-ups
- responses
- meetings
- proposals
- closed deals
- pipeline value

The intern adds:

### What worked?

### What didn't work?

### Strongest opportunity?

### Biggest learning?

### What will change next week?

### Next week's target?

Then:

> **SUBMIT WEEKLY REPORT**

---

# 25. TEAM LEADER WEEKLY REPORT

The Senior receives an automatic team roll-up.

Example:

# TEAM ALPHA — WEEKLY REPORT

### Team Performance

Qualified leads: 137  
Outreach: 321  
Follow-ups: 104  
Responses: 39  
Meetings: 12  
Proposals: 6  
Closed: 2  
Pipeline: ₹X

### Member performance

Automatic table.

### Strongest opportunities

Automatically surfaced from active pipeline.

### Team Leader assessment

The Senior writes:

- strongest performer
- strongest prospect
- strongest vertical
- biggest problem
- biggest learning
- next week's priority

Then:

> **SUBMIT TO COMPANY CORE**

---

# 26. COMPANY WEEKLY REPORT

Company Core automatically aggregates every team.

Founders see:

# CLIENT ACQUISITION — WEEKLY

### Company totals

- Leads
- Qualified leads
- Outreach
- Follow-ups
- Responses
- Meetings
- Proposals
- Pipeline
- Closed deals

### Team comparison

All teams.

### Vertical performance

Manufacturing, retail, hospitality, etc.

### Product performance

Agency vs Verity vs Both.

### Pipeline

Active opportunities.

### Attention

Risks and overdue actions.

### Direction

Next company-level priority.

---

# 27. LEAD DATABASE

The central object of the system is the **Lead / Prospect**.

Every prospect should have a dedicated record.

---

# 28. LEAD RECORD

Example:

## ABC Manufacturing Pvt. Ltd.

### Identity

- Company name
- Website
- Industry
- Location
- Company size if known
- LinkedIn/company profile
- Source

### Contact

- Contact name
- Designation
- LinkedIn
- Email
- Phone if legitimately available
- Decision-maker status

### Opportunity

- Agency / Verity / Both
- Problem identified
- Opportunity identified
- Why relevant
- Buying signal
- Estimated fit
- Estimated value if appropriate

### Ownership

- Lead creator
- Current owner
- Team
- Senior
- Attribution history

### Pipeline

- Stage
- Last contact
- Next action
- Next action date
- Meeting date
- Proposal status
- Closed status

---

# 29. LEAD STAGES

Recommended stages:

1. New
2. Researching
3. Qualified
4. Contacted
5. Follow-up
6. Positive Response
7. Discovery
8. Meeting Booked
9. Meeting Completed
10. Proposal / Pitch
11. Negotiation
12. Advance Payment Pending
13. Closed
14. Not Interested
15. No Response
16. Disqualified

Do not treat every stage as equal.

---

# 30. CLOSED CLIENT DEFINITION

For compensation purposes, according to the Internship Agreement:

> **A client is considered successfully closed only after PlotArmour has received the required advance payment for the applicable project.**

Therefore:

- lead ≠ closed
- response ≠ closed
- meeting ≠ closed
- proposal ≠ closed
- verbal confirmation ≠ closed

The system should make this distinction explicit.

---

# 31. OUTREACH ACTIVITY RECORD

Every meaningful outreach should be logged.

Fields:

- Lead
- Owner
- Date/time
- Channel
- Activity type
- Message
- Response
- Next action
- Next action date
- Attachments/context if authorized

Activity types:

- First LinkedIn outreach
- LinkedIn follow-up
- First email
- Email follow-up
- WhatsApp outreach
- Call
- Referral introduction
- Meeting
- Proposal sent
- Other

---

# 32. OUTREACH TIMELINE

Every lead should have a chronological activity timeline.

Example:

```text
19 Sep
Lead created

19 Sep
LinkedIn outreach sent

20 Sep
Prospect viewed profile

22 Sep
Follow-up sent

23 Sep
Prospect replied

24 Sep
Meeting booked

26 Sep
Discovery completed

27 Sep
Proposal requested

29 Sep
Proposal sent

05 Oct
Advance payment received

05 Oct
CLOSED
```

This becomes the definitive operational history.

---

# 33. OUTREACH MESSAGE ARCHIVE

The system should retain the actual outreach context.

This is important for:

- coaching
- attribution
- handoff
- learning
- accountability
- avoiding duplicate outreach

A Senior should be able to inspect:

> What exactly did the intern send?

---

# 34. RESEARCH REQUIREMENT

A lead should not be considered high-quality merely because a company name was entered.

For a qualified prospect, capture:

### Why is this business relevant?

1–2 sentences.

### What was observed?

Specific evidence.

### What problem might exist?

Reasonable hypothesis.

### What is the buying signal?

Evidence of timing.

### Which track?

Agency / Verity / Both.

This makes research measurable.

---

# 35. PROSPECTING UNIVERSE

The outreach team currently targets businesses across:

## Retail & Commerce

- Retail Stores
- Supermarkets
- Grocery Stores
- Convenience Stores
- Department Stores
- Fashion Stores
- Clothing Boutiques
- Shoe Stores
- Jewellery Stores
- Electronics Stores
- Furniture Stores
- Home Decor Stores
- Beauty Stores
- Cosmetics Stores
- Sports Stores
- Bookstores
- Gift Shops
- Pet Stores
- Hardware Stores
- Auto Parts Stores

## Food & Hospitality

- Restaurants
- Cafés
- Bakeries
- Cloud Kitchens
- Fast Food Businesses
- Catering Businesses
- Bars & Lounges
- Hotels
- Resorts
- Hostels
- Guest Houses
- Travel Agencies
- Tour Operators
- Event Venues

## Professional Services

- Law Firms
- Accounting Firms
- CA Firms
- Consulting Firms
- Marketing Agencies
- Advertising Agencies
- PR Agencies
- Design Agencies
- Architecture Firms
- Interior Designers
- Real Estate Agencies
- Recruitment Agencies
- Insurance Agencies
- Financial Advisors
- IT Services Companies

## Healthcare

- Hospitals
- Clinics
- Dental Clinics
- Dermatology Clinics
- Physiotherapy Clinics
- Diagnostic Labs
- Pharmacies
- Optical Stores
- Veterinary Clinics
- Mental Wellness Practices
- Medical Distributors

## Education

- Schools
- Colleges
- Universities
- Coaching Institutes
- Tuition Centres
- Test Preparation Centres
- EdTech Companies
- Language Institutes
- Skill Training Institutes
- Music Schools
- Dance Academies
- Vocational Training Centres

## Real Estate & Construction

- Real Estate Developers
- Property Dealers
- Property Management
- Construction Companies
- Contractors
- Architects
- Interior Design Firms
- Home Builders
- Facility Management
- Building Material Suppliers

## Manufacturing & B2B

- Manufacturers
- Textile Manufacturers
- Garment Manufacturers
- Furniture Manufacturers
- Chemical Manufacturers
- Pharmaceutical Manufacturers
- Food Manufacturers
- Packaging Companies
- Importers
- Exporters
- Wholesalers
- Distributors
- Industrial Suppliers

## Personal & Local Services

- Salons
- Spas
- Gyms
- Fitness Studios
- Yoga Studios
- Wedding Planners
- Photographers
- Car Rentals
- Car Washes
- Auto Repair Shops
- Cleaning Services
- Laundry Services
- Repair Services
- Printing Businesses
- Tailors

## Digital & Technology

- SaaS Companies
- Software Agencies
- Startups
- E-commerce Businesses
- Online Marketplaces
- App Developers
- Web Development Agencies
- Cybersecurity Companies
- Data Companies
- AI Companies
- Gaming Studios
- Content Agencies
- Creator Businesses

---

# 36. AGENCY VS VERITY

The lead record should include:

> **Opportunity Track**

Options:

- Agency
- Verity
- Both
- Undetermined

---

# 37. AGENCY SIGNALS

Think Agency when a business needs:

- website
- web application
- mobile app
- e-commerce
- marketplace
- customer portal
- booking system
- digital product
- dashboard
- internal tool
- automation
- integration
- digital launch
- branding
- product design
- growth/content
- AI-enabled product/automation

---

# 38. VERITY SIGNALS

Think Verity when a business has:

- fragmented operations
- spreadsheet-heavy workflows
- inventory complexity
- purchasing complexity
- sales/order complexity
- production tracking problems
- approval bottlenecks
- disconnected software
- poor reporting
- multiple departments needing shared data
- manual coordination
- operational scaling problems

---

# 39. BOTH SIGNAL

A prospect may be:

> **Both**

when they need:

- a new digital customer-facing system
- AND
- an internal operational platform

The system must support multi-opportunity discovery.

---

# 40. QUALIFICATION MODEL

Use five dimensions:

## Problem

Is there a real problem?

## Trigger

Why now?

## Fit

Can PlotArmour solve it?

## Authority

Who owns the decision?

## Timing

Can action realistically happen?

The system can eventually assign a qualification score based on these fields.

---

# 41. LEAD QUALITY SCORE

Potential model:

### 0–20 — Weak

Little evidence.

### 21–40 — Possible

Some relevance but weak trigger.

### 41–60 — Qualified

Clear problem and fit.

### 61–80 — Strong

Problem + trigger + decision-maker + realistic timing.

### 81–100 — High Priority

Strong commercial fit and active buying signal.

The exact scoring rules should remain configurable.

Do not make a numerical score the sole basis for decision-making.

---

# 42. BUYING SIGNALS

Track signals such as:

- expansion
- new location
- new product
- new service
- hiring
- funding
- acquisition
- leadership change
- rebrand
- new market
- new distribution
- partnership
- e-commerce launch
- operational growth
- customer complaints
- manual processes
- outdated digital system
- fragmented tools
- scaling issues

---

# 43. FOLLOW-UP MANAGEMENT

Every active lead should have:

- last contact date
- next action
- next action date

The system should automatically identify overdue follow-ups.

Example:

> **FOLLOW-UP OVERDUE**
>
> ABC Manufacturing  
> Owner: Rahul  
> Last contacted: 18 Sep  
> Follow-up due: 21 Sep  
> 2 days overdue

This should appear to:

- Junior
- Senior
- Company Core when material

---

# 44. NEXT-ACTION RULE

No active opportunity should be allowed to remain without a next action.

For every meaningful lead:

> **What happens next?**

Examples:

- send follow-up
- research decision maker
- schedule call
- prepare discovery
- send requested information
- internal technical review
- proposal preparation
- Founder handoff

---

# 45. DUPLICATE DETECTION

The system should identify possible duplicate businesses.

Potential matching:

- company name
- domain
- website
- LinkedIn
- email domain

If duplicate:

> **Possible existing lead**

Show:

- current owner
- team
- last activity
- status

Do not automatically delete.

---

# 46. ATTRIBUTION

Attribution should be based on:

- official lead records
- outreach records
- communication history
- timestamps
- internal attribution rules

If multiple people interact with the same prospect:

1. detect overlap
2. preserve all activity
3. alert relevant Senior
4. avoid manual manipulation
5. allow authorized PlotArmour leadership to determine attribution

The system should maintain an attribution history rather than overwriting historical ownership.

---

# 47. NO RECORD MANIPULATION

Interns must not:

- delete another person's outreach
- backdate activity
- claim someone else's lead
- create fake activities
- hide failed outreach
- alter timestamps
- duplicate leads to inflate numbers
- mark a deal closed before advance payment
- manipulate performance metrics

The system should preserve audit history.

---

# 48. ACTIVITY AUDIT TRAIL

Every meaningful change should be logged:

- who changed it
- what changed
- previous value
- new value
- timestamp

This is particularly important for:

- ownership
- stage
- closed status
- deal value
- attribution
- next action
- target changes

---

# 49. PIPELINE

Pipeline should show:

```text
NEW
 ↓
QUALIFIED
 ↓
CONTACTED
 ↓
POSITIVE
 ↓
DISCOVERY
 ↓
MEETING
 ↓
PROPOSAL
 ↓
NEGOTIATION
 ↓
ADVANCE PENDING
 ↓
CLOSED
```

Also support:

- not interested
- no response
- disqualified

---

# 50. PIPELINE VALUE

Pipeline value should be separated into:

### Estimated

Potential value based on current information.

### Proposed

Value of a proposal already issued.

### Closed

Value of a qualifying client after required advance payment.

Never treat estimated pipeline as revenue.

---

# 51. AGENCY / VERITY PIPELINE SPLIT

Company Core should be able to see:

### Agency

- prospects
- qualified
- meetings
- proposals
- pipeline
- closed

### Verity

- prospects
- qualified
- meetings
- proposals
- pipeline
- closed

### Both

Cross-sell / combined opportunities.

---

# 52. VERTICAL INTELLIGENCE

The system should calculate performance by industry.

Example:

| Industry | Leads | Outreach | Responses | Meetings | Proposals | Closed |
|---|---:|---:|---:|---:|---:|---:|
| Manufacturing | 120 | 260 | 22 | 9 | 4 | 2 |
| Restaurants | 90 | 210 | 12 | 3 | 1 | 0 |
| Retail | 110 | 250 | 18 | 5 | 2 | 1 |
| Professional Services | 80 | 180 | 8 | 2 | 0 | 0 |

This lets Founders answer:

> **Which markets are actually converting?**

---

# 53. CHANNEL INTELLIGENCE

Track performance by:

- LinkedIn
- Email
- WhatsApp
- Calls
- Referrals
- Other

The company should eventually see:

> LinkedIn response rate  
> Email response rate  
> Meeting conversion by channel

Do not optimize prematurely on tiny sample sizes.

---

# 54. OUTREACH INTELLIGENCE

Track:

- first message
- message type
- response
- response time
- follow-up count
- meeting conversion

The goal is to learn:

> Which messages and approaches create conversations?

---

# 55. TEAM COACHING

Senior should be able to open an intern's pipeline and see:

- strongest leads
- weakest leads
- overdue follow-ups
- messages
- response rates
- conversion
- research quality

Senior can add internal coaching notes.

Example:

> “Good personalization. Your problem statement is too broad. Next week focus on identifying a specific operational trigger.”

Coaching should remain internal and should not alter the historical lead record.

---

# 56. TEAM LEADER REVIEW QUEUE

Create a queue:

### Needs Review

- new high-value lead
- poor qualification
- unusual opportunity
- proposal requested
- technical requirement
- Agency + Verity opportunity
- attribution conflict
- stalled opportunity
- strategic company

Senior can:

- review
- comment
- approve progression
- escalate

---

# 57. FOUNDER ESCALATION QUEUE

Company Core should surface opportunities that need Founder attention.

Examples:

- large deal
- strategic company
- enterprise requirement
- unusual technical requirement
- custom Verity implementation
- Agency + Verity cross-sell
- senior decision-maker engaged
- proposal negotiation
- partnership possibility
- sensitive issue

---

# 58. DAILY ACCOUNTABILITY

The system should show:

## Today

### Active interns

X / Y

### Reports submitted

X / Y

### Outreach completed

X

### Follow-ups completed

X

### New leads

X

### Meetings

X

### Problems

X

This should let a Senior see team health in seconds.

---

# 59. ABSENCE / INACTIVITY SIGNALS

Do not assume inactivity means misconduct.

The system should flag:

> **No activity recorded**

not:

> **Intern did not work**

Then Senior can investigate.

Potential rules:

- no daily check-in
- no lead creation
- no outreach
- repeated target miss
- overdue follow-ups

---

# 60. PERFORMANCE SCORECARD

Performance should combine quality and quantity.

Suggested categories:

### 25% Activity

- consistency
- prospecting
- outreach
- follow-ups

### 25% Lead Quality

- relevance
- research
- qualification
- buying signals

### 15% Pipeline Discipline

- accurate records
- next actions
- reporting

### 15% Communication

- outreach
- conversations
- follow-ups

### 20% Commercial Performance

- qualified opportunities
- proposals
- closed business

Weights should remain configurable.

---

# 61. IMPORTANT: DON'T OPTIMIZE FOR RAW VOLUME

If the system rewards:

> 500 messages

without considering:

- relevance
- response
- meetings
- opportunities

interns will spam.

The system should encourage:

> **Quality × Consistency × Conversion**

rather than:

> **Volume alone**

---

# 62. FUNNEL CONVERSION

Company Core should show:

```text
1,000 Prospects
      ↓
650 Qualified
      ↓
500 Contacted
      ↓
90 Responses
      ↓
35 Meetings
      ↓
15 Proposals
      ↓
5 Closed
```

This gives management visibility into where the bottleneck exists.

---

# 63. BOTTLENECK DETECTION

Examples:

### High prospects, low qualification

Research problem.

### High outreach, low responses

Targeting or messaging problem.

### High responses, low meetings

Qualification/conversation problem.

### High meetings, low proposals

Discovery/fit problem.

### High proposals, low closes

Commercial/product/pricing/decision problem.

This is significantly more useful than simply saying:

> “The team sent 400 messages.”

---

# 64. WEEKLY COMPANY LEARNING

At the end of each week, Company Core should surface:

### What is working?

- strongest vertical
- strongest channel
- strongest offer
- strongest team
- strongest message pattern

### What is not working?

- weak vertical
- poor channel
- low conversion stage
- repeated objection

### What should change?

- next week's target vertical
- messaging experiment
- product focus
- team allocation

---

# 65. EXPERIMENTS

The system should support controlled outreach experiments.

Example:

## Experiment

**Target:** Manufacturing businesses

**Hypothesis:**

Operational-growth messaging will outperform generic digital-transformation messaging.

**Variant A:**

Operations-focused outreach.

**Variant B:**

Website/digital-system-focused outreach.

Track:

- leads
- outreach
- responses
- meetings
- proposals
- closures

This turns the intern operation into a learning engine.

---

# 66. COMPANY DIRECTION HISTORY

Every Founder-issued direction should be stored.

Example:

### Week 1

Focus retail.

### Week 2

Shift to manufacturing.

### Week 3

Focus Verity Trade.

### Week 4

Test hospitality + Agency.

This allows management to understand why performance changed.

---

# 67. NOTIFICATIONS

Notifications should be meaningful.

## Junior

- task due
- follow-up due
- follow-up overdue
- target progress
- Senior feedback
- meeting reminder
- Founder/Senior escalation response

## Senior

- intern missing check-in
- overdue follow-ups
- high-priority lead
- attribution conflict
- proposal request
- weekly report pending

## Company Core

- major opportunity
- team performance issue
- major pipeline movement
- strategic lead
- serious attribution issue
- company target risk

Avoid notification spam.

---

# 68. PERMISSIONS

## Company Core / Founders

Can:

- view all data
- create company direction
- set company targets
- view all teams
- view all leads
- view all activity
- view performance
- review attribution
- manage high-level pipeline
- intervene
- export/report as authorized

## Senior Outreach Officer

Can:

- view team data
- create team targets
- manage team tasks
- review team leads
- review outreach
- coach team members
- submit weekly report
- escalate
- view team performance

Should not automatically have unrestricted access to other teams.

## Junior Outreach Officer

Can:

- view own workspace
- create/manage own leads
- log outreach
- update own activities
- complete check-ins
- view assigned tasks
- see relevant team direction

Should not:

- modify another person's lead
- change attribution
- modify team/company targets
- view sensitive company-wide data unless explicitly authorized

---

# 69. DATA OWNERSHIP

The company owns the operational acquisition data.

The system should preserve:

- historical activity
- ownership
- attribution
- communication history
- pipeline stages

A person's departure should not destroy company knowledge.

---

# 70. REPORTING REPLACEMENT MODEL

Current:

```text
Intern
 ↓
Excel
 ↓
Email
 ↓
Senior manually reads
 ↓
Senior creates report
 ↓
Founders read
```

Target:

```text
Intern
 ↓
Verity activity
 ↓
Automatic daily metrics
 ↓
Daily check-in
 ↓
Team dashboard
 ↓
Automatic weekly aggregation
 ↓
Senior assessment
 ↓
Company Core
```

Email can remain as a notification/communication layer if desired, but the **system of record should be Verity**.

---

# 71. EMAIL INTEGRATION

If email reporting remains required, Verity can generate:

### Daily email

**Subject:**
Daily Client Acquisition Report — [Name] — [Date]

Body can automatically contain:

- work summary
- leads
- outreach
- follow-ups
- responses
- meetings
- proposals
- closures
- best opportunity
- blocker
- next priority

The data should come from Verity.

The intern should not manually retype numbers.

---

# 72. WEEKLY EMAIL INTEGRATION

Generate:

**Weekly Client Acquisition Report — [Name] — Week [X]**

Then Senior receives team roll-up.

The Company Core can generate the company summary.

Email becomes a delivery format, not the database.

---

# 73. LEAD CREATION FLOW

Recommended Junior flow:

```text
+ ADD PROSPECT
      ↓
Company
      ↓
Contact
      ↓
Industry
      ↓
Agency / Verity / Both
      ↓
Why Relevant?
      ↓
Problem / Opportunity
      ↓
Buying Signal
      ↓
Assign / Owner
      ↓
SAVE
```

The system should keep this fast.

Do not force a Junior to complete 40 fields before creating a lead.

Use:

### Required at creation

- Company
- Website or identifying information
- Industry
- Track
- Why relevant
- Owner

### Required before outreach

- Contact
- Channel
- First outreach

### Required after qualification

- Problem
- Trigger
- Authority
- Timing
- Next action

---

# 74. OUTREACH FLOW

```text
OPEN LEAD
 ↓
CONTACT
 ↓
CHANNEL
 ↓
MESSAGE
 ↓
SEND
 ↓
LOG ACTIVITY
 ↓
NEXT ACTION
 ↓
FOLLOW-UP
```

The next action should be created automatically where appropriate.

---

# 75. MEETING FLOW

When a meeting is booked:

- create meeting record
- link to lead
- record date/time
- record participants
- record purpose
- show preparation checklist

After meeting:

### Meeting outcome

- qualified
- proposal requested
- follow-up
- not fit
- no decision
- Founder escalation

### Notes

What was learned?

### Next action

What happens next?

---

# 76. PROPOSAL FLOW

When proposal is required:

- proposal status
- requested date
- owner
- value
- scope summary
- proposal sent date
- next action

Do not mark as closed.

Only qualifying advance payment moves it to:

> **Closed**

---

# 77. DEAL FLOW

Deal record should include:

- lead
- company
- owner
- team
- Agency/Verity
- project
- estimated value
- proposal value
- advance required
- advance received
- closed date
- attribution

Only authorized users should confirm payment-related closure.

---

# 78. COMPENSATION VIEW

Because compensation is performance-based, authorized users may have:

### Intern

> My qualifying closed clients

### Senior

> My team's qualifying closures

### Company Core

> Company compensation exposure

Do not expose compensation data unnecessarily to other team members.

---

# 79. COMPENSATION RULE

The system must reflect the Internship Agreement.

Junior:

> **15% on qualifying clients personally closed.**

Senior:

> **10% on qualifying clients closed by members of their team**, according to the Agreement.

No guaranteed stipend/salary.

No compensation based merely on:

- leads
- outreach
- meetings
- proposals

Closure must meet the Agreement's advance-payment definition.

---

# 80. COMMERCIAL ESCALATION

The system should allow an intern to mark:

> **Needs Commercial Review**

Reasons:

- pricing request
- discount request
- custom scope
- large opportunity
- enterprise opportunity
- unusual requirement
- negotiation
- contract question

This should notify the relevant Senior/authorized person.

---

# 81. TECHNICAL ESCALATION

Reasons:

- custom integration
- complex workflow
- API requirement
- mobile app
- advanced AI
- security requirement
- data migration
- custom Verity module

The intern should not promise implementation details.

---

# 82. AGENCY SERVICE ORIENTATION

Agency is the PlotArmour business focused on creating online systems and digital solutions for businesses.

Interns should recognize opportunities around:

- websites
- web applications
- mobile apps
- e-commerce
- portals
- dashboards
- automation
- integrations
- custom digital products
- branding
- design
- content
- growth
- AI
- launch systems

The system should not require the Junior to memorize every service.

The objective is recognizing business problems.

---

# 83. VERITY ORIENTATION

Verity is relevant where businesses have interconnected recurring workflows.

Examples:

- customers
- leads
- quotations
- sales
- purchasing
- inventory
- production
- quality
- projects
- workforce
- finance
- documents
- approvals
- analytics
- automation
- AI

The system should help the intern identify these signals.

---

# 84. INTERNAL PRICING

The uploaded PlotArmour pricing workbook contains internal reference prices.

These should be available only to authorized users.

Examples include Agency packages and Verity packages.

Pricing should be:

- internal
- reference
- permission-controlled
- non-negotiable by default

Interns must not invent:

- discounts
- custom pricing
- final scope
- timelines
- guarantees

---

# 85. AI ASSISTANCE

AI may eventually assist the system with:

- lead research summaries
- company summaries
- prospect qualification suggestions
- buying signal detection
- outreach drafting
- follow-up suggestions
- lead prioritization
- weekly report summaries
- vertical analysis

But AI should never automatically:

- send outreach without authorization
- invent facts
- invent business problems
- fabricate buying signals
- claim a client is closed
- determine compensation
- override attribution
- make commercial commitments

Human judgement remains required.

---

# 86. DATA QUALITY RULES

The system should detect:

- missing website
- missing contact
- missing track
- missing reason
- missing next action
- stale leads
- duplicate companies
- invalid stages
- closed deals without payment confirmation
- opportunities with no owner

Use warnings rather than blocking every workflow.

---

# 87. LEAD HEALTH

Each lead can have a health indicator:

### Healthy

Recent activity + clear next action.

### Stale

No activity for configured period.

### At Risk

Follow-up overdue or prospect unresponsive after sequence.

### Hot

Positive response / meeting / proposal.

### Closed

Advance payment received.

---

# 88. TEAM HEALTH

Each team can have:

- target progress
- activity consistency
- response rate
- meeting conversion
- proposal conversion
- close rate
- overdue actions
- lead quality

This gives the Senior a real management view.

---

# 89. COMPANY HEALTH

Company Core can show:

### Acquisition Health

**Green**

Pipeline healthy.

**Yellow**

Target risk or bottleneck.

**Red**

Major execution issue.

The system should explain the reason rather than simply display a color.

---

# 90. PERFORMANCE REVIEW

The system should allow Senior/Founders to review:

- activity
- quality
- conversion
- consistency
- communication
- commercial output

Performance history should be longitudinal.

Do not judge an intern solely on one bad day.

---

# 91. PROMOTION SUPPORT

The system can provide evidence for movement from:

**Client Acquisition Intern**

to:

**Junior Outreach Officer**

and potentially:

**Senior Outreach Officer**

based on:

- consistency
- lead quality
- communication
- pipeline ownership
- commercial judgement
- closed opportunities
- team-management ability for Senior

Promotion remains a leadership decision.

---

# 92. FIRST-WEEK ONBOARDING

The system should guide a new intern.

## Day 1

- account setup
- read Agreement
- read handbook
- understand Agency
- understand Verity
- view company direction

## Day 2

- learn prospect research
- learn lead creation
- learn qualification

## Day 3

- practice outreach
- create sample leads

## Day 4

- complete 10 → 3 → 1 → 100 assignment

## Day 5

- review with Senior
- begin controlled outreach

---

# 93. THE 10 → 3 → 1 → 100 ASSIGNMENT

Every intern should complete:

### Find 10 businesses

Identify 10 potential PlotArmour prospects.

For each:

- company
- website
- industry
- Agency / Verity / Both
- why relevant
- problem/opportunity
- buying signal
- likely decision maker

### Pick top 3

Explain why.

### Write 1 first outreach

Personalized.

### Write 1 follow-up

For 3–4 days later if no response.

### Explain how to find 100 more

Demonstrate scalable prospecting thinking.

The system can provide an onboarding task form for this.

---

# 94. THE CORE OPERATING LOOP

The complete workflow should be:

```text
COMPANY DIRECTION
       ↓
TEAM TARGET
       ↓
INDIVIDUAL TARGET
       ↓
RESEARCH
       ↓
LEAD
       ↓
QUALIFICATION
       ↓
OUTREACH
       ↓
FOLLOW-UP
       ↓
RESPONSE
       ↓
DISCOVERY
       ↓
MEETING
       ↓
PROPOSAL
       ↓
ADVANCE PAYMENT
       ↓
CLOSED
```

Every stage creates data.

Every stage informs management.

---

# 95. MANAGEMENT LOOP

```text
EXECUTION
    ↓
DATA
    ↓
DASHBOARD
    ↓
INSIGHT
    ↓
COACHING
    ↓
NEW DIRECTION
    ↓
EXECUTION
```

This is the reason the system should live inside Verity rather than in Excel.

---

# 96. WHAT NOT TO BUILD YET

For the current phase, do NOT expand into:

- employee HR management
- payroll
- leave management
- attendance systems
- engineering project management
- client project delivery
- procurement
- general company finance
- general CRM unrelated to acquisition

The system is specifically:

> **PlotArmour Outreach Team Management**

Keep the scope focused.

---

# 97. MVP MODULES

The first production version should include:

## 1. Company Core

- company dashboard
- company direction
- company targets
- all-team performance
- pipeline
- alerts

## 2. Teams

- teams
- Senior
- Junior members
- team targets
- team dashboard

## 3. Leads

- lead database
- lead records
- ownership
- track
- qualification
- stages

## 4. Outreach

- activity log
- channels
- messages
- follow-ups
- timeline

## 5. Tasks

- individual tasks
- follow-up tasks
- team tasks

## 6. Daily Check-in

- automatic metrics
- qualitative report
- submission tracking

## 7. Weekly Reports

- automatic aggregation
- Senior assessment
- Company Core roll-up

## 8. Pipeline

- stages
- values
- next actions
- closed status

## 9. Performance

- activity
- quality
- conversion
- targets

## 10. Attribution

- ownership
- history
- conflict handling
- audit trail

---

# 98. SECOND-PHASE FEATURES

After MVP:

- automated lead scoring
- AI research
- AI outreach suggestions
- message experiments
- advanced analytics
- duplicate detection
- funnel analytics
- vertical intelligence
- channel intelligence
- automated email reports
- advanced alerts
- performance trends

---

# 99. THIRD-PHASE FEATURES

Potentially:

- automated prospect discovery
- external lead-source integrations
- outreach integrations
- email integration
- LinkedIn workflow support where permitted
- advanced forecasting
- revenue attribution
- intelligent prioritization
- AI sales coach
- automated weekly intelligence briefing

These should not block the initial system.

---

# 100. UX PRINCIPLE

The three roles should feel like three different products.

## Junior

**“Tell me what I need to do.”**

## Senior

**“Show me whether my team is executing.”**

## Company Core

**“Tell me what is happening and what I should change.”**

Same data.

Different experience.

---

# 101. JUNIOR UX

Prioritize:

- Today
- My Tasks
- My Leads
- Follow-ups
- My Targets
- Daily Check-in

Do not overwhelm them with company-wide analytics.

---

# 102. SENIOR UX

Prioritize:

- Team performance
- Team target
- Member status
- Lead quality
- Follow-up risk
- Hot opportunities
- Coaching
- Weekly report

---

# 103. COMPANY CORE UX

Prioritize:

- Company performance
- Direction
- Teams
- Pipeline
- Opportunities
- Problems
- Market intelligence
- Conversion
- Strategic decisions

---

# 104. VISUAL LANGUAGE

The system should feel like a serious internal operating system.

Avoid:

- excessive gamification
- childish badges
- loud sales colors
- generic SaaS dashboard styling
- unnecessary charts

Use:

- clean typography
- clear hierarchy
- compact information density
- strong tables
- useful charts
- status indicators
- restrained colors
- excellent spacing
- clear action buttons

---

# 105. COMMAND CENTER DESIGN

Company Core should feel closer to:

> **Operations Room**

than:

> **Sales CRM**

It should communicate:

> “This is where PlotArmour understands and directs acquisition.”

---

# 106. TEAM COMMAND DESIGN

Team Leader should feel like:

> **Manager's cockpit**

It should show:

- target
- people
- work
- pipeline
- exceptions

without unnecessary company-wide information.

---

# 107. JUNIOR DESIGN

Junior should feel like:

> **Daily work console**

Opening it should immediately answer:

1. What is my target?
2. What do I need to do?
3. Who do I need to follow up with?
4. What opportunities are active?
5. Have I submitted today's check-in?

---

# 108. DATA RELATIONSHIP MODEL

Core entities:

```text
Company
  │
  ├── Teams
  │      │
  │      └── Users
  │
  ├── Leads
  │      │
  │      ├── Contacts
  │      ├── Activities
  │      ├── Tasks
  │      ├── Meetings
  │      ├── Proposals
  │      └── Deals
  │
  ├── Targets
  │
  ├── Reports
  │
  └── Directions
```

---

# 109. KEY ENTITY RELATIONSHIPS

### User

belongs to:

- team
- role

### Team

has:

- leader
- members
- targets

### Lead

has:

- company
- contact
- owner
- team
- activities
- tasks
- pipeline stage

### Activity

belongs to:

- lead
- user
- channel
- date/time

### Deal

belongs to:

- lead
- owner
- team
- product track

### Report

belongs to:

- user/team
- period

---

# 110. AUDITABILITY

The system should be designed so that management can reconstruct:

> **What happened to this lead?**

from creation to closure.

No important historical event should disappear because someone edited a field.

---

# 111. ACCOUNTABILITY WITHOUT MICROMANAGEMENT

The system is not intended to spy on interns.

It is intended to create:

- clarity
- accountability
- coaching
- fairness
- transparency

The distinction:

> **Track work, not people for the sake of tracking people.**

The company needs enough information to know whether the acquisition operation is functioning.

---

# 112. THE MOST IMPORTANT ACCOUNTABILITY PRINCIPLE

If an intern says:

> “I contacted 30 companies.”

The system should allow the Senior to answer:

> Which 30?

Then:

> Who did you contact?

Then:

> What did you send?

Then:

> What happened?

Then:

> What is the next action?

That chain is the core of the system.

---

# 113. THE MOST IMPORTANT MANAGEMENT PRINCIPLE

If a Senior says:

> “My team is working.”

Company Core should be able to verify:

- activity
- quality
- pipeline
- follow-ups
- meetings
- conversion

without relying solely on a verbal statement.

---

# 114. THE MOST IMPORTANT FOUNDER PRINCIPLE

Founders should not spend time checking whether interns filled spreadsheets.

They should spend time deciding:

- where the company should prospect
- what should be sold
- which opportunities matter
- which markets convert
- how the team should improve
- where leadership intervention is required

---

# 115. SUCCESS DEFINITION

The system succeeds if:

### Junior

Can execute daily acquisition work without administrative friction.

### Senior

Can manage 4–5 people without manually collecting spreadsheets.

### Company Core

Can understand the entire acquisition operation in minutes.

### PlotArmour

Can continuously improve targeting, messaging and commercial conversion.

---

# 116. FINAL PRODUCT PRINCIPLES

1. **One source of truth.**
2. **Role-based visibility.**
3. **Automatic aggregation.**
4. **Manual qualitative context.**
5. **Every lead is traceable.**
6. **Every meaningful outreach is traceable.**
7. **Every active opportunity has a next action.**
8. **Attribution is auditable.**
9. **Closed means advance payment received.**
10. **Quality matters more than raw volume.**
11. **Company direction flows downward.**
12. **Learning flows upward.**
13. **Seniors manage people; the system manages reporting.**
14. **Founders manage direction; the system provides intelligence.**
15. **Do not build unnecessary complexity into the first version.**

---

# 117. THE FINAL SYSTEM VISION

PlotArmour's outreach operation should eventually work like this:

```text
                    ┌─────────────────────────┐
                    │      COMPANY CORE       │
                    │                         │
                    │ Direction               │
                    │ Company Targets         │
                    │ Pipeline                │
                    │ Team Performance        │
                    │ Market Intelligence     │
                    │ Opportunities           │
                    │ Alerts                  │
                    └────────────┬────────────┘
                                 │
                  ┌──────────────┴──────────────┐
                  │                             │
         ┌────────▼────────┐          ┌────────▼────────┐
         │   TEAM ALPHA    │          │    TEAM BETA    │
         │                 │          │                 │
         │ Target          │          │ Target          │
         │ Members         │          │ Members         │
         │ Pipeline        │          │ Pipeline        │
         │ Coaching        │          │ Coaching        │
         └────────┬────────┘          └────────┬────────┘
                  │                            │
            ┌─────┼─────┐                ┌────┼─────┐
            │     │     │                │    │     │
           JR    JR    JR               JR   JR    JR
            │     │     │                │    │     │
            └─────┴─────┴────────────────┴────┴─────┘
                          │
                          ▼
                  ONE LEAD DATABASE
                          │
                          ▼
                  ONE ACTIVITY HISTORY
                          │
                          ▼
                    ONE PIPELINE
                          │
                          ▼
                    ONE TRUTH
```

The strategic goal is not simply to digitize the current spreadsheet.

The goal is to create a **real operating system for PlotArmour's acquisition function**.

The Junior executes.

The Senior manages.

Company Core directs.

Verity connects the entire loop.

---

# 118. CORE PHILOSOPHY

> **Do not hunt for people to sell something to. Hunt for businesses with problems worth solving.**

The system should reinforce that philosophy at every level.

A lead is not valuable because it exists.

A lead is valuable because:

- it is relevant
- there is a real business problem
- there is a reason to act
- PlotArmour has a credible fit
- the right person can be reached
- the opportunity can progress

The purpose of the system is therefore not:

> **“How many messages did we send?”**

It is:

> **“How effectively are we turning researched business opportunities into real conversations and eventually closed clients?”**

---

# 119. BUILD PRIORITY

When implementing this inside Verity, prioritize in this order:

### P0 — Must work

- authentication/roles
- Company Core
- Teams
- Users
- Leads
- Ownership
- Outreach activity
- Follow-ups
- Targets
- Daily check-in
- Weekly reports
- Pipeline
- Closed status
- Audit history

### P1 — High value

- alerts
- lead quality
- team coaching
- funnel analytics
- vertical analytics
- Agency/Verity reporting
- duplicate detection

### P2 — Intelligence

- AI research
- AI qualification
- AI message suggestions
- experiments
- automated insights
- forecasting

Do not allow P2 intelligence to delay the operational foundation.

---

# 120. ONE-LINE PRODUCT DEFINITION

> **Verity's PlotArmour Outreach Team module is a role-based acquisition operating system that connects Founder direction, team targets, individual execution, lead intelligence, outreach history, pipeline progression and performance into one auditable source of truth.**
