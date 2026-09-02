from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

import yaml


CONTRACT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = CONTRACT_ROOT / "src"
sys.path.insert(0, str(SOURCE_ROOT))

from admin import register_admin  # noqa: E402
from applications import register_applications  # noqa: E402
from common import (  # noqa: E402
    ERROR_CATALOG,
    ContractRegistry,
    build_standard_responses,
    register_common_schemas,
)
from courses import register_courses  # noqa: E402
from exercise import register_exercise  # noqa: E402
from identity import register_identity  # noqa: E402
from services import register_services  # noqa: E402


CONTRACT_VERSION = "1.2.0-contract"
CONTRACT_STATUS = "RC"
PUBLIC_BASE_PATH = "/api/v1"


TAG_DESCRIPTIONS = {
    "Authentication": "OTP, password, refresh-token, and session use cases.",
    "Identity": "Current identity, verified-email change, and account deletion.",
    "Semesters": "Administrator-controlled academic semester state.",
    "Courses": "Course creation, controlled changes, impact checks, and closure.",
    "Enrollment": "Invitation-driven student registration and course membership.",
    "Rosters": "Teacher roster import, findings, resolution, and rollback.",
    "Exercise sessions": "Server-clock exercise-session state transitions.",
    "Media evidence": "Purpose-bound allocation, authoritative verification, and authorized download.",
    "Exercise records": "Immutable record submission and appended teacher reviews.",
    "Statistics": "Student and teacher progress projections derived from confirmed facts.",
    "Applications": "Exemption and certification application workflows.",
    "Endurance": "Measured endurance outcomes and versioned conversion-rule tables.",
    "Final grades": "Teacher publication and correction of signed-int32 final grades.",
    "Feedback": "Student feedback submission and administrator public replies.",
    "Help center": "Bilingual help-article authoring, publication, and retrieval.",
    "Notifications": "In-app notification list and read acknowledgement.",
    "Audit": "Permission-aware audit search and asynchronous ZIP export.",
    "Accounts": "Teacher, student, and sub-administrator account governance.",
    "Dashboards": "Role-specific aggregate views without client-side rule reconstruction.",
    "Admin governance": "System-mode and other fixed-permission administrative controls.",
    "System": "Public release policy and fail-closed system-mode observation.",
}


def assemble() -> tuple[dict[str, Any], ContractRegistry]:
    schemas: dict[str, dict[str, Any]] = {}
    registry = ContractRegistry()
    register_common_schemas(schemas)
    register_identity(schemas, registry)
    register_courses(schemas, registry)
    register_exercise(schemas, registry)
    register_applications(schemas, registry)
    register_services(schemas, registry)
    register_admin(schemas, registry)

    spec: dict[str, Any] = {
        "openapi": "3.1.0",
        "jsonSchemaDialect": "https://json-schema.org/draft/2020-12/schema",
        "info": {
            "title": "BNBU Sports API",
            "version": CONTRACT_VERSION,
            "summary": "The single external communication contract for Android, Web, and Backend.",
            "description": (
                "Public release line `/api/v1`. This Contract specifies API-boundary behavior only: generated DTOs belong "
                "in API or Contract adapters, operationId names application use cases, domain errors are mapped to stable "
                "Contract errors, and ORM entities are never generated from or exposed by this document."
            ),
            "x-contract-status": CONTRACT_STATUS,
        },
        "servers": [
            {
                "url": PUBLIC_BASE_PATH,
                "description": "Versioned API base path; environment origin is supplied by deployment configuration.",
            }
        ],
        "tags": [{"name": name, "description": description} for name, description in TAG_DESCRIPTIONS.items()],
        "paths": registry.paths,
        "components": {
            "securitySchemes": {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": (
                        "Short-lived access token in `Authorization: Bearer <token>`. Refresh credentials are accepted only "
                        "in the refresh request body and must never appear in URLs."
                    ),
                }
            },
            "headers": {
                "RequestId": {
                    "description": "Server correlation identifier; the same value appears in ErrorEnvelope.requestId.",
                    "schema": {"type": "string", "minLength": 1},
                }
            },
            "parameters": {
                "IdempotencyKey": {
                    "name": "Idempotency-Key",
                    "in": "header",
                    "required": True,
                    "description": (
                        "UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the "
                        "original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED."
                    ),
                    "schema": {"type": "string", "format": "uuid"},
                }
            },
            "schemas": schemas,
            "responses": build_standard_responses(),
        },
        "x-contract-governance": {
            "status": CONTRACT_STATUS,
            "lifecycle": {
                "DRAFT": "Still being designed.",
                "RC": "May be used for mocks and Backend implementation.",
                "APPROVED": "May enter Staging.",
                "LOCKED": "Production-release baseline.",
            },
            "changePolicy": "Once the Contract enters RC, every later change requires a recorded Change Request and a Contract version increment.",
            "businessAuthority": [
                "docs/business/00-overview.md",
                "docs/business/10-student-flow.md",
                "docs/business/20-teacher-flow.md",
                "docs/business/30-admin-flow.md",
            ],
            "acceptedPhase4Decisions": [
                "P4-DECISION-01",
                "P4-DECISION-02",
                "P4-DECISION-03",
                "P4-DECISION-04",
                "P4-DECISION-05",
            ],
            "acceptedPhase5ChangeRequests": [
                "CR-20260831-001",
                "CR-20260831-002",
                "CR-20260831-003",
                "CR-20260831-004",
                "CR-20260831-005",
                "CR-20260831-006",
                "CR-20260831-007",
                "CR-20260831-008",
                "CR-20260831-009",
                "CR-20260831-010",
                "CR-20260831-011",
                "CR-20260831-012",
                "CR-20260901-002",
                "CR-20260901-003",
            ],
        },
        "x-public-conventions": {
            "pagination": (
                "Opaque keyset cursors only. Cursors are bound to the operation and normalized filters; clients must not "
                "parse them. Lists return items plus CursorPage. Operation-specific limits are authoritative."
            ),
            "time": (
                "Instants are RFC 3339 UTC strings with explicit Z. Calendar dates use YYYY-MM-DD and retain their "
                "declared business timezone semantics; exercise businessDate is fixed by server time in Asia/Shanghai."
            ),
            "nulls": (
                "Response properties are required unless the schema says otherwise. A required nullable property is "
                "present with null when no value exists; arrays are present and empty. Request omission and explicit null "
                "are distinct, additional properties are rejected, and null is accepted only where declared."
            ),
            "uploads": (
                "Clients first allocate with declared metadata, use the response's required uploadMethod (PUT), exact "
                "requiredHeaders, and byte body against the short-lived least-privilege URL, then finalize or import. "
                "Backend probing of type, size, checksum, duration, audio, and structure is authoritative. Internal object "
                "keys and permanent public URLs are never exposed."
            ),
            "idempotency": (
                "Commands marked REQUIRED_HEADER require Idempotency-Key. Natural idempotency is described per operation. "
                "Read-only operations require no key."
            ),
            "authentication": (
                "Bearer access tokens authenticate protected operations. Roles, fixed administrator permissions, resource "
                "scope, and fail-closed system-mode requirements are declared on every operation."
            ),
        },
        "x-upload-policies": {
            "RECORD_EVIDENCE": {
                "flow": ["ALLOCATE", "DIRECT_UPLOAD", "FINALIZE_AND_PROBE", "BIND_ON_RECORD_SUBMISSION"],
                "image": {
                    "contentTypes": ["image/jpeg", "image/png"],
                    "maximumCount": 6,
                    "maximumBytesEach": 10 * 1024 * 1024,
                },
                "video": {
                    "contentTypes": ["video/mp4"],
                    "maximumCount": 1,
                    "maximumBytesEach": 100 * 1024 * 1024,
                    "durationSeconds": {"minimum": 1, "maximum": 15},
                    "audioRequired": True,
                },
                "aggregateMinimumCount": 1,
                "aggregateMaximumCount": 7,
                "aggregateMaxBytes": 250 * 1024 * 1024,
            },
            "APPLICATION_EVIDENCE": {
                "flow": ["ALLOCATE", "DIRECT_UPLOAD", "FINALIZE_AND_PROBE", "BIND_ON_INITIAL_OR_SUPPLEMENT_SUBMISSION"],
                "contentTypes": ["image/jpeg", "image/png", "image/webp"],
                "maximumBytesEach": 10 * 1024 * 1024,
                "aggregateMaxCount": 3,
                "aggregateScope": "Initial submission plus every supplement for the same application.",
            },
            "ROSTER_SOURCE": {
                "flow": ["ALLOCATE", "DIRECT_UPLOAD", "IMPORT_AND_PARSE"],
                "contentTypes": [
                    "text/csv",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ],
                "maximumBytes": 100 * 1024 * 1024,
                "dataRowMaximum": 500,
                "rowCounting": "Header excluded; invalid and duplicate data rows included.",
                "retention": "Temporary source discarded after parsing; formal snapshot stores normalized facts only.",
            },
        },
        "x-error-catalog": ERROR_CATALOG,
    }
    return spec, registry


class ContractDumper(yaml.SafeDumper):
    def ignore_aliases(self, data: Any) -> bool:
        return True


def render_catalog(registry: ContractRegistry) -> str:
    lines = [
        "# Operation catalog",
        "",
        f"Contract `{CONTRACT_VERSION}` · status `{CONTRACT_STATUS}` · public base path `{PUBLIC_BASE_PATH}`.",
        "",
        "This file is generated from the same registry as `openapi.yaml`; it is a review index, not a second authority.",
        "",
        "| Method | Public path | operationId | Roles | Admin permissions | Resource/system scope | Idempotency |",
        "|---|---|---|---|---|---|---|",
    ]
    for operation in registry.operations:
        roles = ", ".join(operation.roles) or "—"
        permissions = ", ".join(operation.permissions) or "—"
        scope = f"{operation.system_mode}"
        op = registry.paths[operation.path][operation.method.lower()]
        scope = f"{op['x-resource-scope']} / {scope}"
        lines.append(
            f"| {operation.method} | `{PUBLIC_BASE_PATH}{operation.path}` | `{operation.operation_id}` | "
            f"{roles} | {permissions} | {scope} | {operation.idempotency} |"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    spec, registry = assemble()
    yaml_text = yaml.dump(
        spec,
        Dumper=ContractDumper,
        allow_unicode=True,
        sort_keys=False,
        width=120,
        default_flow_style=False,
    )
    openapi_path = CONTRACT_ROOT / "openapi.yaml"
    openapi_path.write_text(yaml_text, encoding="utf-8", newline="\n")
    (CONTRACT_ROOT / "operation-catalog.md").write_text(render_catalog(registry), encoding="utf-8", newline="\n")

    metadata = {
        "contractVersion": CONTRACT_VERSION,
        "contractStatus": CONTRACT_STATUS,
        "publicBasePath": PUBLIC_BASE_PATH,
        "openapiSha256": hashlib.sha256(yaml_text.encode("utf-8")).hexdigest(),
        "pathCount": len(registry.paths),
        "operationCount": len(registry.operations),
        "errorCodeCount": len(ERROR_CATALOG),
    }
    (CONTRACT_ROOT / "contract-metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()
