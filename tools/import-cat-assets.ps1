$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$source = 'D:\mobby\mobidou\output\cat-mobby-prototypes'
$target = Join-Path $project 'assets\cat-mobbies'
foreach ($folder in @('characters','variants','previews','provenance')) {
  New-Item -ItemType Directory -Force -Path (Join-Path $target $folder) | Out-Null
}
$specs = @(
  [pscustomobject]@{id='british-shorthair';name='ブリティッシュショートヘア';source='british-shorthair-v2.png';buttons='round-with-paw-marks';description='青灰色の毛、銅色の目。レアモビー参照の修正版。'},
  [pscustomobject]@{id='siamese-seal-point';name='シャム（シールポイント）';source='siamese-seal-point-v2.png';buttons='round-with-paw-marks';description='クリーム色と濃茶のポイント、青い目。レアモビー参照の修正版。'},
  [pscustomobject]@{id='bengal';name='ベンガル';source='bengal.png';buttons='plain-round';description='金茶のロゼット模様、黄緑色の目。'},
  [pscustomobject]@{id='ragdoll';name='ラグドール';source='ragdoll.png';buttons='plain-round';description='白と青灰色のバイカラー、長めの毛、青い目。'}
)
$catalog = Get-Content -LiteralPath (Join-Path $source 'batch30\catalog.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($cat in $catalog) {
  $specs += [pscustomobject]@{id=($cat.id -replace '^\d+-','');name=$cat.name;source=('batch30\'+$cat.id+'.png');buttons='plain-round';description=$cat.description}
}
Add-Type -AssemblyName System.Drawing
$entries = @()
foreach ($spec in $specs) {
  $from = Join-Path $source $spec.source
  $relative = 'characters/'+$spec.id+'.png'
  $to = Join-Path $target $relative
  if (Test-Path -LiteralPath $to) {
    if ((Get-FileHash -LiteralPath $from).Hash -ne (Get-FileHash -LiteralPath $to).Hash) { throw "Different file already exists: $to" }
  } else { Copy-Item -LiteralPath $from -Destination $to }
  $hash = (Get-FileHash -LiteralPath $to -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -ne (Get-FileHash -LiteralPath $from -Algorithm SHA256).Hash.ToLowerInvariant()) { throw "Copy mismatch: $to" }
  $im = [System.Drawing.Bitmap]::new($to)
  if ($im.RawFormat.Guid -ne [System.Drawing.Imaging.ImageFormat]::Png.Guid -or $im.Width -ne 1254 -or $im.Height -ne 1254 -or $im.PixelFormat.ToString() -ne 'Format32bppArgb') { throw "Unexpected image format: $to" }
  $entries += [pscustomobject]@{id=$spec.id;name=$spec.name;file=$relative;description=$spec.description;buttonStyle=$spec.buttons;status='concept';width=$im.Width;height=$im.Height;format='png';alphaChannel=$true;bytes=(Get-Item -LiteralPath $to).Length;sha256=$hash;originalFile=$spec.source.Replace('\','/')}
  $im.Dispose()
}
$extras = @{
  'british-shorthair.png'='variants/british-shorthair-v1.png'
  'siamese-seal-point.png'='variants/siamese-seal-point-v1.png'
  'batch30\preview-01.jpg'='previews/breeds-01-15.jpg'
  'batch30\preview-02.jpg'='previews/breeds-16-30.jpg'
  'group\cat-mobby-group.png'='previews/all-34-group.png'
  'prompts-v2.md'='provenance/prompts-initial-v2.md'
  'prompts-bengal-ragdoll.md'='provenance/prompts-bengal-ragdoll.md'
  'batch30\PLAN.md'='provenance/prompts-batch30.md'
  'batch30\generation-record.json'='provenance/generation-record-batch30.json'
  'group\README.md'='provenance/group-prompt.md'
}
foreach ($pair in $extras.GetEnumerator()) {
  $from = Join-Path $source $pair.Key
  $to = Join-Path $target $pair.Value
  if (Test-Path -LiteralPath $to) {
    if ((Get-FileHash -LiteralPath $from).Hash -ne (Get-FileHash -LiteralPath $to).Hash) { throw "Different file already exists: $to" }
  } else { Copy-Item -LiteralPath $from -Destination $to }
  if ((Get-FileHash -LiteralPath $from).Hash -ne (Get-FileHash -LiteralPath $to).Hash) { throw "Copy mismatch: $to" }
}
$manifest = [ordered]@{schemaVersion=1;importedOn='2026-10-24';count=$entries.Count;sourceProject=$source;pathsRelativeTo='assets/cat-mobbies';generationMode='built-in image_gen';characters=$entries}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $target 'manifest.json') -Encoding UTF8
if ($entries.Count -ne 34 -or @($entries.id | Select-Object -Unique).Count -ne 34) { throw 'Expected 34 unique characters' }
$rows = $entries | ForEach-Object { '| '+$_.name+' | ['+$_.id+']('+$_.file+') | '+$_.buttonStyle+' |' }
$readme = @'
# にゃこモビー アセット

このチャットで作成した34種のPNGを、元ファイルと同じ内容で取り込んでいます。

- `characters/`: 猫種ごとの代表画像34枚。1254×1254、アルファ付きPNG。
- `variants/`: ブリティッシュとシャムの初期案2枚。
- `previews/`: 追加30種の一覧2枚、34体の集合画像1枚。集合画像は生成による再描画で、個別素材の厳密な合成ではありません。
- `provenance/`: 生成プロンプトと生成記録のコピー。記載されている元プロジェクトのパスは履歴として保持。
- `manifest.json`: ID、日本語名、相対パス、寸法、容量、SHA-256、元ファイル、ボタン仕様。

ブリティッシュとシャムの代表画像は、目と毛並みを修正したv2です。丸ボタンに肉球マークが残っています。他32種は無地の黒い丸ボタンです。全画像を試作（concept）として登録しており、アプリへの組み込みはまだ行っていません。

元データは `D:mobbymobidououtputcat-mobby-prototypes` にも保持。PR画像と配布用ZIPはキャラクター素材に含めていません。

| 猫種 | 画像 | ボタン |
|---|---|---|
'@
($readme + "`n" + ($rows -join "`n") + "`n") | Set-Content -LiteralPath (Join-Path $target 'README.md') -Encoding UTF8
[pscustomobject]@{characters=$entries.Count;variants=2;previews=3;copyHashesVerified=$true;totalCharacterBytes=($entries | Measure-Object -Property bytes -Sum).Sum} | ConvertTo-Json
