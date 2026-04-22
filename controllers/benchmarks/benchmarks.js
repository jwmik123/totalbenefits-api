const { dbQuery } = require('../../helpers/helper');
const { invalidateSchemaAndInsights } = require('../../services/benchmark-data');

const listBenchmarkOptions = async (req, res) => {
    const sqlBranches = 'SELECT * FROM ns_branches';
    const sqlOrganizationTypes = 'SELECT * FROM ns_organization_types';
    const sqlCountries = 'SELECT * FROM ns_countries';
    const sqlCaos = 'SELECT * FROM ns_caos';
    const sqlSources = 'SELECT * FROM ns_sources';
    const sqlTargetGroups = 'SELECT * FROM ns_target_groups';
    try {
        const [branches, organizationTypes, countries, caos, sources, targetGroups] = await Promise.all([
            dbQuery(sqlBranches),
            dbQuery(sqlOrganizationTypes),
            dbQuery(sqlCountries),
            dbQuery(sqlCaos),
            dbQuery(sqlSources),
            dbQuery(sqlTargetGroups)
        ]);
        return res.json({
            branches: branches,
            organization_types: organizationTypes,
            countries: countries,
            caos: caos,
            sources: sources,
            target_groups: targetGroups
        });

    } catch (err) {
        console.error("Fout bij ophalen benchmark opties:", err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const listBenchmarksByBenefit = async (req, res) => {
    const benefitId = req.params.benefitId;
    const sqlQuery = `
    SELECT 
    ns_benchmarks.*, 
    ns_benchmark_companies.title,
    ns_benchmark_companies.branche_id,
    ns_benchmark_companies.employee_count,
    ns_benchmark_companies.organization_type_id,
    ns_benchmark_companies.countries,
    ns_benchmark_companies.has_cao,
    ns_benchmark_companies.cao_id
    FROM ns_benchmarks 
    INNER JOIN ns_benchmark_companies ON ns_benchmarks.benchmark_company_id = ns_benchmark_companies.id
    WHERE ns_benchmarks.benefit_id = ?`;
    try {
        const result = await dbQuery(sqlQuery, [benefitId]);
        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const createBenchmark = async (req, res) => {
    const { title, benchmark_company_id, branche_id, employee_count, organization_type_id, countries, has_cao, cao_id, source_of_truth_id, reliability, updated_at, benefit_id, target_group_id, legal_basis_id, statutory_expansion, description, active } = req.body;
    try {
        let companyId = benchmark_company_id;
        if (!companyId) {
            const companySql = 'INSERT INTO ns_benchmark_companies (title, branche_id, employee_count, organization_type_id, countries, has_cao, cao_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
            const companyValues = [title, branche_id, employee_count, organization_type_id, JSON.stringify(countries), has_cao, cao_id];
            const companyResult = await dbQuery(companySql, companyValues);
            companyId = companyResult.insertId;
        }
        const benchmarkSql = 'INSERT INTO ns_benchmarks (benchmark_company_id, source_of_truth_id, reliability, updated_at, benefit_id, target_group_id, legal_basis_id, statutory_expansion, description, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const benchmarkValues = [companyId, source_of_truth_id, reliability, updated_at, benefit_id, target_group_id, legal_basis_id, statutory_expansion, description, active];
        const result = await dbQuery(benchmarkSql, benchmarkValues);
        await invalidateSchemaAndInsights(benefit_id);
        return res.json({
            message: 'Benchmark succesvol aangemaakt',
            id: result.insertId
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const updateBenchmark = async (req, res) => {
    const id = req.params.id;
    const { title, benchmark_company_id, branche_id, employee_count, organization_type_id, countries, has_cao, cao_id, source_of_truth_id, reliability, updated_at, benefit_id, target_group_id, legal_basis_id, statutory_expansion, description, active } = req.body;

    try {
        let companyId = benchmark_company_id;

        if (!companyId) {
            const companySql = 'INSERT INTO ns_benchmark_companies (title, branche_id, employee_count, organization_type_id, countries, has_cao, cao_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
            const companyValues = [title, branche_id, employee_count, organization_type_id, JSON.stringify(countries), has_cao, cao_id];
            const companyResult = await dbQuery(companySql, companyValues);
            companyId = companyResult.insertId;
        } else {
            const companySql = 'UPDATE ns_benchmark_companies SET title = ?, branche_id = ?, employee_count = ?, organization_type_id = ?, countries = ?, has_cao = ?, cao_id = ? WHERE id = ?';
            const companyValues = [title, branche_id, employee_count, organization_type_id, JSON.stringify(countries), has_cao, cao_id, companyId];
            await dbQuery(companySql, companyValues);
        }

        const oldRow = await dbQuery('SELECT benefit_id FROM ns_benchmarks WHERE id = ? LIMIT 1', [id]);
        const oldBenefitId = oldRow.length > 0 ? oldRow[0].benefit_id : null;

        const benchmarkSql = 'UPDATE ns_benchmarks SET benchmark_company_id = ?, source_of_truth_id = ?, reliability = ?, updated_at = ?, benefit_id = ?, target_group_id = ?, legal_basis_id = ?, statutory_expansion = ?, description = ?, active = ? WHERE id = ?';
        const benchmarkValues = [companyId, source_of_truth_id, reliability, updated_at, benefit_id, target_group_id, legal_basis_id, statutory_expansion, description, active, id];
        await dbQuery(benchmarkSql, benchmarkValues);

        await invalidateSchemaAndInsights(benefit_id);
        if (oldBenefitId != null && oldBenefitId !== benefit_id) {
            await invalidateSchemaAndInsights(oldBenefitId);
        }
        return res.json({ message: 'Benchmark succesvol bijgewerkt' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const getBenchmark = async (req, res) => {
    const id = req.params.id;
    const sqlQuery = `
    SELECT 
    ns_benchmarks.*, 
    ns_benchmark_companies.title,
    ns_benchmark_companies.branche_id,
    ns_benchmark_companies.employee_count,
    ns_benchmark_companies.organization_type_id,
    ns_benchmark_companies.countries,
    ns_benchmark_companies.has_cao,
    ns_benchmark_companies.cao_id
    FROM ns_benchmarks 
    INNER JOIN ns_benchmark_companies ON ns_benchmarks.benchmark_company_id = ns_benchmark_companies.id
    WHERE ns_benchmarks.id = ?`;
    try {
        const result = await dbQuery(sqlQuery, [id]);
        return res.json(result[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const listBenchMarkCompanies = async (req, res) => {
    const id = req.params.id;
    const sqlQuery = `
    SELECT * FROM ns_benchmark_companies`;
    try {
        const result = await dbQuery(sqlQuery);
        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const deleteBenchmark = async (req, res) => {
    const id = req.params.id;
    try {
        const oldRow = await dbQuery('SELECT benefit_id FROM ns_benchmarks WHERE id = ? LIMIT 1', [id]);
        if (oldRow.length === 0) {
            return res.status(404).json({ message: 'Benchmark niet gevonden' });
        }
        const benefitId = oldRow[0].benefit_id;
        await dbQuery('DELETE FROM ns_benchmarks WHERE id = ?', [id]);
        await invalidateSchemaAndInsights(benefitId);
        return res.json({ message: 'Benchmark succesvol verwijderd' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { listBenchmarkOptions, listBenchmarksByBenefit, createBenchmark, updateBenchmark, getBenchmark, listBenchMarkCompanies, deleteBenchmark };