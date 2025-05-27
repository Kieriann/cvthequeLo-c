const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const authenticateToken = require('../middlewares/authMiddleware')
router.use(authenticateToken)

router.get('/profils', async (req, res) => {
  const search = req.query.search || ''

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: search } },
          { username: { contains: search } },
          {
            Experiences: {
              some: {
                OR: [
                  { title: { contains: search } },
                  { description: { contains: search } },
                  // ❌ skills et languages sont en Json → pas de filtre ici
                ],
              },
            },
          },
          {
            Profile: {
              OR: [
                { firstname: { contains: search } },
                { lastname: { contains: search } },
                { bio: { contains: search } },
              ],
            },
          },
        ],
      },
      include: {
        Profile: true,
      },
    })

    const profils = users
      .filter((u) => u.Profile)
      .map((u) => ({
        ...u.Profile,
        User: { email: u.email },
      }))

    res.json(profils)
  } catch (err) {
    console.error('❌ Erreur admin profils :', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
