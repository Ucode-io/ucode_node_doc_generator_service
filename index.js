const express = require('express');
const axios = require('axios');
const fs = require('fs');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const cfg = require('./config/index');

const app = express();
const port = cfg.http_port;

const { convertapi_secret } = require('./config/constants');

app.use(cors()); 
app.use(express.json());

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Document Generation API',
            version: '1.0.0',
            description: 'API for generating documents from templates',
            contact: {
                name: 'API Support',
                email: 'support@example.com'
            },
        },
    },
    apis: ['./index.js'],
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

/**
 * @swagger
 * /generate-doc:
 *   post:
 *     summary: Generates a PDF document from a template downloaded from a Minio link
 *     parameters:
 *       - in: query
 *         name: link
 *         schema:
 *           type: string
 *         required: true
 *         description: The Minio link to the DOCX file
 *       - in: query
 *         name: data
 *         schema:
 *           type: object
 *         required: true
 *         description: The data to be injected into the DOCX template
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *     responses:
 *       200:
 *         description: The generated PDF document
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid link
 *       500:
 *         description: Error rendering document
 */
app.post('/generate-doc', async (req, res) => {
    const { link, data } = req.body;

    if (!link) {
        return res.status(400).send('Invalid link.');
    }

    console.log("Received link:", link);

    // let newRelations = JSON.parse(relations)
    // console.log("new relations data", newRelations?.data)
    let newData = data
    console.log("new data", newData)
    
    try {
        const response = await axios({
            method: 'get',
            url: link,
            responseType: 'arraybuffer'
        });

        if (response.status !== 200) {
            return res.status(400).send('Failed to fetch the document.');
        }

        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
            return res.status(400).send('The provided link does not point to a valid DOCX file.');
        }

        const content = Buffer.from(response.data);
        const zip = new PizZip(content);
      
        const expressionParser = require('docxtemplater/expressions.js');
        const doc = new Docxtemplater(zip, { parser: expressionParser });

        doc.setData(data);
        doc.render();

        const buf = doc.getZip().generate({ type: 'nodebuffer' });

        const tempDocxPath = './temp/output.docx';
        fs.writeFileSync(tempDocxPath, buf);

        const filePath = tempDocxPath;
        const fileData = fs.readFileSync(filePath);
        const base64FileData = fileData.toString('base64');


        const payload = {
            Parameters: [
              {
                Name: 'File',
                FileValue: {
                  Name: 'output.docx',
                  Data: base64FileData
                }
              },
              {
                Name: 'StoreFile',
                Value: true
              }
            ]
        };

        const convertResp = await axios.post(
            `https://v2.convertapi.com/convert/docx/to/pdf?Auth=${convertapi_secret}`,
            payload,
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

        const pdfLinkResp = await axios({
            method: 'get',
            url: convertResp.data.Files[0].Url,
            responseType: 'arraybuffer'
        });

        if (pdfLinkResp.status !== 200) {
            return res.status(400).send('Failed to fetch the document.');
        }

        const pdfContent = Buffer.from(pdfLinkResp.data);
        const pdfPath = './temp/output.pdf';
        fs.writeFileSync(pdfPath, pdfContent);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=generated.pdf');

        fs.unlinkSync(tempDocxPath);
        fs.unlinkSync(pdfPath);

        res.send(pdfContent);
    } catch (error) {
        return res.status(500).send('Error rendering document.');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
