-- CreateEnum
CREATE TYPE "public"."RankChangeType" AS ENUM ('UP', 'DOWN', 'SAME', 'NEW', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "public"."RankAlertType" AS ENUM ('RANK_DROP', 'RANK_IMPROVEMENT', 'OUT_OF_TOP_10', 'BACK_IN_TOP_10', 'NEW_KEYWORD_RANKING');

-- CreateEnum
CREATE TYPE "public"."BatchUpdateStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ScheduledPostStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."versions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."locations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "website" TEXT,
    "categories" TEXT,
    "last_rank_updated" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scheduled_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'en-US',
    "topicType" TEXT NOT NULL DEFAULT 'STANDARD',
    "mediaFormat" TEXT NOT NULL DEFAULT 'PHOTO',
    "imageUrl" TEXT NOT NULL,
    "originalImageUrl" TEXT,
    "actionType" TEXT,
    "actionUrl" TEXT,
    "accountId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT DEFAULT 'UTC',
    "status" "public"."ScheduledPostStatus" NOT NULL DEFAULT 'PENDING',
    "publishedAt" TIMESTAMP(3),
    "publishedPostId" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "viewColor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gmb_integrations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3) NOT NULL,
    "accountName" TEXT,
    "accountId" TEXT,
    "clientId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmb_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."competitor_analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextUpdate" TIMESTAMP(3) NOT NULL,
    "competitors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."keywords" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "keyword" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."keyword_ranks" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'India',
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "targetDomain" TEXT,
    "rank" INTEGER,
    "previousRank" INTEGER,
    "rankChange" "public"."RankChangeType" NOT NULL DEFAULT 'NOT_FOUND',
    "rankChangeValue" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT,
    "title" TEXT,
    "snippet" TEXT,
    "searchResults" TEXT,
    "totalResults" BIGINT NOT NULL DEFAULT 0,
    "searchTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keyword_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."keyword_tracking" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "locationId" TEXT NOT NULL DEFAULT 'default',
    "location" TEXT NOT NULL DEFAULT 'India',
    "userId" TEXT NOT NULL DEFAULT 'default',
    "targetDomain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshRate" INTEGER NOT NULL DEFAULT 48,
    "lastChecked" TIMESTAMP(3),
    "nextBatchUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keyword_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batch_updates" (
    "id" TEXT NOT NULL,
    "status" "public"."BatchUpdateStatus" NOT NULL DEFAULT 'PENDING',
    "totalKeywords" INTEGER NOT NULL DEFAULT 0,
    "processedKeywords" INTEGER NOT NULL DEFAULT 0,
    "failedKeywords" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultLocation" TEXT NOT NULL DEFAULT 'India',
    "defaultDomain" TEXT,
    "autoRefreshHours" INTEGER NOT NULL DEFAULT 48,
    "emailAlerts" BOOLEAN NOT NULL DEFAULT false,
    "alertThreshold" INTEGER NOT NULL DEFAULT 5,
    "batchUpdateTime" TEXT NOT NULL DEFAULT '02:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rank_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "alertType" "public"."RankAlertType" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "currentRank" INTEGER,
    "previousRank" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rank_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "versions_version_key" ON "public"."versions"("version");

-- CreateIndex
CREATE INDEX "scheduled_posts_status_scheduledAt_idx" ON "public"."scheduled_posts"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "scheduled_posts_accountId_locationId_idx" ON "public"."scheduled_posts"("accountId", "locationId");

-- CreateIndex
CREATE INDEX "scheduled_posts_createdBy_idx" ON "public"."scheduled_posts"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "gmb_integrations_userId_key" ON "public"."gmb_integrations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "competitor_analyses_userId_locationId_businessType_key" ON "public"."competitor_analyses"("userId", "locationId", "businessType");

-- CreateIndex
CREATE INDEX "keyword_ranks_keyword_location_userId_idx" ON "public"."keyword_ranks"("keyword", "location", "userId");

-- CreateIndex
CREATE INDEX "keyword_ranks_createdAt_idx" ON "public"."keyword_ranks"("createdAt");

-- CreateIndex
CREATE INDEX "keyword_ranks_batchId_idx" ON "public"."keyword_ranks"("batchId");

-- CreateIndex
CREATE INDEX "keyword_tracking_userId_isActive_idx" ON "public"."keyword_tracking"("userId", "isActive");

-- CreateIndex
CREATE INDEX "keyword_tracking_nextBatchUpdate_isActive_idx" ON "public"."keyword_tracking"("nextBatchUpdate", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "keyword_tracking_keyword_location_userId_key" ON "public"."keyword_tracking"("keyword", "location", "userId");

-- CreateIndex
CREATE INDEX "batch_updates_status_createdAt_idx" ON "public"."batch_updates"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "public"."user_settings"("userId");

-- CreateIndex
CREATE INDEX "rank_alerts_userId_isRead_idx" ON "public"."rank_alerts"("userId", "isRead");

-- CreateIndex
CREATE INDEX "rank_alerts_batchId_idx" ON "public"."rank_alerts"("batchId");
