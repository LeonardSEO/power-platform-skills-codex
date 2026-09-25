# Example: Azure AI / Foundry action blocks

**Concept only.** This is a small example of visible actions, not a deployable
Swagger definition. It does not contain a resource hostname, model deployment,
API key, connector policy, or customer data.

| Action shown in Power Automate | Input | Output |
|---|---|---|
| **Maak AI-antwoord** | Vraag, model/deployment, optional instructions | Answer text, response ID, usage |
| **Analyseer PDF** | Question and PDF content/reference | Answer text and response ID |
| **Roep Foundry-agent aan** | Agent name/version and user request | Agent response and conversation reference |

Example flow: **Ontvang klantvraag** → **Bereid de vraag voor** → **Maak
AI-antwoord** → **Controleer het antwoord** → **Sla het resultaat op**. A
customer can explain each visible step. Keep the API request shaping inside
the connector action when it serves that one step.

The user's supplied Responses/Foundry Swagger illustrates this direction. Its
operations and schemas must be checked against the selected service. A friendly
connector path that is rewritten to a real API path needs its companion policy
in `apiProperties.json`; the Swagger alone does not supply that behavior.
Credentials belong in the connector connection. Model usage is billed through
the selected Azure/Foundry deployment, while Power Automate custom connector
licensing is a separate requirement.
