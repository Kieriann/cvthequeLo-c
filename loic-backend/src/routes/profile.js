console.log('📁 profile.js chargé');

const express = require('express');
const router = express.Router();
const prisma = require('../utils/prismaClient.js');
const requireAuth = require('../middlewares/authMiddleware');

router.get('/me', requireAuth, async (req, res) => {
  console.log('➡️ route /me appelée');
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId },
      include: { Address: true }
    });

    if (!profile) return res.json({ message: 'Aucun profil trouvé', empty: true });

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
