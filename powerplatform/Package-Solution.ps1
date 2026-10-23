param([Parameter(Mandatory)][string]$SolutionUniqueName, [string]$OutputDirectory = 'artifacts/dataverse')
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
& pac solution export --name $SolutionUniqueName --path "$OutputDirectory/TenderOpsFoundation_managed.zip" --managed true --overwrite
if ($LASTEXITCODE -ne 0) { throw 'Managed export failed. Authenticate to the intended sandbox first.' }
& pac solution export --name $SolutionUniqueName --path "$OutputDirectory/TenderOpsFoundation_unmanaged.zip" --managed false --overwrite
if ($LASTEXITCODE -ne 0) { throw 'Unmanaged export failed.' }
& pac solution unpack --zipfile "$OutputDirectory/TenderOpsFoundation_unmanaged.zip" --folder "$OutputDirectory/source" --packagetype Unmanaged
if ($LASTEXITCODE -ne 0) { throw 'Unpack failed.' }
# Check in reviewed unpacked source after the first verified sandbox run; do not commit tokens.
