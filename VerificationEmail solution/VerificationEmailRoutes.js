const express = require('express');
const router = express.Router();
const controller = require('../controllers/VerificationEmailController');

router.post('/send', controller.sendVerificationEmail);
router.get('/verify', controller.verifyEmail);
router.put('/update-password',controller.updatePassword);
module.exports = router;
