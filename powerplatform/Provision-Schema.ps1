param(
    [Parameter(Mandatory)][uri]$OrganizationUrl,
    [Parameter(Mandatory)][string]$SolutionUniqueName,
    [string]$Prefix = 'tpo',
    [switch]$Apply
)
$ErrorActionPreference = 'Stop'
if ($OrganizationUrl.Scheme -ne 'https' -or $OrganizationUrl.AbsolutePath -ne '/') { throw 'Provide an HTTPS organization origin.' }
if ($Prefix -notmatch '^[a-z][a-z0-9]{1,7}$' -or $SolutionUniqueName -notmatch '^[A-Za-z][A-Za-z0-9_]+$') { throw 'Invalid prefix or solution name.' }
$manifest = Get-Content -LiteralPath "$PSScriptRoot/schema.json" -Raw | ConvertFrom-Json
# Access token comes from a secure process environment, never an argument or a tracked file.
if (-not $env:TENDEROPS_DATAVERSE_TOKEN) { throw 'Set TENDEROPS_DATAVERSE_TOKEN in a secure local session (do not print it).' }
$api = $OrganizationUrl.AbsoluteUri.TrimEnd('/') + '/api/data/v9.2/'
$headers = @{ Authorization = "Bearer $env:TENDEROPS_DATAVERSE_TOKEN"; 'OData-Version' = '4.0'; 'OData-MaxVersion' = '4.0'; 'MSCRM.SolutionUniqueName' = $SolutionUniqueName }
function Label([string]$text) { return @{ LocalizedLabels = @(@{ Label = $text; LanguageCode = 1033 }) } }
function Request([string]$method, [string]$relative, $body) {
    $parameters = @{ Method = $method; Uri = $api + $relative; Headers = $headers }
    if ($null -ne $body) { $parameters.Body = ConvertTo-Json -InputObject $body -Depth 30; $parameters.ContentType = 'application/json; charset=utf-8' }
    return Invoke-RestMethod @parameters
}
$solution = Request GET "solutions?`$select=solutionid,uniquename&`$filter=uniquename eq '$SolutionUniqueName'" $null
if ($solution.value.Count -ne 1) { throw 'Select an existing unmanaged solution after checking its publisher. No solution is created implicitly.' }
$solutionDetails = Request GET "solutions($($solution.value[0].solutionid))?`$select=ismanaged&`$expand=publisherid(`$select=customizationprefix)" $null
if ($solutionDetails.ismanaged -or $solutionDetails.publisherid.customizationprefix -ne $Prefix) { throw 'Unmanaged solution publisher must match the requested prefix.' }
$report = @()
foreach ($table in $manifest.tables) {
    $logical = "${Prefix}_$($table.kind)"
    $metadata = Request GET "EntityDefinitions?`$select=MetadataId,LogicalName,EntitySetName,IsOptimisticConcurrencyEnabled&`$filter=LogicalName eq '$logical'" $null
    if ($metadata.value.Count -eq 0) {
        $report += [pscustomobject]@{ Table = $logical; Status = 'Missing'; ExpectedSet = "${logical}s" }
        if (-not $Apply) { continue }
        $attributes = @()
        foreach ($column in @($manifest.common.columns) + @($table.columns)) {
            if ($null -eq $column) { continue }
            $attribute = @{ SchemaName = "${Prefix}_$($column.name)"; DisplayName = Label $column.name; RequiredLevel = @{ Value = $(if ($column.required) { 'ApplicationRequired' } else { 'None' }) }; IsAuditEnabled = @{ Value = $true } }
            switch ($column.type) {
                'String' { $attribute['@odata.type'] = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'; $attribute.AttributeType = 'String'; $attribute.MaxLength = $column.maxLength; $attribute.IsPrimaryName = [bool]$column.primary }
                'Memo' { $attribute['@odata.type'] = 'Microsoft.Dynamics.CRM.MemoAttributeMetadata'; $attribute.AttributeType = 'Memo'; $attribute.MaxLength = $column.maxLength; $attribute.IsSecured = [bool]$table.securedPayload }
                'Integer' { $attribute['@odata.type'] = 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata'; $attribute.AttributeType = 'Integer'; $attribute.MinValue = 0; $attribute.MaxValue = 2147483647; $attribute.Format = 'None' }
                'DateTime' { $attribute['@odata.type'] = 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata'; $attribute.AttributeType = 'DateTime'; $attribute.Format = 'DateAndTime'; $attribute.DateTimeBehavior = @{ Value = 'UserLocal' } }
                'Boolean' { $attribute['@odata.type'] = 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata'; $attribute.AttributeType = 'Boolean'; $attribute.DefaultValue = $false; $attribute.OptionSet = @{ TrueOption = @{ Value = 1; Label = Label 'Yes' }; FalseOption = @{ Value = 0; Label = Label 'No' } } }
                default { throw "Unsupported column type: $($column.type)" }
            }
            $attributes += $attribute
        }
        $entity = @{ SchemaName = $logical; EntitySetName = "${logical}s"; DisplayName = Label $table.label; DisplayCollectionName = Label $table.label; OwnershipType = 'UserOwned'; HasActivities = $false; HasNotes = $false; IsActivity = $false; IsAuditEnabled = @{ Value = $true }; IsOptimisticConcurrencyEnabled = $true; PrimaryNameAttribute = "${Prefix}_name"; Attributes = $attributes }
        Request POST 'EntityDefinitions' $entity | Out-Null
    } else {
        $report += [pscustomobject]@{ Table = $logical; Status = 'Exists - verify fields, privileges and relationships'; ExpectedSet = $metadata.value[0].EntitySetName }
        if ($metadata.value[0].EntitySetName -ne "${logical}s" -or -not $metadata.value[0].IsOptimisticConcurrencyEnabled) { throw "Incompatible metadata: $logical" }
    }
    if ($Apply -and $table.kind -ne 'company') {
        $relation = "${Prefix}_company_$($table.kind)"
        $exists = Request GET "RelationshipDefinitions?`$select=SchemaName&`$filter=SchemaName eq '$relation'" $null
        if ($exists.value.Count -eq 0) {
            Request POST 'RelationshipDefinitions' @{ '@odata.type' = 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata'; SchemaName = $relation; ReferencedEntity = "${Prefix}_company"; ReferencingEntity = $logical; Lookup = @{ SchemaName = "${Prefix}_company"; DisplayName = Label 'Company'; RequiredLevel = @{ Value = 'ApplicationRequired' } }; CascadeConfiguration = @{ Assign = 'NoCascade'; Delete = 'Restrict'; Merge = 'NoCascade'; Reparent = 'NoCascade'; Share = 'NoCascade'; Unshare = 'NoCascade' } } | Out-Null
        }
    }
}
if ($Apply) { Request POST 'PublishAllXml' @{} | Out-Null }
$report | Format-Table
Write-Output 'No runtime connection is accepted until field security, owner role, alternate identity strategy and two-company tests are verified. Export the real managed solution using Package-Solution.ps1.'
