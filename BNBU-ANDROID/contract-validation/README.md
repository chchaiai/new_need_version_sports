# Phase 6A Contract validation entry

This Android library is a validation consumer of `1.3.0-contract / RC`.
The exact SHA-256, published source commit and input file hashes are pinned in
`contract-lock.json`. `:app` does not depend on this library: its historical runtime
and its historical `phase5ga` tests keep their existing bindings.

## Reproduce

Use Python 3.12 with PyYAML, the project's Gradle wrapper and cached project
dependencies, JDK 21, Android SDK 35, OpenAPI Generator CLI 7.24.0, and the two
Phase5 runtime jars (`json-schema-1.9.1.jar`, `jmail-2.1.0.jar`). The existing
Phase5 tool cache can supply these files. Generator, template and runtime jar
hashes are checked; the runner neither installs tools nor downloads substitutes.

From `BNBU-ANDROID`, set these variables to local paths, then run:

```powershell
& $Python -B -X utf8 .\tools\phase6\run_step02.py `
  --generator-jar $GeneratorJar `
  --runtime-dir $RuntimeDirectory `
  --java-home $JavaHome `
  --android-sdk $AndroidSdk `
  --evidence $NewEvidenceDirectory
```

`$NewEvidenceDirectory` must not exist and must be outside this repository.
The runner records commands, exit codes, two generation manifests and logs,
JUnit results, the strict smoke report, source hashes and the validation AAR.
It never stages, commits, pushes or changes a remote.

For direct Gradle use, provide `-Pphase6Python`, `-Pphase6GeneratorJar` and
`-Pphase6RuntimeDir`, and run `:contract-validation:assembleDebug` and
`:contract-validation:testDebugUnitTest`. Both use the mandatory binding and
generation gates. Generated sources and binaries stay under ignored `build/`.

## Step3 full schema verification

Use the same arguments with `tools/phase6/run_step03.py`. The equivalent Gradle
option is `-Pphase6FullValidation=true`. Step2's default runner still runs only
the smoke suite. Step3 additionally runs all 992 published fixtures unchanged,
targeted boundary cases, constructed-request serialization checks and a report
which links actual passing results to all six discriminator groups (15 wire
branches), including the nested endurance-rule change, and all 99 error codes.
Coverage reports distinguish root schemas, traversed schemas and unvisited schemas;
the fixture count does not imply exhaustive coverage of all 316 schemas or endpoints.

Two consumer-tool defects were exposed by the expanded cases:

- `F6A-03-01`: `OffsetDateTime` rewrites short fractional seconds and cannot retain
  arbitrary fractional precision; the JVM format checker also rejected ten-digit
  fractions. The client-only `generation-profile.json` now selects the generator's
  supported `dateLibrary=string` option, including nullable date aliases. The wire
  string stays unchanged and date/date-time formats are validated strictly.
- `F6A-03-02`: the old validator did not enforce OpenAPI `int64` ranges before Gson
  converted numbers into Kotlin `Long`. The format evaluator now checks exact
  `int32`/`int64` ranges before decoding and after encoding, without floating-point
  conversion. Overflow inputs remain required rejections.

The published Contract, templates and non-date generation mappings are unchanged.
Date strings are transport values; parsing for display and business calculations
belongs to the subsequent Mapper work. The RFC3339 checker validates calendar/time,
fraction syntax, timezone bounds and leap-second position. It does not assert a
leap-second announcement or prove a server clock. Other formats retain the pinned
validator implementation.

Sources: [RFC3339 sections5.6–5.7](https://www.rfc-editor.org/rfc/rfc3339.html#section-5.6),
[Kotlin generator options](https://openapi-generator.tech/docs/generators/kotlin/),
[OpenAPI int64 range](https://spec.openapis.org/registry/format/int64).

## What the smoke entry verifies

- Published raw bytes, Version, Status, metadata, templates, fixture and tool jars.
- Two fresh generations of all 324 models, with the 26 Phase5 selected wrappers.
- Android library compilation using the existing AGP 8.7.3 / Kotlin 2.0.21,
  compileSdk 35 / minSdk 26 / Java target 17 settings; all model classes in the AAR.
- Seventeen published synthetic cases against this module's Android-compiled
  classes on the host JVM: eight legal roundtrips and nine expected rejections.
  These include union branch selection, ordinary/swimming/offline submissions,
  a nested pending record with nulls and nanosecond timestamps, student dashboard
  and notification data, wrong discriminators, missing/extra fields and wrong types.
- Nine entry checks, including negative controls for changed bytes, CRLF conversion, wrong Version/Status,
  stale metadata, a wrong generator jar, and altered/missing generated models.

The generator configuration is adapted from the pinned Phase5 reproduction recipe;
its support module and templates are consumed directly, with the lossless date
profile described above. DTOs are never hand-edited.
The Phase5 Java test probe is copied with recorded substitutions:
`Files.readString/writeString` become Java8 UTF-8 read/write equivalents, because
the Android compilation stubs do not expose the former methods; the format factory
uses the declared RFC3339 and integer rules; a failed corpus throws an assertion
instead of terminating the whole JUnit process. The source hash, adapted hash and
exact substitutions are recorded. Schema constraints, generated branch checks,
scalar handling, omission/null tracking and exact roundtrip assertions are unchanged.

## Scope of the result

The schema validator and probe are test dependencies. Step5 also packages them into
the Android instrumentation test APK; they are absent from the validation AAR and
the formal app. Successful host tests and APK compilation do not prove device
runtime support by themselves. Step6 subsequently executed the sealed APK on Android;
the results and accepted scope are recorded below. Overall 6C acceptance remains open.

The read-only Phase5 release consistency check runs unmodified in normal mode against
an explicit input snapshot. Every immutable input is checked from this checkout;
only the historical `docs/rebuild/STATUS.md` release artifact comes from entry commit
`2ba9355e38373b8d2350eb8efe4071048337c320`. This lets later stage progress advance without
rewriting the Phase5 release seal. `published_input_seal.py` records both status hashes;
five regression controls reject altered Contract, fixture, manifest and historical
status bytes while accepting only current progress changes. Directly running the old
Phase5 verifier on this later-stage checkout reports the expected STATUS hash mismatch.
Its separate
`--require-published` flag still treats the explicitly deferred Phase7.0 backend
recipient as mandatory. That known gate-scope mismatch remains recorded for the
Contract Owner; this Android entry does not change that assertion or the release records.

## Student projections and mapper verification

`tools/phase6/run_step04.py` accepts the same tool-path arguments as `run_step03.py`.
It runs the strict schema regression plus `Phase6MapperTest`, packages the Android
library, and saves actual JUnit/case-set and source-hash evidence outside the repo.
`mapper-coverage.json` assigns all 41 Phase2 pages to tested data-mapping families or
local/school processes. It explicitly does **not** claim 41 rendered-page tests or
complete endpoint/command coverage. The repeated 99 error-code cases are reported
separately from the remaining behavioral scenarios.

The `Student*.kt` source files consume the actual generated `bnbu.cr005.review` DTOs:
progress/checkpoints, records/review/reasons/timers, session/first material, invitation,
course/home, raw endurance, applications/certification, notices, account/OTP, media,
help/feedback and release policy. Output models intentionally expose no student
grade/score/rank/historical-remark fields. Structured review reasons keep bilingual
labels; public teacher text remains original. Certification kind is read explicitly.

The caller must validate incoming JSON before mapping. `MapperWire` proves this chain
on the host using the same hash-bound strict guard as Step3; it is test-only and must
not be mistaken for a device-ready HTTP codec. Mapping contradictions throw instead
of fabricating success; the subsequent Mock/UI integration must display a data error.

`StudentViewContext` is supplied from fresh mode and owned-object reads. `LIVE` includes
a currently fetched continuing pre-closure/removal chain; `ARCHIVED` means a historical
read-only view. `canAttempt*` flags control a UI attempt only: they neither promise
acceptance nor replace authentication, ownership, concurrency, current mode, deadlines,
media verification and server command checks. Cached/archived progress is explicitly
historical. A current receipt is immutable history; locked transfer eligibility needs
a separate current material projection and the identical batch/manifest. Existing
formal media is read-only. Source timestamps and arbitrary fractional precision are
retained; business dates never become UTC-midnight instants. Device time does not
decide review outcomes, school-working-day SLA or maintenance recovery.

This module is still isolated from `:app`. The existing app's legacy-hour/status/text
adapters and old API binding remain unchanged for the later planned integration and
Phase8 runtime migration. Step5 connects Mock responses through parsing/mapping
to UI states; Step6's actual execution is recorded below. No host test proves
backend enforcement or real-world natural-language notification safety.

## Mock HTTP and validation screen

`tools/phase6/run_step05.py` uses the same tool arguments. It regenerates the DTOs
twice, reruns the schema and Mapper suites, runs Mock HTTP/page-state tests and
builds `contract-validation-debug-androidTest.apk`. It does not install or launch
that APK. Its minSdk 26 / targetSdk 35 matches the formal app's declared range.
JUnit, request traces, source hashes, APK/input hashes and the explicit
device-execution gap are saved to the external evidence directory.

The chain is `MockWebServer -> ContractMockHttp -> StrictMockCodec -> generated
DTO -> Student Mapper -> MockScreenController -> ContractMockScreen`. Server
addresses are restricted to literal `http://127.0.0.1` with synthetic credentials.
Operations and response schemas come from the sealed OpenAPI; all business paths
include `/api/v1`. The codec retains required-null/omitted distinctions, strict
types/ranges, formats, discriminators and exact roundtrips, and rejects raw HTTP
duplicate JSON members, trailing documents, malformed UTF-8 and unexpected fields.
Redirects and automatic network retries are disabled.

The independent screen covers affected page families and all seven states:
NORMAL, LOADING, EMPTY, ERROR, FORBIDDEN, MAINTENANCE, RESUME. Read-only is a separate
flag. A typed successful empty collection alone yields EMPTY; upstream failures
do not. Fresh NORMAL is required after maintenance; its estimated end is display
information. A fresh mode/eligibility/material read checks locked batch identity,
manifest and the server-time boundary before enabling a resume attempt. New loads
invalidate older responses. Cached/archived displays cannot enable write actions.

The supplement command exercise serializes a real generated request, checks fresh
review/timer identities, sends the version fields and an explicit idempotency key,
and waits for a matching 201 receipt. A 409 requests refresh and is not automatically
resubmitted. This validation command is not backend enforcement or complete media
upload/command coverage. Other visible action callbacks are tested for dispatch;
the full production flows and network binding remain Phase8 work.

`StrictMockCodec`, `MockCases` and `MockScenarioHarness` are the identical source
files compiled for JVM tests and Android instrumentation. `Phase6MockUiTest` binds
the real controller state to Compose, checks content/action tags and read-only
behavior. `Phase6MockRetryUiTest` checks that clicking Retry runs fresh Mock HTTP.
These are **build-only in Step5**. Step6 must run them on an emulator/device and
report failures; no screenshot or device pass is inferred from JVM assertions.
The Compose test setup follows the official
[Android Compose testing documentation](https://developer.android.com/develop/ui/compose/testing).

## Accepted Step6 result and local Step7 handoff

The final Step6 build regenerated all 324 models identically and passed 1,156 strict
schema cases (286 legal roundtrips / 870 required rejections), 255 Mapper cases and
71 Mock cases (44 page scenarios / 27 boundaries). The Android instrumentation run
passed 74/74: 44 UI scenarios, one actual Retry interaction, 27 boundaries and two
corpus tests covering the same 1,156 cases. A separate same-APK landscape/font-2.0
Retry test passed 1/1. The emulator was Android17/API37, x86_64, 16KB pages; this is
not a claim about every supported Android version. Actual capture produced 47 PNGs;
13 representative images were visually reviewed.

The user accepted Step6 after reviewing the separate manual launcher on an iQOO12Pro.
This is a user-reported physical review, without exported per-case results, OS version
or ADB-verified installed hash. The launcher's own emulator checks passed 2/2; these
are separate from the 74 instrumentation tests and do not constitute physical tests.

Local Android work is complete at 7/7. Git publication is pending user action;
Web PR#11 review and 6C consolidation are separate pending work. No production-app
API migration, backend enforcement/E2E or zero-defect claim follows from acceptance.
See the [stage handoff](../../docs/rebuild/handoffs/new-req-phase-6-android.md) and
[original evidence](../../docs/rebuild/handoffs/new-req-phase-6-android-evidence/README.md).

To reproduce the complete host/build result, run `run_step05.py` with the tool-path
arguments above and a new external evidence directory. With a booted Android device
or emulator, run the device suite from `BNBU-ANDROID`:

```powershell
& $Python -B -X utf8 .\tools\phase6\run_step06.py `
  --build-evidence $NewBuildEvidenceDirectory `
  --android-sdk $AndroidSdk `
  --serial $AndroidSerial `
  --suite full `
  --evidence $NewDeviceEvidenceDirectory
```

This command installs and executes the independent test APK. Obtain/select the
device first; it does not launch an emulator. Build and device runners check exact
source hashes. Step7 changes this README and the host verification entry, adding a
historical-input snapshot helper and five regression controls for the mutable progress
page. Compiled Android source, Gradle/generation configuration and fixtures remain
unchanged; the complete host/build chain is rerun after this tooling repair, with
packaged contents compared to the accepted Step6 artifacts. No Contract assertions
are weakened.
The old build evidence retains its original README hash and historical pending
fields. Use a fresh Step5 build before a fresh Step6 run on this checkout; do not
edit old results or bypass a source mismatch. The original source snapshot, APKs,
manual launcher sources and captures are retained in the separate evidence archive.
