-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeNo" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "birthdate" DATETIME,
    "contactNumber" TEXT,
    "personalEmail" TEXT,
    "companyEmail" TEXT,
    "gender" TEXT,
    "position" TEXT,
    "employmentDate" DATETIME,
    "employmentStatus" TEXT NOT NULL DEFAULT 'Active',
    "username" TEXT,
    "passwordHash" TEXT,
    "securityQuestion" TEXT,
    "securityAnswerHash" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "requestedAccessAt" DATETIME,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "isMotherAccount" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "logoPath" TEXT
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeNo_key" ON "User"("employeeNo");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
