param(
  [Parameter(Mandatory = $true)][string]$SourcePath,
  [Parameter(Mandatory = $true)][string]$OutputRoot,
  [Parameter(Mandatory = $true)][string]$CharacterId
)

$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSEdition -eq 'Desktop') {
  $drawingAssembly = 'System.Drawing.dll'
  $references = @($drawingAssembly)
  Add-Type -AssemblyName System.Drawing
}
else {
  $drawingAssembly = Join-Path $PSHOME 'System.Drawing.Common.dll'
  $drawingPrimitivesAssembly = Join-Path $PSHOME 'System.Drawing.Primitives.dll'
  $runtimeAssembly = Join-Path $PSHOME 'System.Runtime.dll'
  $collectionsAssembly = Join-Path $PSHOME 'System.Collections.dll'
  $coreLibAssembly = Join-Path $PSHOME 'System.Private.CoreLib.dll'
  $references = @($drawingAssembly, $drawingPrimitivesAssembly, $runtimeAssembly, $collectionsAssembly, $coreLibAssembly)
  Add-Type -Path $drawingAssembly
}

$sourceFull = [System.IO.Path]::GetFullPath($SourcePath)
$outputFull = [System.IO.Path]::GetFullPath($OutputRoot)
if (-not (Test-Path -LiteralPath $sourceFull -PathType Leaf)) {
  throw "Atlas not found: $sourceFull"
}

$code = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class MobbyAtlasSplitter {
  private static bool IsLightBackground(byte b, byte g, byte r, byte a) {
    int max = Math.Max(r, Math.Max(g, b));
    int min = Math.Min(r, Math.Min(g, b));
    return a > 0 && min >= 224 && max - min <= 22;
  }

  private static void ClearConnectedLightBackground(Bitmap bmp) {
    int width = bmp.Width;
    int height = bmp.Height;
    Rectangle bounds = new Rectangle(0, 0, width, height);
    BitmapData data = bmp.LockBits(bounds, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    try {
      int stride = data.Stride;
      int absStride = Math.Abs(stride);
      byte[] bytes = new byte[absStride * height];
      Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
      bool[] seen = new bool[width * height];
      Queue<int> queue = new Queue<int>();
      Action<int, int> add = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        int flat = y * width + x;
        if (seen[flat]) return;
        int offset = y * absStride + x * 4;
        if (!IsLightBackground(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])) return;
        seen[flat] = true;
        queue.Enqueue(flat);
      };
      for (int x = 0; x < width; x++) { add(x, 0); add(x, height - 1); }
      for (int y = 1; y < height - 1; y++) { add(0, y); add(width - 1, y); }
      while (queue.Count > 0) {
        int flat = queue.Dequeue();
        int x = flat % width;
        int y = flat / width;
        int offset = y * absStride + x * 4;
        bytes[offset] = 0;
        bytes[offset + 1] = 0;
        bytes[offset + 2] = 0;
        bytes[offset + 3] = 0;
        for (int dy = -1; dy <= 1; dy++) {
          for (int dx = -1; dx <= 1; dx++) {
            if (dx != 0 || dy != 0) add(x + dx, y + dy);
          }
        }
      }
      Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
    }
    finally {
      bmp.UnlockBits(data);
    }
  }

  public static void Split(string sourcePath, string outputRoot, string characterId) {
    using (Bitmap source = new Bitmap(sourcePath)) {
      if (source.Width < 8 || source.Height < 4) throw new InvalidDataException("Atlas is too small.");
      Color corner = source.GetPixel(0, 0);
      if (IsLightBackground(corner.B, corner.G, corner.R, corner.A)) ClearConnectedLightBackground(source);
      string[] actions = new string[] { "peekaboo", "fall-back", "angry-hands", "sleep-bubble" };
      const int cellSize = 512;
      for (int action = 0; action < actions.Length; action++) {
        string dir = Path.Combine(outputRoot, characterId, actions[action]);
        Directory.CreateDirectory(dir);
        string output = Path.Combine(dir, "spritesheet.png");
        using (Bitmap sheet = new Bitmap(cellSize * 4, cellSize * 2, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(sheet)) {
          g.Clear(Color.Transparent);
          g.CompositingMode = CompositingMode.SourceCopy;
          g.CompositingQuality = CompositingQuality.HighQuality;
          g.InterpolationMode = InterpolationMode.HighQualityBicubic;
          g.PixelOffsetMode = PixelOffsetMode.HighQuality;
          for (int frame = 0; frame < 8; frame++) {
            int sourceColumn = action * 2 + frame % 2;
            int sourceRow = frame / 2;
            int x0 = (int)Math.Round(sourceColumn * source.Width / 8.0, MidpointRounding.AwayFromZero);
            int x1 = (int)Math.Round((sourceColumn + 1) * source.Width / 8.0, MidpointRounding.AwayFromZero);
            int y0 = (int)Math.Round(sourceRow * source.Height / 4.0, MidpointRounding.AwayFromZero);
            int y1 = (int)Math.Round((sourceRow + 1) * source.Height / 4.0, MidpointRounding.AwayFromZero);
            Rectangle crop = Rectangle.FromLTRB(x0, y0, x1, y1);
            int destX = (frame % 4) * cellSize;
            int destY = (frame / 4) * cellSize;
            g.DrawImage(source, new Rectangle(destX, destY, cellSize, cellSize), crop, GraphicsUnit.Pixel);
          }
          sheet.Save(output, ImageFormat.Png);
        }
      }
    }
  }
}
'@

if (-not ('MobbyAtlasSplitter' -as [type])) {
  Add-Type -TypeDefinition $code -ReferencedAssemblies $references
}
[MobbyAtlasSplitter]::Split($sourceFull, $outputFull, $CharacterId)
"Split $CharacterId from $sourceFull"
