#!/usr/bin/env bash
set -euo pipefail
backend_dir="$(cd "$(dirname "$0")/../.." && pwd)"
repo_dir="$(cd "$backend_dir/.." && pwd)"
evidence_dir="$backend_dir/evidence/phase7/G1-Z"
mkdir -p "$evidence_dir"
# A stale PASS must never survive a host/PRE/build failure before the Node runner starts.
run_id="$(date +%Y%m%d%H%M%S)-$$"
if test -f "$evidence_dir/summary.json"; then
  mkdir -p "$evidence_dir/attempts/host-$run_id"
  for previous in "$evidence_dir"/*; do
    if test -f "$previous"; then mv "$previous" "$evidence_dir/attempts/host-$run_id/"; fi
  done
fi
printf '%s\n' '{"technicalStatus":"RUNNING","stageStatus":"IN_PROGRESS"}' > "$evidence_dir/summary.json"
project="bnbu-p7-g1-z-$run_id"
compose=(docker compose --env-file /dev/null -p "$project" -f "$backend_dir/docker-compose.g1.yml")
compose_started=false
stage=host-pre
cleanup() {
  local prior=$? cleanup_code=0
  trap - EXIT
  if "$compose_started"; then
    "${compose[@]}" down --volumes --remove-orphans || cleanup_code=$?
  fi
  if test "$cleanup_code" -ne 0; then prior=1; fi
  printf '{"project":"%s","exitCode":%d,"cleanupExitCode":%d,"lastStage":"%s"}\n' \
    "$project" "$prior" "$cleanup_code" "$stage" > "$evidence_dir/host-entry.json"
  if test "$prior" -ne 0 && ! grep -q '"technicalStatus": "FAIL"' "$evidence_dir/summary.json"; then
    mv "$evidence_dir/summary.json" "$evidence_dir/host-interrupted-summary.json"
    printf '{"technicalStatus":"FAIL","exitCode":%d,"failure":"HOST_ENTRY_FAILED","lastStage":"%s","stageStatus":"IN_PROGRESS"}\n' \
      "$prior" "$stage" > "$evidence_dir/summary.json"
  fi
  exit "$prior"
}
trap cleanup EXIT
expected_head=f95c3833870fe0da55a297aa28c958ec53e9e935
expected_sha=5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed
test "$(git -C "$repo_dir" rev-parse HEAD)" = "$expected_head"
test "$(git -C "$repo_dir" show HEAD:contracts/openapi.yaml | shasum -a 256 | cut -d ' ' -f 1)" = "$expected_sha"
git -C "$repo_dir" status --porcelain --untracked-files=all > "$evidence_dir/candidate-git-status.txt"
git -C "$repo_dir" diff --check
# Validate each path, including untracked files; retain the real uncommitted state.
while IFS= read -r -d '' entry; do
  changed_path="${entry:3}"
  case "$changed_path" in
    BNBU-Sports-Backend/package.json|BNBU-Sports-Backend/package-lock.json|BNBU-Sports-Backend/tsconfig.json|\
    BNBU-Sports-Backend/eslint.config.*|BNBU-Sports-Backend/vitest.config.*|BNBU-Sports-Backend/Dockerfile.test|\
    BNBU-Sports-Backend/.dockerignore|BNBU-Sports-Backend/README.md|BNBU-Sports-Backend/docker-compose.g1.yml|\
    BNBU-Sports-Backend/src/bootstrap/*|BNBU-Sports-Backend/src/shared/api/*|\
    BNBU-Sports-Backend/src/shared/application/*|BNBU-Sports-Backend/src/shared/domain/*|\
    BNBU-Sports-Backend/src/shared/infrastructure/*|BNBU-Sports-Backend/src/modules/identity-access/*|BNBU-Sports-Backend/src/modules/course-enrollment/*|\
    BNBU-Sports-Backend/src/modules/academic-term/*|BNBU-Sports-Backend/src/modules/system-mode/*|\
    BNBU-Sports-Backend/src/modules/audit/*|BNBU-Sports-Backend/src/modules/notification-center/*|\
    BNBU-Sports-Backend/migrations/1[0-4][0-9][0-9]_*.sql|BNBU-Sports-Backend/tests/contract/*|BNBU-Sports-Backend/tests/architecture/*|\
    BNBU-Sports-Backend/tests/integration/g1/*|BNBU-Sports-Backend/tests/unit/g1/*|BNBU-Sports-Backend/evidence/phase7/G1-Z/*|\
    docs/rebuild/handoffs/new-req-phase-7-g1-z.md) ;;
    *) printf 'Outside the v3 write scope: %s\n' "$changed_path" >&2; exit 1 ;;
  esac
done < <(git -C "$repo_dir" status --porcelain -z --untracked-files=all)
docker version --format '{{json .}}' > "$evidence_dir/host-docker.json"
docker compose version > "$evidence_dir/host-compose-version.txt"
node_ref=node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
pg_ref=postgres:17.6-bookworm@sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3
mail_ref=axllent/mailpit:v1.31.1@sha256:98b916bd3c8d61f7633a52d3ea2f58d00620cb01ca57ab59edde68c347a95365
docker image inspect "$mail_ref" >/dev/null 2>&1 || docker pull "$mail_ref"
docker image inspect "$node_ref" >/dev/null 2>&1 || docker pull "$node_ref"
docker image inspect "$pg_ref" >/dev/null 2>&1 || docker pull "$pg_ref"
docker image inspect "$node_ref" "$pg_ref" "$mail_ref" \
  --format '{"tags":{{json .RepoTags}},"digests":{{json .RepoDigests}},"id":{{json .Id}},"os":"{{.Os}}","architecture":"{{.Architecture}}"}' \
  | { IFS= read -r node_image; IFS= read -r pg_image; IFS= read -r mail_image; printf '[%s,%s,%s]\n' "$node_image" "$pg_image" "$mail_image"; } > "$evidence_dir/host-images.json"
# New project, no host ports, tmpfs data; never stop an unrelated existing container.
export P7_TEST_PASSWORD
P7_TEST_PASSWORD="$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')"
stage=compose-build-and-verify
compose_started=true
"${compose[@]}" up --build --abort-on-container-exit --exit-code-from backend-test
stage=verified
