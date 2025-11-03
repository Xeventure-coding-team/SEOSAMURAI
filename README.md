# 1. Install dependencies

npm install prisma @prisma/client

# 2. Generate Prisma client

npx prisma generate

# 3. Create and apply migration

npx prisma migrate dev --name init

# 4. (Optional) Open Prisma Studio to view your database

npx prisma studio
