import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // ponytail: fallback agar prisma generate tidak crash saat build (generate tidak butuh koneksi DB)
    url: process.env["DIRECT_URL"] ?? "postgresql://localhost/placeholder",
  },
});