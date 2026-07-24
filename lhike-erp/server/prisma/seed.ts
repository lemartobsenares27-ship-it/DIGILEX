import bcrypt from "bcryptjs";
import { ALL_PERMISSION_KEYS } from "../src/permissions.js";
// Reuses the same adapter-configured client as the app itself (see
// ../src/db.ts) instead of constructing a second one from the bare
// "@prisma/client" specifier -- that specifier no longer resolves to a
// generated client at all, since schema.prisma's custom `output` now
// generates straight into netlify/functions/generated/prisma-client/.
import { prisma } from "../src/db.js";

async function main() {
  const existing = await prisma.user.findUnique({ where: { employeeNo: "ADMIN" } });
  if (existing) {
    console.log("Seed skipped -- ADMIN account already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
  const securityAnswerHash = await bcrypt.hash("changeme", 10);

  await prisma.user.create({
    data: {
      employeeNo: "ADMIN",
      firstName: "Admin",
      lastName: "Admin",
      position: "System Administrator",
      username: "admin",
      passwordHash,
      securityQuestion: "What should you do immediately after first login?",
      securityAnswerHash,
      enabled: true,
      isMotherAccount: true,
      permissions: JSON.stringify(ALL_PERMISSION_KEYS),
      requestedAccessAt: new Date(),
    },
  });

  console.log("Seeded ADMIN / ChangeMe123! -- a Mother Account with every permission granted.");
  console.log("Change this password immediately in a real deployment.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
