Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Clear-TransformedRect {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height
  )

  $oldMode = $Graphics.CompositingMode
  $Graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $transparentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Transparent)
  $Graphics.FillRectangle($transparentBrush, $X, $Y, $Width, $Height)
  $transparentBrush.Dispose()
  $Graphics.CompositingMode = $oldMode
}

function New-MakeYourTabIcon {
  param(
    [int]$Size,
    [string]$OutputPath
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $backgroundPath = New-RoundedRectanglePath ($Size * 0.06) ($Size * 0.06) ($Size * 0.88) ($Size * 0.88) ($Size * 0.18)
  $backgroundBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 250, 251, 255))
  $backgroundPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 59, 130, 246)), ([Math]::Max([Math]::Round($Size * 0.028), 1))
  $graphics.FillPath($backgroundBrush, $backgroundPath)
  $graphics.DrawPath($backgroundPen, $backgroundPath)

  $graphics.TranslateTransform($Size / 2, $Size / 2)
  $graphics.RotateTransform(-35)
  $graphics.TranslateTransform(-($Size / 2), -($Size / 2))

  $penWidth = [Math]::Max([Math]::Round($Size * 0.085), 2)
  $outer = New-RoundedRectanglePath ($Size * 0.28) ($Size * 0.10) ($Size * 0.40) ($Size * 0.80) ($Size * 0.20)
  $middle = New-RoundedRectanglePath ($Size * 0.38) ($Size * 0.18) ($Size * 0.23) ($Size * 0.64) ($Size * 0.12)
  $inner = New-RoundedRectanglePath ($Size * 0.47) ($Size * 0.28) ($Size * 0.08) ($Size * 0.42) ($Size * 0.05)

  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 0, 0, 0)), $penWidth
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $graphics.DrawPath($pen, $outer)
  $graphics.DrawPath($pen, $middle)
  $graphics.DrawPath($pen, $inner)

  # Cut the lower-left opening to mimic the supplied paperclip logo.
  Clear-TransformedRect $graphics ($Size * 0.18) ($Size * 0.62) ($Size * 0.30) ($Size * 0.25)
  Clear-TransformedRect $graphics ($Size * 0.30) ($Size * 0.57) ($Size * 0.20) ($Size * 0.20)

  $pen.Dispose()
  $outer.Dispose()
  $middle.Dispose()
  $inner.Dispose()
  $backgroundBrush.Dispose()
  $backgroundPen.Dispose()
  $backgroundPath.Dispose()

  $directory = Split-Path -Parent $OutputPath
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

$iconRoot = Join-Path $PSScriptRoot "..\\icons"
New-MakeYourTabIcon -Size 16 -OutputPath (Join-Path $iconRoot "icon16.png")
New-MakeYourTabIcon -Size 32 -OutputPath (Join-Path $iconRoot "icon32.png")
New-MakeYourTabIcon -Size 48 -OutputPath (Join-Path $iconRoot "icon48.png")
New-MakeYourTabIcon -Size 128 -OutputPath (Join-Path $iconRoot "icon128.png")

Write-Output "icons-generated"
