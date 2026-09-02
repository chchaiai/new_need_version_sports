# Generated OpenAPI models

This source package is reserved for the Kotlin contract models generated from
`app/openapi/openapi.snapshot.yaml`. Gradle writes the generated sources to
`app/build/generated/openapi/src/main/kotlin` and adds that directory to the
Android main source set; generated files are not edited or maintained here.

The generation task is bound to the contract version and SHA-256 recorded in
`app/openapi/contract.properties`. Do not edit files inside the generated build
directory by hand. Change requests for the contract must be raised against the
backend contract rather than patched in the Android client.

The pinned Kotlin generator currently needs a deterministic compatibility step
for OpenAPI 3.1 explicit-null schemas, a decimal const enum, and one object that
combines properties with `anyOf`. That step runs automatically after generation,
is limited to this pinned contract hash, and fails if the generator output shape
changes. It never rewrites the authoritative snapshot.

Existing hand-written DTOs remain legacy until their owning feature is
migrated to the generated v1 models.
