# Example: Symbis Utilities

**Concept only.** One custom connector could group small, reusable operations
implemented in one C# custom-code script, without a separate Azure Function or
API for operations that can run locally. The examples below are proposed
action names, not implemented operations.

| Group | Example visible actions | Typical result |
|---|---|---|
| **JSON** | Filter lijst; Sorteer lijst; Groepeer lijst; Verwijder duplicaten; Selecteer velden | A named array or object |
| **Tekst** | Haal tekst op met regex; Vervang tekst; Normaliseer tekst | Text or a list of matches |
| **CSV** | CSV naar JSON; JSON naar CSV | Records or CSV text |
| **XML** | XML naar JSON; Lees nodes met XPath | Structured data or selected nodes |
| **Codering en crypto** | Base64 coderen; URL coderen; Bereken SHA-256; Bereken HMAC; Maak GUID; Pak gzip uit | Encoded text, hash, ID, or bytes |

Further candidate actions include JSON merge/flatten/unflatten and field
renaming; text split/join/trim, substring, multiple regex matches, and HTML
tag removal; CSV header, delimiter, and column selection; JSON-to-XML and
namespace handling; SHA-512, Base64/URL decoding, and gzip compression.
Each needs its own input/output contract and proportional tests before it is
presented as available in a real connector.

Example: **Lees verkoopregels** → **Filter actieve regels** → **Sorteer op
prijs** → **Bewaar de selectie**. Separate visible actions keep the business
rules explainable. A **Transformeer JSON** action can combine several internal
operations when they together form one clearly named business step and expose
its inputs and output plainly; do not hide unrelated decisions in it.

Microsoft's custom-code runtime supports a single script per connector and
dispatch by `OperationId`. It can return a response without forwarding to a
backend, as shown in Microsoft's Hello World example. The documented runtime
uses .NET Standard 2.0 with selected namespaces including JSON, regular
expressions, XML, compression, and cryptography; the script limit is 1 MB and
new connectors have a two-minute execution limit. These are feasibility
boundaries, not proof that every listed operation is already built or suitable
for large files. Bound regex work and decompression, parse XML safely, and keep
HMAC keys in approved secret handling rather than action inputs or source.

Source: [Write code in a custom connector](https://learn.microsoft.com/en-us/connectors/custom-connectors/write-code).
