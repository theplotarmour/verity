# Module: Base

## Purpose
The `base` module is the foundation of the entire Odoo system. It establishes core framework capabilities, metadata models, and the standard database schemas used by all business applications.

## Scope
- Defines core models: `res.partner`, `res.company`, `res.users`, `res.groups`, `res.currency`, `res.country`, `res.lang`.
- Declares core system configurations and parameters (`ir.config_parameter`).
- Sets up baseline scheduled actions (`ir.cron`), actions, menus, and view management services.

## Actors
- **System Administrator**: Full access to security configurations, groups, users, and base configuration parameters.
- **Internal User**: Access to browse partners, countries, and currency lists.
- **Portal User**: Restricted to viewing their own linked partner records.
- **Public User**: Access limited to public country lists or currency exchange rates where explicitly shared on the website catalog.

## Entities
- **Partner (`res.partner`)**: Contacts, customers, vendors, and delivery addresses.
- **User (`res.users`)**: Login accounts, preferences, active company mappings.
- **Company (`res.company`)**: Legal companies sharing the database instance.
- **Currency (`res.currency`)**: Monetary units, conversion tables, and formatting parameters.
- **Groups (`res.groups`)**: Security roles and permission bundles.

## Permissions
- Model Access is defined in `odoo/addons/base/security/ir.model.access.csv`.
- **Closed Access Control**: Users have no read or write permissions on core tables (like `res.users` or `res.groups`) unless they belong to the `base.group_system` (Administration / Settings) group.
- **Internal User Read access**: Members of `base.group_user` (Employees) are granted read access to partners and currencies.

## Traceability
- **Module Directory**: `odoo/addons/base`
- **Model Files**: `odoo/addons/base/models/*.py`
- **Security Definitions**: `odoo/addons/base/security/`
