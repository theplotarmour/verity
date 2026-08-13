# Role-Based Experience

Client users see the workspace through module permissions and job context.

## Principles

- Roles grant permissions, not blanket access.
- Permissions are contributed by modules.
- A permission only counts if the owning module is enabled.
- Frontline workers should land on task-specific surfaces, not generic admin dashboards.
- Owners/managers may see dashboards only from modules they are entitled to.

## Examples

Restaurant:

- Chef sees kitchen queue.
- Server sees serving/floor tasks.
- Manager sees menu/order/billing management if permissions allow.

Manufacturing:

- Worker sees assigned job cards.
- Supervisor sees department queue.
- Quality inspector sees inspection queue if quality module and permission allow.

These are examples of module-owned role surfaces, not hardcoded global behavior.
