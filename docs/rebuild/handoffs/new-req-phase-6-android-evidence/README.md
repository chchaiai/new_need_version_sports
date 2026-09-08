# Phase6A evidence index

`acceptance.json` is the current local acceptance record; `evidence-manifest.json`
lists 84 original reports/logs copied byte-for-byte. `findings.json` consolidates
16 closed Android findings (15 from Steps3–6 and one Step7 reproduction-entry defect) with links to their original records. `closeout-check.json`
records the Step7 integrity checks. Historical `PENDING`, build-only `notRun`, and
`deviceTestsExecuted: 0` fields in earlier reports remain unchanged; later device
results and the actual user acceptance supersede them only for their stated scope.

Directories:

- `host/`: final Step6 build, generation manifests, schema/Mapper/Mock coverage and cases,
  JUnit outputs and commands. Source was stable during that build.
- `device/`: actual full Android run, events/JUnit, device identity, installed APK hash,
  corpus results and commands, including capture retrieval.
- `stress/`: separate same-APK landscape/font-2.0 Retry check.
- `manual/`: original debug-launcher delivery seal, input hashes and its two emulator checks.
  User phone review is recorded only in `acceptance.json`.
- `step06/`, `history/`: original audits, visual review, cleanup and finding histories.

The separate owner-held `phase6a-final-evidence.zip` contains 298 original files:
the exact tested source snapshot, final build binaries/inputs, actual screenshots,
device results and the prepared manual-review source/assets/dependencies/APK.
`archive.json` records its SHA-256, size, each entry and local location. It is not
automatically uploaded to GitHub. Share that attachment separately when raw images
or the phone APK are needed; this repository retains compact evidence and the main
validation source/reproduction entry. Earlier failed attempts remain in the original
local T02–T06 directories, not all in the final archive; failure diagnoses are retained
in the finding/audit records. No signing keys or Gradle caches are included.

For replay, extract to a new folder and verify every entry against the embedded
`archive-manifest.json`. Never extract over an existing repository. The manual wrapper
is already prepared under `T06/manual-review`: `app/libs`, sources and assets match
the reviewed seals. With JDK21/AndroidSDK35 and the pinned cached dependencies, the
repository's `BNBU-ANDROID/gradlew.bat -p <extracted>/T06/manual-review --offline
:app:assembleDebug :app:assembleDebugAndroidTest` rebuilds that wrapper. Set JAVA_HOME
and ANDROID_HOME to your actual tools. Do not rerun its historical `prepare.py` against
a changed checkout; that script intentionally references the original layout and seal.
A rebuild may have a different APK hash/signature on another computer and requires
its own recorded build and test result. The archived APK is the original issued one.

Step7 changed `contract-validation/README.md` and the host runner, adding a historical
release snapshot helper and five negative/positive controls. All compiled Android
source, settings, fixtures and generation configuration match Step6. The complete
host/build chain was rerun after the tooling fix; `step07-reproduction/` preserves
its results and artifact comparison. `source-delta.json` records the exact documentation
and tooling delta, not a rewritten Step6 seal. To execute
`run_step06.py` on a new checkout, first create fresh build evidence with `run_step05.py`.
The exact source gate is preserved.
