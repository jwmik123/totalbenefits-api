const { callClaudeText, callClaudeJSON } = require('../helpers/claude');

const REQUIRED_SCHEMA_KEYS = ['key', 'label', 'type', 'unit', 'show_in_kpi', 'show_in_table'];

const generateSchema = async (benefit, descriptions) => {
    const numbered = descriptions
        .map((d, i) => `${i + 1}. "${d}"`)
        .join('\n');

    const prompt = `Je bent een HR-data-analist. Analyseer de volgende arbeidsvoorwaarde en alle beschikbare observaties uit benchmarkdata.

Arbeidsvoorwaarde: "${benefit.title}"
Beschrijving: "${benefit.introduction}"

Observaties (${descriptions.length} stuks):
${numbered}

Taak: Bepaal welke meetbare implementatie-parameters relevant zijn voor het benchmarken van deze arbeidsvoorwaarde op basis van ALLE observaties hierboven.

Regels voor parameterselectie:
- Maximaal 3 parameters. Kies de drie meest onderscheidende.
- Kies alleen parameters die in meerdere observaties terugkomen. Negeer details die slechts in één observatie voorkomen.
- Kies parameters die daadwerkelijk variëren tussen observaties. Parameters die in alle observaties dezelfde waarde hebben voegen niets toe aan een benchmark.
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

    const response = await callClaudeJSON(prompt);

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
    const prompt = `Je bent een HR-data-analist.

Parameterenschema:
${JSON.stringify(schema, null, 2)}

Observatietekst:
"${description}"

Taak: Extraheer de parameterwaarden uit UITSLUITEND deze observatietekst op basis van het schema.

Regels:
- Extraheer alleen waarden die expliciet in DEZE tekst staan. Lees niets af uit andere observaties of externe kennis.
- Gebruik null als de waarde niet expliciet in deze tekst voorkomt. Raad niet. Vul niet in met een standaardwaarde.
- Gebruik het juiste datatype per parameter: number voor "number", true/false voor "boolean", string voor "string".

Geef je antwoord terug als geldig JSON in dit exacte formaat, zonder markdown, zonder uitleg:
{
  "values": { "key": waarde, ... }
}`;

    const response = await callClaudeJSON(prompt);
    const values = response.values;

    const allNull = Object.values(values).every((v) => v === null);
    if (allNull) {
        console.warn(`[benchmark-ai] extractParams: all values null for description: "${description.slice(0, 80)}..."`);
    }

    return values;
};

const generateInsight = async (benefit, clientProfile, aggregates, observationCount) => {
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

    const prompt = `Je bent een HR-benchmarkspecialist. Schrijf een beschrijvend inzicht van 3 tot 4 zinnen in zakelijk Nederlands over de arbeidsvoorwaarde "${benefit.title}" voor ${clientProfile.name}.

Regels:
- Beschrijf uitsluitend wat de marktdata hieronder laat zien. Geen adviezen, aanbevelingen, voorstellen, of suggesties.
- Geen domeinkennis of externe feiten toevoegen. Beperk je strikt tot wat in de data staat.
- Geen prescriptieve taal zoals "het advies luidt", "overweeg", "implementeer", "zou kunnen", "is verstandig". Blijf bij feitelijke observaties.
- Plaats de cijfers in context van ${clientProfile.name} door te verwijzen naar branche en grootte waar relevant, zonder conclusies te trekken over wat ${clientProfile.name} zou moeten doen.

Bedrijfsprofiel:
- Naam: ${clientProfile.name}
- Branche: ${brancheStr}
- Organisatiegrootte: ${employeeCountStr}

Marktdata (gebaseerd op ${observationCount} observaties):
${aggregatesFormatted}

Schrijf lopende tekst. Geen opsomming. Geen markdown. Geen aanhef.`;

    const text = await callClaudeText(prompt);
    return text.trim();
};

module.exports = { generateSchema, extractParams, generateInsight };
