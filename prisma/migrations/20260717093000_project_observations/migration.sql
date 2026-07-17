CREATE TYPE "ObservationStatus" AS ENUM ('DRAFT', 'PROMOTED');

CREATE TABLE "ProjectObservation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ObservationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceAgent" "AgentKind",
    "sourceLabel" TEXT,
    "sourceSession" TEXT,
    "agentConnectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectObservation_projectId_status_updatedAt_idx" ON "ProjectObservation"("projectId", "status", "updatedAt");
CREATE INDEX "ProjectObservation_authorId_updatedAt_idx" ON "ProjectObservation"("authorId", "updatedAt");

ALTER TABLE "ProjectObservation" ADD CONSTRAINT "ProjectObservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectObservation" ADD CONSTRAINT "ProjectObservation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
