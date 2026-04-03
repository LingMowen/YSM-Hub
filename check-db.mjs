import { PrismaClient } from './generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const dbPath = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function check() {
  const user = await prisma.user.findFirst({ where: { name: '666' } });
  console.log('User 666:', JSON.stringify(user, null, 2));
  
  const models = await prisma.model.findMany({ 
    include: { 
      uploaders: { 
        include: { 
          user: { 
            select: { id: true, name: true, role: true } 
          } 
        } 
      } 
    } 
  });
  console.log('All models with uploaders:', JSON.stringify(models, null, 2));
  
  await prisma.$disconnect();
}

check();
