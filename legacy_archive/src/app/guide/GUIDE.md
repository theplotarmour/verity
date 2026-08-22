# Verity User Guide

Verity is one system for running an operation: the people, the work, the assets and the money. This guide is the single source of truth — the same file renders at `/guide` inside the app and reads as plain Markdown in the repository.

Not every section applies to you. Verity is modular, and your workspace only shows the modules your organisation is entitled to. If a screen described here is missing from your sidebar, that module is off — ask your administrator rather than looking for a hidden menu.

---

## Part One — Setup

Do this section once, in order. Each step depends on the one before it, and skipping ahead is the usual reason something later "doesn't show anything".

### 1.1 Master data first

Before any work can be recorded, the things work happens *to* have to exist.

- **Customers** (`Customers`, top bar) — every client you invoice or serve. A customer needs a name; everything else can wait. Add the GST number and billing address before you raise the first invoice, not after.
- **Team** (`Team`, top bar) — every person who logs in. Each gets a phone number and a 4-digit PIN. The phone number is the username.
- **Departments** (`Departments`, top bar) — for production workspaces, the stages a job moves through. Service workspaces can ignore this.
- **Item master** (`Master Data`) — for inventory and production workspaces: the things you buy, make and hold.

**Common mistake:** creating tickets or work orders before adding customers. You can, but they end up unattached, and no invoice can ever be built from them.

### 1.2 Sites — where work happens

A **Site** is a physical place belonging to a client: the guarded premises, the serviced building, the construction plot. It is not a warehouse. Warehouses locate *stock*; sites locate *work*.

Go to **Sites → New site**.

| Field | What it does |
|---|---|
| Site name | What people call it: "DLF Tower — Block A" |
| Client | Which customer owns this site |
| Site manager | The person accountable for it |
| Contract start / end | The engagement window |
| **SLA response (hours)** | The promise. Read the note below. |

**The SLA field is the most important one on this form.** When you raise a ticket or a work order at a site, Verity stamps a deadline onto it — creation time plus the site's SLA hours. That stamp is taken *once, at creation*. Changing a site's SLA later does not re-date work that already exists, which is deliberate: history should not move.

Leave it blank if the site has no SLA. A blank SLA means work raised there simply has no deadline, not a deadline of zero.

**Deploying staff.** Open a site and use **Deploy staff** on the Roster tab. A deployment is a posting: a person, a role on site ("Guard", "Housekeeper", "Technician" — free text, use your own vocabulary), optionally a shift, and a start date. Leave the end date blank for an open-ended posting.

Ending a posting keeps it in history under *Past postings*. Setting a site to **Terminated** ends every active posting on it automatically, so a closed site cannot keep inflating your headcount.

### 1.3 Scheduling — who works when

The **Shift** records in Settings are definitions only: a name and two clock times. They answer "what is the morning shift?" and nothing else. The calendar lives in **Scheduling**.

1. Define your shifts in Settings first. Scheduling cannot do anything without them, and the form will tell you so.
2. Go to **Scheduling**. The grid is one row per person, one column per day.
3. **Schedule shift** posts one person to one shift on one date, optionally at a site.
4. Once a week is right, **Copy week** repeats it into the following week. Existing entries are left alone, so re-running a copy is safe.

The grid only lists people who appear somewhere that week. Empty cells in a row are the point — those are unstaffed days.

**Swaps.** A pending swap appears in the queue on the right. Approving one moves the shift to the replacement in a single step. Verity refuses to approve a swap with no named replacement, and refuses one where the replacement is already on that shift.

### 1.4 Checklists and inspections

A **Checklist Template** (built under Quality) is a set of checkpoints someone completes and signs off. Templates belong to a department and can be marked as requiring a walkthrough video.

Templates attach to work in two places:

- **Production** — a department's template runs against every job card at that stage.
- **Service work orders** — pick a checklist on the work order, and completing the visit opens an inspection against it.

Where a work order has a site, the resulting inspection is tagged to that site and appears on the site's Inspections tab. This is how a facilities contract proves what was actually checked, and when.

### 1.5 Choosing your modules

Your workspace was provisioned from an **industry pack** — a named bundle of modules. A security company gets Sites, Scheduling, Helpdesk and Billing; a garment factory gets Inventory, Manufacturing, Quality and Procurement. Neither sees the other's menu.

Modules can be changed after the fact by an administrator. Turning a module **off only hides it** — no data is deleted, and turning it back on returns everything exactly as it was.

---

## Part Two — Daily Use

### 2.1 Helpdesk — requests

A **ticket** is a request. Somebody reported that something is wrong.

**Raising one:** Helpdesk → New ticket. Subject and priority are the minimum. Attaching a site sets the SLA clock.

**The queue orders itself.** Tickets are not listed newest-first. Anything that has breached its SLA floats to the top, then by priority, then by age. If the top of your list is quiet, you are on top of your SLAs.

**Statuses:**

| Status | Means |
|---|---|
| `Open` | Nobody has picked it up |
| `In progress` | Someone is working it |
| `Waiting on customer` | Blocked on the client, SLA still ticking |
| `Resolved` | Fixed, pending confirmation |
| `Closed` | Done |

Assigning an untouched `Open` ticket moves it to `In progress` automatically. Anything already in flight keeps the status it has.

**Comments.** Post updates on the ticket thread. Tick **Internal note** for anything the client should not read — internal notes are visually separated and marked.

### 2.2 Service work orders — visits

A ticket is a request; a **work order** is the visit that answers it. They are separate because one complaint can produce three visits, and a planned maintenance round produces work orders with no ticket at all.

From a ticket, use **Dispatch** — the client and site carry over. Otherwise create one directly from the Work Orders screen.

Categories are `Corrective`, `Preventive`, `Inspection`, `Installation`. Statuses run `Open → Assigned → In progress → Completed`, with `Pending parts` for the wait and `Cancelled` for the abandoned.

**On timing:** the first move into `In progress` is what "started" means. Pausing and resuming later does not reset the clock, so your time-to-complete figures stay honest.

### 2.3 Projects and timesheets

A **Project** is an engagement with a client, a budget and a manager — the service-sector equivalent of a production plan. Tasks are the job cards; timesheets are what gets billed.

The detail screen has three tabs:

- **Overview** — the commercials. Budget, rate, billable value, percentage of budget consumed.
- **Tasks** — the work breakdown, with status, assignee, due date and estimate.
- **Timesheets** — hours logged, and the approval gate.

**Approval matters.** Only hours that are both **billable** and **approved** are picked up when an invoice is built from work. An entry that is approved cannot be deleted until it is un-approved first, because by then it may already sit on an invoice or a payroll run.

The **billable rate** on the project is what prices those hours. Set it before you log a month of time, not after.

### 2.4 Assets and maintenance

The **asset register** lists everything the business owns and must keep running. It is not stock: stock is counted and consumed, an asset is one identifiable thing with a service history.

The register sorts overdue maintenance to the top. It is a to-do list before it is an inventory.

**Maintenance plans** are simple by design: "every N days". Create one on the asset detail screen with an interval and a first due date.

**Logging maintenance** against a plan rolls that plan's next due date forward *from the date the work actually happened*, not from when it was due. A plan that slips stays slipped rather than compounding into a backlog of phantom overdue services.

Cost and downtime on every log roll up to the totals at the top of the asset. Those two numbers are the answer to the only question the register exists to settle: whether keeping this thing is still cheaper than replacing it.

An asset with maintenance history cannot be deleted — set it to **Disposed**. The history is the record of what it cost to own.

### 2.5 Production, Floor and Logistics

For manufacturing workspaces:

- **Order Taking** — book customer orders.
- **Production** — plan them into work orders and job cards.
- **Floor** — live status per department: what is running, who is on it.
- **Quality** — the QC queue, inspections and approvals.
- **Logistics** — dispatch and delivery.

These do not appear in a service workspace, and the service screens do not appear here.

### 2.6 Billing

Two halves of the same act — turning work that already happened into money.

**Invoices.** Create one by hand, or use **From work**: pick a client and a period, and Verity drafts an invoice from completed work orders and approved billable hours in that window. Nothing is sent. Review the lines and the prices first — work orders come through at zero price by design, because Verity does not know what you charge for a visit.

Invoice numbers restart each financial year (`INV-2026-00041`).

A **draft** can be edited and deleted. Once it is `Sent`, it cannot — the client is holding a copy, and editing it in place would make their copy a forgery. Cancel and reissue instead.

`Overdue` is worked out from the clock, not from someone remembering to press a button.

**Payroll inputs.** Pick a period and press **Recompute period**. Verity summarises every active employee from attendance, approved leave and (if Projects is on) approved timesheet hours.

Recomputing is safe to repeat: rows still in `Draft` are recalculated, rows already `Finalised` or `Exported` are left untouched. Payroll that has been handed off must not change underneath the handoff.

**Export CSV** downloads the period and marks it exported in the same action. That pairing is deliberate — an export that does not flip the status is how a period gets paid twice.

---

## Part Three — Reference

### 3.1 Status vocabulary

Statuses share meaning across modules on purpose. `Open` means the same thing on a ticket and a work order, so it is the same colour on both screens.

| Colour | Meaning | Examples |
|---|---|---|
| Green | Live and healthy, or finished well | `Active`, `Completed`, `Resolved`, `Paid`, `Approved` |
| Scarlet | In flight | `In progress`, `Assigned`, `Scheduled`, `Sent` |
| Amber | Waiting on someone | `Open`, `To do`, `Pending`, `On hold`, `Draft` |
| Orange | Wrong | `Blocked`, `Overdue`, `Absent`, `Rejected` |
| Grey | Finished with, not celebrated | `Closed`, `Cancelled`, `Terminated`, `Retired` |

### 3.2 Document numbering

| Prefix | What |
|---|---|
| `SITE-0001` | Site |
| `TKT-00001` | Ticket |
| `SWO-00001` | Service work order |
| `PRJ-0001` | Project |
| `AST-00001` | Asset |
| `INV-2026-00001` | Service invoice (restarts yearly) |

Numbers are allocated at creation and never reused.

### 3.3 Team and PIN management

Every user signs in with a **phone number and a 4-digit PIN**. There is no password and no email login.

- Add people under **Team**. Every new account gets a **randomly generated PIN, shown once** at creation — copy it then, because it cannot be read back afterwards. If it is lost, reset it; there is no default PIN and no way to recover the old one.
- Phone numbers are stored as the last 10 digits. You may type `+91 98765 43210` or `09876543210`; all forms reach the same account.
- Deactivating a user (rather than deleting them) keeps their history intact — their logged hours, inspections and comments stay attributed.
- After repeated failed attempts an account locks itself. An owner or administrator can clear the lock from the user's record.
- **Roles** decide what someone sees. Owner and Co-Owner see everything; Manager runs the operation; Supervisor works the queue and posts staff but does not sign contracts or raise invoices; Worker sees their own jobs, their schedule and their timesheet.

### 3.4 Troubleshooting

**"A screen in this guide isn't in my sidebar."**
That module is not enabled for your organisation. Nav items for disabled modules are not rendered at all, and typing the URL redirects to your dashboard.

**"The site dropdown is empty or disabled."**
The Sites module is off, or you have no active sites. Terminated sites are deliberately excluded from pickers.

**"I can't schedule anyone."**
No shifts are defined. Add them in Settings first.

**"Building an invoice from work found nothing."**
Check three things: the work orders are actually `Completed` and completed inside the period; the timesheet entries are both `billable` and `approved`; and the project or work order is attached to the client you picked.

**"Payroll shows zero leave days."**
Only `Approved` leave counts. Pending applications are ignored.

**"My SLA deadline looks wrong."**
It was stamped when the ticket was raised, from the site's SLA at that moment. Editing the site's SLA now affects new work only.
| Client | Which customer owns this site |
| Site manager | The person accountable for it |
| Contract start / end | The engagement window |
| **SLA response (hours)** | The promise. Read the note below. |

**The SLA field is the most important one on this form.** When you raise a ticket or a work order at a site, Verity stamps a deadline onto it — creation time plus the site's SLA hours. That stamp is taken *once, at creation*. Changing a site's SLA later does not re-date work that already exists, which is deliberate: history should not move.

Leave it blank if the site has no SLA. A blank SLA means work raised there simply has no deadline, not a deadline of zero.

**Deploying staff.** Open a site and use **Deploy staff** on the Roster tab. A deployment is a posting: a person, a role on site ("Guard", "Housekeeper", "Technician" — free text, use your own vocabulary), optionally a shift, and a start date. Leave the end date blank for an open-ended posting.

Ending a posting keeps it in history under *Past postings*. Setting a site to **Terminated** ends every active posting on it automatically, so a closed site cannot keep inflating your headcount.

### 1.3 Scheduling — who works when

The **Shift** records in Settings are definitions only: a name and two clock times. They answer "what is the morning shift?" and nothing else. The calendar lives in **Scheduling**.

1. Define your shifts in Settings first. Scheduling cannot do anything without them, and the form will tell you so.
2. Go to **Scheduling**. The grid is one row per person, one column per day.
3. **Schedule shift** posts one person to one shift on one date, optionally at a site.
4. Once a week is right, **Copy week** repeats it into the following week. Existing entries are left alone, so re-running a copy is safe.

The grid only lists people who appear somewhere that week. Empty cells in a row are the point — those are unstaffed days.

**Swaps.** A pending swap appears in the queue on the right. Approving one moves the shift to the replacement in a single step. Verity refuses to approve a swap with no named replacement, and refuses one where the replacement is already on that shift.

### 1.4 Checklists and inspections

A **Checklist Template** (built under Quality) is a set of checkpoints someone completes and signs off. Templates belong to a department and can be marked as requiring a walkthrough video.

Templates attach to work in two places:

- **Production** — a department's template runs against every job card at that stage.
- **Service work orders** — pick a checklist on the work order, and completing the visit opens an inspection against it.

Where a work order has a site, the resulting inspection is tagged to that site and appears on the site's Inspections tab. This is how a facilities contract proves what was actually checked, and when.

### 1.5 Choosing your modules

Your workspace was provisioned from an **industry pack** — a named bundle of modules. A security company gets Sites, Scheduling, Helpdesk and Billing; a garment factory gets Inventory, Manufacturing, Quality and Procurement. Neither sees the other's menu.

Modules can be changed after the fact by an administrator. Turning a module **off only hides it** — no data is deleted, and turning it back on returns everything exactly as it was.

---

## Part Two — Daily Use

### 2.1 Helpdesk — requests

A **ticket** is a request. Somebody reported that something is wrong.

**Raising one:** Helpdesk → New ticket. Subject and priority are the minimum. Attaching a site sets the SLA clock.

**The queue orders itself.** Tickets are not listed newest-first. Anything that has breached its SLA floats to the top, then by priority, then by age. If the top of your list is quiet, you are on top of your SLAs.

**Statuses:**

| Status | Means |
|---|---|
| `Open` | Nobody has picked it up |
| `In progress` | Someone is working it |
| `Waiting on customer` | Blocked on the client, SLA still ticking |
| `Resolved` | Fixed, pending confirmation |
| `Closed` | Done |

Assigning an untouched `Open` ticket moves it to `In progress` automatically. Anything already in flight keeps the status it has.

**Comments.** Post updates on the ticket thread. Tick **Internal note** for anything the client should not read — internal notes are visually separated and marked.

### 2.2 Service work orders — visits

A ticket is a request; a **work order** is the visit that answers it. They are separate because one complaint can produce three visits, and a planned maintenance round produces work orders with no ticket at all.

From a ticket, use **Dispatch** — the client and site carry over. Otherwise create one directly from the Work Orders screen.

Categories are `Corrective`, `Preventive`, `Inspection`, `Installation`. Statuses run `Open → Assigned → In progress → Completed`, with `Pending parts` for the wait and `Cancelled` for the abandoned.

**On timing:** the first move into `In progress` is what "started" means. Pausing and resuming later does not reset the clock, so your time-to-complete figures stay honest.

### 2.3 Projects and timesheets

A **Project** is an engagement with a client, a budget and a manager — the service-sector equivalent of a production plan. Tasks are the job cards; timesheets are what gets billed.

The detail screen has three tabs:

- **Overview** — the commercials. Budget, rate, billable value, percentage of budget consumed.
- **Tasks** — the work breakdown, with status, assignee, due date and estimate.
- **Timesheets** — hours logged, and the approval gate.

**Approval matters.** Only hours that are both **billable** and **approved** are picked up when an invoice is built from work. An entry that is approved cannot be deleted until it is un-approved first, because by then it may already sit on an invoice or a payroll run.

The **billable rate** on the project is what prices those hours. Set it before you log a month of time, not after.

### 2.4 Assets and maintenance

The **asset register** lists everything the business owns and must keep running. It is not stock: stock is counted and consumed, an asset is one identifiable thing with a service history.

The register sorts overdue maintenance to the top. It is a to-do list before it is an inventory.

**Maintenance plans** are simple by design: "every N days". Create one on the asset detail screen with an interval and a first due date.

**Logging maintenance** against a plan rolls that plan's next due date forward *from the date the work actually happened*, not from when it was due. A plan that slips stays slipped rather than compounding into a backlog of phantom overdue services.

Cost and downtime on every log roll up to the totals at the top of the asset. Those two numbers are the answer to the only question the register exists to settle: whether keeping this thing is still cheaper than replacing it.

An asset with maintenance history cannot be deleted — set it to **Disposed**. The history is the record of what it cost to own.

### 2.5 Production, Floor and Logistics

For manufacturing workspaces:

- **Order Taking** — book customer orders.
- **Production** — plan them into work orders and job cards.
- **Floor** — live status per department: what is running, who is on it.
- **Quality** — the QC queue, inspections and approvals.
- **Logistics** — dispatch and delivery.

These do not appear in a service workspace, and the service screens do not appear here.

### 2.6 Billing

Two halves of the same act — turning work that already happened into money.

**Invoices.** Create one by hand, or use **From work**: pick a client and a period, and Verity drafts an invoice from completed work orders and approved billable hours in that window. Nothing is sent. Review the lines and the prices first — work orders come through at zero price by design, because Verity does not know what you charge for a visit.

Invoice numbers restart each financial year (`INV-2026-00041`).

A **draft** can be edited and deleted. Once it is `Sent`, it cannot — the client is holding a copy, and editing it in place would make their copy a forgery. Cancel and reissue instead.

`Overdue` is worked out from the clock, not from someone remembering to press a button.

**Payroll inputs.** Pick a period and press **Recompute period**. Verity summarises every active employee from attendance, approved leave and (if Projects is on) approved timesheet hours.

Recomputing is safe to repeat: rows still in `Draft` are recalculated, rows already `Finalised` or `Exported` are left untouched. Payroll that has been handed off must not change underneath the handoff.

**Export CSV** downloads the period and marks it exported in the same action. That pairing is deliberate — an export that does not flip the status is how a period gets paid twice.

---

## Part Three — Reference

### 3.1 Status vocabulary

Statuses share meaning across modules on purpose. `Open` means the same thing on a ticket and a work order, so it is the same colour on both screens.

| Colour | Meaning | Examples |
|---|---|---|
| Green | Live and healthy, or finished well | `Active`, `Completed`, `Resolved`, `Paid`, `Approved` |
| Scarlet | In flight | `In progress`, `Assigned`, `Scheduled`, `Sent` |
| Amber | Waiting on someone | `Open`, `To do`, `Pending`, `On hold`, `Draft` |
| Orange | Wrong | `Blocked`, `Overdue`, `Absent`, `Rejected` |
| Grey | Finished with, not celebrated | `Closed`, `Cancelled`, `Terminated`, `Retired` |

### 3.2 Document numbering

| Prefix | What |
|---|---|
| `SITE-0001` | Site |
| `TKT-00001` | Ticket |
| `SWO-00001` | Service work order |
| `PRJ-0001` | Project |
| `AST-00001` | Asset |
| `INV-2026-00001` | Service invoice (restarts yearly) |

Numbers are allocated at creation and never reused.

### 3.3 Team and PIN management

Every user signs in with a **phone number and a 4-digit PIN**. There is no password and no email login.

- Add people under **Team**. Every new account gets a **randomly generated PIN, shown once** at creation — copy it then, because it cannot be read back afterwards. If it is lost, reset it; there is no default PIN and no way to recover the old one.
- Phone numbers are stored as the last 10 digits. You may type `+91 98765 43210` or `09876543210`; all forms reach the same account.
- Deactivating a user (rather than deleting them) keeps their history intact — their logged hours, inspections and comments stay attributed.
- After repeated failed attempts an account locks itself. An owner or administrator can clear the lock from the user's record.
- **Roles** decide what someone sees. Owner and Co-Owner see everything; Manager runs the operation; Supervisor works the queue and posts staff but does not sign contracts or raise invoices; Worker sees their own jobs, their schedule and their timesheet.

### 3.4 Troubleshooting

**"A screen in this guide isn't in my sidebar."**
That module is not enabled for your organisation. Nav items for disabled modules are not rendered at all, and typing the URL redirects to your dashboard.

**"The site dropdown is empty or disabled."**
The Sites module is off, or you have no active sites. Terminated sites are deliberately excluded from pickers.

**"I can't schedule anyone."**
No shifts are defined. Add them in Settings first.

**"Building an invoice from work found nothing."**
Check three things: the work orders are actually `Completed` and completed inside the period; the timesheet entries are both `billable` and `approved`; and the project or work order is attached to the client you picked.

**"Payroll shows zero leave days."**
Only `Approved` leave counts. Pending applications are ignored.

**"My SLA deadline looks wrong."**
It was stamped when the ticket was raised, from the site's SLA at that moment. Editing the site's SLA now affects new work only.

**"An approved timesheet entry won't delete."**
Un-approve it first. This is a guard, not a bug — approved hours may already be invoiced.

**"The site won't delete."**
Sites with tickets, work orders or invoices against them cannot be deleted, because that history has to keep pointing somewhere real. Set the site to `Terminated` instead.

---

## Part Four — Your Industry
 
Verity ships as five operating packs. The pack decides which modules your workspace is entitled to and which dashboard you land on, so two Verity workspaces can look quite different from each other. Your pack was chosen at onboarding; ask your administrator to change it if it is wrong.
 
### 4.1 Auto Components
 
**Modules:** core, inventory, manufacturing, quality, procurement, sales, hr, automotive
 
A production floor. Work is a physical thing moving through stages — Queue → Cutting → Stitching → QC → Dispatch — and every order resolves to a finished-good item that production is planned against.
 
**Your dashboard** shows floor progress, live operators, and a **defect Pareto**: the checkpoints that failed most often in the last seven days, ranked. Use it the way it is meant to be used — the top two bars are usually most of your rework, and fixing those two is worth more than a general instruction to be careful.
 
**Daily rhythm:** book orders (or receive them from your storefront — see 4.6), release drafts to the floor, work the QC queue, dispatch with a passport.
 
### 4.2 Facility Management
 
**Modules:** core, hr, sites, scheduling, helpdesk, assets, quality, procurement, billing
 
A field-service operation. Work is a person being somewhere they are supposed to be, and a promise about how fast you respond.
 
**Your dashboard** is deliberately time-relative rather than cumulative. "Shift coverage" is today's attended shifts over today's scheduled shifts. "SLA breached" counts tickets already past their deadline; alongside it sits the count due within four hours, because that is the list you can still do something about.
 
**Daily rhythm:** check coverage, work the SLA list worst-first, close work orders with their inspection attached, build invoices from completed work at month end.
 
**Note on SLA:** a ticket's deadline is stamped when it is raised, from the site's SLA at that moment. Changing a site's SLA affects new tickets only — existing promises are not silently rewritten.
 
### 4.3 Verity Franchise — QSR
 
**Modules:** core, hr, inventory, quality, procurement, billing
 
An outlet network. See 4.7 for the Franchise OS in depth.
 
**Your dashboard** ranks rather than totals, because with a network the useful question is which outlet is the outlier, not what the average is. Outlets are listed **worst first**.
 
- **Outlet health scorecard** — passed audits over completed audits per outlet, last 30 days. An outlet with no audit in the window is listed but *not scored*: showing it as 0% would read as a failing outlet rather than an unvisited one, and those need different responses.
- **Price audit** — see 4.7.
- **Kitchen SOP** — recent opening/hygiene audits across the network.
 
### 4.4 Verity Franchise — Retail
 
**Modules:** core, hr, inventory, quality, procurement, sales, billing
 
A store network. Same shape as QSR, different question: stock in the right place, and a shop floor that looks the way the brand says it should.
 
**Your dashboard** pairs **sales against compliance** side by side rather than showing either alone. A store selling well while failing its standards audit is a different problem from one doing neither, and a single blended score hides exactly that.
 
**Reorder alerts** compare each item's stock balance against *its own* reorder level, not a flat number. Items with no reorder level set are not tracked — set one on the item for it to appear.
 
### 4.5 Restaurant OS

**Modules:** core, hr, menu, tables_orders, kitchen, serving, billing

A dine-in and kitchen operation. Work is table service, order routing, kitchen preparation and point-of-sale billing. Success is defined by high table turnover and zero order delays.

**Your dashboard** features four dedicated widgets that adapt dynamically to your entitlements:
- **Metrics Strip:** Real-time counts of active occupied tables, tickets in the kitchen, orders ready to be served, and tables waiting to pay.
- **Table Floor Map:** A visual layout of all dining tables (Available, Occupied, Billing/Billed) showing guest counts and occupation times at a glance.
- **Recent Orders Activity:** A live feed of active table logs and status changes.
- **Takings Panel:** A breakdown of today's settled sales grouped by payment method (Cash, Card, UPI).

**Daily rhythm:** Opens with a table selection, booking dining orders, and automatically routing item lines to the kitchen queue. Chefs mark prepared items ready, servers deliver them to tables, and cashiers settle the bills via POS.

### 4.6 Integrations — the headless layer
 
Verity is the operations engine, not your storefront and not your ledger. Orders come in from outside; milestones go out.
 
**Orders in.** Your storefront or dealer portal POSTs to `/api/orders/receive`. Every request needs:
 
| Header | What it is |
|---|---|
| `Authorization: Bearer …` | Your API key. Issued once, stored hashed — if you lose it, issue a new one. |
| `X-Verity-Timestamp` | Unix seconds. Requests more than 5 minutes out are refused. |
| `X-Verity-Signature` | HMAC-SHA256 of `timestamp + "." + rawBody`, using your signing secret. |
| `Idempotency-Key` | Optional but strongly recommended. |
 
Three things worth knowing:
 
1. **Orders arrive as drafts.** An external system proposes work; somebody here releases it to the floor. This is deliberate — your storefront should not be able to start production unattended.
2. **The workspace comes from the key, never the payload.** A key belongs to one workspace and can only write into it.
3. **Retries are safe.** Send the same `Idempotency-Key` and you get the original response back rather than a second order. If you send no key, an identical body is treated as the same request — weaker, but it stops a timeout from duplicating production work.
 
Anything Verity could not match — a fabric name that does not exist in your item master — comes back in `warnings` rather than being silently dropped. Read them.
 
**Events out.** Configure a webhook endpoint and Verity POSTs order milestones (`ORDER_RECEIVED`, `ORDER_COMMITTED`, `ORDER_QC_PASSED`, `ORDER_DISPATCHED`) to it, signed the same way so you can verify they came from us. Deliveries are queued and retried with backoff, so a receiver that is briefly down does not lose events. Endpoints must be public `https` addresses — private and internal addresses are refused.
 
**Where to set this up:** Settings → Integrations. Issue a key, copy the token and signing secret (the token is shown once), and add your webhook endpoint. The operator console can do the same for you if you would rather not.
 
**Shopify, specifically.** Enter your shop domain when issuing the key, then in Shopify go to Settings → Notifications → Webhooks and add an **Order creation** webhook pointing at `/api/integrations/shopify`. Paste the signing secret from Verity into Shopify.
 
Two things worth knowing about the Shopify path:
 
- **Custom options come through.** Fabric, vehicle, colour, headrest count and armrest are read from your line-item properties or cart attributes, under whatever names your storefront uses — "Fabric", "Material" and "Seat fabric" all work. Anything Verity cannot match to your item master arrives as a warning on the order rather than being dropped.
- **Zero-quantity lines are ignored.** Shopify sends refunded and removed lines with quantity 0; booking those would put a job card on the floor for nothing.
 
**Tally export.** Reports → **Tally CSV** downloads every dispatch in the date range shown on that page, formatted for Tally's voucher import: DD-MM-YYYY dates, one row per line item, GSTIN and billing address from the customer record. Fill those in before month end, not after — a blank GSTIN column is a manual fix per row on the Tally side.
 
### 4.7 Franchise OS in depth
 
The franchise packs treat an **outlet or store as a Site**. A franchise outlet and a serviced site are the same shape — a place with a manager, a roster and a checklist — so they share one table and one set of screens rather than a near-identical copy that drifts.
 
**Launching a new outlet.** Add the site, assign a manager, attach the standard checklists, and roster staff to it. Everything network-wide — audits, scorecards, price benchmarks — starts including it immediately.
 
**SOP and audit tracking.** Build a checklist per routine: opening SOP, hygiene, visual standards. Attach photo checkpoints where "it was done" needs evidence. Outlet managers complete them on their phone; area managers review. Every completed audit feeds the scorecard.
 
**The price audit, and why it uses the median.** For each item bought at least three times in the last 30 days, Verity compares the highest price paid against the **median** across the network, and flags anything more than 15% above it.
 
The median matters. One outlet paying far over the going rate is precisely what this is for — and an *average* would let that outlier drag the benchmark up toward itself and hide the thing you were looking for. Three purchases is the floor because two data points are not a benchmark, only a disagreement.
 
An alert is a question, not an accusation. Legitimate reasons exist: an emergency purchase, a different pack size, a genuinely remote outlet. The point is that you get to ask.
 
**Scorecards.** Compliance is passed audits over completed audits. It is deliberately not blended with sales into one number — see 4.4 for why.
 
**What a franchise pack does not do.** No POS, no accounting. Sales come in through the integration layer; ledgers stay in Tally or Busy. Verity holds the operation.
 
### 4.8 The daily opening checklist, and what it gates
 
If you name an active checklist **"Opening SOP"** (or anything containing "opening" or "daily SOP"), it becomes that day's gate for every outlet.
 
**What it does:** until today's opening checklist is *approved* for an outlet, that outlet cannot dispatch. Yesterday's approval does not carry over — that is the entire point of a daily checklist.
 
**What it deliberately does not do:**
 
- It does not block recording anything. You can still raise tickets, complete work orders and log what happened. Blocking the record would lose the day's history as well as its trading, and the history is the part worth keeping.
- It does not apply if you have not created an opening checklist. The gate is opt-in; a business that never asked for the rule is not subject to it.
- It does not apply to work with no outlet attached.
 
**If an outlet is blocked**, the message says which of the two situations you are in: the checklist has not been started, or it is filled in and waiting for sign-off. Those need different actions, so they are phrased differently.
 
### 4.9 Photo evidence on checklists
 
Any checkpoint can carry a photo. Tick **Require image** on a checkpoint and the inspection cannot be submitted until one is attached — useful for hygiene checks and visual-standards audits, where "it was done" and "here is what it looked like" are different claims.
 
On a phone the camera button opens the rear camera directly rather than the photo library, because these are completed standing in front of the thing being checked.
 
Re-answering a checkpoint keeps the photo already attached to it. Remove it explicitly if it no longer applies.
 
### 4.10 Launching an outlet
 
**Sites → Launch outlet.** This creates the outlet inside your own workspace, so it joins the network scorecard, the price audit and the dashboard immediately.
 
Give it a manager at the same time if you can. Without an account, nobody on site can complete the opening checklist — and if you have configured one, that outlet cannot dispatch until somebody does. The manager's PIN is shown once at creation; copy it then.
 
Note this is different from a new *workspace*. A franchise network is one Verity workspace containing many outlets. That is what makes comparing outlets possible — fifty separate workspaces would mean fifty dashboards and no network view at all.
