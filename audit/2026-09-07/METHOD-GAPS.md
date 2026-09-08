# Method gaps — what the black-box phases could not have found

The brief asks for this file because the gap between what driving the application reveals and
what reading it reveals is itself a result. This run makes the gap unusually visible, because
the read-only constraint removed the write path entirely.

## Found only by reading the source

Nine of the twenty-seven findings could not have been reached from outside, and six of those
are the ones that matter most.

| Finding | Why the running application could not show it |
|---|---|
| **F-003** `assignRole` grants any role, to anyone, including yourself | The proof is a *write*. Driving it means actually escalating a role in a production tenant. The absence of a ceiling check is visible in twenty lines of `administration.ts` and in no HTTP response. |
| **F-004** `grantPermission` has no ceiling | Same. And a successful escalation looks identical to a legitimate admin action from outside. |
| **F-005** Layer 2 missing in nine capabilities | Requires a tenant with a multi-organization hierarchy *and* data in `hr`/`billing`/`dinein`/etc. No such tenant exists. From outside, an Organization-scoped role seeing everything is indistinguishable from one legitimately granted Tenant scope. |
| **F-006** Layer 3 never runs | `field_permission` is empty in both tenants, so **the control's absence produces no observable difference**. A black-box run would have concluded, correctly and uselessly, that no field is redacted — because none is declared. |
| **F-012** Dine-in bills 0% GST when unconfigured | `dinein` is not active for either tenant, and activating it is a write. |
| **F-013** Billing ₹0 invoice on missing readings | Same — `billing` inactive. |
| **F-023** GSTR-3B counts unconfirmed bills as eligible ITC | This is the sharpest case. The figure is *plausible*: it is a number, in the right units, on a working paper. Nothing about the rendered page says it is wrong. It is wrong only against a definition the same codebase applies correctly in two other places — which you can only see by reading all three. **A black-box auditor would have ticked GSTR-3B as working.** |
| **F-024** Financial year computed in UTC | Only reproducible for five and a half hours a year, on 1 April. Reading `getUTCFullYear()` takes ten seconds. |
| **F-025** "Paid" read from `payment.invoiceId` rather than allocations | Requires a payment split across several invoices to exist in the data. None does in the audited tenants — so the wrong number never appears. |

## Found only by driving the application

The inverse is also true, and worth recording because it is the brief's own argument.

- **F-001 / F-002.** The customer, sales, prices, ledgers and transactions pages *do not
  render*. `npm run typecheck` passes. `npm run build` would pass. The code reads as correct —
  `customerExposurePaise` is careful, well-commented and right about the accounting. It is the
  N-times-3-round-trips-inside-one-transaction shape that kills it, and that shape is invisible
  in review because each individual call looks reasonable. It took one page load to find.
- **F-009.** An unhandled 500 on every inactive-capability route. In source this is a thrown
  `CapabilityError` that looks handled, because a reader assumes an error boundary exists
  somewhere. `find src/app -name error.tsx` returning nothing is the sort of absence review
  does not notice.
- **F-010.** The metrics endpoint returning `"counters":{}` after fourteen hours and several
  hundred logged errors is what turned "captureError has no call sites" from a tidy-up note
  into a High.
- **F-007.** Cookie attributes are a property of the response, not of the source. The source
  says the membership cookie is `httpOnly: true` and it is; nothing in the source says the
  Supabase session cookie is not.

## Where the two disagreed

- The source claims all three authorization layers are enforced (`CLAUDE.md`). The running
  system agrees for Layer 1 and cannot be made to disagree about Layers 2 and 3, because the
  data that would expose them does not exist. **Neither method alone reaches the truth here** —
  it took the source to find the gap and the database to confirm nothing masks it.
- `next.config.ts` documents the CSP omission honestly, and the live response headers confirm
  it. That is the healthy case: the code says what it does.
- `tax.ts:767-771` carries a comment asserting that `eligibleItcPaise` and `booksItcPaise` are
  "identical today". Against the rest of the codebase that comment is false, and it is the
  reason the defect survived. **A comment asserting a property is not evidence of it** — this
  is the clearest example in the repository of a well-written explanation making a wrong line
  look considered.
