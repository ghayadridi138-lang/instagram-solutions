const express = require('express');
const multer = require('multer');
const vision = require('@google-cloud/vision');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const router = express.Router();

// Configuration du stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
            return cb(new Error('Format d\'image non supporté'), false);
        }
        cb(null, true);
    }
});

// Initialisation du client Vision
const client = new vision.ImageAnnotatorClient({
    keyFilename: path.join(__dirname, '..', process.env.GOOGLE_CLOUD_KEY)
});

// Endpoint pour analyse
router.post('/analyze', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Aucun fichier envoyé' });
        }

        const [result] = await client.textDetection(req.file.path);
        const detections = result.textAnnotations;
        const extractedText = detections.length > 0 ? detections[0].description : '';

        console.log("Texte brut détecté:", extractedText);

        const cinMatch = extractedText.match(/\b\d{8}\b/);

        res.json({
            success: !!cinMatch,
            cin: cinMatch ? cinMatch[0] : null,
            message: cinMatch ? 'CIN détecté avec succès.' : 'CIN non détecté, vérifiez la qualité de l\'image.',
            rawText: extractedText
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erreur Vision API' });
    } finally {
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Erreur de suppression du fichier temporaire :", err);
            });
        }
    }
});

module.exports = router;
