# Interactive PowerShell Setup for TAPAS Live Telephony (Calls, SMS & WhatsApp)

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TAPAS Live Telephony Setup (Automated Calls, SMS, WhatsApp)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$phone = Read-Host "Enter your Mobile Number to receive alerts (e.g. +919876543210)"
if (-not $phone) {
    Write-Host "Phone number cannot be empty." -ForegroundColor Red
    exit 1
}

$hasTwilio = Read-Host "Do you have Twilio credentials ready? (y/n)"

if ($hasTwilio -eq 'y' -or $hasTwilio -eq 'Y') {
    $sid = Read-Host "Enter your Twilio Account SID (e.g. ACxxxxxxxxxxxxxxxx)"
    $token = Read-Host "Enter your Twilio Auth Token"
    $fromNum = Read-Host "Enter your Twilio Sender Phone Number (e.g. +1234567890)"

    & "c:\Users\Pranav\TAPAS\TAPAS_BT\.venv\Scripts\python.exe" "backend\scripts\setup_live_telephony.py" $phone $sid $token $fromNum
    Write-Host ""
    Write-Host "[SUCCESS] Telephony configured! Restart your backend server to apply:" -ForegroundColor Green
    Write-Host "  cd backend && uvicorn app.main:app --port 8000 --reload" -ForegroundColor Yellow
} else {
    & "c:\Users\Pranav\TAPAS\TAPAS_BT\.venv\Scripts\python.exe" "backend\scripts\setup_live_telephony.py" $phone
    Write-Host ""
    Write-Host "[INFO] Your phone number was saved as the primary emergency contact in the database." -ForegroundColor Green
    Write-Host "To make your phone physically ring, obtain a free Twilio trial at https://www.twilio.com/try-twilio and run this script again." -ForegroundColor Yellow
}
