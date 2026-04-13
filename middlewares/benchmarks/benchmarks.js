const { dbQuery } = require('../../helpers/helper');

const validateBenchmarkOptions = async (req, res, next) => {
  const userId = req.user.id;
  try {
    const [userInfo] = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
    if (userInfo.role !== 1) {
      return res.status(403).json({ error: 'Je kunt geen benchmarks aanmaken of bewerken' });
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database query error' });
  }
};

const validateBenchmarkCreation = async (req, res, next) => {
  const userId = req.user.id;
  try {
    const [userInfo] = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
    if (userInfo.role !== 1) {
      return res.status(403).json({ error: 'Je kunt geen benchmarks aanmaken of bewerken' });
    }
    if (!req.body.title) {
      return res.status(403).json({ error: 'Titel is verplicht' });
    }
    if (!req.body.branche_id) {
      return res.status(403).json({ error: 'Geef een branche op' });
    }
    if (!req.body.employee_count) {
      return res.status(403).json({ error: 'Geef het aantal werknemers op' });
    }
    if (!req.body.organization_type_id) {
      return res.status(403).json({ error: 'Geef een organisatietype op' });
    }
    if (!req.body.countries) {
      return res.status(403).json({ error: 'Geef minimaal 1 land op' });
    }
    if (!req.body.cao_id && req.body.has_cao) {
      return res.status(403).json({ error: 'Selecteer een CAO' });
    }
    if (!req.body.source_of_truth_id) {
      return res.status(403).json({ error: 'Geef de bron van informatie mee' });
    }
    if (!req.body.reliability) {
      return res.status(403).json({ error: 'Geef de betrouwbaarheid van informatie op' });
    }
    if (!req.body.benefit_id) {
      return res.status(403).json({ error: 'Geef het id van de gekoppelde arbeidsvoorwaarde mee' });
    }
    if (!req.body.target_group_id) {
      return res.status(403).json({ error: 'Selecteer een doelgroep' });
    }
    if (!req.body.legal_basis_id) {
      return res.status(403).json({ error: 'Selecteer een juridische basis' });
    }
    if (!req.body.description) {
      return res.status(403).json({ error: 'Geef een beschrijving mee' });
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database query error' });
  }
};

module.exports = { validateBenchmarkOptions, validateBenchmarkCreation };