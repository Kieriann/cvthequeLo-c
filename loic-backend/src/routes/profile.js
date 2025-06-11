const express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const authenticateToken = require('../middlewares/authMiddleware')

router.use(authenticateToken)

const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
const upload = multer({ storage })

router.post('/profil', upload.fields([
  { name: 'photo' },
  { name: 'cv' },
  { name: 'realFiles' }
]), async (req, res) => {
  try {
    const userId = req.user.id
    const profileData = JSON.parse(req.body.profile)
    const addressData = JSON.parse(req.body.address)
    const experiencesData = JSON.parse(req.body.experiences)

    // 1. Créer ou mettre à jour Profile
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: { ...profileData },
      create: { ...profileData, userId },
    })

    // 2. Créer ou mettre à jour Address
    await prisma.address.upsert({
      where: { profileId: profile.id },
      update: { ...addressData },
      create: { ...addressData, profileId: profile.id },
    })

    // 3. Supprimer les expériences précédentes
    await prisma.experience.deleteMany({ where: { userId } })

    // 4. Recréer les expériences
    const realFiles = req.files?.realFiles || []
    for (let i = 0; i < experiencesData.length; i++) {
      const exp = experiencesData[i]
      const realFile = realFiles.find(f => f.originalname === exp.realFilePath)

      await prisma.experience.create({
  data: {
    title: exp.title,
    client: exp.client || '',
    description: exp.description,
    domains: exp.domains || '',
    skills: JSON.stringify(exp.skills || []),
    languages: Array.isArray(exp.languages) ? exp.languages : [],
    realTitle: exp.realTitle || '',
    realDescription: exp.realDescription || '',
    realFilePath: exp.realFilePath || '', 
    userId,
  },
})

    }

    // 5. Sauvegarder les fichiers (facultatif)
    const photoFile = req.files?.photo?.[0]
    const cvFile = req.files?.cv?.[0]

    if (photoFile) {
      await prisma.document.upsert({
        where: { userId },
        update: { type: 'ID_PHOTO' },
        create: { userId, type: 'ID_PHOTO' },
      })
    }

    if (cvFile) {
      await prisma.document.upsert({
        where: { userId },
        update: { type: 'CV' },
        create: { userId, type: 'CV' },
      })
    }

    res.status(200).json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/profil', async (req, res) => {
  try {
    const userId = req.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAdmin: true,
        Profile: { include: { Address: true } },
      },
    })

    const experiences = await prisma.experience.findMany({ where: { userId } })
    const documents = await prisma.document.findMany({ where: { userId } })

    res.json({
      isAdmin: user.isAdmin,
      profile: user.Profile,
      experiences,
      documents,
    })
  } catch (err) {
    console.error('Erreur GET /profil', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
