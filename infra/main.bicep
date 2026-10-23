targetScope = 'resourceGroup'
@allowed(['dev', 'test', 'prod'])
param environment string
param location string = resourceGroup().location
param namePrefix string
param apiImage string
param workerImage string
@description('Non-secret runtime values. Use managed Key Vault secret references for credentials; never plain-text Bicep parameters.')
param runtimeVariables array = []
var suffix = uniqueString(resourceGroup().id, namePrefix, environment)
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-${environment}-logs'
  location: location
  properties: { sku: { name: 'PerGB2018' }, retentionInDays: 30 }
}
resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-${environment}-insights'
  location: location
  kind: 'web'
  properties: { Application_Type: 'web', WorkspaceResourceId: logs.id }
}
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'tpo${suffix}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: { minimumTlsVersion: 'TLS1_2', allowBlobPublicAccess: false, allowSharedKeyAccess: false, supportsHttpsTrafficOnly: true }
}
resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: { isVersioningEnabled: true }
}
resource privateContainers 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = [for container in ['quarantine', 'documents', 'sessionkeys']: {
  parent: blobs
  name: container
  properties: { publicAccess: 'None' }
}]
resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'tpo-${suffix}'
  location: location
  properties: {
    tenantId: tenant().tenantId
    sku: { name: 'standard', family: 'A' }
    enableRbacAuthorization: true
    enablePurgeProtection: true
    softDeleteRetentionInDays: 90
    accessPolicies: []
  }
}
resource bus 'Microsoft.ServiceBus/namespaces@2024-01-01' = {
  name: '${namePrefix}-${environment}-${suffix}'
  location: location
  sku: { name: 'Standard', tier: 'Standard' }
  properties: { minimumTlsVersion: '1.2', disableLocalAuth: true }
}
resource queue 'Microsoft.ServiceBus/namespaces/queues@2024-01-01' = {
  parent: bus
  name: 'tenderops-events-v1'
  properties: { requiresDuplicateDetection: true, duplicateDetectionHistoryTimeWindow: 'PT10M', maxDeliveryCount: 5, deadLetteringOnMessageExpiration: true }
}
resource apps 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${namePrefix}-${environment}'
  location: location
  properties: { appLogsConfiguration: { destination: 'log-analytics', logAnalyticsConfiguration: { customerId: logs.properties.customerId, sharedKey: logs.listKeys().primarySharedKey } } }
}
resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-${environment}-api'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: apps.id
    configuration: { activeRevisionsMode: 'Single', ingress: { external: true, targetPort: 8080, allowInsecure: false } }
    template: {
      containers: [{ name: 'api', image: apiImage, resources: { cpu: json('0.5'), memory: '1Gi' }, env: concat([{ name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }, { name: 'Storage__Mode', value: 'Dataverse' }, { name: 'Demo__Enabled', value: 'false' }], runtimeVariables), probes: [{ type: 'Liveness', httpGet: { path: '/health/live', port: 8080 }, initialDelaySeconds: 15 }] }]
      scale: { minReplicas: 1, maxReplicas: 2 }
    }
  }
}
resource worker 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-${environment}-worker'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: apps.id
    configuration: { activeRevisionsMode: 'Single' }
    template: { containers: [{ name: 'worker', image: workerImage, resources: { cpu: json('0.5'), memory: '1Gi' }, env: runtimeVariables }], scale: { minReplicas: 1, maxReplicas: 2 } }
  }
}
output apiHost string = api.properties.configuration.ingress.fqdn
output vaultUri string = vault.properties.vaultUri
output storageAccount string = storage.name
output serviceBusNamespace string = bus.name
output applicationInsightsConnectionString string = insights.properties.ConnectionString
