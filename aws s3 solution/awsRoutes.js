const express = require('express');
const router = express.Router();
const awsController = require('../controllers/awsController');

router.post('/upload', awsController.uploadToS3);
router.get('/download', awsController.downloadFromS3);
router.delete('/delete/:key', awsController.deleteFromS3);

module.exports = router;
