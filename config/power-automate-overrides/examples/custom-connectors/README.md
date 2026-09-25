# Custom connector examples

These are **design sketches**, not importable connectors. They show the named
actions a Dutch-speaking customer would see in Power Automate. Each concept
still needs an OpenAPI 2.0 definition, `apiProperties.json`, authentication or
script configuration, testing, and the right environment and licensing before
it can be created.

| Concept | Example actions | Implementation direction |
|---|---|---|
| [Azure AI / Foundry](azure-ai-foundry.md) | Maak AI-antwoord; Analyseer PDF; Roep Foundry-agent aan | Custom connector calling the user's Azure AI/Foundry API |
| [Symbis Utilities](symbis-utilities.md) | Filter lijst; Haal tekst op met regex; CSV naar JSON; Lees XML-nodes; Bereken SHA-256 | One connector with local C# custom code, where feasible |

Check Microsoft's maintained [custom connector example folders](https://github.com/microsoft/PowerPlatformConnectors/tree/dev/custom-connectors)
before building either concept. In particular, the
[AzureOpenAIService folder](https://github.com/microsoft/PowerPlatformConnectors/tree/dev/custom-connectors/AzureOpenAIService)
is a reference for connector structure and authentication; verify its API
operations against the intended Foundry endpoint before reuse.
