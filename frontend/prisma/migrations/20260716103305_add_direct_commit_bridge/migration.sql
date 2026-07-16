-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "repoUrl" TEXT,
    "repoLocalPath" TEXT,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "directCommitEnabled" BOOLEAN NOT NULL DEFAULT false,
    "contextPath" TEXT,
    "architecturePath" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("architecturePath", "contextPath", "createdAt", "createdById", "defaultBranch", "description", "id", "name", "repoUrl", "slug", "status", "updatedAt") SELECT "architecturePath", "contextPath", "createdAt", "createdById", "defaultBranch", "description", "id", "name", "repoUrl", "slug", "status", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
