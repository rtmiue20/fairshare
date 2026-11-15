<#
  Chụp ảnh màn hình FairShare cho User Guide (WP5 – M5), có nhãn thời gian trên ảnh.
  Dùng Microsoft Edge chạy ẩn + Chrome DevTools Protocol (không cần cài thêm gói nào).

  Cách chạy (staging đang chạy, đã chạy scripts/uat-seed.py):
      powershell -ExecutionPolicy Bypass -File scripts\capture-screens.ps1 [-BaseUrl http://localhost:8081]
  Ảnh lưu vào docs\qa\evidence\user-guide\*.png
#>
param(
  [string]$BaseUrl = "http://localhost:8081",
  [string]$OutDir  = "docs\qa\evidence\user-guide",
  [int]$Width = 1440, [int]$Height = 900
)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$pw = ((Get-Content .uat-credentials.local) | Where-Object { $_ -like "PASSWORD=*" }).Split("=", 2)[1]
function Login($email) {
  (Invoke-RestMethod -Method Post "$BaseUrl/api/auth/login" -ContentType "application/json; charset=utf-8" `
     -Body (@{ email = $email; password = $pw } | ConvertTo-Json)).data
}

# --- Mở Edge ẩn với cổng DevTools
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
          "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$port = 9333
$profileDir = Join-Path $env:TEMP "fairshare-cdp-$([guid]::NewGuid().ToString('N').Substring(0,8))"
$proc = Start-Process $edge -PassThru -ArgumentList @("--headless=new", "--remote-debugging-port=$port",
  "--user-data-dir=$profileDir", "--window-size=$Width,$Height", "--hide-scrollbars", "--lang=vi-VN", "about:blank")
$target = $null
for ($i = 0; $i -lt 30 -and -not $target; $i++) {
  Start-Sleep -Milliseconds 500
  try { $target = (Invoke-RestMethod "http://127.0.0.1:$port/json") | Where-Object { $_.type -eq "page" } | Select-Object -First 1 } catch {}
}
if (-not $target) { throw "Không mở được Edge DevTools" }

$ws = New-Object System.Net.WebSockets.ClientWebSocket
$ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()
$script:msgId = 0
function Cdp($method, $params = @{}) {
  $script:msgId++
  $id = $script:msgId
  $json = @{ id = $id; method = $method; params = $params } | ConvertTo-Json -Depth 10 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $seg = New-Object "System.ArraySegment[byte]" -ArgumentList (,$bytes)
  $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
  $buf = New-Object byte[] 1048576
  $rseg = New-Object "System.ArraySegment[byte]" -ArgumentList (,$buf)
  while ($true) {
    $ms = New-Object IO.MemoryStream
    do {
      $res = $ws.ReceiveAsync($rseg, [Threading.CancellationToken]::None).Result
      $ms.Write($buf, 0, $res.Count)
    } while (-not $res.EndOfMessage)
    $msg = [Text.Encoding]::UTF8.GetString($ms.ToArray()) | ConvertFrom-Json
    if ($msg.id -eq $id) { return $msg.result }
  }
}
function Eval($js) { (Cdp "Runtime.evaluate" @{ expression = $js; awaitPromise = $true; returnByValue = $true }).result.value }
function Go($path) { Cdp "Page.navigate" @{ url = "$BaseUrl$path" } | Out-Null; Start-Sleep -Seconds 4 }
function Shot($name, $caption) {
  $stamp = Get-Date -Format "dd/MM/yyyy HH:mm"
  $label = "FairShare staging · $caption · chụp lúc $stamp"
  Eval @"
(() => { const d = document.createElement('div'); d.id = 'fs-shot-stamp';
  d.textContent = $(ConvertTo-Json $label);
  d.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;background:rgba(15,23,42,.85);color:#fff;font:600 13px/1.4 Segoe UI,Arial;padding:6px 10px;border-radius:6px;pointer-events:none';
  document.body.appendChild(d); return true; })()
"@ | Out-Null
  $png = (Cdp "Page.captureScreenshot" @{ format = "png" }).data
  [IO.File]::WriteAllBytes((Join-Path $repo "$OutDir\$name.png"), [Convert]::FromBase64String($png))
  Eval "document.getElementById('fs-shot-stamp')?.remove()" | Out-Null
  Write-Host "  [OK] $name.png  ($caption)"
}
function SignIn($session) {
  $userJson = ($session.user | ConvertTo-Json -Compress -Depth 5)
  Eval "localStorage.setItem('token', $(ConvertTo-Json $session.accessToken)); localStorage.setItem('fairshare_user', $(ConvertTo-Json $userJson)); true" | Out-Null
}

try {
  Cdp "Page.enable" | Out-Null
  Cdp "Emulation.setDeviceMetricsOverride" @{ width = $Width; height = $Height; deviceScaleFactor = 1; mobile = $false } | Out-Null
  Write-Host "== Chụp màn hình trên $BaseUrl"
  Go "/login";    Shot "01-dang-nhap" "Đăng nhập"
  Go "/register"; Shot "02-dang-ky" "Đăng ký"

  $lead = Login "uat01@fairshare.test"
  Go "/login"; SignIn $lead
  $teamId = ((Invoke-RestMethod -Headers @{ Authorization = "Bearer $($lead.accessToken)" } "$BaseUrl/api/teams").data |
             Where-Object { $_.name -like "UAT*" } | Select-Object -First 1).id
  Go "/teams";                         Shot "03-danh-sach-nhom" "Nhóm đồ án (Leader uat01)"
  Go "/teams/$teamId";                 Shot "04-chi-tiet-nhom" "Chi tiết nhóm, mã mời, sprint"
  Go "/teams/$teamId/board";           Shot "05-task-board" "Task Board nội bộ (CR-02)"
  $opened = Eval "(() => { const b = [...document.querySelectorAll('button[title]')].find(x => x.title === 'Chi tiết thẻ'); if (!b) return false; b.click(); return true })()"
  Start-Sleep -Seconds 2
  if ($env:FS_DEBUG) { Write-Host ("  DEBUG titles: " + (Eval "JSON.stringify([...new Set([...document.querySelectorAll('button[title]')].map(b=>b.title))].slice(0,15))")); Write-Host ("  DEBUG h3: " + (Eval "JSON.stringify([...document.querySelectorAll('h3')].map(h=>h.textContent.trim()).slice(0,10))")) }
  $found = $false
  for ($t = 0; $opened -and -not $found -and $t -lt 10; $t++) {
    Start-Sleep -Milliseconds 500
    $found = Eval "[...document.querySelectorAll('h3')].some(h => h.textContent.trim() === 'Chi tiết công việc')"
  }
  $opened = $opened -and $found
  if ($opened) { Shot "06-chi-tiet-the" "Chi tiết thẻ: người phụ trách, SP, hạn, minh chứng" } else { Write-Host "  [BỎ QUA] 06-chi-tiet-the: không mở được hộp chi tiết thẻ" }
  Go "/dashboard?teamId=$teamId"
  $navJs = "(label) => { const el = [...document.querySelectorAll('h1,h2,h3,h4,div,span,p')].find(e => e.children.length === 0 && e.textContent.trim().toLowerCase().startsWith(label)); if (!el) return false; window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); return true }"
  Eval "($navJs)('tỷ lệ đóng góp tổng thể')" | Out-Null; Start-Sleep -Seconds 3
  Shot "07-bang-dong-gop" "Bảng đóng góp: tỷ lệ đóng góp theo thành viên"
  if (Eval "($navJs)('bằng chứng truy vết minh chứng')") { Start-Sleep -Seconds 3; Shot "07b-bang-chung" "Bảng đóng góp: bằng chứng gốc (truy vết)" }
  Go "/contributions/manual?teamId=$teamId"; Shot "08-khai-bao-dong-gop" "Khai báo đóng góp ngoài board"
  Go "/peer-review?teamId=$teamId";    Shot "09-cham-cheo" "Chấm chéo ẩn danh (đủ 3 phiếu)"
  Go "/alerts";                        Shot "10-canh-bao" "Cảnh báo sớm"
  Go "/report?teamId=$teamId";         Shot "11-xuat-bao-cao" "Xuất báo cáo PDF"
  Go "/profile";                       Shot "12-ho-so-consent" "Hồ sơ & Consent"

  $member = Login "uat02@fairshare.test"
  Go "/login"; SignIn $member
  Go "/peer-review?teamId=$teamId";    Shot "13-cham-cheo-duoi-nguong" "Chấm chéo: thành viên chưa đủ 3 phiếu"
}
finally {
  try { $ws.Dispose() } catch {}
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*$profileDir*" } | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
  Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue
}
