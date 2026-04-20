const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const { 
    validateBenchmarkOptions,
    validateBenchmarkCreation 
} = require('../../middlewares/benchmarks/benchmarks');

//Controllers
const {
    listBenchmarkOptions,
    createBenchmark,
    updateBenchmark,
    getBenchmark,
    listBenchmarksByBenefit,
    listBenchMarkCompanies,
    updateBenchmarkOption,
    deleteBenchmarkOption
} = require('../../controllers/benchmarks/benchmarks');
const { viewBenchmark, regenerateInsight } = require('../../controllers/benchmarks/benchmark-view');
const { validateBenchmarkViewParams } = require('../../middlewares/benchmarks/benchmark-view');

//Router
const router = express.Router();

//Routes
router.post('/', authenticateJWT, validateBenchmarkCreation, createBenchmark);
router.get('/options', authenticateJWT, validateBenchmarkOptions, listBenchmarkOptions);
router.get('/companies', authenticateJWT, validateBenchmarkOptions, listBenchMarkCompanies);
router.get('/benefits/:benefitId', authenticateJWT, validateBenchmarkOptions, listBenchmarksByBenefit);
router.get('/view/:nsBenefitId', authenticateJWT, validateBenchmarkViewParams, viewBenchmark);
router.post('/insight/:nsBenefitId', authenticateJWT, validateBenchmarkViewParams, regenerateInsight);
router.get('/:id', authenticateJWT, validateBenchmarkOptions, getBenchmark);
router.put('/:id', authenticateJWT, validateBenchmarkCreation, updateBenchmark);
//router.delete('/:id', authenticateJWT, validateBenchmarkOptions, deleteBenchmarkOption);

module.exports = router;