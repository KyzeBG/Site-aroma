$ErrorActionPreference = "Stop"

$base = $args[0]
if (-not $base) { $base = "https://site-aroma-flame.vercel.app" }

$doc = Invoke-WebRequest -UseBasicParsing -Uri ($base + "/") -TimeoutSec 30
"HTML_STATUS=$($doc.StatusCode)"
"HTML_CACHE_CONTROL=$($doc.Headers["Cache-Control"])"

$m = [regex]::Match($doc.Content, 'src="(?<src>[^"]*app\.js\?v=[^"]+)"')
if ($m.Success) {
  $src = $m.Groups["src"].Value
} else {
  $src = "NOT_FOUND"
}
"HTML_APPJS_SRC=$src"

if ($src -eq "NOT_FOUND") {
  $appUrl = $base + "/app.js"
} elseif ($src.StartsWith("http")) {
  $appUrl = $src
} else {
  $appUrl = $base + "/" + $src.TrimStart("./")
}
"APP_URL=$appUrl"

$app = Invoke-WebRequest -UseBasicParsing -Uri $appUrl -TimeoutSec 30
"APP_STATUS=$($app.StatusCode)"
"APP_CACHE_CONTROL=$($app.Headers["Cache-Control"])"

$b = [regex]::Match($app.Content, 'const\s+BUILD_ID\s*=\s*"(?<id>[^"]+)"')
if ($b.Success) {
  "APP_BUILD_ID=$($b.Groups["id"].Value)"
} else {
  "APP_BUILD_ID=NOT_FOUND"
}

$data = Invoke-WebRequest -UseBasicParsing -Uri ($base + "/preview-data.json") -TimeoutSec 30
"DATA_STATUS=$($data.StatusCode)"
"DATA_CACHE_CONTROL=$($data.Headers["Cache-Control"])"
