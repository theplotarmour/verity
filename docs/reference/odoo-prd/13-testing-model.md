# Testing and Verification Model

This document outlines Odoo's testing architecture, executing framework, and verification categories.

## 1. Test Suite Architecture
Odoo integrates a Python-based testing framework that extends `unittest`. Tests are categorized by the degree of integration and their runtime environment.

### Core Test Classes
1. **Transaction Case (`odoo.tests.common.TransactionCase`)**:
   - The most common test type.
   - Every test case is executed within a single database transaction.
   - Upon test completion (whether pass or fail), the framework automatically rolls back the transaction, leaving the database state pristine.
   - Used for verifying ORM behavior, write/create permissions, compute field dependencies, and constraints.
2. **HTTP Case (`odoo.tests.common.HttpCase`)**:
   - Starts a real HTTP server in a sub-thread during test execution.
   - Can verify HTTP routes, routing controllers, cookie sessions, and JSON-RPC integrations.
   - Serves as the executing host for frontend Javascript tests (tours).
3. **Savepoint Case (`odoo.tests.common.SavepointCase`)**:
   - A sub-variant of TransactionCase where the initial setup data is created once using database savepoints and shared across all test methods in the class, speeding up execution.

---

## 2. Frontend JS Tours
To verify user workflows and interactive UI behaviors, Odoo uses **Tours**.

### Tour Mechanics
- Tours are declared in JavaScript and registered with the tour registry.
- A tour defines a sequence of user actions (steps):
  ```javascript
  registry.category("web_tour.tours").add('sale_tour', {
      url: '/web',
      steps: () => [
          { trigger: '.o_menu_brand:contains("Sales")', content: "Go to Sales" },
          { trigger: '.o_list_button_add', content: "Create quotation" },
          { trigger: '.o_field_widget[name="partner_id"] input', run: "text Decathlon" },
          { trigger: 'button:contains("Confirm")', content: "Confirm sale" },
      ]
  });
  ```
- During test execution, an `HttpCase` launches a headless browser (typically Chrome via Puppeteer/Playwright) to run the tour, asserting that each step successfully completes and no JS/console errors are emitted.
