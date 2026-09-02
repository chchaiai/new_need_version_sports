package edu.bnbu.student.mvp.core.review

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalReviewWorkspaceProviderTest {
    @Test
    fun debugFixture_isSyntheticAndContainsNoBackendRepository() {
        val factory = requireNotNull(LocalReviewWorkspaceProvider.workspaceFactory)
        val workspace = factory()

        assertEquals("LOCAL-REVIEW-STUDENT", workspace.student.id)
        assertEquals("本地测试学生", workspace.student.name)
        assertEquals("ACTIVE", workspace.student.status)
        assertTrue(workspace.student.email.endsWith(".invalid"))
        assertTrue(workspace.progress.source.contains("不来自真实 Backend"))
        assertEquals(16.0, workspace.progress.authoritativeTotalHours ?: -1.0, 0.0)
        assertFalse(workspace.courses.isEmpty())
        assertFalse(workspace.records.isEmpty())
        assertTrue(workspace.records.all { it.reviewStatus == "VALID" })
        assertTrue(workspace.records.all { it.startTime != null && it.endTime != null })
        assertTrue(workspace.records.all { it.actualDurationSeconds == 7_800L })
        assertNull(workspace.progress.organizationCredit)
        val exemption = workspace.exemptions.single()
        assertEquals("run_800m", exemption.type)
        assertEquals("审核中", exemption.status)
        assertEquals("因踝关节扭伤申请本学期 800 米测试缓测。", exemption.reason)
        assertEquals(listOf("mock://proof/medical_certificate.jpg"), exemption.proofFiles)
        assertTrue(exemption.proofFiles.all { it.endsWith(".jpg") || it.endsWith(".png") })
        assertEquals("已收到校医院证明，正在审核。", exemption.reviewComment)
        assertEquals("2026-07-21 11:05", exemption.createdAt)
    }
}
