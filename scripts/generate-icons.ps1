Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path (Get-Location) "AIMPLB_logo.png"
$publicDir = Join-Path (Get-Location) "public"

if (!(Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir -Force
}

# Copy direct master logo file to public
Copy-Item -Path $srcPath -Destination (Join-Path $publicDir "AIMPLB_logo.png") -Force
Copy-Item -Path $srcPath -Destination (Join-Path $publicDir "logo.png") -Force
Copy-Item -Path $srcPath -Destination (Join-Path $publicDir "new_logo.png") -Force
Write-Output "Copied AIMPLB_logo.png to public master assets."

function Resize-Image($sourcePath, $destPath, $targetWidth, $targetHeight, $padRatio = 0.0, $bgColor = $null) {
    $srcImage = [System.Drawing.Image]::FromFile($sourcePath)
    $destBitmap = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($bgColor -ne $null) {
        $graphics.Clear($bgColor)
    } else {
        $graphics.Clear([System.Drawing.Color]::Transparent)
    }

    $usableWidth = $targetWidth * (1.0 - $padRatio)
    $usableHeight = $targetHeight * (1.0 - $padRatio)

    $scale = [Math]::Min($usableWidth / $srcImage.Width, $usableHeight / $srcImage.Height)
    $destW = [int]($srcImage.Width * $scale)
    $destH = [int]($srcImage.Height * $scale)
    $destX = [int](($targetWidth - $destW) / 2)
    $destY = [int](($targetHeight - $destH) / 2)

    $graphics.DrawImage($srcImage, $destX, $destY, $destW, $destH)
    $graphics.Dispose()
    $srcImage.Dispose()

    $destBitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBitmap.Dispose()
    Write-Output "Generated $destPath ($targetWidth x $targetHeight, pad: $padRatio)"
}

$whiteBg = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)

# Standard Android PWA Icons with 18% safe padding and crisp white background so circular masks don't clip
Resize-Image $srcPath (Join-Path $publicDir "icon-192.png") 192 192 0.18 $whiteBg
Resize-Image $srcPath (Join-Path $publicDir "icon-512.png") 512 512 0.18 $whiteBg

# iOS Apple Touch Icon with 14% padding
Resize-Image $srcPath (Join-Path $publicDir "apple-touch-icon.png") 180 180 0.14 $whiteBg
Resize-Image $srcPath (Join-Path $publicDir "apple-touch-icon-precomposed.png") 180 180 0.14 $whiteBg

# Android Adaptive Maskable Icon with 25% safe zone padding (strictly follows W3C PWA spec)
Resize-Image $srcPath (Join-Path $publicDir "maskable-icon-512.png") 512 512 0.25 $whiteBg

# Browser Favicons
Resize-Image $srcPath (Join-Path $publicDir "favicon-32x32.png") 32 32 0.05 $null
Resize-Image $srcPath (Join-Path $publicDir "favicon-16x16.png") 16 16 0.05 $null

# Generate favicon.ico from 32x32
$bmp32 = New-Object System.Drawing.Bitmap (Join-Path $publicDir "favicon-32x32.png")
$iconHandle = $bmp32.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$fileStream = [System.IO.File]::OpenWrite((Join-Path $publicDir "favicon.ico"))
$icon.Save($fileStream)
$fileStream.Close()
$bmp32.Dispose()
Write-Output "Generated favicon.ico with proper padding."
