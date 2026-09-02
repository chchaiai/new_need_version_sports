"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudentProfile } from "./student-profile";
import { toUserFacingError, type UserFacingError } from "./api-client";

export type StudentProfileLoadState = "idle" | "loading" | "ready" | "error";

type StudentProfileLoadSnapshot = {
  key: string;
  details: Partial<StudentProfile>;
  status: StudentProfileLoadState;
  error: UserFacingError | null;
};

const profileCache = new Map<string, Partial<StudentProfile>>();
const pendingProfileLoads = new Map<
  string,
  { epoch: number; promise: Promise<Partial<StudentProfile>> }
>();
let profileCacheEpoch = 0;

/** Clears account-scoped data at every authentication boundary. */
export function clearStudentProfileCache(): void {
  profileCacheEpoch += 1;
  profileCache.clear();
  pendingProfileLoads.clear();
}

function cacheKey(profile: StudentProfile) {
  return String(profile.id);
}

function initialLoadSnapshot(key: string, hasLoader: boolean): StudentProfileLoadSnapshot {
  const cached = profileCache.get(key);
  return {
    key,
    details: cached ?? {},
    status: hasLoader && !cached ? "idle" : "ready",
    error: null,
  };
}

export function useStudentProfile({
  student,
  loadProfile,
}: {
  student: StudentProfile;
  loadProfile?: (student: StudentProfile) => Promise<Partial<StudentProfile>>;
}) {
  const key = cacheKey(student);
  const [loadSnapshot, setLoadSnapshot] = useState<StudentProfileLoadSnapshot>(
    () => initialLoadSnapshot(key, Boolean(loadProfile)),
  );
  const activeKey = useRef(key);
  useEffect(() => {
    activeKey.current = key;
  }, [key]);
  const snapshot = loadSnapshot.key === key
    ? loadSnapshot
    : initialLoadSnapshot(key, Boolean(loadProfile));

  const load = useCallback(async (force = false) => {
    if (!loadProfile) return student;

    if (!force) {
      const cached = profileCache.get(key);
      if (cached) {
        setLoadSnapshot({ key, details: cached, status: "ready", error: null });
        return { ...student, ...cached };
      }
    } else {
      profileCache.delete(key);
      pendingProfileLoads.delete(key);
    }

    setLoadSnapshot({ key, details: snapshot.details, status: "loading", error: null });

    try {
      const requestEpoch = profileCacheEpoch;
      let pending = pendingProfileLoads.get(key);
      if (!pending || pending.epoch !== requestEpoch) {
        pending = { epoch: requestEpoch, promise: loadProfile(student) };
        pendingProfileLoads.set(key, pending);
      }
      const loaded = await pending.promise;
      if (requestEpoch !== profileCacheEpoch) return student;
      profileCache.set(key, loaded);
      if (pendingProfileLoads.get(key) === pending) pendingProfileLoads.delete(key);
      if (activeKey.current === key) {
        setLoadSnapshot({ key, details: loaded, status: "ready", error: null });
      }
      return { ...student, ...loaded };
    } catch (reason) {
      const pending = pendingProfileLoads.get(key);
      if (pending?.epoch === profileCacheEpoch) pendingProfileLoads.delete(key);
      if (profileCacheEpoch !== pending?.epoch) return student;
      if (activeKey.current === key) {
        setLoadSnapshot({
          key,
          details: snapshot.details,
          status: "error",
          error: toUserFacingError(reason),
        });
      }
      return student;
    }
  }, [key, loadProfile, snapshot.details, student]);

  const profile = useMemo(() => ({ ...student, ...snapshot.details }), [snapshot.details, student]);

  return { profile, status: snapshot.status, error: snapshot.error, load };
}
