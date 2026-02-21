const fs = require('fs');
const path = './ui/src/js/simpleweb/json/companies.json';

// Read the JSON file
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

console.log('Original count:', data.length);

// Remove duplicates based on company name
const seen = new Set();
const unique = [];

data.forEach((company) => {
  if (!seen.has(company.name)) {
    seen.add(company.name);
    unique.push(company);
  }
});

console.log('Unique count:', unique.length);
console.log('Duplicates removed:', data.length - unique.length);

// Renumber IDs sequentially
const renumbered = unique.map((company, index) => ({
  id: index + 1,
  name: company.name,
  branche: company.branche,
}));

// Write back to file
fs.writeFileSync(path, JSON.stringify(renumbered, null, 2) + '\n', 'utf8');
console.log('File updated successfully!');
