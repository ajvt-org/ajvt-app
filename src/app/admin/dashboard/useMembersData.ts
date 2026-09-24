"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { loginPathWithNext } from "@/lib/utils";
import type { Member, RecordingAdmin } from "./types";

interface MembersResponse {
  members: Member[];
  recordingAdmins: RecordingAdmin[];
}

export function useMembersData(onFirstLoad: (members: Member[]) => void) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [recordingAdmins, setRecordingAdmins] = useState<RecordingAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const firstLoad = useRef(true);

  function reload() {
    return api
      .get<MembersResponse>("/api/admin/members")
      .then((data) => {
        const loaded = data.members || [];
        setMembers(loaded);
        setRecordingAdmins(data.recordingAdmins || []);
        if (firstLoad.current) {
          firstLoad.current = false;
          onFirstLoad(loaded);
        }
      })
      .catch((e) => {
        const status = e instanceof ApiError ? e.status : 0;
        if (status === 401 || status === 0) router.push(loginPathWithNext("/admin/login"));
      })
      .finally(() => setLoading(false));
  }

  async function reloadQuietly(): Promise<Member[]> {
    const data = await api
      .get<{ members: Member[] }>("/api/admin/members")
      .catch(() => ({ members: [] as Member[] }));
    const loaded = data.members || [];
    if (loaded.length > 0) setMembers(loaded);
    return loaded;
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { members, setMembers, recordingAdmins, loading, reload, reloadQuietly };
}
