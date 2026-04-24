const listEndpoints = require('express-list-endpoints');
const express = require('express');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const COLLECTION_NAME = 'TotalBenefits API';

// Mirror index.js route mounts without starting the server
const app = express();

const routes = [
  ['/auth',               require('../routes/auth')],
  ['/password',           require('../routes/password')],
  ['/dashboard',          require('../routes/dashboard/dashboard')],
  ['/users',              require('../routes/users/users')],
  ['/companies',          require('../routes/companies/companies')],
  ['/employees',          require('../routes/employees/employees')],
  ['/themes',             require('../routes/themes/themes')],
  ['/entities',           require('../routes/entities/entities')],
  ['/core-values',        require('../routes/core-values/core-values')],
  ['/benefits',           require('../routes/benefits/benefits')],
  ['/benefits-db',        require('../routes/benefits-db/benefits-db')],
  ['/favorites',          require('../routes/favorites/favorites')],
  ['/branches',           require('../routes/branches/branches')],
  ['/sdgs',               require('../routes/sdgs/sdgs')],
  ['/subbranches',        require('../routes/subbranches/subbranches')],
  ['/tags',               require('../routes/tags/tags')],
  ['/statuses',           require('../routes/statuses/statuses')],
  ['/compensation-types', require('../routes/compensation-types/compensation-types')],
  ['/tax-regimes',        require('../routes/tax-regimes/tax-regimes')],
  ['/target-groups',      require('../routes/target-groups/target-groups')],
  ['/deepdives',          require('../routes/deepdives/deepdives')],
  ['/best-practices',     require('../routes/best-practices/best-practices')],
  ['/benchmarks',         require('../routes/benchmarks/benchmarks')],
  ['/implementations',    require('../routes/implementations/implementations')],
  ['/upload',             require('../routes/upload/upload')],
];

for (const [prefix, router] of routes) {
  app.use(prefix, router);
}

const endpoints = listEndpoints(app);

// Group by first path segment
const groups = {};
for (const endpoint of endpoints) {
  const segment = endpoint.path.split('/')[1] || 'root';
  if (!groups[segment]) groups[segment] = [];
  groups[segment].push(endpoint);
}

function buildUrl(urlPath) {
  const raw = `${BASE_URL}${urlPath}`;
  const parts = urlPath.split('/').filter(Boolean);
  const withoutProtocol = BASE_URL.replace(/https?:\/\//, '');
  const [hostname, portStr] = withoutProtocol.split(':');
  return {
    raw,
    protocol: BASE_URL.startsWith('https') ? 'https' : 'http',
    host: [hostname],
    ...(portStr && { port: portStr }),
    path: parts.map(p => (p.startsWith(':') ? `{{${p.slice(1)}}}` : p)),
  };
}

function buildRequest(method, urlPath) {
  const needsBody = ['POST', 'PUT', 'PATCH'].includes(method);
  return {
    method,
    header: [
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Authorization', value: 'Bearer {{token}}' },
    ],
    url: buildUrl(urlPath),
    ...(needsBody && {
      body: {
        mode: 'raw',
        raw: '{}',
        options: { raw: { language: 'json' } },
      },
    }),
  };
}

const items = Object.entries(groups).map(([folder, folderEndpoints]) => ({
  name: folder,
  item: folderEndpoints.flatMap(endpoint =>
    endpoint.methods
      .filter(m => m !== 'HEAD')
      .map(method => ({
        name: `${method} ${endpoint.path}`,
        request: buildRequest(method, endpoint.path),
        response: [],
      }))
  ),
}));

const collection = {
  info: {
    name: COLLECTION_NAME,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'token', value: '', type: 'string' },
  ],
  item: items,
};

const outPath = path.join(__dirname, '..', 'postman_collection.json');
fs.writeFileSync(outPath, JSON.stringify(collection, null, 2));
console.log(`Collection written to: ${outPath}`);
console.log(`Folders: ${items.length}, Total requests: ${items.reduce((n, f) => n + f.item.length, 0)}`);
