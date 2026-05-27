const Tesseract = require('tesseract.js');
const path = require('path');
const os = require('os');

/**
 * Extract text from an image buffer using Tesseract.js OCR.
 * Supports English + Hindi (hin) for Indian regional content.
 *
 * @param {Buffer} imageBuffer - Raw image buffer from multer
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromImage(imageBuffer) {
  try {
    console.log('[OCRService] Starting OCR on uploaded image...');

    const result = await Tesseract.recognize(imageBuffer, 'eng+hin', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\r[OCRService] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    console.log('\n[OCRService] OCR complete.');

    const text = result.data.text.trim();

    if (!text || text.length < 10) {
      throw new Error('OCR extracted insufficient text from image. Please ensure the image is clear and readable.');
    }

    console.log(`[OCRService] Extracted ${text.length} characters.`);
    return text;
  } catch (err) {
    console.error('[OCRService] Error:', err.message);
    throw new Error(`OCR failed: ${err.message}`);
  }
}

module.exports = { extractTextFromImage };
