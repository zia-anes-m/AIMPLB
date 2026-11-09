Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path (Get-Location) "AIMPLB_logo.png"
$publicDir = Join-Path (Get-Location) "public"

if (!(Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir -Force
}

# Copy direct high-res master logo files to public
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
    Write-Output "Generated $destPath ($targetWidth x $targetHeight)"
}

# Generate PNG icons
Resize-Image $srcPath (Join-Path $publicDir "icon-192.png") 192 192
Resize-Image $srcPath (Join-Path $publicDir "icon-512.png") 512 512
Resize-Image $srcPath (Join-Path $publicDir "apple-touch-icon.png") 180 180
Resize-Image $srcPath (Join-Path $publicDir "apple-touch-icon-precomposed.png") 180 180
Resize-Image $srcPath (Join-Path $publicDir "favicon-32x32.png") 32 32
Resize-Image $srcPath (Join-Path $publicDir "favicon-16x16.png") 16 16

# Generate maskable icon with 15% safe zone padding and institutional background
$bg = [System.Drawing.Color]::FromArgb(255, 250, 249, 246) # #FAF9F6
Resize-Image $srcPath (Join-Path $publicDir "maskable-icon-512.png") 512 512 0.20 $bg

# Also save favicon.ico
$bmp32 = New-Object System.Drawing.Bitmap (Join-Path $publicDir "favicon-32x32.png")
$iconHandle = $bmp32.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$fileStream = [System.IO.File]::OpenWrite((Join-Path $publicDir "favicon.ico"))
$icon.Save($fileStream)
$fileStream.Close()
$bmp32.Dispose()
Write-Output "Generated favicon.ico from AIMPLB_logo.png"
