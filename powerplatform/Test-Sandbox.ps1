param([Parameter(Mandatory)][uri]$OrganizationUrl, [string]$Prefix = 'tpo')
$ErrorActionPreference = 'Stop'
if ($OrganizationUrl.Scheme -ne 'https' -or $OrganizationUrl.AbsolutePath -ne '/' -or $Prefix -notmatch '^[a-z][a-z0-9]{1,7}$') { throw 'Invalid organization origin or publisher prefix.' }
if (-not $env:TENDEROPS_DATAVERSE_TOKEN) { throw 'Provide a secure process token; never commit or print it.' }
$api = $OrganizationUrl.AbsoluteUri.TrimEnd('/') + '/api/data/v9.2/'
$headers = @{ Authorization = "Bearer $env:TENDEROPS_DATAVERSE_TOKEN"; 'OData-Version' = '4.0' }
$identity = Invoke-RestMethod -Uri ($api + 'WhoAmI') -Headers $headers
if (-not $identity.UserId) { throw 'Application user could not be resolved.' }
$manifest = Get-Content -LiteralPath "$PSScriptRoot/schema.json" -Raw | ConvertFrom-Json
foreach ($table in $manifest.tables) {
    $logical = "${Prefix}_$($table.kind)"
    $metadata = Invoke-RestMethod -Uri ($api + "EntityDefinitions(LogicalName='$logical')?`$select=LogicalName,EntitySetName,IsOptimisticConcurrencyEnabled&`$expand=Attributes(`$select=LogicalName,IsSecured)") -Headers $headers
    if ($metadata.EntitySetName -ne "${logical}s" -or -not $metadata.IsOptimisticConcurrencyEnabled) { throw "Metadata mismatch for $logical" }
    foreach ($column in @($manifest.common.columns) + @($table.columns)) {
        if ($null -eq $column) { continue }
        $attribute = $metadata.Attributes | Where-Object LogicalName -eq "${Prefix}_$($column.name)"
        if ($null -eq $attribute) { throw "Missing column: $logical.$($column.name)" }
        if ($column.name -eq 'payload' -and $table.securedPayload -and -not $attribute.IsSecured) { throw "Sensitive payload is not secured: $logical" }
    }
    if ($table.kind -ne 'company') {
        $relationName = "${Prefix}_company_$($table.kind)"
        $relation = Invoke-RestMethod -Uri ($api + "RelationshipDefinitions?`$select=SchemaName&`$filter=SchemaName eq '$relationName'") -Headers $headers
        if ($relation.value.Count -ne 1) { throw "Missing company relationship: $logical" }
    }
    Write-Output "Metadata verified: $logical"
}
Write-Output 'Read-only metadata smoke passed. This does not validate write privileges, atomic transactions, field profiles, BFF sign-in, cross-company authorization or a managed solution import.'
