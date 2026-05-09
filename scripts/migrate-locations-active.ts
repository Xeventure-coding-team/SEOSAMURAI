import { prisma } from "../lib/prisma"

async function main() {
    const result = await prisma.locations.updateMany({
        where: {
            is_deleted: false,
        },
        data: {
            is_active: true
        }
    })

    console.log(`✅ Updated ${result.count} locations`)
    await prisma.$disconnect()
}

main().catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
})