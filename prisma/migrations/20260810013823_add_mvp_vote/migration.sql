-- CreateTable
CREATE TABLE "MatchMvpVote" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "MatchMvpVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MvpCandidate" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "MvpCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MvpVote" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MvpVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchMvpVote_matchId_key" ON "MatchMvpVote"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MvpCandidate_voteId_memberId_key" ON "MvpCandidate"("voteId", "memberId");

-- CreateIndex
CREATE INDEX "MvpVote_candidateId_idx" ON "MvpVote"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "MvpVote_voteId_userId_key" ON "MvpVote"("voteId", "userId");

-- AddForeignKey
ALTER TABLE "MatchMvpVote" ADD CONSTRAINT "MatchMvpVote_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MvpCandidate" ADD CONSTRAINT "MvpCandidate_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "MatchMvpVote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MvpCandidate" ADD CONSTRAINT "MvpCandidate_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MvpVote" ADD CONSTRAINT "MvpVote_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "MatchMvpVote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MvpVote" ADD CONSTRAINT "MvpVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "MvpCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MvpVote" ADD CONSTRAINT "MvpVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
