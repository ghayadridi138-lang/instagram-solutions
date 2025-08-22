const nodemailer = require('nodemailer');
const { User } = require('../config/models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  }
});
exports.sendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email requis" });
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
  const token = jwt.sign(
    { email, societe: user.societe },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de mot de passe',
    html: `
      <p>Bonjour,</p>
      <p>Cliquez sur le bouton ci-dessous pour confirmer votre compte :</p>
          <a href="${process.env.CORS_ORIGIN ?? 'http://localhost:4200'}/reset-password?token=${token}" 
         style="padding: 10px 20px; background: red; color: white; text-decoration: none;">
         ✅ Oui, c’est moi
      </a>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'E-mail envoyé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l’envoi de l’e-mail', error });
  }
};
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // ✅ même clé qu'à la génération
    const email = decoded.email;

    await User.update(
      { verified: 1 },
      { where: { email, societe: decoded.societe } }
    );

    res.send(`<h2>Compte activé avec succès pour ${email} ✅</h2>`);
  } catch (err) {
    res.status(400).send('Lien invalide ou expiré ❌');
  }
};
exports.updatePassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token et mot de passe requis' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Token invalide ou expiré' });
    }
    const email = decoded.email;
    const user = await User.findOne({ where: { email, active: 1 } });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé ou inactif' });
    }
    await user.update({ password: newPassword });
    res.status(200).json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur updatePassword:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du mot de passe' });
  }
};
