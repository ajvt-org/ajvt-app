"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import Money from "@/components/Money";
import Notice from "@/components/Notice";
import PageLoading from "@/components/PageLoading";
import StatTile from "@/components/admin/StatTile";
import SupportersTable from "@/components/SupportersTable";
import type { PublicLeaderboardEntry } from "@/lib/donationsServer";
import { adminSupporters } from "@/lib/texts";

const SOURCE = "/api/admin/supporters";

interface Board {
  rows: PublicLeaderboardEntry[];
  count: number;
  given: number;
}

export default function AdminSupportersPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Board>(SOURCE)
      .then(setBoard)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) {
    return (
      <div className="admin-page">
        <Notice tone="error">{error}</Notice>
      </div>
    );
  }

  if (!board) return <PageLoading />;

  return (
    <div className="admin-page space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatTile icon="users" label={adminSupporters.count}>
          <bdi dir="ltr">{board.count}</bdi>
        </StatTile>
        <StatTile icon="heart" label={adminSupporters.given} color="var(--mint-700)">
          <Money value={board.given} />
        </StatTile>
      </div>

      {board.count === 0 ? (
        <div className="card p-8 text-center fade-up">
          <div className="mb-3 flex justify-center">
            <Icon name="heart" size={40} color="var(--mint-400)" />
          </div>
          <p className="font-semibold" style={{ color: "var(--text-main)" }}>
            {adminSupporters.empty}
          </p>
        </div>
      ) : (
        <SupportersTable
          initial={board.rows}
          total={board.count}
          minePositions={[]}
          source={SOURCE}
        />
      )}
    </div>
  );
}
