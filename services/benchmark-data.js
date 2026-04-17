const { dbQuery } = require('../helpers/helper');

const getBenefitById = async (benefitId) => {
    const results = await dbQuery('SELECT * FROM ns_bd_benefits WHERE id = ?', [benefitId]);
    return results[0] || null;
};

const getBenchmarksForBenefit = async (benefitId) => {
    const sql = `
        SELECT
            nb.*,
            bc.title,
            bc.branche_id,
            bc.employee_count,
            bc.has_cao,
            bc.organization_type_id,
            bc.cao_id,
            br.name AS branch_name
        FROM ns_benchmarks nb
        INNER JOIN ns_benchmark_companies bc ON nb.benchmark_company_id = bc.id
        LEFT JOIN ns_branches br ON bc.branche_id = br.id
        WHERE nb.benefit_id = ? AND nb.active = 1
        ORDER BY nb.id ASC
    `;
    return dbQuery(sql, [benefitId]);
};

const getClientProfile = async (companyId) => {
    const sql = `
        SELECT
            c.id,
            c.name,
            c.branche,
            c.subbranche,
            cp.employee_count
        FROM ns_companies c
        LEFT JOIN ns_companyprofiles cp ON cp.company = c.id
        WHERE c.id = ?
    `;
    const results = await dbQuery(sql, [companyId]);
    return results[0] || null;
};

const getParameterSchema = async (benefitId) => {
    const results = await dbQuery(
        'SELECT parameters, updated_at FROM ns_benefit_parameter_schemas WHERE benefit_id = ?',
        [benefitId]
    );
    if (!results[0]) return null;
    return {
        parameters: results[0].parameters,
        updated_at: results[0].updated_at,
    };
};

const saveParameterSchema = async (benefitId, parameters) => {
    const sql = `
        INSERT INTO ns_benefit_parameter_schemas (benefit_id, parameters)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE parameters = VALUES(parameters)
    `;
    return dbQuery(sql, [benefitId, JSON.stringify(parameters)]);
};

const getExtractedParams = async (benchmarkIds) => {
    if (benchmarkIds.length === 0) return new Map();
    const placeholders = benchmarkIds.map(() => '?').join(', ');
    const rows = await dbQuery(
        `SELECT benchmark_id, parameters FROM ns_benchmark_extracted_params WHERE benchmark_id IN (${placeholders})`,
        benchmarkIds
    );
    const map = new Map();
    for (const row of rows) {
        map.set(row.benchmark_id, row.parameters);
    }
    return map;
};

const saveExtractedParams = async (benchmarkId, benefitId, parameters) => {
    const sql = `
        INSERT INTO ns_benchmark_extracted_params (benchmark_id, benefit_id, parameters)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE parameters = VALUES(parameters), extracted_at = NOW()
    `;
    return dbQuery(sql, [benchmarkId, benefitId, JSON.stringify(parameters)]);
};

const getStaleBenchmarks = async (benefitId, schemaUpdatedAt) => {
    const sql = `
        SELECT
            nb.*,
            bc.title,
            bc.branche_id,
            bc.employee_count,
            bc.has_cao,
            bc.organization_type_id,
            bc.cao_id,
            br.name AS branch_name
        FROM ns_benchmarks nb
        INNER JOIN ns_benchmark_companies bc ON nb.benchmark_company_id = bc.id
        LEFT JOIN ns_branches br ON bc.branche_id = br.id
        LEFT JOIN ns_benchmark_extracted_params ep ON ep.benchmark_id = nb.id
        WHERE nb.benefit_id = ?
          AND nb.active = 1
          AND (
            ? IS NULL
            OR ep.benchmark_id IS NULL
            OR ep.extracted_at < nb.updated_at
            OR ep.extracted_at < ?
          )
        ORDER BY nb.id ASC
    `;
    return dbQuery(sql, [benefitId, schemaUpdatedAt, schemaUpdatedAt]);
};

const getInsight = async (benefitId, companyId) => {
    const sql = `
        SELECT insight_text, generated_at
        FROM ns_benefit_benchmark_insights
        WHERE benefit_id = ? AND company_id = ? AND expires_at > NOW()
    `;
    const results = await dbQuery(sql, [benefitId, companyId]);
    return results[0] || null;
};

const saveInsight = async (benefitId, companyId, insightText) => {
    const sql = `
        INSERT INTO ns_benefit_benchmark_insights (benefit_id, company_id, insight_text, generated_at, expires_at)
        VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
        ON DUPLICATE KEY UPDATE
            insight_text = VALUES(insight_text),
            generated_at = NOW(),
            expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY)
    `;
    return dbQuery(sql, [benefitId, companyId, insightText]);
};

const invalidateInsights = async (benefitId) => {
    return dbQuery(
        'UPDATE ns_benefit_benchmark_insights SET expires_at = NOW() WHERE benefit_id = ?',
        [benefitId]
    );
};

const resolveBdBenefitId = async (nsBenefitId) => {
    const results = await dbQuery(
        'SELECT linked_benefit FROM ns_benefits WHERE id = ?',
        [nsBenefitId]
    );
    return results[0]?.linked_benefit ?? null;
};

module.exports = {
    getBenefitById,
    getBenchmarksForBenefit,
    getClientProfile,
    getParameterSchema,
    saveParameterSchema,
    getExtractedParams,
    saveExtractedParams,
    getStaleBenchmarks,
    getInsight,
    saveInsight,
    invalidateInsights,
    resolveBdBenefitId,
};
