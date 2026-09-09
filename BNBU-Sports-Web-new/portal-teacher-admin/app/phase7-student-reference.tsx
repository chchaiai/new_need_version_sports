import type { components } from "./phase5b-contract.generated";
import { studentIdentityDisplay } from "../../frontend/student/js/contract/wire.js";

/** Phase6 validation surface; a deleted identity cannot become a current-profile link. */
export function StudentReferenceDisplay({ reference, english = false }: {
  reference: components["schemas"]["StudentReference"]; english?: boolean;
}) {
  const identity = studentIdentityDisplay(reference, english);
  return <span data-student-kind={identity.deleted ? "DELETED_STUDENT" : "CURRENT_STUDENT"}>
    <strong>{identity.label}</strong>{identity.studentNumber !== null && <small>{identity.studentNumber}</small>}
  </span>;
}
