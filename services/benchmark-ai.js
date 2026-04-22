const { callClaudeText, callClaudeJSON, MODELS } = require('../helpers/claude');

const REQUIRED_SCHEMA_KEYS = ['key', 'label', 'type', 'unit', 'show_in_kpi', 'show_in_table'];

const HR_SPECIALIST_SYSTEM = `Je bent een senior HR-benchmarkspecialist voor het Total Benefits platform. Je analyseert Nederlandse arbeidsvoorwaarden ("benefits") en vergelijkt hoe bedrijven deze invullen.

Context over het platform:
- Total Benefits is een SaaS-platform waar HR-teams hun arbeidsvoorwaarden catalogiseren en vergelijken met marktdata.
- Klanten zien per arbeidsvoorwaarde hun eigen implementatie naast geaggregeerde observaties van andere bedrijven.
- Observaties ("benchmarks") beschrijven hoe andere bedrijven een specifieke arbeidsvoorwaarde hebben geregeld.

Kernprincipes die je altijd volgt:

1. Taal: zakelijk Nederlands. Geen markdown tenzij expliciet gevraagd. Geen aanhef, geen afsluiting.

2. Terminologie voor de vergelijkingsgroep:
   - Gebruik "andere bedrijven", "de markt", of "overige organisaties".
   - Gebruik NOOIT "vergelijkbare bedrijven", "peers", "soortgelijke organisaties", of formuleringen die suggereren dat de vergelijkingsgroep qua branche, grootte of sector matcht. De data bevat niet noodzakelijk matchende bedrijven.

3. Wettelijk vs. bovenwettelijk:
   - Je analyseert UITSLUITEND bovenwettelijke invullingen — dus wat bedrijven bovenop het wettelijk minimum aanbieden.
   - Wettelijke minima (bijvoorbeeld de 20 wettelijke vakantiedagen, wettelijk verplichte zwangerschapsuitkering) hebben geen benchmark-waarde en horen niet in je output.
   - Zie je in een observatie alleen wettelijke informatie, behandel die observatie dan alsof er niets in staat: geen parameters extraheren, niet noemen in inzichten.

4. Feitelijkheid: gebruik uitsluitend wat in de aangeleverde data staat. Geen externe kennis, geen aannames, geen standaardwaarden.

5. Geen advies: beschrijf wat de data laat zien. Geen aanbevelingen, suggesties, of prescriptieve taal ("overweeg", "het advies luidt", "zou kunnen", "is verstandig", "implementeer").`;

const generateSchema = async (benefit, descriptions) => {
    const numbered = descriptions
        .map((d, i) => `${i + 1}. "${d}"`)
        .join('\n');

    const prompt = `Analyseer de volgende arbeidsvoorwaarde en alle beschikbare observaties uit benchmarkdata.

Arbeidsvoorwaarde: "${benefit.title}"
Beschrijving: "${benefit.introduction}"

Observaties (${descriptions.length} stuks):
${numbered}

Taak: Bepaal welke meetbare bovenwettelijke implementatie-parameters relevant zijn voor het benchmarken van deze arbeidsvoorwaarde.

Regels voor parameterselectie:
- Maximaal 3 parameters. Kies de drie meest onderscheidende.
- Kies alleen parameters die in meerdere observaties terugkomen. Negeer details die slechts in één observatie voorkomen.
- Kies parameters die daadwerkelijk variëren tussen observaties. Parameters die in alle observaties dezelfde waarde hebben voegen niets toe aan een benchmark.
- Negeer wettelijke minima in observaties. Kies geen parameter die slechts de wettelijke ondergrens uitdrukt.
- Combineer een boolean-vlag niet met de bijbehorende numerieke waarde als twee aparte parameters. Kies óf de boolean (wel/niet aanwezig) óf de numerieke waarde (hoeveel), niet beide. Als de numerieke waarde altijd impliceert dat het aanwezig is, kies dan de numerieke waarde.
- Geef prioriteit aan kerngetallen (percentages, bedragen, duur) boven contextuele flags.

Richtlijn show_in_kpi: true voor kerngetallen die direct vergelijkbaar zijn tussen organisaties (bijv. percentage, bedrag, duur). false voor boolean of contextuele velden.

Geef je antwoord terug als geldig JSON in dit exacte formaat, zonder markdown, zonder uitleg:
{
  "schema": [
    {
      "key": "string (snake_case, Engels)",
      "label": "string (Nederlands, kort)",
      "type": "number" | "boolean" | "string",
      "unit": "string of null",
      "show_in_kpi": boolean,
      "show_in_table": boolean
    }
  ]
}`;

    const response = await callClaudeJSON(prompt, {
        system: HR_SPECIALIST_SYSTEM,
        model: MODELS.REASONING,
    });

    for (const entry of response.schema) {
        for (const key of REQUIRED_SCHEMA_KEYS) {
            if (!(key in entry)) {
                throw new Error(`Schema entry missing required key: "${key}"`);
            }
        }
    }

    return response.schema;
};

const extractParams = async (schema, description) => {
    const prompt = `Parameterenschema:
${JSON.stringify(schema, null, 2)}

Observatietekst:
"${description}"

Taak: Extraheer de parameterwaarden uit UITSLUITEND deze observatietekst op basis van het schema.

Regels:
- Extraheer alleen waarden die expliciet in DEZE tekst staan. Lees niets af uit andere observaties of externe kennis.
- Gebruik null als de waarde niet expliciet in deze tekst voorkomt. Raad niet. Vul niet in met een standaardwaarde.
- Als de tekst uitsluitend een wettelijk minimum beschrijft zonder bovenwettelijke invulling, retourneer null voor alle parameters.
- Gebruik het juiste datatype per parameter: number voor "number", true/false voor "boolean", string voor "string".

Geef je antwoord terug als geldig JSON in dit exacte formaat, zonder markdown, zonder uitleg:
{
  "values": { "key": waarde, ... }
}`;

    const response = await callClaudeJSON(prompt, {
        system: HR_SPECIALIST_SYSTEM,
        model: MODELS.EXTRACTION,
    });
    const values = response.values;

    const allNull = Object.values(values).every((v) => v === null);
    if (allNull) {
        console.warn(`[benchmark-ai] extractParams: all values null for description: "${description.slice(0, 80)}..."`);
    }

    return values;
};

const generateInsight = async (benefit, clientProfile, clientImplementation, aggregates, observationCount) => {
    const employeeCountStr = clientProfile.employee_count != null
        ? `~${clientProfile.employee_count} medewerkers`
        : 'onbekende grootte';

    const brancheStr = clientProfile.branche_name != null
        ? clientProfile.branche_name
        : 'onbekende branche';

    const aggregatesFormatted = Object.entries(aggregates)
        .map(([, agg]) => {
            if ('avg' in agg) {
                const unit = agg.unit || '';
                return `- ${agg.label}: gemiddeld ${agg.avg}${unit}, range ${agg.min}${unit}–${agg.max}${unit}`;
            }
            return `- ${agg.label}: ${agg.true_pct}% biedt dit`;
        })
        .join('\n');

    const implementationBlock = clientImplementation && clientImplementation.trim().length > 0
        ? `Huidige implementatie bij ${clientProfile.name}:\n${clientImplementation}`
        : `Huidige implementatie bij ${clientProfile.name}: niet ingevuld.`;

    const prompt = `Schrijf een beschrijvend inzicht van 3 tot 4 zinnen over de arbeidsvoorwaarde "${benefit.title}" voor ${clientProfile.name}.

Bedrijfsprofiel:
- Naam: ${clientProfile.name}
- Branche: ${brancheStr}
- Organisatiegrootte: ${employeeCountStr}

${implementationBlock}

Marktdata van andere bedrijven (gebaseerd op ${observationCount} observaties):
${aggregatesFormatted}

Taak:
- Contrasteer de huidige implementatie bij ${clientProfile.name} met wat andere bedrijven doen volgens de marktdata.
- Benoem concreet waar ${clientProfile.name} boven, onder, of gelijk aan het marktgemiddelde zit voor de getoonde parameters.
- Als de implementatie bij ${clientProfile.name} niet is ingevuld, beschrijf dan uitsluitend wat de marktdata laat zien zonder conclusies over ${clientProfile.name}.

Regels:
- Beschrijf uitsluitend feiten uit de data hierboven. Geen externe kennis.
- Geen aanbevelingen of adviezen. Geen prescriptieve taal.
- Noem concrete getallen uit de aggregates waar relevant.
- Schrijf lopende tekst. Geen opsomming. Geen markdown. Geen aanhef.`;

    const text = await callClaudeText(prompt, {
        system: HR_SPECIALIST_SYSTEM,
        model: MODELS.REASONING,
    });
    return text.trim();
};

module.exports = { generateSchema, extractParams, generateInsight };
