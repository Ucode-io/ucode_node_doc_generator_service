const axios = require('axios');
const fs = require('fs');
const puppeteer = require('puppeteer');
const htmlToDocx = require('html-to-docx');
const path = require('path');
const CdnService = require('./cdnService');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const cheerio = require('cheerio');

/**
 * HTML Converter Service - converts HTML to PDF or DOCX
 */
class HtmlConverterService {
    constructor() {
        this.cdnService = new CdnService();
        this.tempDir = path.join(__dirname, '../../temp');
        this.supportedFormats = ['pdf', 'docx'];
    }

    /**
     * Convert HTML from URL to specified format
     * @param {string} htmlLink - URL to HTML content
     * @param {string} outputFormat - Target format ('pdf' or 'docx')
     * @returns {Promise<Object>} - Conversion result with file URL and metadata
     */
    async convertFromUrl(htmlLink, outputFormat) {
        const startTime = Date.now();

        // Validate inputs
        this._validateInputs(htmlLink, outputFormat);

        try {
            // Fetch HTML content
            const htmlContent = await this._fetchHtmlContent(htmlLink);

            // Convert to specified format
            const result = await this._convertHtml(htmlContent, outputFormat.toLowerCase());

            // Calculate conversion time
            const conversionTime = Date.now() - startTime;

            return {
                success: true,
                fileUrl: result.fileUrl,
                fileName: result.fileName,
                outputFormat: outputFormat.toLowerCase(),
                conversionTime
            };

        } catch (error) {
            console.error(`HTML to ${outputFormat} conversion failed:`, error.message);
            throw new Error(`Conversion failed: ${error.message}`);
        }
    }

    /**
     * Convert HTML content directly to specified format
     * @param {string} htmlContent - HTML content string
     * @param {string} outputFormat - Target format ('pdf' or 'docx')
     * @returns {Promise<Object>} - Conversion result
     */
    async convertContent(htmlContent, outputFormat) {
        const startTime = Date.now();

        if (!htmlContent || !outputFormat) {
            throw new Error('HTML content and output format are required');
        }

        if (!this.supportedFormats.includes(outputFormat.toLowerCase())) {
            throw new Error(`Unsupported format. Allowed: ${this.supportedFormats.join(', ')}`);
        }

        try {
            const result = await this._convertHtml(htmlContent, outputFormat.toLowerCase());
            const conversionTime = Date.now() - startTime;

            return {
                success: true,
                fileUrl: result.fileUrl,
                fileName: result.fileName,
                outputFormat: outputFormat.toLowerCase(),
                conversionTime
            };

        } catch (error) {
            console.error(`HTML content to ${outputFormat} conversion failed:`, error.message);
            throw new Error(`Conversion failed: ${error.message}`);
        }
    }

    /**
     * Convert HTML content directly to specified format and return bytes
     * @param {string} htmlContent - HTML content string
     * @param {string} outputFormat - Target format ('pdf' or 'docx')
     * @returns {Promise<Object>} - Conversion result with file bytes
     */
    async convertContentToBytes(htmlContent, outputFormat) {
        const startTime = Date.now();

        if (!htmlContent || !outputFormat) {
            throw new Error('HTML content and output format are required');
        }

        if (!this.supportedFormats.includes(outputFormat.toLowerCase())) {
            throw new Error(`Unsupported format. Allowed: ${this.supportedFormats.join(', ')}`);
        }

        try {
            const result = await this._convertHtmlToBytes(htmlContent, outputFormat.toLowerCase());
            const conversionTime = Date.now() - startTime;

            return {
                success: true,
                data: result.fileBytes,
                fileName: result.fileName,
                outputFormat: outputFormat.toLowerCase(),
                conversionTime
            };

        } catch (error) {
            console.error(`HTML content to ${outputFormat} conversion failed:`, error.message);
            throw new Error(`Conversion failed: ${error.message}`);
        }
    }

    /**
     * Validate input parameters
     * @private
     */
    _validateInputs(htmlLink, outputFormat) {
        if (!htmlLink) {
            throw new Error('HTML link is required');
        }

        if (!outputFormat) {
            throw new Error('Output format is required');
        }

        if (!this.supportedFormats.includes(outputFormat.toLowerCase())) {
            throw new Error(`Invalid output format. Allowed formats: ${this.supportedFormats.join(', ')}`);
        }
    }

    /**
     * Fetch HTML content from URL
     * @private
     */
    async _fetchHtmlContent(htmlLink) {
        try {
            const response = await axios({
                method: 'get',
                url: htmlLink,
                responseType: 'text',
                timeout: 30000 // 30 seconds timeout
            });

            if (response.status !== 200) {
                throw new Error(`Failed to fetch HTML. Status: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout while fetching HTML content');
            }
            throw new Error(`Failed to fetch HTML content: ${error.message}`);
        }
    }

    /**
     * Convert HTML content to specified format and return bytes
     * @private
     */
    async _convertHtmlToBytes(htmlContent, format) {
        let tempFilePath, fileName;
        console.log(`Starting HTML to ${format.toUpperCase()} conversion...`);
        if (format === 'pdf') {
            const result = await this._convertToPdf(htmlContent);
            tempFilePath = result.filePath;
            fileName = result.fileName;
        } else if (format === 'docx') {
            const result = await this._convertToDocx(htmlContent);
            tempFilePath = result.filePath;
            fileName = result.fileName;
        }

        try {
            // Read file as bytes
            const fileBytes = fs.readFileSync(tempFilePath);

            // Clean up temporary file
            fs.unlinkSync(tempFilePath);

            return { fileBytes, fileName };
        } catch (error) {
            // Clean up temporary file even if reading fails
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            throw error;
        }
    }

    /**
     * Convert HTML content to specified format
     * @private
     */
    async _convertHtml(htmlContent, format) {
        let tempFilePath, fileName;

        if (format === 'pdf') {
            const result = await this._convertToPdf(htmlContent);
            tempFilePath = result.filePath;
            fileName = result.fileName;
        } else if (format === 'docx') {
            const result = await this._convertToDocx(htmlContent);
            tempFilePath = result.filePath;
            fileName = result.fileName;
        }

        try {
            // Upload to CDN
            const fileUrl = await this.cdnService.uploadFile(tempFilePath, fileName);

            // Clean up temporary file
            fs.unlinkSync(tempFilePath);

            return { fileUrl, fileName };
        } catch (error) {
            // Clean up temporary file even if upload fails
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            throw error;
        }
    }

    /**
     * Convert HTML to PDF using Puppeteer
     * @private
     */
    async _convertToPdf(htmlContent) {
        let browser;

        try {
            browser = await puppeteer.launch({
                headless: 'new', // yoki true
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser', // Alpine'da ba’zan '/usr/bin/chromium'
                dumpio: true,
                timeout: 60000,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--disable-features=Vulkan,UseOzonePlatform,VizDisplayCompositor',
                    '--use-angle=swiftshader',
                    '--use-gl=swiftshader',
                ],
            });

            console.log('Puppeteer launched successfully');

            const page = await browser.newPage();
            await page.setContent(htmlContent, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            const tempFilePath = path.join(this.tempDir, `html_output_${Date.now()}.pdf`);

            await page.pdf({
                path: tempFilePath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                }
            });

            return {
                filePath: tempFilePath,
                fileName: 'converted_output.pdf'
            };

        } catch (error) {
            throw new Error(`PDF conversion failed: ${error.message}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Convert HTML to DOCX using html-to-docx
     * @private
     */
    async _convertToDocx(htmlContent) {
        try {

    function cleanHtml(html) {
      const $ = cheerio.load(html, { decodeEntities: false });


      $("[style]").each((i, el) => {
        let style = $(el).attr("style") || "";
        style = style.replace(/\\+/g, "").trim();
        if (style && !style.endsWith(";")) style += ";";
        $(el).attr("style", style);
      });


      $("b strong, strong b").each((i, el) => {
        $(el).replaceWith(`<strong>${$(el).text()}</strong>`);
      });


      $("[dir]").each((i, el) => {
        const dir = $(el).attr("dir");
        if (dir === "ltr" || dir === "rtl") $(el).removeAttr("dir");
      });


      $("span").each((i, el) => {
        if (!$(el).text().trim() && !$(el).children().length) $(el).remove();
      });

      return $.html();
    }

    const cleanedHtmlContent = cleanHtml(htmlContent);


    const inputFilePath = path.join(this.tempDir, `html_input_${Date.now()}.html`);
    const outputDir = this.tempDir;

    const outputFilePath = path.join(
      outputDir,
      path.basename(inputFilePath, path.extname(inputFilePath)) + '.docx'
    );

    fs.writeFileSync(inputFilePath, cleanedHtmlContent);

    const cmd = `soffice --headless --infilter="HTML (StarWriter)" --convert-to "docx:Office Open XML Text" --outdir "${outputDir}" "${inputFilePath}"`;
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) console.warn('soffice stderr:', stderr);
    if (stdout) console.log('soffice stdout:', stdout);


    if (!fs.existsSync(outputFilePath)) {
      throw new Error('LibreOffice conversion did not produce output DOCX.');
    }


    fs.unlinkSync(inputFilePath);

    return {
      filePath: outputFilePath,
      fileName: path.basename(outputFilePath),
    };
  } catch (error) {
    throw new Error(`DOCX conversion failed (LibreOffice): ${error.message}`);
  }
}


}

module.exports = HtmlConverterService;
