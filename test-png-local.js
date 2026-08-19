/**
 * Lokal PNG tekshiruvi - CDN'ga tegmasdan.
 * Ishga tushirish:
 *   PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *   node test-png-local.js
 *
 * Natija: ./temp/local-test.png
 * Tekshirib bo'lgach bu faylni o'chirib tashlash mumkin.
 */
const fs = require('fs');
const HtmlConverterService = require('./src/services/htmlConverterService');

const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, Arial, sans-serif; padding: 40px; }
  h1 { color: #2563eb; }
  table { border-collapse: collapse; margin-top: 20px; }
  td, th { border: 1px solid #999; padding: 8px 14px; }
  th { background: #eff6ff; }
</style></head>
<body>
  <h1>PNG konvertatsiya testi</h1>
  <p>Bu HTML rasmga aylanishi kerak. Kirill va o'zbek harflari: Ш, Ў, G'ayrat.</p>
  <table>
    <tr><th>№</th><th>Nomi</th><th>Qiymat</th></tr>
    <tr><td>1</td><td>Birinchi</td><td>100</td></tr>
    <tr><td>2</td><td>Ikkinchi</td><td>200</td></tr>
  </table>
</body>
</html>`;

(async () => {
    const converter = new HtmlConverterService();

    console.log('supportedFormats:', converter.supportedFormats);

    // convertContentToBytes CDN'ga yubormaydi - faqat konvertatsiya qiladi
    const result = await converter.convertContentToBytes(html, 'png');

    const outPath = './temp/local-test.png';
    fs.writeFileSync(outPath, result.data);

    console.log('OK ->', outPath);
    console.log('   fileName:', result.fileName);
    console.log('   outputFormat:', result.outputFormat);
    console.log('   conversionTime:', result.conversionTime, 'ms');
    console.log('   size:', result.data.length, 'bytes');
})().catch((err) => {
    console.error('XATO:', err.message);
    process.exit(1);
});
