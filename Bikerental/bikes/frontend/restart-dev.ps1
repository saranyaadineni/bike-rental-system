# Clean restart script for frontend dev server
Write-Host "Clearing Vite cache..."
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue

Write-Host "Verifying @radix-ui/react-tooltip installation..."
if (Test-Path "node_modules\@radix-ui\react-tooltip") {
    Write-Host "✓ Package is installed" -ForegroundColor Green
} else {
    Write-Host "✗ Package missing, reinstalling..." -ForegroundColor Red
    npm install @radix-ui/react-tooltip
}

Write-Host "Starting dev server..."
npm run dev





