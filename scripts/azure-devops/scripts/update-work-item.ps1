<#
.SYNOPSIS
    Updates a single field on an Azure DevOps Work Item using JSON Patch.

.DESCRIPTION
    This script performs a PATCH request to the Azure DevOps Work Item Tracking API (v7.1) 
    to modify specific fields on a work item. It reads the Personal Access Token (PAT) 
    from the AZDO_PAT environment variable for authentication and is designed to fail fast 
    if required parameters or credentials are missing.

.PARAMETER Organization
    The Azure DevOps organization name (e.g., 'blakboi').
.PARAMETER Project
    The Azure DevOps project name (e.g., 'SqlCopilot').
.PARAMETER WorkItemId
    The numeric ID of the work item to update.
.PARAMETER Field
    The full field reference name (e.g., 'System.State' or 'Custom.DeploymentEnvironment').
.PARAMETER Value
    The new value for the specified field.

.EXAMPLE
    # Move a work item to 'Active' state
    .\scripts\azure-devops\scripts\update-work-item.ps1 `
      -Organization blakboi `
      -Project SqlCopilot `
      -WorkItemId 123 `
      -Field System.State `
      -Value Active

.NOTES
    Requires 'AZDO_PAT' environment variable to be set.
    Uses the Azure DevOps Work Item Tracking API v7.1 (PATCH).
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$Organization,

    [Parameter(Mandatory=$true)]
    [string]$Project,

    [Parameter(Mandatory=$true)]
    [int]$WorkItemId,

    [Parameter(Mandatory=$true)]
    [string]$Field,

    [Parameter(Mandatory=$true)]
    [string]$Value
)

# --- Configuration and Setup ---
$apiBase = "https://dev.azure.com/$Organization/$Project/_apis/wit/workitems/$WorkItemId?api-version=7.1"
# 1. Check for PAT environment variable
if (-not $env:AZDO_PAT) {
    Write-Error "The AZDO_PAT environment variable is not set. Please export your Personal Access Token."
    exit 1
}

try {
    # 2. Construct the JSON Patch payload
    $patchBody = @(
        @{
            op = "add"
            path = "/fields/$Field"
            value = $Value
        }
    ) | ConvertTo-Json -Depth 10

    Write-Verbose "Attempting to patch work item $WorkItemId in project $Project..."

    # 3. Make the API call using Invoke-RestMethod
    $headers = @{
        "Authorization" = "Basic " + [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes(":$env:AZDO_PAT"))
        "Content-Type" = "application/json-patch+json"
    }

    $response = Invoke-RestMethod -Uri $apiBase `
                                  -Method PATCH `
                                  -Headers $headers `
                                  -Body $patchBody

    # 4. Success output and validation
    Write-Host "✅ SUCCESS: Work Item '$WorkItemId' in project '$Project' updated successfully."
    Write-Host "Field Updated: '$Field'"
    Write-Host "New Value: '$Value'"
    Write-Host "Revision: $($response.rev)"

} catch {
    # 5. Error handling and clear logging
    Write-Error "❌ FAILED to update Work Item $WorkItemId in project $Project."
    if ($_.Exception.Response) {
        $errorDetails = $_.Exception.Response | ConvertFrom-Json
        Write-Error "Azure DevOps API Error Details: $($errorDetails | Select-Object -ExpandProperty message)"
    } else {
        Write-Error "A general error occurred: $($_.Exception.Message)"
    }
    exit 1
}
