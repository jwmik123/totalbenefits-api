const validateBenchmarkViewParams = (req, res, next) => {
    const nsBenefitId = parseInt(req.params.nsBenefitId, 10);
    if (!req.params.nsBenefitId || isNaN(nsBenefitId) || nsBenefitId <= 0) {
        return res.status(400).json({ message: 'Ongeldig benefit-id' });
    }

    const administrationId = parseInt(req.query.administrationId, 10);
    if (!req.query.administrationId || isNaN(administrationId) || administrationId <= 0) {
        return res.status(400).json({ message: 'Ongeldige administratie' });
    }

    req.nsBenefitId = nsBenefitId;
    req.administrationId = administrationId;
    next();
};

module.exports = { validateBenchmarkViewParams };
