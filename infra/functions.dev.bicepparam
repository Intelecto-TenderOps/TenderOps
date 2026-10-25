using './functions.bicep'
param environment = 'dev'
param namePrefix = 'tenderops'
param corsOrigins = [
  'http://127.0.0.1:5173'
  'http://localhost:5173'
]
