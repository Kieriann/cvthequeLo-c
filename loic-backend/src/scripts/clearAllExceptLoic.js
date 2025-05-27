const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const loic = await prisma.user.findUnique({
    where: { email: 'loic.bernard15@yahoo.fr' },
    include: { Profile: true },
  })

  if (!loic) {
    console.error("❌ Le compte de Loïc n'existe pas.")
    return
  }

  const loicId = loic.id

  // Supprime tout sauf ce qui appartient à Loïc
  await prisma.address.deleteMany({
    where: { NOT: { profileId: loic.Profile?.id || 0 } },
  })

  await prisma.profile.deleteMany({
    where: { userId: { not: loicId } },
  })

  await prisma.experience.deleteMany({
    where: { userId: { not: loicId } },
  })

  await prisma.document.deleteMany({
    where: { userId: { not: loicId } },
  })

  await prisma.training.deleteMany({
    where: { userId: { not: loicId } },
  })

  await prisma.diploma.deleteMany({
    where: { userId: { not: loicId } },
  })

  await prisma.application.deleteMany({
    where: { userId: { not: loicId } },
  })

  await prisma.customerReference.deleteMany({
    where: { userId: { not: loicId } },
  })

  await prisma.post.deleteMany({
    where: { authorId: { not: loicId } },
  })

  await prisma.thread.deleteMany({
    where: { authorId: { not: loicId } },
  })

  await prisma.user.deleteMany({
    where: { id: { not: loicId } },
  })

  console.log('✔ Tout supprimé sauf Loïc')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
