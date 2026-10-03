# Start Cốc Cốc with Remote Debugging on port 9222 for MCP
$coccocPath = "C:\Program Files\CocCoc\Browser\Application\browser.exe"
$debugProfile = "$env:TEMP\coccoc-mcp-debug-profile"

if (Test-Path $coccocPath) {
    Write-Host "Starting Coc Coc with Remote Debugging on port 9222..." -ForegroundColor Cyan
    Start-Process -FilePath $coccocPath -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=$debugProfile"
    Write-Host "Coc Coc is now running with port 9222 ready for MCP chrome-devtools!" -ForegroundColor Green
} else {
    Write-Error "Coc Coc not found at $coccocPath"
}
