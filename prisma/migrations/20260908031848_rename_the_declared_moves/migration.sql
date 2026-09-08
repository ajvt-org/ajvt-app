ALTER TYPE "PartOutcome" RENAME TO "UnitOutcome";
ALTER TYPE "PartColour" RENAME TO "UnitColour";

ALTER TABLE "AdjustmentRule" RENAME TO "MoveRule";
ALTER TABLE "MoveRule" RENAME CONSTRAINT "AdjustmentRule_pkey" TO "MoveRule_pkey";
ALTER TABLE "MoveRule" RENAME CONSTRAINT "AdjustmentRule_activityId_fkey" TO "MoveRule_activityId_fkey";
ALTER TABLE "MoveRule" RENAME CONSTRAINT "AdjustmentRule_levelId_fkey" TO "MoveRule_levelId_fkey";
ALTER INDEX "AdjustmentRule_activityId_name_key" RENAME TO "MoveRule_activityId_name_key";
ALTER INDEX "AdjustmentRule_activityId_idx" RENAME TO "MoveRule_activityId_idx";
ALTER INDEX "AdjustmentRule_levelId_idx" RENAME TO "MoveRule_levelId_idx";

ALTER TABLE "MatchAdjustment" RENAME TO "MatchMove";
ALTER TABLE "MatchMove" RENAME CONSTRAINT "MatchAdjustment_pkey" TO "MatchMove_pkey";
ALTER TABLE "MatchMove" RENAME CONSTRAINT "MatchAdjustment_matchId_fkey" TO "MatchMove_matchId_fkey";
ALTER TABLE "MatchMove" RENAME CONSTRAINT "MatchAdjustment_unitId_fkey" TO "MatchMove_unitId_fkey";
ALTER TABLE "MatchMove" RENAME CONSTRAINT "MatchAdjustment_ruleId_fkey" TO "MatchMove_ruleId_fkey";
ALTER INDEX "MatchAdjustment_matchId_idx" RENAME TO "MatchMove_matchId_idx";
ALTER INDEX "MatchAdjustment_unitId_idx" RENAME TO "MatchMove_unitId_idx";
ALTER INDEX "MatchAdjustment_ruleId_idx" RENAME TO "MatchMove_ruleId_idx";
