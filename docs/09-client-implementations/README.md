# Client Implementations

Client implementation docs describe how a client is configured on Verity.

They must not redefine Verity architecture.

## Required Client Files

Each client folder should include:

- `requirements.md`
- `workflow.md`
- `module-map.md`
- `configuration.md`
- `implementation-scope.md`
- `future-expansion.md`

## Rules

- Explain the real-world business workflow.
- Map requirements to reusable modules.
- Mark custom requests as configuration, extension, new module, or exception.
- Do not describe client-specific code as the preferred pattern.
- Do not add client implementation details to Core/platform docs.
