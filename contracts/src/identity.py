from __future__ import annotations

from typing import Any

from common import (
    EMAIL,
    INSTANT,
    NON_EMPTY_TEXT,
    UUID,
    VERSION,
    ContractRegistry,
    Schema,
    array_of,
    integer_schema,
    nullable,
    object_schema,
    query_parameter,
    ref,
    string_schema,
)


def register_identity(schemas: dict[str, Schema], registry: ContractRegistry) -> None:
    schemas["ActorRole"] = string_schema(enum=["STUDENT", "TEACHER", "ADMIN"])
    schemas["AdminKind"] = string_schema(enum=["SUPER", "SUB"])
    schemas["AdminPermission"] = string_schema(
        enum=[
            "COURSE_VIEW",
            "SEMESTER",
            "USERS_ACCOUNTS",
            "FEEDBACK",
            "GLOBAL_RULES",
            "SYSTEM_MODE",
            "HELP_CENTER",
            "AUDIT_QUERY",
        ]
    )
    schemas["AuthChallengePurpose"] = string_schema(
        enum=[
            "STUDENT_LOGIN",
            "STUDENT_EMAIL_BINDING",
            "PASSWORD_RESET",
            "CURRENT_EMAIL_VERIFICATION",
            "NEW_EMAIL_VERIFICATION",
            "ACCOUNT_DELETION",
        ]
    )
    schemas["AuthChallengeRequest"] = object_schema(
        {
            "purpose": ref("AuthChallengePurpose"),
            "email": EMAIL,
        },
        ["purpose", "email"],
        description="Requests an email OTP challenge. The response must not disclose whether an account exists.",
    )
    schemas["AuthChallenge"] = object_schema(
        {
            "challengeId": UUID,
            "expiresAt": INSTANT,
            "retryAfterSeconds": integer_schema(fmt="int32", minimum=0),
        },
        ["challengeId", "expiresAt", "retryAfterSeconds"],
    )
    schemas["OtpProof"] = object_schema(
        {
            "challengeId": UUID,
            "code": string_schema(min_length=1, write_only=True),
        },
        ["challengeId", "code"],
    )
    schemas["StudentSessionRequest"] = object_schema({"otpProof": ref("OtpProof")}, ["otpProof"])
    schemas["PasswordSessionRequest"] = object_schema(
        {
            "loginType": string_schema(enum=["TEACHER_EMAIL", "ADMIN_EMAIL", "ADMIN_LOGIN_NAME"]),
            "identifier": string_schema(min_length=1),
            "password": string_schema(min_length=1, write_only=True),
        },
        ["loginType", "identifier", "password"],
    )
    schemas["CurrentActor"] = object_schema(
        {
            "userId": UUID,
            "organizationId": UUID,
            "role": ref("ActorRole"),
            "displayName": string_schema(min_length=1),
            "verifiedEmail": EMAIL,
            "accountState": string_schema(enum=["ACTIVE", "DISABLED"]),
            "adminKind": nullable(ref("AdminKind")),
            "adminPermissions": array_of(ref("AdminPermission")),
            "mustChangePassword": {
                "type": "boolean",
                "description": (
                    "True only while a Teacher/Admin is using a system- or other-person-assigned temporary initial "
                    "password. Successful self password change or verified-email self reset clears it to false."
                ),
            },
            "version": VERSION,
        },
        [
            "userId",
            "organizationId",
            "role",
            "displayName",
            "verifiedEmail",
            "accountState",
            "adminKind",
            "adminPermissions",
            "mustChangePassword",
            "version",
        ],
    )
    schemas["SessionTokenPair"] = object_schema(
        {
            "accessToken": string_schema(min_length=1, fmt="password"),
            "accessExpiresAt": INSTANT,
            "refreshToken": string_schema(min_length=1, fmt="password"),
            "refreshExpiresAt": INSTANT,
            "actor": ref("CurrentActor"),
        },
        ["accessToken", "accessExpiresAt", "refreshToken", "refreshExpiresAt", "actor"],
        description="Short-lived bearer access token plus a rotating opaque refresh token. Clients use platform secure storage.",
    )
    schemas["RefreshSessionRequest"] = object_schema(
        {"refreshToken": string_schema(min_length=1, fmt="password", write_only=True)},
        ["refreshToken"],
    )
    schemas["PasswordResetRequest"] = object_schema(
        {
            "otpProof": ref("OtpProof"),
            "newPassword": string_schema(min_length=1, write_only=True),
        },
        ["otpProof", "newPassword"],
    )
    schemas["PasswordChangeRequest"] = object_schema(
        {
            "currentPassword": string_schema(min_length=1, write_only=True),
            "newPassword": string_schema(min_length=1, write_only=True),
            "expectedVersion": VERSION,
        },
        ["currentPassword", "newPassword", "expectedVersion"],
    )
    schemas["VerifiedEmailChangeRequest"] = object_schema(
        {
            "currentEmailProof": ref("OtpProof"),
            "newEmailProof": ref("OtpProof"),
            "expectedVersion": VERSION,
        },
        ["currentEmailProof", "newEmailProof", "expectedVersion"],
    )
    schemas["AccountDeletionImpact"] = object_schema(
        {
            "allowed": {"type": "boolean"},
            "blockers": array_of(
                object_schema(
                    {
                        "code": string_schema(
                            enum=["ACTIVE_EXERCISE_SESSION", "ADMIN_RESPONSIBILITY"]
                        ),
                        "count": integer_schema(fmt="int32", minimum=1),
                    },
                    ["code", "count"],
                )
            ),
            "dataDeleted": array_of(string_schema(min_length=1)),
            "factsRetained": array_of(string_schema(min_length=1)),
        },
        ["allowed", "blockers", "dataDeleted", "factsRetained"],
    )
    schemas["AccountDeletionRequest"] = object_schema(
        {
            "otpProof": ref("OtpProof"),
            "expectedVersion": VERSION,
            "acknowledgement": {"type": "string", "const": "DELETE_MY_ACCOUNT"},
        },
        ["otpProof", "expectedVersion", "acknowledgement"],
    )
    schemas["AppReleasePolicy"] = object_schema(
        {
            "platform": string_schema(enum=["ANDROID", "IOS", "WEB"]),
            "currentBuildNumber": integer_schema(fmt="int64", minimum=0),
            "minimumSupportedBuildNumber": integer_schema(fmt="int64", minimum=0),
            "latestBuildNumber": integer_schema(fmt="int64", minimum=0),
            "forceUpgrade": {"type": "boolean"},
            "downloadUrl": nullable(string_schema(fmt="uri")),
            "message": nullable(ref("LocalizedText")),
            "evaluatedAt": INSTANT,
        },
        [
            "platform",
            "currentBuildNumber",
            "minimumSupportedBuildNumber",
            "latestBuildNumber",
            "forceUpgrade",
            "downloadUrl",
            "message",
            "evaluatedAt",
        ],
        description="Auxiliary startup result. A failed check must not clear a previously cached force-upgrade requirement.",
    )

    registry.add(
        method="post",
        path="/auth/challenges",
        operation_id="requestAuthChallenge",
        tag="Authentication",
        summary="Request an email verification challenge",
        description="Creates a purpose-scoped OTP challenge without revealing whether the target account exists.",
        roles=["ANONYMOUS", "STUDENT", "TEACHER", "ADMIN"],
        success_schema="AuthChallenge",
        success_status=202,
        success_description="Challenge request accepted.",
        request_schema="AuthChallengeRequest",
        resource_scope="TARGET_EMAIL_WITH_ANTI_ENUMERATION",
        system_mode="ALLOWED_DURING_MAINTENANCE",
        idempotent=True,
        error_codes=["RATE_LIMITED"],
        public=True,
    )
    registry.add(
        method="post",
        path="/auth/sessions/student",
        operation_id="createStudentSession",
        tag="Authentication",
        summary="Create a student session with a verified email OTP",
        description="Consumes a STUDENT_LOGIN challenge and returns rotating session credentials.",
        roles=["ANONYMOUS"],
        success_schema="SessionTokenPair",
        success_status=201,
        request_schema="StudentSessionRequest",
        resource_scope="VERIFIED_STUDENT_EMAIL",
        system_mode="ALLOWED_DURING_MAINTENANCE",
        idempotent=True,
        error_codes=["INVALID_CREDENTIALS", "CHALLENGE_EXPIRED", "ACCOUNT_DISABLED"],
        public=True,
    )
    registry.add(
        method="post",
        path="/auth/sessions/password",
        operation_id="createPasswordSession",
        tag="Authentication",
        summary="Create a teacher or administrator password session",
        description="Authenticates a teacher by verified school email or an administrator by the declared identifier type.",
        roles=["ANONYMOUS"],
        success_schema="SessionTokenPair",
        success_status=201,
        request_schema="PasswordSessionRequest",
        resource_scope="DECLARED_LOGIN_IDENTIFIER",
        system_mode="ALLOWED_DURING_MAINTENANCE",
        idempotent=True,
        error_codes=["INVALID_CREDENTIALS", "ACCOUNT_DISABLED"],
        public=True,
    )
    registry.add(
        method="post",
        path="/auth/sessions/refresh",
        operation_id="refreshSession",
        tag="Authentication",
        summary="Rotate a refresh credential",
        description="Consumes the current opaque refresh credential and returns a new access/refresh pair. Reuse of a rotated credential is rejected.",
        roles=["ANONYMOUS"],
        success_schema="SessionTokenPair",
        request_schema="RefreshSessionRequest",
        resource_scope="REFRESH_SESSION_OWNER",
        system_mode="ALLOWED_DURING_MAINTENANCE",
        idempotent=True,
        error_codes=["INVALID_CREDENTIALS", "TOKEN_EXPIRED", "ACCOUNT_DISABLED"],
        public=True,
    )
    registry.add(
        method="post",
        path="/auth/sessions/current/logout",
        operation_id="logoutCurrentSession",
        tag="Authentication",
        summary="Revoke the current login session",
        description="Revokes the current session. Repeating the command returns the committed revocation result.",
        roles=["STUDENT", "TEACHER", "ADMIN"],
        success_schema="CommandAccepted",
        request_schema=None,
        resource_scope="CURRENT_SESSION",
        system_mode="ALLOWED_DURING_MAINTENANCE",
        idempotent=True,
    )
    registry.add(
        method="post",
        path="/auth/sessions/logout-all",
        operation_id="logoutAllSessions",
        tag="Authentication",
        summary="Revoke all sessions for the current account",
        description="Revokes every still-valid session owned by the authenticated account.",
        roles=["STUDENT", "TEACHER", "ADMIN"],
        success_schema="CommandAccepted",
        request_schema=None,
        resource_scope="CURRENT_ACCOUNT",
        system_mode="ALLOWED_DURING_MAINTENANCE",
        idempotent=True,
    )
    registry.add(
        method="post",
        path="/auth/password/reset",
        operation_id="resetPassword",
        tag="Authentication",
        summary="Reset a teacher or administrator password",
        description=(
            "Consumes valid PASSWORD_RESET proof for the account holder's verified school email and sets that holder's "
            "final personal password. Success clears mustChangePassword, revokes every prior session, returns no token, "
            "and does not automatically log in. A proof-resolved DISABLED account returns ACCOUNT_DISABLED without "
            "changing its credential, gate, or access state; challenge issuance keeps its anti-enumeration behavior."
        ),
        roles=["ANONYMOUS"],
        success_schema="CommandAccepted",
        request_schema="PasswordResetRequest",
        resource_scope="VERIFIED_ACCOUNT_EMAIL",
        system_mode="ALLOWED_DURING_MAINTENANCE",
        idempotent=True,
        error_codes=["INVALID_CREDENTIALS", "CHALLENGE_EXPIRED", "ACCOUNT_DISABLED"],
        public=True,
    )
    registry.add(
        method="get",
        path="/me",
        operation_id="getCurrentActor",
        tag="Identity",
        summary="Get the current authenticated actor",
        description="Returns only the current account/profile projection required by clients; no credentials or internal subject history are exposed.",
        roles=["STUDENT", "TEACHER", "ADMIN"],
        success_schema="CurrentActor",
        resource_scope="SELF",
        system_mode="ALLOWED_DURING_MAINTENANCE",
    )
    registry.add(
        method="put",
        path="/me/password",
        operation_id="changeOwnPassword",
        tag="Identity",
        summary="Change the current teacher or administrator password",
        description=(
            "Allows only the ACTIVE Teacher/Admin account holder to replace their own password using the current password "
            "and expected version. Success preserves the current session, revokes every other session, and returns "
            "CurrentActor with mustChangePassword=false."
        ),
        roles=["TEACHER", "ADMIN"],
        success_schema="CurrentActor",
        request_schema="PasswordChangeRequest",
        resource_scope="SELF",
        system_mode="ALLOWED_DURING_MAINTENANCE",
        idempotent=True,
        error_codes=["INVALID_CREDENTIALS", "ACCOUNT_DISABLED", "VERSION_CONFLICT"],
    )
    registry.add(
        method="put",
        path="/me/verified-email",
        operation_id="changeOwnVerifiedEmail",
        tag="Identity",
        summary="Change the current verified school email",
        description="Requires independent proofs for the current and new school email and updates the account atomically.",
        roles=["STUDENT", "TEACHER", "ADMIN"],
        success_schema="CurrentActor",
        request_schema="VerifiedEmailChangeRequest",
        resource_scope="SELF",
        system_mode="NORMAL_REQUIRED",
        idempotent=True,
        error_codes=["CHALLENGE_EXPIRED", "EMAIL_ALREADY_IN_USE", "VERSION_CONFLICT"],
    )
    registry.add(
        method="get",
        path="/me/account-deletion-impact",
        operation_id="getOwnAccountDeletionImpact",
        tag="Identity",
        summary="Inspect own-account deletion impact and blockers",
        description="Returns explicit current blockers plus the account data deleted and formal facts retained on success. Teachers and super administrators are not eligible for self-deletion.",
        roles=["STUDENT", "ADMIN"],
        success_schema="AccountDeletionImpact",
        resource_scope="SELF_STUDENT_OR_SUB_ADMIN",
        system_mode="NORMAL_REQUIRED",
        error_codes=["FORBIDDEN"],
    )
    registry.add(
        method="post",
        path="/me/account-deletion",
        operation_id="deleteOwnAccount",
        tag="Identity",
        summary="Delete the current student or sub-administrator account",
        description="Requires second-factor verification. Login account, credentials, sessions, challenges, verified email/login name, and current profile PII are deleted; exercise records, formal media, and audit events remain linked only to an opaque non-login historical subject.",
        roles=["STUDENT", "ADMIN"],
        success_schema="DeletionResult",
        request_schema="AccountDeletionRequest",
        resource_scope="SELF_STUDENT_OR_SUB_ADMIN",
        system_mode="NORMAL_REQUIRED",
        idempotent=True,
        error_codes=["CHALLENGE_EXPIRED", "ACCOUNT_DELETION_BLOCKED", "VERSION_CONFLICT"],
    )
    registry.add(
        method="get",
        path="/app-release-policy",
        operation_id="getAppReleasePolicy",
        tag="System",
        summary="Evaluate the client release policy",
        description="Auxiliary startup check. Failure does not independently make the application unavailable, and clients must not clear a cached force-upgrade requirement without a newer authoritative result.",
        roles=["ANONYMOUS", "STUDENT", "TEACHER", "ADMIN"],
        success_schema="AppReleasePolicy",
        parameters=[
            query_parameter("platform", string_schema(enum=["ANDROID", "IOS", "WEB"]), required=True),
            query_parameter("currentBuildNumber", integer_schema(minimum=0), required=True),
        ],
        resource_scope="PUBLIC_POLICY",
        system_mode="ALLOWED_DURING_MAINTENANCE",
        error_codes=["DEPENDENCY_UNAVAILABLE"],
        public=True,
    )
