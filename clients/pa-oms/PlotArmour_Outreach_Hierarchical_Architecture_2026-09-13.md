# PlotArmour Outreach — Hierarchical Operating & Reporting Architecture

**Status: AUTHORITATIVE, supersedes the role-view framing in
`PlotArmour_Outreach_Team_Management_System_Master_Context.md` wherever the
two conflict.** Given by the user 2026-09-13 as an explicit architecture
correction after the "build all 5" role-based settings batch shipped. The
master-context doc's 120 sections remain authoritative for anything this
document doesn't address (state machine, rejection taxonomy, attribution
windows, etc.) — this document narrows and reframes the **authority model**
and **information architecture**, it does not replace the domain rules.
Handbook Ch. 00's authority order (Internship Agreement > approved
commercial info > handbook > leadership instructions) is unaffected; this
document is Verity build guidance, same rank as the master-context doc it
corrects.

Verbatim text of the user's direction follows.

---

Yes. With this clarification, I would change the architecture quite significantly.

This should **not be a generic "intern CRM."** It should be a **hierarchical operating and reporting system for PlotArmour's outreach organisation**, where:

* **Company Core observes, analyses, judges and directs at a company level.**
* **Team Leaders own execution completely.**
* **Junior Interns execute the work and report everything through Verity.**
* **WhatsApp becomes an exception/escalation channel, not the operating system.**

The most important principle is:

> **Core should know everything, but should not manage everyone. Team Leaders should manage their teams completely. Juniors should have very little ambiguity about what they need to do each day.**

---

# 1. THE ORGANISATIONAL MODEL

Current structure:

```text
                         COMPANY CORE
                  Divo · Naksh · Ayush · Shubhankar
                              │
               ┌──────────────┴──────────────┐
               │                             │
               ▼                             ▼
        TEAM 1 — KULSOOM              TEAM 2 — RADHIKA
        Team Leader                   Team Leader
               │                             │
       ┌───────┼────────┐            ┌───────┼────────┐
       │       │        │            │       │        │
      JR      JR       JR           JR      JR       JR
       │       │        │            │       │        │
       └───────┴────────┘            └───────┴────────┘
```

There are **three fundamentally different experiences** inside Verity.

---

# 2. ROLE 1 — COMPANY CORE

### People

* Divo
* Naksh
* Ayush
* Shubhankar

## Their job

Core is **not another layer of daily management**.

Core exists to answer:

> **"How is the entire acquisition organisation performing, where are the problems, what are we learning, and what should the company do next?"**

Core should primarily:

* view
* analyse
* compare
* judge
* identify patterns
* review Team Leaders
* review intern performance
* review pipeline
* review acquisition quality
* review reporting discipline
* issue high-level company direction

Core should **not** routinely:

* assign an intern's daily task
* chase an intern
* approve every lead
* tell a Junior whom to contact
* manage individual follow-ups
* collect daily reports
* manage a team's day-to-day work

That belongs to the Team Leader.

---

# 3. CORE'S MENTAL MODEL

The Core dashboard should answer five questions:

### 1. Are teams working?

Activity and reporting.

### 2. Are teams working on the right things?

Lead quality, industries, Agency/Verity fit.

### 3. Is the work producing results?

Responses → meetings → proposals → closures.

### 4. Which Team Leaders are managing well?

Team performance + discipline + pipeline quality.

### 5. What should PlotArmour change?

Direction, priorities, verticals, messaging, resource allocation.

---

# 4. CORE HOME PAGE

The first page should be:

# COMPANY CORE

Not a CRM.

Not a task list.

Not a giant spreadsheet.

A **management intelligence dashboard**.

---

## Top: Company pulse

```text
OUTREACH ORGANISATION

Active Teams             2
Active Interns           13
Leads This Week          182
Outreach                 426
Follow-ups               138
Responses                 47
Meetings                  16
Proposals                  7
Active Pipeline          ₹X
Closed Deals               X
```

Then a time selector:

**Today | This Week | This Month | Custom**

---

# 5. CORE — TEAM COMPARISON

Immediately underneath:

|            |  Team 1 |  Team 2 |
| ---------- | ------: | ------: |
| Leader     | Kulsoom | Radhika |
| Members    |       7 |       6 |
| Target     |       X |       X |
| Leads      |       X |       X |
| Outreach   |       X |       X |
| Follow-ups |       X |       X |
| Responses  |       X |       X |
| Meetings   |       X |       X |
| Proposals  |       X |       X |
| Pipeline   |      ₹X |      ₹X |
| Closed     |       X |       X |

Clicking a team opens **Team Performance**, not the Team Leader's management interface.

Core is looking at the team from above.

---

# 6. CORE — ATTENTION / JUDGEMENT

This should be one of the most important sections.

Instead of making Core inspect everything manually, Verity should surface exceptions.

### Example:

## Requires Attention

**Team 1**

* 2 members consistently below weekly activity target
* 14 overdue follow-ups
* lead quality declining

**Team 2**

* excellent outreach volume
* response rate below company average
* 8 opportunities have no recent next action

**Organisation**

* Manufacturing conversion significantly above Retail
* Verity opportunities converting better than Agency
* 3 high-value opportunities require leadership attention

Core can then investigate.

---

# 7. CORE — INDIVIDUAL PERFORMANCE

Core should be able to drill down:

**Company → Team → Person**

But this should be primarily **analytical**.

Example:

### Shreya Bansal

**Team:** Kulsoom
**Role:** Junior Outreach Officer

#### Performance

* Leads: 42
* Qualified: 31
* Outreach: 96
* Follow-ups: 33
* Responses: 14
* Meetings: 5
* Proposals: 2
* Closed: 1

#### Quality

* Lead quality
* research completeness
* response rate
* meeting conversion
* follow-up discipline
* reporting consistency

#### Trend

Show the last 4–6 weeks.

Core should be able to determine:

> **Is this intern improving, declining, consistent, or simply generating volume without results?**

---

# 8. CORE SHOULD SEE THE ACTUAL WORK

This is critical.

Core shouldn't just see:

> Shreya — 96 outreach

They should be able to click:

> **96 outreach**

and see the underlying activity.

Then:

> Company → Contact → Message → Response → Follow-up → Outcome

This maintains accountability without requiring Core to micromanage.

---

# 9. CORE — REPORTING DISCIPLINE

Because daily reporting is a core requirement, Core should see:

### Reporting Health

```text
Daily reports expected     13
Submitted                   12
Missing                      1

Weekly team reports expected 2
Submitted                     1
```

But the first person responsible for missing reports should be the **Team Leader**, not Core.

Core sees the issue.

Team Leader handles it.

---

# 10. CORE — WEEKLY REVIEW

Core should primarily receive **weekly team reports**, not 13 individual reports.

Every weekend:

### Team 1 — Weekly Report

Submitted by Kulsoom.

### Team 2 — Weekly Report

Submitted by Radhika.

Core reviews both.

The system should automatically attach all supporting data.

So Core can click:

> **Team 1 Weekly Report**

and inspect the evidence behind it.

---

# 11. CORE — DIRECTION

Core can issue **company-level direction**, but not individual daily instructions.

For example:

> ### Week 4 Company Direction
>
> **Primary market:** Manufacturing
> **Primary opportunity:** Verity
> **Secondary:** Agency
> **Priority:** Businesses with fragmented operational workflows
> **Focus:** Mid-sized businesses
> **Target:** 150 qualified prospects

That direction becomes visible to Team Leaders.

---

# 12. CORE'S AUTHORITY

Core can:

* create company direction
* set company-wide priorities
* view all teams
* view all people
* view all leads
* view all pipeline
* evaluate Team Leaders
* evaluate interns
* review reports
* identify systemic problems
* review attribution
* make strategic decisions

Core normally does **not**:

* assign daily intern work
* manage individual intern schedules
* edit team targets
* chase follow-ups
* conduct routine lead reviews
* approve individual outreach messages

---

# 13. ROLE 2 — TEAM LEADER

This is the **most important role in the system**.

Kulsoom and Radhika are not report collectors.

They are **owners of their respective acquisition teams**.

Their responsibility is:

> **Take company direction and turn it into daily team execution.**

---

# 14. TEAM LEADER AUTHORITY

The Team Leader should own:

* team strategy
* team target
* individual targets
* prospecting priorities
* vertical allocation
* daily work allocation
* lead quality
* outreach quality
* follow-ups
* team pipeline
* coaching
* performance management
* team reporting
* escalation to Core

If a Junior has a problem, the default route is:

> **Junior → Team Leader**

not:

> Junior → Founders.

---

# 15. TEAM LEADER HOME PAGE

Their homepage should be:

# TEAM COMMAND

Example:

> **Team Kulsoom**
>
> Week: 14–20 September

### Team Target

**150 qualified prospects**

### Current

**127 / 150**

**84.7%**

Then:

### Team Health

* Activity: 🟢
* Lead quality: 🟢
* Follow-up discipline: 🟡
* Conversion: 🟢
* Reporting: 🟢

---

# 16. TEAM LEADER — MEMBER TABLE

The most important table:

| Intern   | Target | Leads | Outreach | Follow-ups | Responses | Meetings | Status |
| -------- | -----: | ----: | -------: | ---------: | --------: | -------: | ------ |
| Shreya   |     25 |    24 |       51 |         13 |         6 |        2 | 🟢     |
| Prakhar  |     25 |    21 |       46 |         11 |         5 |        1 | 🟢     |
| Hikari   |     25 |    19 |       42 |          9 |         3 |        1 | 🟡     |
| Mehak    |     25 |    25 |       55 |         16 |         7 |        3 | 🟢     |
| Abhishek |     25 |    16 |       31 |          7 |         2 |        0 | 🔴     |
| Nishika  |     25 |    22 |       48 |         14 |         5 |        2 | 🟢     |
| Khushboo |     25 |    20 |       39 |         10 |         4 |        1 | 🟡     |

Clicking a person opens their complete workspace from the leader's perspective.

---

# 17. TEAM LEADER — DAILY REPORTS

This should be a dedicated page.

# DAILY REPORTS

```text
TODAY

7 / 7 members reported

Shreya       Submitted  ✓
Prakhar      Submitted  ✓
Hikari       Submitted  ✓
Mehak        Submitted  ✓
Abhishek     Submitted  ✓
Nishika      Submitted  ✓
Khushboo     Submitted  ✓
```

The Senior should be able to open each report.

---

# 18. DAILY REPORT SHOULD BE DEEP

The Junior isn't just saying:

> "Did outreach."

The daily report should capture:

### Automatically generated

* leads created
* qualified leads
* outreach
* follow-ups
* responses
* meetings
* proposals
* closed deals
* tasks completed

### Intern-written

**1. What did you work on today?**

Detailed but concise.

**2. What were your most important prospects?**

Select 1–3.

**3. What happened with them?**

Context.

**4. What did you learn?**

**5. What did not work?**

**6. What blocker do you have?**

**7. What is tomorrow's priority?**

---

# 19. TEAM LEADER REVIEWS DAILY REPORT

The Senior can:

### Mark

* Reviewed
* Needs clarification
* Needs correction
* Needs coaching

### Add private team note

Example:

> "Your prospect research is strong. Increase follow-up discipline tomorrow."

The Junior sees the appropriate feedback.

Core can see that the Senior reviewed it.

This creates a management chain.

---

# 20. DAILY REPORT STATUS

Every report should have:

**Not Started**

↓

**In Progress**

↓

**Submitted**

↓

**Reviewed**

↓

**Needs Clarification**

↓

**Resolved**

This is much better than emails sitting in inboxes.

---

# 21. TEAM LEADER — TARGET MANAGEMENT

Senior should have:

# TARGETS

They can define:

### Team target

Example:

> 150 qualified prospects / week

Then distribute:

| Intern  | Leads | Outreach | Follow-ups |
| ------- | ----: | -------: | ---------: |
| Shreya  |    25 |       60 |         20 |
| Prakhar |    25 |       60 |         20 |
| Hikari  |    20 |       50 |         20 |
| ...     |   ... |      ... |        ... |

Targets should be editable by the Team Leader.

Core can view them.

---

# 22. TARGETS SHOULD NOT BE STATIC

The Senior should be able to adjust based on reality.

For example:

> Hikari has a university commitment today.

Senior can adjust today's target.

The system records:

**Original target → adjusted target → reason → who changed it → timestamp**

This prevents arbitrary target manipulation.

---

# 23. TEAM LEADER — WORK ALLOCATION

Senior should be able to say:

### This week

**Shreya**

* Manufacturing
* Verity

**Prakhar**

* Retail
* Agency

**Hikari**

* Hospitality
* Agency

etc.

This becomes visible in the Junior's workspace.

---

# 24. JUNIOR ROLE

The Junior should have one simple responsibility:

> **Execute the acquisition work assigned by the Team Leader and document it completely.**

They should not have to figure out organisational strategy.

They need to know:

* what market to work
* what solution to look for
* how many prospects to research
* how many people to contact
* who to follow up with
* what meetings are coming
* what their targets are

---

# 25. JUNIOR HOME PAGE

The first page:

# MY DAY

### Team Direction

> Focus this week: Manufacturing
> Product: Verity

### Today's Targets

**2 / 3**

Qualified prospects

**8 / 10**

Outreach

**4 / 5**

Follow-ups

---

# 26. JUNIOR — TODAY'S TASKS

```text
TODAY

□ Research 3 manufacturing companies
□ Contact 5 decision-makers
□ Follow up with ABC Manufacturing
□ Follow up with XYZ Industries
□ Update meeting notes
□ Complete daily report
```

The user should not need to search through the system to understand what to do.

---

# 27. JUNIOR — MY LEADS

A simple list:

| Company | Track  | Stage     | Last Contact | Next Action |
| ------- | ------ | --------- | ------------ | ----------- |
| ABC     | Verity | Positive  | 18 Sep       | Follow-up   |
| XYZ     | Agency | Contacted | 17 Sep       | Follow-up   |
| DEF     | Verity | Meeting   | 18 Sep       | Prepare     |

---

# 28. JUNIOR — LEAD PAGE

This is where the actual acquisition work happens.

### Company

ABC Manufacturing

### Opportunity

Verity

### Research

What the intern discovered.

### Contact

Decision maker.

### Why relevant

Specific reason.

### Buying signal

Specific evidence.

### Current stage

Positive Response

### Next action

Discovery call

### Next action date

18 Sep

---

# 29. JUNIOR — OUTREACH

When they contact someone:

**Log Outreach**

* LinkedIn
* Email
* WhatsApp
* Call
* Referral

Then:

### Message

Paste actual message.

### Context

Why this message was sent.

### Outcome

Pending / replied / interested / etc.

### Next action

Follow-up date.

This is the operational record.

---

# 30. NO "FAKE REPORTING"

The system should calculate:

> Outreach = number of outreach activities actually logged.

Not:

> Intern typed "23" into a daily report.

That distinction is critical.

---

# 31. DAILY REPORT MECHANISM

Every working day:

### Morning

Junior sees:

> Today's targets + tasks.

### During day

They create:

* leads
* activities
* follow-ups
* meetings

### End of day

Verity calculates activity.

Junior fills qualitative context.

### Submit

Report goes to Team Leader.

### Team Leader

Reviews.

### Core

Can see reporting status, but does not need to intervene.

---

# 32. WEEKLY MECHANISM

This is where the hierarchy becomes very clear.

### Monday

Core direction is active.

↓

Team Leaders translate it into team targets.

↓

Juniors execute.

↓

Daily reports go to Team Leaders.

↓

Team Leaders review and coach.

↓

End of week:

Verity aggregates team data.

↓

Senior writes team assessment.

↓

Senior submits weekly report.

↓

Core reviews.

---

# 33. CORE DOES NOT GET 13 WEEKLY REPORTS

This is important.

Core should get:

**2 team reports.**

Not:

**13 intern reports.**

But Core can drill into any supporting data if something looks wrong.

So:

> **Summary first, evidence on demand.**

---

# 34. TEAM WEEKLY REPORT

Senior sees automatically:

### Performance

* team target
* actual
* leads
* outreach
* follow-ups
* responses
* meetings
* proposals
* closures

### Quality

* qualified %
* response %
* meeting conversion
* lead quality

### People

Who performed.

### Pipeline

Top opportunities.

Then Senior writes:

### Team assessment

**What worked?**

**What didn't?**

**Strongest member?**

**Weakest area?**

**Strongest opportunity?**

**Next week's focus?**

**Any escalation?**

Submit.

---

# 35. CORE WEEKLY REVIEW

Core sees:

# WEEKLY ACQUISITION REVIEW

### Company

Overall metrics.

### Team 1 — Kulsoom

Performance + Senior assessment.

### Team 2 — Radhika

Performance + Senior assessment.

Then:

# Core Assessment

Core can internally assess:

* Team 1 management
* Team 2 management
* overall acquisition
* strategy
* market signals

This assessment is not a replacement for Senior reporting.

---

# 36. CORE SHOULD JUDGE TEAM LEADERS

This is an important distinction.

Core isn't just judging interns.

It should be able to ask:

> **"Is Kulsoom managing her team well?"**

and:

> **"Is Radhika managing her team well?"**

Metrics might include:

### Team execution

Did the team hit targets?

### Team discipline

Are daily reports complete?

### Pipeline health

Are opportunities moving?

### Lead quality

Are prospects actually relevant?

### Coaching

Are weak performers improving?

### Conversion

Is activity turning into results?

---

# 37. TEAM LEADER PERFORMANCE

The Senior's performance should therefore not be:

> "How many messages did Kulsoom send?"

Instead:

> **"How effectively did Kulsoom run Team 1?"**

This can include:

* team target achievement
* average member performance
* team response rate
* meeting conversion
* pipeline growth
* follow-up discipline
* reporting discipline
* member improvement
* closed deals

---

# 38. THE ESCALATION SYSTEM

This should dramatically reduce WhatsApp.

Instead of:

> "Divo, I have a problem with this lead."

Create:

# ESCALATE

The Junior selects:

### Type

* Commercial
* Technical
* Client/Prospect issue
* Attribution
* Team issue
* Other

### Description

[Context]

### Lead

[Linked lead]

### Urgency

Normal / High / Critical

Then:

> **SUBMIT ESCALATION**

It goes to the Team Leader.

---

# 39. ESCALATION CHAIN

Default:

```text
Junior
   ↓
Team Leader
   ↓
Company Core
```

But Team Leader can resolve most issues.

Only important issues reach Core.

---

# 40. WHATSAPP ROLE

WhatsApp should become:

### Good for

* urgent communication
* meeting coordination
* emergencies
* quick clarification
* immediate alerts

### Not good for

* daily reports
* lead tracking
* task assignment
* prospect lists
* pipeline updates
* weekly reporting
* performance records
* attribution
* company decisions

The system should always push people toward:

> **"Record it in Verity."**

---

# 41. REDUCING WHATSAPP WITHOUT MAKING IT IMPOSSIBLE

Do not simply tell interns:

> "Don't use WhatsApp."

Instead:

### If something is operational:

**Verity.**

### If something is urgent:

**WhatsApp → then record relevant information in Verity.**

Example:

> "Prospect has suddenly asked for a proposal."

WhatsApp may be useful for immediate notification.

But the actual proposal opportunity belongs in Verity.

---

# 42. NOTIFICATIONS

Verity can replace many WhatsApp messages.

### Junior gets

* target changes
* assigned task
* follow-up reminder
* Senior feedback
* meeting reminder
* escalation response
* report reminder

### Senior gets

* missing report
* overdue follow-up
* high-priority lead
* escalation
* target risk
* new positive response
* proposal request

### Core gets

* weekly report
* major opportunity
* serious performance issue
* strategic market signal
* team-level risk

---

# 43. NOTIFICATION PHILOSOPHY

Do not create:

> "You have 17 notifications."

Create:

> **3 things need your attention.**

This keeps the system operationally useful.

---

# 44. LEAD OWNERSHIP

Every lead has:

* Created by
* Current owner
* Team
* Team Leader
* Created date
* Last activity
* Attribution history

Junior shouldn't be able to simply claim another intern's lead.

---

# 45. DUPLICATE LEADS

Before creating:

> **ABC Manufacturing**

Verity should search existing company records.

If found:

> Existing company found.

Show:

* owner
* team
* status
* last activity

This prevents two interns unknowingly contacting the same business.

---

# 46. CROSS-TEAM CONFLICT

If Team 1 and Team 2 contact the same business:

Verity should flag:

> **Potential cross-team conflict**

Both activity histories remain.

The system doesn't silently overwrite ownership.

Authorized leadership resolves attribution.

---

# 47. THE PIPELINE

The whole organisation should use one pipeline model:

```text
Research
 ↓
Qualified
 ↓
Contacted
 ↓
Follow-up
 ↓
Positive Response
 ↓
Discovery
 ↓
Meeting
 ↓
Proposal
 ↓
Negotiation
 ↓
Advance Pending
 ↓
Closed
```

With exits:

```text
Not Interested
No Response
Disqualified
```

---

# 48. LEAD QUALITY

The Team Leader should be able to review:

> **Why did you add this company?**

Required context:

### Why relevant?

### What problem do you suspect?

### What evidence?

### What buying signal?

### Agency / Verity?

This is what prevents interns from filling the system with random businesses.

---

# 49. BUSINESS RESEARCH & ANALYSIS

Your current workbook has:

> Business R&A

Keep this concept.

But instead of a numeric column, make it a **real activity**.

Example:

### Research Activity

**Company:** ABC Manufacturing

**Research completed:**

* website
* LinkedIn
* company size
* decision-maker
* product/service
* operational signals

**Opportunity hypothesis:**

Potential inventory/procurement workflow issue.

This is much more useful.

---

# 50. PERFORMANCE SHOULD BE FUNNEL-BASED

Don't rank interns simply by outreach.

Show:

```text
Prospects
  ↓
Qualified
  ↓
Outreach
  ↓
Responses
  ↓
Meetings
  ↓
Proposals
  ↓
Closed
```

Then compare people and teams based on the whole funnel.

---

# 51. EXAMPLE OF WHY THIS MATTERS

Intern A:

> 200 outreach
> 4 responses
> 0 meetings

Intern B:

> 90 outreach
> 15 responses
> 5 meetings
> 2 proposals

Raw activity says:

> A is better.

Actual acquisition says:

> B is dramatically better.

Verity should make this obvious.

---

# 52. TEAM LEADER SHOULD BE ABLE TO COACH FROM DATA

Example:

System tells Kulsoom:

> Shreya has excellent research quality but low response rate.

Kulsoom opens outreach.

She discovers:

> Messages are overly long.

She gives feedback.

Next week:

> Response rate improves.

Verity now shows:

**Coaching → change → result**

That's valuable organisational learning.

---

# 53. COMPANY CORE SHOULD SEE PATTERNS

Example:

Core notices:

> Both teams are getting better response rates from manufacturing than retail.

Core can issue:

> **Next week's direction: increase manufacturing prospecting.**

Team Leaders adapt.

This is the strategic feedback loop.

---

# 54. COMPANY → TEAM → INTERN

The final mechanism:

```text
CORE
Company direction
      ↓
TEAM LEADER
Interpretation + targets + allocation
      ↓
JUNIOR
Daily execution
      ↓
VERITY
Data + activity + reports
      ↓
TEAM LEADER
Review + coaching + correction
      ↓
WEEKLY REPORT
      ↓
CORE
Analysis + judgement
      ↓
NEW DIRECTION
```

That is the system.

---

# 55. WHAT EACH ROLE SEES

## COMPANY CORE

### Navigation

* Overview
* Teams
* People
* Pipeline
* Leads
* Performance
* Intelligence
* Weekly Reports
* Company Direction
* Audit / Attribution

### Primary action

**Review / Analyse / Direct**

---

## TEAM LEADER

### Navigation

* My Team
* Targets
* Daily Reports
* Team Leads
* Pipeline
* Tasks
* Coaching
* Weekly Report
* Escalations

### Primary action

**Manage / Assign / Review / Coach / Report**

---

## JUNIOR

### Navigation

* My Day
* My Tasks
* My Leads
* Outreach
* Follow-ups
* Meetings
* Reports

### Primary action

**Execute / Record / Report**

---

# 56. PERMISSION MODEL

This should be strict.

### Core

**All teams, all data, mostly read-only.**

Can create:

* company direction
* strategic priorities

### Senior

**Full ownership of own team.**

Can:

* create/edit targets
* assign work
* review members
* manage team leads
* coach
* resolve team issues
* submit weekly report

### Junior

**Own execution data.**

Can:

* create leads
* log activities
* update own pipeline
* complete tasks
* submit reports
* raise escalations

Cannot:

* change targets
* manage other interns
* modify attribution
* access other teams
* delete historical activities

---

# 57. "MOSTLY READ-ONLY" FOR CORE IS IMPORTANT

I would intentionally make Core's interface relatively restrained.

A Founder opening Company Core shouldn't see:

> **+ Assign Task**

everywhere.

They should see:

> **What's happening?**

and:

> **What needs my judgement?**

Core's actions should mostly be:

* issue direction
* review
* comment
* approve/escalate where necessary
* inspect
* analyse

That protects the management hierarchy.

---

# 58. SENIOR HAS THE OPERATIONAL AUTHORITY

If Shreya is under Kulsoom:

Shreya shouldn't be waiting for Divo to tell her what to do.

Kulsoom decides.

If Kulsoom needs guidance:

> Kulsoom → Core.

That keeps the company scalable.

---

# 59. DAILY MANAGEMENT LOOP

Every day:

### 9:00 AM

Junior opens Verity.

Sees:

> Targets
> Tasks
> Follow-ups
> Team direction

### During day

They execute.

### Throughout day

Verity records:

> Leads + Outreach + Follow-ups + Meetings.

### End of day

Junior submits report.

### Senior

Reviews team.

### Core

Does nothing unless something exceptional requires attention.

This is exactly how it should work.

---

# 60. WEEKLY MANAGEMENT LOOP

### Sunday / weekend

System closes the week's data.

### Juniors

Complete weekly reflection if required.

### Senior

Receives automatic team summary.

Writes:

> Team assessment + problems + next week's plan.

### Core

Reviews Team 1 + Team 2.

Then Core determines:

> What changes next week?

---

# 61. COMPANY CORE WEEKLY DECISION

Example:

### Observation

Manufacturing:

> 18% response rate

Retail:

> 6%

### Observation

Verity:

> 9 meetings

Agency:

> 4 meetings

### Decision

> Next week's primary focus = Manufacturing / Verity.

Core publishes direction.

Team Leaders receive it.

They distribute work.

And the cycle begins again.

---

# 62. THIS ALSO MAKES VERITY A REAL PRODUCT

There is a bigger strategic advantage here.

You are not merely building an internal intern dashboard.

You are testing Verity's fundamental promise:

> **A business has multiple people, teams, workflows, responsibilities and layers of management — Verity gives each layer exactly the information and control it needs while keeping the entire organisation connected.**

Your outreach team becomes the first real deployment.

---

# 63. MVP PAGE MAP

I would build the first version around these pages.

### Core

1. **Company Overview**
2. **Teams**
3. **Team Performance**
4. **People**
5. **Pipeline**
6. **Lead Database**
7. **Reports**
8. **Intelligence**
9. **Company Direction**

### Team Leader

10. **Team Command**
11. **Members**
12. **Targets**
13. **Daily Reports**
14. **Team Leads**
15. **Pipeline**
16. **Tasks**
17. **Coaching**
18. **Weekly Report**
19. **Escalations**

### Junior

20. **My Day**
21. **My Tasks**
22. **My Leads**
23. **My Pipeline**
24. **Outreach**
25. **Follow-ups**
26. **Meetings**
27. **Daily Report**

### Shared

28. **Lead Detail**
29. **Activity Timeline**
30. **Notifications**
31. **Profile / Account**

---

# 64. THE MOST IMPORTANT PAGE: LEAD DETAIL

All three roles see the same underlying lead, but with different capabilities.

### Core

Can inspect everything.

### Senior

Can manage team ownership, coaching and progression.

### Junior

Can update their own work and activity.

That is a good example of how Verity should handle permissions.

---

# 65. THE MOST IMPORTANT SYSTEM PRINCIPLE

I would put this directly into the product requirements:

> **No important operational information should live only in WhatsApp.**

If it affects:

* a lead
* a target
* an assignment
* a follow-up
* a meeting
* a proposal
* attribution
* a report
* performance

it belongs in Verity.

WhatsApp is for communication.

**Verity is the record.**

---

# 66. FINAL ROLE DEFINITIONS

### COMPANY CORE

> **Observe → Analyse → Judge → Direct**

Core sees the entire organisation and decides where PlotArmour should go.

### TEAM LEADER

> **Plan → Assign → Manage → Review → Coach → Report**

Senior owns the team completely.

### JUNIOR

> **Research → Contact → Follow Up → Progress → Record → Report**

Junior executes the acquisition work.

---

# 67. FINAL SYSTEM

The complete mechanism should ultimately feel like this:

```text
                         COMPANY CORE
              ┌─────────────────────────────┐
              │                             │
              │ SEE EVERYTHING              │
              │ ANALYSE                     │
              │ COMPARE                     │
              │ JUDGE TEAMS                 │
              │ JUDGE LEADERS               │
              │ IDENTIFY PATTERNS           │
              │ SET COMPANY DIRECTION       │
              └──────────────┬──────────────┘
                             │
                    COMPANY DIRECTION
                             │
             ┌───────────────┴───────────────┐
             │                               │
             ▼                               ▼
      KULSOOM / TEAM 1                RADHIKA / TEAM 2
             │                               │
       TEAM COMMAND                    TEAM COMMAND
             │                               │
       TARGETS / WORK                  TARGETS / WORK
             │                               │
       REVIEW / COACH                   REVIEW / COACH
             │                               │
      ┌──────┼──────┐                 ┌──────┼──────┐
      ▼      ▼      ▼                 ▼      ▼      ▼
     JR     JR     JR                JR     JR     JR
      │      │      │                 │      │      │
      └──────┴──────┘                 └──────┴──────┘
             │                               │
             └──────────────┬────────────────┘
                            ▼
                       VERITY DATA
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
           LEADS         ACTIVITY       REPORTS
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                     TEAM LEADER REVIEW
                            │
                            ▼
                     WEEKLY TEAM REPORT
                            │
                            ▼
                       COMPANY CORE
                            │
                            ▼
                     NEW DIRECTION
```

### The key design decision

**Do not build this as "Core + two different dashboards."**

Build it as **one connected operational system with a strict chain of responsibility**:

> **Core owns direction.**
> **Senior owns the team.**
> **Junior owns execution.**
> **Verity owns the record.**

That will make the system much more disciplined than the current Excel + email + WhatsApp workflow, while also giving you a very strong internal proof-of-concept for Verity itself.
