# HTML Conversion API Documentation

Bu loyihaga HTML fayllarni PDF va DOCX formatlariga o'tkazish uchun universal API qo'shildi.

## Yangi API Endpoint

### Universal HTML Conversion

**Endpoint:** `POST /convert-html`

**Request Body (JSON):**
```json
{
  "htmlLink": "https://example.com/document.html",
  "outputFormat": "pdf"
}
```

**Parametrlar:**
- `htmlLink` (string, majburiy) - HTML faylning havolasi
- `outputFormat` (string, majburiy) - Konvertatsiya format turi
  - Qabul qilinadigan qiymatlar: `"pdf"`, `"docx"` (case-insensitive)
  - Enum validation mavjud

**Muvaffaqiyatli javob:**
```json
{
  "success": true,
  "fileUrl": "https://converted-file-url.pdf",
  "fileName": "converted_output.pdf",
  "outputFormat": "pdf",
  "conversionTime": 3450
}
```

**PDF konvertatsiya misoli:**
```bash
curl -X POST "http://localhost:3000/convert-html" \
  -H "Content-Type: application/json" \
  -d '{
    "htmlLink": "https://example.com/document.html",
    "outputFormat": "pdf"
  }'
```

**DOCX konvertatsiya misoli:**
```bash
curl -X POST "http://localhost:3000/convert-html" \
  -H "Content-Type: application/json" \
  -d '{
    "htmlLink": "https://example.com/document.html",
    "outputFormat": "docx"
  }'
```

## Format Enum Validation

API quyidagi formatlarni qo'llab-quvvatlaydi:

### ✅ Qabul qilinadigan formatlar:
- `"pdf"` yoki `"PDF"`
- `"docx"` yoki `"DOCX"`

### ❌ Qabul qilinmaydigan formatlar:
- `"txt"`, `"jpg"`, `"png"`, `"excel"`, `"xls"`, `"ppt"` va boshqalar

Noto'g'ri format yuborilganda:
```json
{
  "success": false,
  "error": "Invalid output format. Allowed formats: pdf, docx"
}
```

## Xatolik kodlari

### 400 Bad Request

**1. Parametr yo'q:**
```json
{
  "success": false,
  "error": "HTML link is required."
}
```

```json
{
  "success": false,
  "error": "Output format is required."
}
```

**2. Noto'g'ri format:**
```json
{
  "success": false,
  "error": "Invalid output format. Allowed formats: pdf, docx"
}
```

**3. HTML yuklanmadi:**
```json
{
  "success": false,
  "error": "Failed to fetch HTML content."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Error during PDF conversion.",
  "details": "Browser launch failed"
}
```

## Testlar

Loyihada Jest va Supertest yordamida yozilgan keng qamrovli testlar mavjud.

### Testlarni ishga tushirish:
```bash
npm test
```

### Test qamrovi:
- ✅ Parametr validatsiyasi (htmlLink, outputFormat)
- ✅ Format enum validation (pdf, docx, invalid formats)
- ✅ Case-insensitive format qabul qilish (PDF, pdf, DOCX, docx)
- ✅ Muvaffaqiyatli konvertatsiya (PDF va DOCX)
- ✅ Xatoliklarni boshqarish
- ✅ Javob formatini tekshirish
- ✅ Unsupported format testlari
- ✅ API barqarorligi

### Muhim test natijalari:
```bash
✓ Input validation tests
✓ Format enum validation tests
✓ Successful conversion tests  
✓ Response format validation tests
✓ Error handling tests
```

## Texnik Tafsilotlar

### Ishlatilgan kutubxonalar:
- `puppeteer` - HTML dan PDF konvertatsiya uchun
- `html-to-docx` - HTML dan DOCX konvertatsiya uchun
- `axios` - HTTP so'rovlar uchun

### Konvertatsiya jarayoni:
1. **Validation:** Request body parametrlarini tekshirish
2. **Format Enum Check:** outputFormat ning to'g'riligini tekshirish
3. **HTML Fetch:** htmlLink dan kontent yuklab olish
4. **Conversion:** Tanlangan formatga konvertatsiya qilish
5. **Upload:** CDN ga yuklash
6. **Cleanup:** Vaqtinchalik fayllarni o'chirish
7. **Response:** Natija havolasini qaytarish

### Format-specific logic:
- **PDF:** Puppeteer bilan browser rendering va PDF generation
- **DOCX:** html-to-docx kutubxonasi bilan to'g'ridan-to'g'ri konvertatsiya

## Swagger Documentation

API dokumentatsiyasi Swagger UI orqali mavjud: `http://localhost:3000/api-docs`

### Swagger-da ko'rish mumkin:
- Request/Response schemas
- Format enum tavsifi
- Parametrlar validatsiyasi
- Xatolik kodlari
- Misol so'rovlar

## Mavjud API'lar

1. `POST /generate-doc` - DOCX shablon asosida PDF yaratish
2. `POST /convert-html` - HTML dan PDF/DOCX yaratish ✨ **YANGI UNIVERSAL API**

## Ishga tushirish

```bash
# Dependency'larni o'rnatish
npm install

# Serverni ishga tushirish
npm start

# Testlarni ishga tushirish  
npm test
```

Server `http://localhost:3000` da ishga tushadi.

## Misollar

### Test HTML file yaratib sinab ko'rish:

```bash
# PDF ga konvertatsiya
curl -X POST "http://localhost:3000/convert-html" \
  -H "Content-Type: application/json" \
  -d '{
    "htmlLink": "https://httpbin.org/html",
    "outputFormat": "pdf"
  }'

# DOCX ga konvertatsiya
curl -X POST "http://localhost:3000/convert-html" \
  -H "Content-Type: application/json" \
  -d '{
    "htmlLink": "https://httpbin.org/html", 
    "outputFormat": "docx"
  }'
```
