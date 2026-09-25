# Ontwerpregel: uitlegbare Power Automate-flows

Ontwerp flows voor overdracht aan Nederlandstalige klanten. De stappen in de
designer en de uitvoeringsgeschiedenis moeten het bedrijfsproces zichtbaar maken.
Leesbaarheid en uitlegbaarheid gaan vóór het aantal acties, de kortste expressie
of de snelste generatie van een flow.

- Geef de flow, acties, voorwaarden, lussen en scopes duidelijke Nederlandse
  namen. Beschrijf de handeling of beslissing, bijvoorbeeld
  `Controleer_of_bijlage_een_PDF_is`. Houd technische actiereferenties stabiel
  zodra andere acties ernaar verwijzen.
- Maak iedere betekenisvolle bedrijfsstap een afzonderlijke actie. Gebruik
  standaardacties zoals **Voorwaarde**, **Toepassen op elke**, **Array filteren**,
  **Samenstellen** en **JSON parseren** wanneer ze tussenresultaten of keuzes
  zichtbaar maken. Groepeer samenhangende stappen in een benoemde scope.
- Een complexe expressie binnen één actie mag als die actie één helder doel
  heeft en de invoer, uitkomst en fout in de uitvoeringsgeschiedenis te volgen
  zijn. Splits een expressie wanneer zij meerdere beslissingen, controles of
  transformaties tegelijk verbergt. Maak geen extra acties voor louter cosmetische
  tussenwaarden zonder eigen betekenis.
- Gebruik arrays voor werkelijke lijsten en objecten voor gestructureerde
  gegevens. Verberg een bedrijfsregel over meerdere items niet in een
  ondoorzichtige filter- of map-expressie als afzonderlijke acties de regel
  beter tonen.
- Een template is alleen een startpunt. Hernoem en splits de acties voordat je
  de flow oplevert als de template het proces onvoldoende laat zien.

Controleer vóór creatie of oplevering iedere zichtbare actie: kan je in één
Nederlandse zin uitleggen wat zij doet, welke invoer zij gebruikt en wat haar
uitkomst is? Splits of hernoem een actie als dat niet lukt. Behoud altijd de
technische validatie van de definitie en de vereiste verbindingen.

Bijvoorbeeld bij mailbijlagen: `Doorloop_de_bijlagen` →
`Controleer_of_bijlage_een_PDF_is` → `Sla_de_PDF_op` →
`Leg_het_resultaat_vast`. De werkelijke acties hangen af van de connector en
de gewenste uitkomst.
