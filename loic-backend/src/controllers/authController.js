const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const prisma = require('../utils/prismaClient')
const { sendEmail } = require('../utils/mailer')

//
// ─── Création de compte (inscription) ──────────────────────────────
//
async function signup(req, res) {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' })
  }

  // Vérifier si l’utilisateur existe déjà
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return res.status(409).json({ error: 'Email déjà utilisé' })
  }

  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10)
  const username = email.split('@')[0]

  // Générer un token de confirmation unique
  const emailConfirmationToken = crypto.randomBytes(32).toString('hex')

  // Créer l’utilisateur avec emailConfirmed à false et le token
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      isAdmin: email === 'loic.bernard15@yahoo.fr',
      emailConfirmed: false,
      emailConfirmationToken,
    },
  })

  // Construire le lien de confirmation
  const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${emailConfirmationToken}`

  // Tenter d’envoyer l’email, sans planter si ça échoue
  try {
    await sendEmail({
      to: user.email,
      subject: 'Confirme ton adresse e-mail',
      text: `
Bienvenue chez Free’s Biz !

Pour activer ton compte, clique sur ce lien :
${confirmUrl}

Si tu n’as pas demandé cet e-mail, ignore-le.
      `,
    })
  } catch (mailErr) {
    console.error('⚠️ Erreur lors de l’envoi de l’email de confirmation :', mailErr)
    // On continue quand même, l’inscription est validée même si le mail n’a pas pu partir
  }

  // Répondre toujours 201 pour valider l’inscription
  return res
    .status(201)
    .json({ message: 'Inscription réussie ! Vérifie ta boîte mail pour confirmer ton adresse.' })
}

//
// ─── Confirmation d’e-mail ─────────────────────────────────────────
//
async function confirmEmail(req, res) {
  const { token } = req.query
  if (!token) {
    return res.status(400).send('Token manquant')
  }

  // Recherche de l’utilisateur par token
  const user = await prisma.user.findUnique({
    where: { emailConfirmationToken: token },
  })
  if (!user) {
    return res.status(404).send('Token invalide')
  }

  // Activation du compte
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailConfirmed: true,
      emailConfirmationToken: null,
    },
  })

  return res
    .status(200)
    .json({ message: 'E-mail confirmé ! Vous pouvez maintenant vous connecter.' })
}

//
// ─── Connexion ─────────────────────────────────────────────────────
//
async function login(req, res) {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' })
  }
  if (!user.emailConfirmed) {
    return res.status(403).json({ error: 'Email non confirmé' })
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Mot de passe incorrect' })
  }

  const token = jwt.sign(
    { userId: user.id, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({ token, user: { id: user.id, email: user.email } })
}

//
// ─── Récupération de l’utilisateur connecté ───────────────────────
//
async function me(req, res) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Utilisateur non authentifié' })
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true },
  })
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' })
  }

  res.json(user)
}

module.exports = { signup, confirmEmail, login, me }
