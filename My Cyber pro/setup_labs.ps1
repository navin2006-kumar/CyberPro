# Copy Labshock files to My Cyber Pro isolated labs

$sourceRoot = "..\labshock\oilsprings"
$destRoot = ".\labs"

Write-Host "Setting up isolated labs..." -ForegroundColor Cyan

# Function to copy lab files
function Setup-Lab {
    param (
        [string]$Name,
        [string]$SourcePath,
        [string]$DestPath
    )

    Write-Host "Configuring $Name lab..." -NoNewline
    
    # Create destination if not exists
    if (!(Test-Path $DestPath)) {
        New-Item -ItemType Directory -Force -Path $DestPath | Out-Null
    }

    # Copy files (excluding docker-compose.yml which we already created custom)
    Copy-Item -Path "$SourcePath\*" -Destination $DestPath -Recurse -Force -Exclude "docker-compose.yml"
    
    Write-Host " Done!" -ForegroundColor Green
}

# 1. SCADA
Setup-Lab -Name "SCADA" -SourcePath "$sourceRoot\scada" -DestPath "$destRoot\scada"

# 2. PLC
Setup-Lab -Name "PLC" -SourcePath "$sourceRoot\plc" -DestPath "$destRoot\plc"

# 3. Pentest
Setup-Lab -Name "Pentest" -SourcePath "$sourceRoot\pentest" -DestPath "$destRoot\pentest"

# 4. Network (IDS)
Setup-Lab -Name "Network/IDS" -SourcePath "$sourceRoot\ids" -DestPath "$destRoot\network"

Write-Host "`nAll lab files copied successfully!" -ForegroundColor Green
Write-Host "You can now run 'npm start' to launch the platform." -ForegroundColor Yellow
