# Exercise integration handoff

## Member B delivery

- `ExerciseGateway` is the only backend boundary used by the new exercise workflow.
- `ExerciseSessionCoordinator` restores the server state over a stale local mirror.
- Pause, resume, finish, record update, and record submit all send `expectedVersion`.
- Failed operations retain the last confirmed state and never report a false success.
- `ExerciseRecordCoordinator` preserves its draft, form, and media references after failure.
- Record commands contain no credited-hours or review-result fields.

## Member A wiring

1. Implement `ExerciseGateway` with the v1 transport.
2. Map a server version conflict to `ExerciseVersionConflictException`.
3. Inject the implementation into `ExerciseSessionController(exerciseGateway = ...)`.
4. Keep the constructor argument `null` only for the existing local debug demonstration.
5. Return the server's final duration and `COMPLETED` phase from `finish`.

## Media boundary

Member B does not implement media upload. The upload owner must provide an
`ExerciseMediaReference` only after the server reports that media as `AVAILABLE`.
The reference must include the original session ID and media type. Signed URLs,
upload retries, confirmation, and processing polling remain outside this module.

The finished-screen Record action can switch from the legacy submission path to
`ExerciseRecordCoordinator` after those `AVAILABLE` media IDs are exposed to the
screen. Until then, contract and coordinator tests are complete, but real Record
submission must not be described as integrated with staging.

## Required manual checks after wiring

1. Restore an active and a paused session after app restart.
2. Verify server state replaces stale local timing while local media remains.
3. Pause, resume, and finish with incrementing versions.
4. Force a version conflict and confirm the latest server state is displayed.
5. Force a network failure and confirm no local false success appears.
6. Attach only `AVAILABLE` media from the same session.
7. Retry a failed Record submission without creating a second draft.
