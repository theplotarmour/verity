# Module: CRM

## Purpose
The `crm` module manages prospective customer relationships and sales pipelines. It tracks initial interest (Leads) and qualified sales cycles (Opportunities) through customizable pipelines.

## Scope
- Creates and maintains Leads and Opportunities in a single model (`crm.lead`).
- Manages sales pipelines partitioned by Sales Teams and stages.
- Automates sales probability calculations based on stages.
- Handles lost deal reason logs for business analytics.

## Major Entities

### 1. Lead / Opportunity (`crm.lead`)
- **Type**: Persistent Model.
- **Purpose**: Represents a potential business deal.
- **Fields**:
  - `name`: Brief description of the opportunity (required).
  - `partner_id`: Associated Customer Partner (`Many2one`).
  - `type`: Selection enum (`lead` or `opportunity`).
  - `stage_id`: Pipeline stage (`Many2one` to `crm.stage`).
  - `probability`: Float percentage (0 to 100) representing likelihood of winning.
  - `expected_revenue` / `recurring_revenue`: Monetary forecast fields.
  - `probability`: Automatically updated as the stage changes.

### 2. Stage (`crm.stage`)
- **Type**: Persistent Model.
- **Purpose**: Represents columns in the Kanban pipeline view (e.g., New, Qualified, Proposition, Won).
- **Fields**:
  - `name`: Stage label.
  - `sequence`: Ordering parameter.
  - `is_won`: Boolean indicating if landing in this stage marks the opportunity as Won (sets probability to 100%).

## Core Workflows
- **Lead-to-Opportunity Conversion**:
  - Transition: `type = 'lead'` → `type = 'opportunity'`.
  - Logic: Triggered by the Sales Representative clicking "Convert to Opportunity". The wizard maps existing contact info, matches or creates a Customer Partner, and moves the card to the Opportunity pipeline.
- **Pipeline Stage Changes**:
  - Transition: Dragging cards between stages updates `stage_id`. If the stage has a default probability defined, it overwrites `crm.lead.probability` unless manually frozen.

## Permissions
- Model Access is defined in `addons/crm/security/ir.model.access.csv`.
- **Groups**:
  - `sales_team.group_sale_salesman`: Can read/write their own leads and opportunities.
  - `sales_team.group_sale_manager`: Can assign leads, configure team pipelines, and view consolidated sales funnels.

## Traceability
- **Module Directory**: `addons/crm`
- **Model Path**: `addons/crm/models/crm_lead.py`
