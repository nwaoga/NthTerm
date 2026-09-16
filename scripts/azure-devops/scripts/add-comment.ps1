<#
.SYNOPSIS
    Adds a comment to an Azure DevOps Work Item.

.DESCRIPTION
    This script performs a POST request to the Azure DevOps Comments API (v7.1-preview.4) 
    to add contextual notes, deployment status, or handover information to a specific work item. 
    It reads the Personal Access Token (PAT) from the AZDO_PAT environment variable for authentication.

.PARAMETER Organization
    The Azure DevOps organization name (e.g., 'blakboi').
.PARAMETER Project
    The Azure DevOps project name (e.g., 'SqlCopilot').
.PARAMETER WorkItemId
    The numeric ID of the work item to add a comment to.
.PARAMETER Comment
    The body text for the comment, formatted in Markdown or plain text.

.EXAMPLE
    # Add a deployment note about testing completion
    .\scripts\azure-devops\scripts\add-comment.ps1 `
      -Organization blakboi `
      -Project SqlCopilot `
      -WorkItemId 456 `
      -Comment "Deployed to UAT on 2026-09-13. Smoke tests passed successfully."

.NOTES
    Requires 'AZDO_PAT' environment variable to be set.
    Uses the Azure DevOps Comments API v7.1-preview.4 (POST).
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
    [string]$Comment
)

# --- Configuration and Setup ---
$apiBase = "https://dev.azure.com/$Organization/$Project/_apis/wit/workItems/$WorkItemId/comments?api-version=7.1-preview.4"

# 1. Check for PAT environment variable
if (-not $env:AZDO_PAT) {
    Write-Error "The AZDO_PAT environment variable is not set. Please export your Personal Access Token."
    exit 1
}

try {
    $body = @{
        "content" = $Comment
    } | ConvertTo-Json -Depth 10

    Write-Verbose "Attempting to add comment to work item $WorkItemId in project $Project..."

    # 2. Construct Headers and make the API call
    $headers = @{
        "Authorization" = "Basic " + [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes(":$env:AZDO_PAT"))
        "Content-Type" = "application/json" # Comments use JSON, not JSON Patch
    }

    $response = Invoke-RestMethod -Uri $apiBase `
                                  -Method POST `
                                  -Headers $headers `
                                  -Body $body

    # 3. Success output and validation
    Write-Host "✅ SUCCESS: Comment added to Work Item '$WorkItemId' in project '$Project'."
    Write-Host "Comment ID: $($response.id)"
    Write-Host "Last Updated By: $($response.commenter)"
    Write-Host "Content Preview: $([System.Math]::Min(20, $Comment.Length)) characters."

} catch {
    # 4. Error handling and clear logging
    Write-Error "❌ FAILED to add comment to Work Item $WorkItemId in project $Project."
    if ($_.Exception.Response) {
        $errorDetails = $_.Exception.Response | ConvertFrom-Json
        Write-Error "Azure DevOps API Error Details: $($errorDetails | Select-Object -ExpandProperty message)"
    } else {
        Write-Error "A general error occurred: $($_.Exception.Message)"
    }
    exit 1
}
