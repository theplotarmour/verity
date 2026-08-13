# Client Portal

The client portal is a dynamically configured workspace.

A client does not receive "the Verity app." A client receives a Verity workspace assembled from enabled modules, permissions, workflows, settings, and dashboard composition.

## Portal Inputs

- authenticated user,
- organization/workspace context,
- enabled modules,
- role permissions,
- module settings,
- dashboard configuration,
- workflow state,
- subscription state.

## Portal Outputs

- navigation,
- dashboard widgets,
- module pages,
- settings screens,
- role-specific task surfaces,
- empty states,
- blocked states.

## Empty Workspace

A new blank tenant should see:

```text
Welcome to Verity
Your workspace has not been configured yet.
Contact your Verity administrator to activate modules.
```

It should not see manufacturing, restaurant, service, retail, franchise, or demo workflows until modules are enabled.

## Direct Access Rule

If a user enters a URL for a disabled module:

- page redirects to a safe core page or unauthorized state,
- server actions reject with a clear error,
- no data is leaked.

Frontend navigation is an affordance, not the authority.
