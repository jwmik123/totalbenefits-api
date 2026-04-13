const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const passwordRoutes = require('./routes/password');
const dashboardRoutes = require('./routes/dashboard/dashboard');
const usersRoutes = require('./routes/users/users');
const companiesRoutes = require('./routes/companies/companies');
const employeesRoutes = require('./routes/employees/employees');
const themesRoutes = require('./routes/themes/themes');
const entitiesRoutes = require('./routes/entities/entities');
const coreValuesRoutes = require('./routes/core-values/core-values');
const benefitsRoutes = require('./routes/benefits/benefits');
const benefitsDBRoutes = require('./routes/benefits-db/benefits-db');
const favoritesRoutes = require('./routes/favorites/favorites');
const branchesRoutes = require('./routes/branches/branches');
const sdgsRoutes = require('./routes/sdgs/sdgs');
const subbranchesRoutes = require('./routes/subbranches/subbranches');
const tagsRoutes = require('./routes/tags/tags');
const statusesRoutes = require('./routes/statuses/statuses');
const compensationTypesRoutes = require('./routes/compensation-types/compensation-types');
const taxRegimesRoutes = require('./routes/tax-regimes/tax-regimes');
const targetGroupsRoutes = require('./routes/target-groups/target-groups');
const deepDiveRoutes = require('./routes/deepdives/deepdives');
const bestPracticesRoutes = require('./routes/best-practices/best-practices');
const benchmarksRoutes = require('./routes/benchmarks/benchmarks');
const uploadRoutes = require('./routes/upload/upload');
const authenticateJWT = require('./middlewares/authenticate');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.APP_PORT || 3000;

// Enable CORS
const corsOptions = {
  origin: process.env.APP_ORIGIN, // Allow requests from this frontend origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
  credentials: true, // Allow cookies and Authorization headers
  allowedHeaders: ['Content-Type', 'Authorization'], // Custom headers to allow
};

//app.use(cors(corsOptions));
app.use(cors());

// Middleware for parsing JSON
app.use(express.json());
//app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/password', passwordRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/users', usersRoutes);
app.use('/companies', companiesRoutes);
app.use('/employees', employeesRoutes);
app.use('/themes', themesRoutes);
app.use('/entities', entitiesRoutes);
app.use('/core-values', coreValuesRoutes);
app.use('/benefits', benefitsRoutes);
app.use('/benefits-db', benefitsDBRoutes);
app.use('/favorites', favoritesRoutes);
app.use('/branches', branchesRoutes);
app.use('/sdgs', sdgsRoutes);
app.use('/subbranches', subbranchesRoutes);
app.use('/tags', tagsRoutes);
app.use('/statuses', statusesRoutes);
app.use('/compensation-types', compensationTypesRoutes);
app.use('/tax-regimes', taxRegimesRoutes);
app.use('/target-groups', targetGroupsRoutes)
app.use('/deepdives', deepDiveRoutes);
app.use('/best-practices', bestPracticesRoutes);
app.use('/benchmarks', benchmarksRoutes);
app.use('/upload', uploadRoutes);

app.get('/protected', authenticateJWT, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

