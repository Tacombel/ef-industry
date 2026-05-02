CREATE TABLE "UsageLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT,
    "userId" TEXT,
    "statusCode" INTEGER,
    "ms" INTEGER
);

CREATE INDEX "UsageLog_createdAt_idx" ON "UsageLog"("createdAt");
CREATE INDEX "UsageLog_path_idx" ON "UsageLog"("path");
CREATE INDEX "UsageLog_userId_idx" ON "UsageLog"("userId");
