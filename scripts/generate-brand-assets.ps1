[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$assetDirectory = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\img'
if (-not (Test-Path -LiteralPath $assetDirectory -PathType Container)) {
    throw "Brand asset directory was not found: $assetDirectory"
}

$emerald = [System.Drawing.ColorTranslator]::FromHtml('#2b825b')
$accent = [System.Drawing.ColorTranslator]::FromHtml('#40bf86')
$light = [System.Drawing.ColorTranslator]::FromHtml('#f4f4f4')
$white = [System.Drawing.Color]::White

function New-MarkBitmap {
    param(
        [Parameter(Mandatory)]
        [int] $Size,

        [switch] $Favicon
    )

    $bitmap = [System.Drawing.Bitmap]::new(
        $Size,
        $Size,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
    $scale = $Size / 64.0

    try {
        if ($Favicon) {
            $graphics.Clear($emerald)
            $upperBrush = [System.Drawing.SolidBrush]::new($white)
            $lowerBrush = $upperBrush
        }
        else {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $upperBrush = [System.Drawing.SolidBrush]::new($light)
            $lowerBrush = [System.Drawing.SolidBrush]::new($accent)
        }

        try {
            $graphics.FillRectangle($upperBrush, 8 * $scale, 8 * $scale, 48 * $scale, 12 * $scale)
            $graphics.FillRectangle($upperBrush, 8 * $scale, 8 * $scale, 20 * $scale, 28 * $scale)
            $graphics.FillRectangle($lowerBrush, 8 * $scale, 44 * $scale, 48 * $scale, 12 * $scale)
            $graphics.FillRectangle($lowerBrush, 36 * $scale, 28 * $scale, 20 * $scale, 28 * $scale)
        }
        finally {
            if (-not [object]::ReferenceEquals($upperBrush, $lowerBrush)) {
                $lowerBrush.Dispose()
            }
            $upperBrush.Dispose()
        }
    }
    finally {
        $graphics.Dispose()
    }

    return $bitmap
}

$favicon32 = New-MarkBitmap -Size 32 -Favicon
$appleTouchIcon = New-MarkBitmap -Size 180 -Favicon
$brandMark = New-MarkBitmap -Size 512

try {
    $favicon32.Save(
        (Join-Path $assetDirectory 'favicon-32.png'),
        [System.Drawing.Imaging.ImageFormat]::Png
    )
    $appleTouchIcon.Save(
        (Join-Path $assetDirectory 'apple-touch-icon.png'),
        [System.Drawing.Imaging.ImageFormat]::Png
    )
    $brandMark.Save(
        (Join-Path $assetDirectory 'practical-architecture-mark-512.png'),
        [System.Drawing.Imaging.ImageFormat]::Png
    )

    # Write a 32-bit BMP-backed ICO directly so the emerald is not quantized
    # to a legacy 16-color Windows palette by System.Drawing.Icon.Save().
    $size = 32
    $xorByteLength = $size * $size * 4
    $maskStride = [int] ([Math]::Ceiling($size / 32.0) * 4)
    $maskByteLength = $maskStride * $size
    $imageByteLength = 40 + $xorByteLength + $maskByteLength
    $stream = [System.IO.File]::Create((Join-Path $assetDirectory 'favicon.ico'))
    try {
        $writer = [System.IO.BinaryWriter]::new($stream)
        try {
            $writer.Write([uint16] 0)                 # Reserved
            $writer.Write([uint16] 1)                 # ICO image type
            $writer.Write([uint16] 1)                 # One image
            $writer.Write([byte] 32)                  # Width
            $writer.Write([byte] 32)                  # Height
            $writer.Write([byte] 0)                   # No indexed palette
            $writer.Write([byte] 0)                   # Reserved
            $writer.Write([uint16] 1)                 # Color planes
            $writer.Write([uint16] 32)                # Bits per pixel
            $writer.Write([uint32] $imageByteLength)  # Image byte length
            $writer.Write([uint32] 22)                # Image byte offset

            $writer.Write([uint32] 40)                # BITMAPINFOHEADER size
            $writer.Write([int32] $size)              # Width
            $writer.Write([int32] ($size * 2))        # XOR + AND mask height
            $writer.Write([uint16] 1)                 # Color planes
            $writer.Write([uint16] 32)                # Bits per pixel
            $writer.Write([uint32] 0)                 # BI_RGB compression
            $writer.Write([uint32] $xorByteLength)    # Pixel byte length
            $writer.Write([int32] 0)                  # Horizontal resolution
            $writer.Write([int32] 0)                  # Vertical resolution
            $writer.Write([uint32] 0)                 # Colors used
            $writer.Write([uint32] 0)                 # Important colors

            for ($y = $size - 1; $y -ge 0; $y--) {
                for ($x = 0; $x -lt $size; $x++) {
                    $pixel = $favicon32.GetPixel($x, $y)
                    $writer.Write([byte] $pixel.B)
                    $writer.Write([byte] $pixel.G)
                    $writer.Write([byte] $pixel.R)
                    $writer.Write([byte] $pixel.A)
                }
            }

            $writer.Write([byte[]]::new($maskByteLength))
        }
        finally {
            $writer.Dispose()
        }
    }
    finally {
        $stream.Dispose()
    }
}
finally {
    $favicon32.Dispose()
    $appleTouchIcon.Dispose()
    $brandMark.Dispose()
}

Write-Output "Generated favicon and raster brand assets in $assetDirectory"
