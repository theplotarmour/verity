# Localization and Internationalization Model

Odoo implements a multi-language translation architecture and country-specific fiscal localizations.

## 1. Multi-Language Translation Framework (i18n)
All user-facing strings (menu items, fields, form labels, reports, and email templates) support multi-language translation.

### Technical Mechanics
- **Translation Extraction**: Translatable terms in Python source code (wrapped in the `_()` function) and XML view definitions are extracted into standard **Gettext PO template (`.pot`)** files.
- **Language-Specific Catalogs**: Located in a module's `i18n/` directory (e.g., `fr.po` for French, `de.po` for German).
- **Database Translation Table (`ir.translation`)**: At database load time, PO file terms are loaded into the `ir.translation` table. 
- **Dynamic Translation**:
  - The client side automatically translates UI terms based on the user's active language setting (`res.users.lang`).
  - Fields with the attribute `translate=True` (e.g., product names, category descriptions) can store distinct values for each language. The system serves the matching language term on-the-fly at query-time.

---

## 2. Fiscal and Accounting Localizations (`l10n_*`)
Odoo supports different legal and accounting requirements across multiple countries via specialized modules prefixed with `l10n_`.

### Core Localization Components
1. **Chart of Accounts (CoA)**: Standardized accounts matching local legal formats.
2. **Tax Definitions**: Specific tax percentages, formulas (inclusive/exclusive), and accounting codes for local tax reporting.
3. **Fiscal Positions**: Mapping templates that automatically substitute default taxes and accounts based on customer geographic attributes (e.g. domestic, intra-EU, export).
4. **Electronic Data Interchange (EDI)**: Connectors and document encoders to transmit digital invoices directly to tax authorities (e.g., SDI in Italy, XRechnung in Germany, Peppol network globally).
5. **Localization-specific views**: View extensions to add localized fields (e.g., VAT number validation, tax registry codes).
