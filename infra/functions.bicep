targetScope = 'resourceGroup'

@allowed(['dev', 'test', 'prod'])
param environment string
param location string = resourceGroup().location
param namePrefix string = 'tenderops'
param corsOrigins array = []

var suffix = uniqueString(resourceGroup().id, namePrefix, environment, 'func')
var functionAppName = '${namePrefix}-${environment}-func'
var storageName = take('tno${suffix}', 24)
var deploymentContainer = 'app-package-${functionAppName}'

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-${environment}-func-logs'
  location: location
  properties: { sku: { name: 'PerGB2018' }, retentionInDays: 30 }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-${environment}-func-insights'
  location: location
  kind: 'web'
  properties: { Application_Type: 'web', WorkspaceResourceId: logs.id }
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${namePrefix}-${environment}-func-id'
  location: location
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: { isVersioningEnabled: true }
}

resource packageContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: deploymentContainer
  properties: { publicAccess: 'None' }
}

resource queues 'Microsoft.Storage/storageAccounts/queueServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

var queueNames = ['secop-sync', 'tender-alerts', 'notifications', 'dynamics-reconcile']
resource queueResources 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-05-01' = [for name in queueNames: {
  parent: queues
  name: name
}]

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: take('tno-${environment}-${suffix}', 24)
  location: location
  properties: {
    tenantId: tenant().tenantId
    sku: { name: 'standard', family: 'A' }
    enableRbacAuthorization: true
    enablePurgeProtection: environment == 'prod'
    softDeleteRetentionInDays: 90
    accessPolicies: []
  }
}

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${namePrefix}-${environment}-func-plan'
  location: location
  kind: 'functionapp'
  sku: { name: 'FC1', tier: 'FlexConsumption' }
  properties: { reserved: true }
}

resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: corsOrigins
        supportCredentials: true
      }
    }
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}${deploymentContainer}'
          authentication: {
            type: 'UserAssignedIdentity'
            userAssignedIdentityResourceId: identity.id
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: 40
        instanceMemoryMB: 2048
      }
      runtime: {
        name: 'node'
        version: '22'
      }
    }
  }
}

resource appSettings 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: functionApp
  name: 'appsettings'
  properties: {
    AzureWebJobsStorage__accountName: storage.name
    AzureWebJobsStorage__credential: 'managedidentity'
    AzureWebJobsStorage__clientId: identity.properties.clientId
    APPLICATIONINSIGHTS_CONNECTION_STRING: insights.properties.ConnectionString
    APPLICATIONINSIGHTS_AUTHENTICATION_STRING: 'ClientId=${identity.properties.clientId};Authorization=AAD'
    FUNCTIONS_EXTENSION_VERSION: '~4'
    FUNCTIONS_WORKER_RUNTIME: 'node'
    TENDEROPS_ENVIRONMENT: environment
    DEMO_ENABLED: environment == 'dev' ? 'false' : 'false'
    STORAGE_MODE: 'Dataverse'
    DATAVERSE_PUBLISHER_PREFIX: 'tno'
    DATAVERSE_SOLUTION_NAME: 'TenderOpsFoundation'
    SECOP_II_DATASET_ID: 'p6dx-8zbt'
    SECOP_I_DATASET_ID: 'f789-7hwg'
    SECOP_RETENTION_DAYS: '90'
    SECOP_SYNC_SCHEDULE: '0 0 * * * *'
    SHAREPOINT_SITE_URL: 'https://intelecto1.sharepoint.com/sites/intelectocrm'
    SHAREPOINT_LIBRARY_NAME: 'Cuenta'
    AZURE_FUNCTIONS_BASE_URL: 'https://${functionApp.properties.defaultHostName}'
    AZURE_STORAGE_ACCOUNT_NAME: storage.name
    AZURE_KEY_VAULT_URL: vault.properties.vaultUri
  }
}

resource storageBlobDataContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, identity.id, 'blob')
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource failedRequests 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-${environment}-func-failures'
  location: 'global'
  properties: {
    description: 'Azure Functions HTTP failures'
    severity: 2
    enabled: true
    scopes: [insights.id]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Http5xx'
          metricName: 'requests/failed'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
  }
}

output functionAppHostname string = functionApp.properties.defaultHostName
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}/api/v1'
output vaultUri string = vault.properties.vaultUri
output storageAccount string = storage.name
output applicationInsightsConnectionString string = insights.properties.ConnectionString
output managedIdentityClientId string = identity.properties.clientId
