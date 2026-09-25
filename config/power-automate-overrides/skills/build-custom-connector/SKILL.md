---
name: build-custom-connector
description: Discover, adapt, and prepare a Power Automate custom connector from an API or OpenAPI definition. Use when named connector actions would make a flow clearer, including Microsoft Foundry and Azure OpenAI pay-as-you-go scenarios.
user-invocable: true
argument-hint: "<API or OpenAPI file and desired operations>"
---

# Build a custom connector

Create reviewable connector files before changing a Power Platform environment.
Follow [custom-connectors.md](../../references/custom-connectors.md) to search
the selected environment and Microsoft's example folders first. An existing
connector or suitable example can be adapted; do not generate a duplicate by
default.
The local [example sketches](../../examples/custom-connectors/README.md)
illustrate Azure AI/Foundry action blocks and a Symbis Utilities connector;
they contain no deployable connector definition.

## Prepare

1. Confirm the target environment, intended API endpoint, operations,
   authentication method, owner, and any solution name. For Azure AI, confirm
   the intended Foundry resource/deployment and usage-billing preference.
2. Inspect the provided OpenAPI file. Power Automate imports OpenAPI **2.0**;
   check its operations, unique `operationId`s, schemas, host/base path,
   security definition, and size. Treat example hosts and API versions as
   placeholders until checked against the intended service.
3. Inspect every referenced connector policy and custom code script. Preserve
   required `apiProperties.json` policy instances, `scriptOperations`, and
   `.csx` files; do not claim the connector works from Swagger alone when an
   operation depends on a missing policy or script.
4. Prepare an `apiDefinition.swagger.json` or supported OpenAPI file and an
   `apiProperties.json` in a reviewable local folder. Use `pac connector init`
   to scaffold connection properties when helpful, then adapt them. Keep keys
   and tokens in the connector connection or approved secret store, never in
   Swagger, `apiProperties.json`, examples, or skill text. Use Dutch action
   summaries that name the business operation clearly.
5. Explain which connector actions the flow will expose, how each action maps
   to the API, the required permissions, and the separate Power Automate and
   Azure/Foundry cost or licensing considerations. Do not invent prices.

## Create and verify

`pac connector create --api-definition-file <path> --api-properties-file
<path> --environment <environment-id-or-url>` creates a connector in the
selected environment. Add `--script-file`, `--settings-file`, or
`--solution-unique-name` only when required by the prepared connector. Run
`pac connector create` only after the user has authorized that cloud change.
`pac connector update` changes an existing connector and needs the same
authorization. Check current `pac connector` help before running commands.

After creation, verify the connector in the intended environment, establish a
connection through the normal credential flow, and inspect the actual
operations with FlowAgent. Only then use those operations in `build-flow` or
`create-flow`. A local schema check or successful create command alone does
not prove authentication, policies, scripts, action behavior, or billing.

For a supplied Microsoft Foundry/Responses Swagger, check that actions routed
by a policy (for example a friendly path rewritten to `/responses`) have the
matching policy in `apiProperties.json`. Do not copy environment-specific
hosts or customer configuration into this plugin's example files.

References: [Power Platform CLI](https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/connector),
[OpenAPI import](https://learn.microsoft.com/en-us/connectors/custom-connectors/define-openapi-definition),
[Microsoft custom connector examples](https://github.com/microsoft/PowerPlatformConnectors/tree/dev/custom-connectors).
