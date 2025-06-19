// index.js
console.log('Fichier index.js exécuté')

const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

dotenv.config()

const prisma = new PrismaClient()

async function bootstrap() {
  // créer la colonne teleworkDays si elle n'existe pas
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Profile"
    ADD COLUMN IF NOT EXISTS "teleworkDays" INTEGER NOT NULL DEFAULT 0;
  `)

  // ─── Création de l'app Express ───────────────────────────────────────
  const app = express()

  // ─── Health check ────────────────────────────────────────────────────
  app.get('/healthz', (_req, res) => {
    res.status(200).send('OK')
  })

  // ─── CORS ────────────────────────────────────────────────────────────
  const allowedOrigins = [process.env.FRONTEND_URL || '*']
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      callback(new Error('CORS non autorisé'))
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }))
  app.options('*', cors())

  // ─── Middlewares globaux ─────────────────────────────────────────────
  app.use(express.json())
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

  // ─── Import des routes ───────────────────────────────────────────────
  const authRoutes    = require('./src/routes/authRoutes.js')
  const profileRoutes = require('./src/routes/profile.js')
  const adminRoutes   = require('./src/routes/admin')

  // ─── Routes API ──────────────────────────────────────────────────────
  app.use('/api/auth',    authRoutes)
  app.use('/api/profile', profileRoutes)
  app.use('/api/admin',   adminRoutes)

  // ─── Routes de test/debug ───────────────────────────────────────────
  app.get('/test', (req, res) => {
    console.log('/test appelé')
    res.send('ok')
  })
  app.get('/', (req, res) => {
    res.send('API Loïc en ligne')
  })

  // ─── Gestion globale des erreurs ────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error('💥 Erreur serveur :', err.stack)
    res
      .status(500)
      .json({ error: err.message, stack: err.stack.split('\n').slice(0,5) })
  })

  // ─── Lancement du serveur ────────────────────────────────────────────
  const PORT = process.env.PORT || 4000
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`)
  })
}

bootstrap().catch(err => {
  console.error('Erreur au démarrage :', err)
  process.exit(1)
})
