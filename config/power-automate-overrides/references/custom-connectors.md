# Custom connectors: discover before building

Before designing a flow, actively check whether a custom connector can expose
the required API as clear, named actions in the Power Automate designer. Do this
especially for Azure AI, Microsoft Foundry, Azure OpenAI, and APIs that would
otherwise require repeated HTTP actions or large opaque expressions.

Use the local [example sketches](../examples/custom-connectors/README.md) to
show what an Azure AI action block or a grouped utilities connector could look
like. They are illustrative and cannot be imported as connectors.

1. Inspect connectors and operations in the **selected environment** with
   `list_connectors`, `search_operations`, `get_connector`, and
   `get_operation_details`. Check for an existing usable custom connector and
   connection; discovering a connector does not prove the current user can use
   it. `create-connection` creates a connection, not a connector.
2. Search current official documentation and the Microsoft
   [PowerPlatformConnectors custom-connectors folders](https://github.com/microsoft/PowerPlatformConnectors/tree/dev/custom-connectors)
   for a relevant example. Examples include
   [AzureOpenAIService](https://github.com/microsoft/PowerPlatformConnectors/tree/dev/custom-connectors/AzureOpenAIService)
   and [AzureKeyVault](https://github.com/microsoft/PowerPlatformConnectors/tree/dev/custom-connectors/AzureKeyVault).
   Inspect the actual folder: Swagger/OpenAPI, `apiProperties.json`, scripts,
   policies, README, supported operations, authentication, and maintenance
   status. An example is a starting point, not proof that it supports a current
   Foundry or Responses API endpoint.
3. Compare the practical choices for the user's scenario: an existing standard
   action, an existing custom connector, a reusable example that can be adapted,
   and a new custom connector. Prefer a connector when its named actions make
   the flow easier for a Dutch-speaking customer to follow. Do not force extra
   infrastructure when a built-in action already communicates the process well.
4. For AI requests, ask which billing and service the user wants if it is not
   already stated. **If the user prefers Microsoft Foundry/Azure OpenAI
   pay-as-you-go, do not silently switch to AI Builder/Copilot credits.** Check
   that the chosen model and deployment support the requested API and explain
   that Foundry model usage and Power Automate custom-connector licensing are
   separate considerations. Confirm current terms from Microsoft documentation.
5. Tell the user what you found, which operations would become visible blocks,
   what files or access are missing, and whether a connector must first be
   created. Then use `build-custom-connector` to prepare it when needed. Do not
   assume that FlowAgent's `create_flow` or `create-connection` can create a
   custom connector.

For a supplied Swagger file, treat it as a candidate API definition. Verify
OpenAPI 2.0 compatibility, the host/base path, operation IDs and request and
response schemas. Inspect references to connector policies or scripts: a
Swagger file alone does not contain those. Keep environment-specific hosts,
API keys, tokens, and customer data out of public examples and source control.

Sources: [Power Platform CLI connector commands](https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/connector),
[OpenAPI import requirements](https://learn.microsoft.com/en-us/connectors/custom-connectors/define-openapi-definition),
[Microsoft connector examples](https://github.com/microsoft/PowerPlatformConnectors).
