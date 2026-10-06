param(
    [string]$DocxPath,
    [string]$PdfPath
)

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    Write-Host "Opening document: $DocxPath"
    $doc = $word.Documents.Open($DocxPath)
    Write-Host "Exporting to PDF: $PdfPath"
    $wdFormatPDF = 17
    $doc.SaveAs([ref]$PdfPath, [ref]$wdFormatPDF)
    $doc.Close([ref]$false)
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    Write-Host "PDF export successful!"
} catch {
    Write-Error $_
    if ($word) {
        $word.Quit()
    }
    exit 1
}
