package edu.bnbu.student.mvp.core.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class AccountStatusTest {
    @Test
    fun studentMembershipStatusHasOnlyEnrolledAndWithdrawnStates() {
        assertEquals(StudentStatus.ACTIVE, StudentStatus.fromHasActiveEnrollment(true))
        assertEquals(StudentStatus.PENDING, StudentStatus.fromHasActiveEnrollment(false))
    }

    @Test
    fun missingOrUnknownStatusFailsClosedToContactBinding() {
        assertEquals(AccountStatus.PENDING_CONTACT_BINDING, AccountStatus.from(null))
        assertEquals(AccountStatus.PENDING_CONTACT_BINDING, AccountStatus.from(""))
        assertEquals(AccountStatus.PENDING_CONTACT_BINDING, AccountStatus.from("UNRECOGNIZED"))
    }

    @Test
    fun authoritativeJoinStatusMustBeKnown() {
        assertEquals(
            AccountStatus.PENDING_CONTACT_BINDING,
            AccountStatus.requireKnown("PENDING_CONTACT_BINDING")
        )
        assertEquals(AccountStatus.ACTIVE, AccountStatus.requireKnown("ACTIVE"))
        assertThrows(IllegalArgumentException::class.java) {
            AccountStatus.requireKnown(null)
        }
        assertThrows(IllegalArgumentException::class.java) {
            AccountStatus.requireKnown("SUSPENDED")
        }
    }
}
