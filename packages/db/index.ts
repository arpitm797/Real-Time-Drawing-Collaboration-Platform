import dotenv from "dotenv";
import path from "path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";



dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
});

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma = new PrismaClient({
  adapter,
});
