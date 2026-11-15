<#
  Quay video demo dự phòng FairShare (WP5 – M5) bằng Edge chạy ẩn + DevTools screencast,
  có chú thích từng bước trên màn hình. Không cần cài thêm gói nào.

  Cách chạy (staging đang chạy, đã chạy scripts/uat-seed.py):
      powershell -ExecutionPolicy Bypass -File scripts\record-demo.ps1 [-BaseUrl http://localhost:8081]
  Kết quả: docs\qa\evidence\demo\fairshare-demo-<ngày>.avi (MJPEG, mở bằng VLC / Windows Media Player)

  Khung hình chụp bằng Page.captureScreenshot trong lúc chờ ở mỗi bước (ổn định hơn screencast).
  Luồng: đăng nhập -> nhóm -> Task Board (mở thẻ, chuyển thẻ sang cột kế tiếp rồi trả lại)
         -> Bảng đóng góp -> Chấm chéo ẩn danh (đủ / chưa đủ 3 phiếu) -> Xuất báo cáo PDF.
#>
param(
  [string]$BaseUrl = "http://localhost:8081",
  [string]$OutDir  = "docs\qa\evidence\demo",
  [int]$Width = 1280, [int]$Height = 800
)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$frames = Join-Path $env:TEMP "fairshare-frames-$([guid]::NewGuid().ToString('N').Substring(0,8))"
New-Item -ItemType Directory -Force -Path $frames | Out-Null
$pw = ((Get-Content .uat-credentials.local) | Where-Object { $_ -like "PASSWORD=*" }).Split("=", 2)[1]

$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
          "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$port = 9334
$profileDir = Join-Path $env:TEMP "fairshare-cdp-rec-$([guid]::NewGuid().ToString('N').Substring(0,8))"
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
$script:pending = $null
$buf = New-Object byte[] 4194304
$rseg = New-Object "System.ArraySegment[byte]" -ArgumentList (,$buf)
$script:ms = New-Object IO.MemoryStream
$script:nFrames = 0

function Send($method, $params = @{}) {
  $script:msgId++
  $json = @{ id = $script:msgId; method = $method; params = $params } | ConvertTo-Json -Depth 10 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $seg = New-Object "System.ArraySegment[byte]" -ArgumentList (,$bytes)
  $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
  return $script:msgId
}
# Nhận 1 thông điệp (chờ tối đa $timeoutMs); xử lý khung hình screencast ngay khi tới
function Receive([int]$timeoutMs) {
  if (-not $script:pending) { $script:pending = $ws.ReceiveAsync($rseg, [Threading.CancellationToken]::None) }
  if (-not $script:pending.Wait($timeoutMs)) { return $null }
  $res = $script:pending.Result; $script:pending = $null
  $script:ms.Write($buf, 0, $res.Count)
  if (-not $res.EndOfMessage) { return Receive $timeoutMs }
  $msg = [Text.Encoding]::UTF8.GetString($script:ms.ToArray()) | ConvertFrom-Json
  $script:ms.SetLength(0)
  if ($msg.method -eq "Page.screencastFrame") {
    $ts = [long]([double]$msg.params.metadata.timestamp * 1000)
    [IO.File]::WriteAllBytes((Join-Path $frames "$ts.jpg"), [Convert]::FromBase64String($msg.params.data))
    $script:nFrames++
    Send "Page.screencastFrameAck" @{ sessionId = $msg.params.sessionId } | Out-Null
  }
  return $msg
}
function Cdp($method, $params = @{}) {
  $id = Send $method $params
  while ($true) { $m = Receive 30000; if ($m -and $m.id -eq $id) { return $m.result } }
}
function Pump([double]$seconds) {    # chờ và chụp khung hình liên tục (khoảng 8-10 khung/giây)
  $end = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $end) {
    $ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    $img = (Cdp "Page.captureScreenshot" @{ format = "jpeg"; quality = 72 }).data
    if ($img) { [IO.File]::WriteAllBytes((Join-Path $frames "$ts.jpg"), [Convert]::FromBase64String($img)); $script:nFrames++ }
  }
}
function Eval($js) { (Cdp "Runtime.evaluate" @{ expression = $js; awaitPromise = $true; returnByValue = $true }).result.value }
function Caption($text) {
  Eval @"
(() => { let d = document.getElementById('fs-caption'); if (!d) { d = document.createElement('div'); d.id = 'fs-caption';
  d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:22px;z-index:2147483647;max-width:80%;background:rgba(15,23,42,.92);color:#fff;font:600 17px/1.45 Segoe UI,Arial;padding:10px 18px;border-radius:10px;border:1px solid rgba(129,140,248,.6);box-shadow:0 6px 24px rgba(0,0,0,.4);text-align:center;pointer-events:none';
  document.body.appendChild(d); } d.textContent = $(ConvertTo-Json $text); return true })()
"@ | Out-Null
}
function Go($path, $caption, [double]$hold = 4) { Cdp "Page.navigate" @{ url = "$BaseUrl$path" } | Out-Null; Pump 2.5; Caption $caption; Pump $hold }
function Click($js) { Eval $js }
function SmoothScroll([int]$px, [double]$seconds = 3) {
  Eval "(() => { const el = document.scrollingElement; const start = el.scrollTop; const t0 = performance.now(); const d = $($seconds*1000); function step(t){ const p = Math.min(1,(t-t0)/d); el.scrollTop = start + $px*p; if (p<1) requestAnimationFrame(step) } requestAnimationFrame(step); return true })()" | Out-Null
  Pump ($seconds + 0.5)
}
function TypeInto($selector, $value) {
  Eval "(() => { const el = document.querySelector($(ConvertTo-Json $selector)); if (!el) return false; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(el, $(ConvertTo-Json $value)); el.dispatchEvent(new Event('input',{bubbles:true})); return true })()" | Out-Null
}
$cardBtn = "(cardTitle, btnTitle) => { const find = (root) => [...root.querySelectorAll('button[title]')].find(b => b.title === btnTitle); const t = [...document.querySelectorAll('h1,h2,h3,h4,h5,p,span,div')].find(e => e.children.length === 0 && e.textContent.trim() === cardTitle); let el = t; while (el && !find(el)) el = el.parentElement; const b = el && find(el); if (b) b.click(); return !!b }"
$navJs = "(label) => { const el = [...document.querySelectorAll('h1,h2,h3,h4,div,span,p')].find(e => e.children.length === 0 && e.textContent.trim().toLowerCase().startsWith(label)); if (!el) return false; window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); return true }"

try {
  Cdp "Page.enable" | Out-Null
  Cdp "Emulation.setDeviceMetricsOverride" @{ width = $Width; height = $Height; deviceScaleFactor = 1; mobile = $false } | Out-Null

  Go "/login" "FairShare – đo lường và minh bạch hóa đóng góp trong dự án nhóm" 4
  Caption "1. Trưởng nhóm đăng nhập (tài khoản UAT uat01)"
  TypeInto "input[type=email],input[name=email]" "uat01@fairshare.test"; Pump 1
  TypeInto "input[type=password]" $pw; Pump 1
  Click "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Đăng nhập'); if (b) b.click(); return !!b })()" | Out-Null
  Pump 4
  $lead = (Invoke-RestMethod -Method Post "$BaseUrl/api/auth/login" -ContentType "application/json; charset=utf-8" -Body (@{ email = "uat01@fairshare.test"; password = $pw } | ConvertTo-Json)).data
  $teamId = ((Invoke-RestMethod -Headers @{ Authorization = "Bearer $($lead.accessToken)" } "$BaseUrl/api/teams").data | Where-Object { $_.name -like "UAT*" } | Select-Object -First 1).id

  Go "/teams/$teamId" "2. Chi tiết nhóm: thành viên, đồng thuận dữ liệu (NĐ 13/2023), mã mời, sprint" 5
  Go "/teams/$teamId/board" "3. Task Board nội bộ (thay Trello theo CR-02): mọi thao tác sinh sự kiện đóng góp" 4
  Click "(() => { const b = [...document.querySelectorAll('button[title]')].find(x => x.title === 'Chi tiết thẻ'); if (b) b.click(); return !!b })()" | Out-Null
  Pump 1; Caption "Chi tiết thẻ: người phụ trách, story point, hạn, độ khó, checklist, minh chứng"; Pump 5
  Click "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Đóng'); if (b) b.click(); return !!b })()" | Out-Null
  Pump 1.5
  Caption "Chuyển thẻ 'Màn hình Dashboard' sang cột kế tiếp (hệ thống ghi sự kiện CARD_MOVED với cột thật trên server)"
  Eval "($cardBtn)('Màn hình Dashboard', 'Chuyển sang Review')" | Out-Null
  Pump 4
  Caption "Trả thẻ về cột cũ để giữ nguyên dữ liệu UAT"
  Eval "($cardBtn)('Màn hình Dashboard', 'Chuyển sang In Progress')" | Out-Null
  Pump 3

  Go "/dashboard?teamId=$teamId" "4. Bảng đóng góp: tỷ lệ % từng thành viên tính từ sự kiện board" 3
  Eval "($navJs)('tỷ lệ đóng góp tổng thể')" | Out-Null; Pump 1; Caption "Tỷ lệ đóng góp theo thành viên (tổng 100%) – công cụ hỗ trợ ra quyết định"; Pump 5
  if (Eval "($navJs)('bằng chứng truy vết minh chứng')") { Pump 1; Caption "Truy vết bằng chứng gốc: ai làm gì, lúc nào, đúng hạn hay trễ"; Pump 5 }

  Go "/peer-review?teamId=$teamId" "5. Chấm chéo ẩn danh 360°: điểm chỉ hiện khi có ít nhất 3 người chấm" 6
  Go "/report?teamId=$teamId" "6. Báo cáo đóng góp gửi giảng viên – xuất PDF (đo được < 0,1 giây)" 4
  SmoothScroll 700 3
  Caption "FairShare – WP5 Kiểm thử & Triển khai · demo trên staging Docker Compose"; Pump 3
}
finally {
  try { $ws.Dispose() } catch {}
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
  Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue
}
Write-Host "Đã thu $script:nFrames khung hình"
$py = @("py", "python", "python3") | Where-Object { Get-Command $_ -ErrorAction SilentlyContinue } | Select-Object -First 1
$out = Join-Path $OutDir ("fairshare-demo-" + (Get-Date -Format "yyyy-MM-dd") + ".avi")
& $py -X utf8 scripts\frames-to-avi.py $frames $out 10
Remove-Item -Recurse -Force $frames -ErrorAction SilentlyContinue
