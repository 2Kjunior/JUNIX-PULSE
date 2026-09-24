Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\simon\.gemini\antigravity-ide\brain\94fb2fbb-44c3-4ee9-ab41-a504bcf94a75\.user_uploaded\media_1790263949631.png"
$assetsDir = "c:\Users\simon\Desktop\Projets\junix-pulse\assets\images"

$sourceImg = [System.Drawing.Bitmap]::new($sourcePath)

# 1. icon.png (1024x1024 direct copy)
$iconBmp = [System.Drawing.Bitmap]::new(1024, 1024)
$g = [System.Drawing.Graphics]::FromImage($iconBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::White)
$g.DrawImage($sourceImg, 0, 0, 1024, 1024)
$g.Dispose()
$iconBmp.Save("$assetsDir\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Dispose()
Write-Host "icon.png saved."

# 2. android-icon-foreground.png (Safe zone ~72% centered on white background)
$fgBmp = [System.Drawing.Bitmap]::new(1024, 1024)
$g = [System.Drawing.Graphics]::FromImage($fgBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::White)
# Scale to 740x740 and center: offset = (1024 - 740) / 2 = 142
$targetSize = 740
$offset = [int]((1024 - $targetSize) / 2)
$g.DrawImage($sourceImg, $offset, $offset, $targetSize, $targetSize)
$g.Dispose()
$fgBmp.Save("$assetsDir\android-icon-foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
$fgBmp.Dispose()
Write-Host "android-icon-foreground.png saved."

# 3. splash-icon.png (Centered emblem for splash screen)
$splashBmp = [System.Drawing.Bitmap]::new(1024, 1024)
$g = [System.Drawing.Graphics]::FromImage($splashBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
# Draw source image centered
$g.DrawImage($sourceImg, 0, 0, 1024, 1024)
$g.Dispose()
$splashBmp.Save("$assetsDir\splash-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$splashBmp.Dispose()
Write-Host "splash-icon.png saved."

# 4. favicon.png (48x48)
$favBmp = [System.Drawing.Bitmap]::new(48, 48)
$g = [System.Drawing.Graphics]::FromImage($favBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::White)
$g.DrawImage($sourceImg, 0, 0, 48, 48)
$g.Dispose()
$favBmp.Save("$assetsDir\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$favBmp.Dispose()
Write-Host "favicon.png saved."

# Also save official logo as official-logo.png in assets/images
Copy-Item $sourcePath "$assetsDir\official-logo.png" -Force
Write-Host "official-logo.png copied."

$sourceImg.Dispose()
Write-Host "All assets generated successfully!"
