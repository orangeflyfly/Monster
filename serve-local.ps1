$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8080
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$listener.Start()

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream)
    $line = $reader.ReadLine()
    if (-not $line) {
      continue
    }

    $parts = $line.Split(' ')
    $urlPath = if ($parts.Length -gt 1) { $parts[1] } else { '/' }

    while ($reader.Peek() -ge 0) {
      $headerLine = $reader.ReadLine()
      if ([string]::IsNullOrEmpty($headerLine)) {
        break
      }
    }

    $decoded = [System.Uri]::UnescapeDataString($urlPath.Split('?')[0])
    if ($decoded -eq '/') {
      $decoded = '/index.html'
    }

    $relative = $decoded.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $path = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relative))
    $rootFull = [System.IO.Path]::GetFullPath($root)

    if (-not $path.StartsWith($rootFull) -or -not (Test-Path -LiteralPath $path -PathType Leaf)) {
      $body = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
      $response = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
      $stream.Write($response, 0, $response.Length)
      $stream.Write($body, 0, $body.Length)
      continue
    }

    $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
    $type = switch ($ext) {
      '.html' { 'text/html; charset=utf-8' }
      '.css' { 'text/css; charset=utf-8' }
      '.js' { 'application/javascript; charset=utf-8' }
      '.json' { 'application/json; charset=utf-8' }
      '.zip' { 'application/zip' }
      default { 'application/octet-stream' }
    }

    $body = [System.IO.File]::ReadAllBytes($path)
    $response = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 OK`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
    $stream.Write($response, 0, $response.Length)
    $stream.Write($body, 0, $body.Length)
  } catch {
  } finally {
    $client.Close()
  }
}
