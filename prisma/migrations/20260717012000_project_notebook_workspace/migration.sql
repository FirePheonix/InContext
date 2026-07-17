CREATE TABLE "ProjectNotebook" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Shared project notebook',
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectNotebook_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectNotebook_projectId_key" ON "ProjectNotebook"("projectId");
CREATE INDEX "ProjectNotebook_authorId_updatedAt_idx" ON "ProjectNotebook"("authorId", "updatedAt");

ALTER TABLE "ProjectNotebook" ADD CONSTRAINT "ProjectNotebook_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectNotebook" ADD CONSTRAINT "ProjectNotebook_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
