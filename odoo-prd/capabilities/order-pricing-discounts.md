# Capability: Pricing and Discounts

## Purpose
Specifies Odoo's dynamic pricing engine, discount application rules, and customer-specific pricelist evaluations.

## Scope
- Resolves item base prices based on customer context.
- Applies volume-based price breaks and discounts.
- Computes tax inclusions/exclusions on sales order lines.

## Functional Requirements
1. **Pricelist Evaluation**:
   - The system checks if the customer partner record has a specific pricelist mapped (`res.partner.property_product_pricelist`).
   - If not set, it defaults to the company's default currency pricelist.
2. **Formula Calculations**:
   - Price formulas are computed in hierarchical stages:
     - Base price (from product catalog card).
     - Fixed price override, percentage discount, or advanced formula (`cost_price + margin`).
     - Rounding rules.

## Traceability
- **Source Module**: `product`
- **Source Files**: `addons/product/models/product_pricelist.py`
