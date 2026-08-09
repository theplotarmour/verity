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

- Add people under **Team**. New accounts start with a default PIN that should be changed on first sign-in.
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
