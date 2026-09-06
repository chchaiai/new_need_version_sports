package edu.bnbu.student.mvp.feature.checkin

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseReviewPublicReasonUiModelTest {
    @Test
    fun catalogContainsExactlyTheSixApprovedBilingualReasonsInAuthorityOrder() {
        val expected = listOf(
            "材料不清晰" to "Unclear evidence",
            "必需材料缺失（含要求的前后照）" to "Missing required evidence",
            "材料与本次运动不符" to "Evidence does not match this session",
            "材料信息矛盾" to "Inconsistent evidence",
            "材料真实性待核实" to "Evidence authenticity requires clarification",
            "经核实存在重复使用或冒用材料" to "Confirmed reuse or misuse of evidence"
        )

        assertEquals(
            expected,
            ExerciseReviewPublicReasonCodeUi.entries.map { it.chineseLabel to it.englishLabel }
        )
        assertFalse(
            ExerciseReviewPublicReasonCodeUi.entries.any {
                it.chineseLabel.contains("其他") || it.englishLabel.equals("Other", ignoreCase = true)
            }
        )
    }

    @Test
    fun returnForSupplementOnlyShowsItsFiveApplicableReasons() {
        assertEquals(
            listOf(
                ExerciseReviewPublicReasonCodeUi.UnclearEvidence,
                ExerciseReviewPublicReasonCodeUi.MissingRequiredEvidence,
                ExerciseReviewPublicReasonCodeUi.EvidenceDoesNotMatchSession,
                ExerciseReviewPublicReasonCodeUi.InconsistentEvidence,
                ExerciseReviewPublicReasonCodeUi.AuthenticityRequiresClarification
            ),
            ExerciseReviewPublicReasonCodeUi.forAction(
                ExerciseReviewTeacherActionUi.ReturnForSupplement
            )
        )
    }

    @Test
    fun markInvalidOnlyShowsItsFiveApplicableReasons() {
        assertEquals(
            listOf(
                ExerciseReviewPublicReasonCodeUi.UnclearEvidence,
                ExerciseReviewPublicReasonCodeUi.MissingRequiredEvidence,
                ExerciseReviewPublicReasonCodeUi.EvidenceDoesNotMatchSession,
                ExerciseReviewPublicReasonCodeUi.InconsistentEvidence,
                ExerciseReviewPublicReasonCodeUi.ConfirmedReuseOrMisuse
            ),
            ExerciseReviewPublicReasonCodeUi.forAction(
                ExerciseReviewTeacherActionUi.MarkInvalid
            )
        )
    }

    @Test
    fun actionSpecificReasonsCannotBeCombinedWithTheWrongTeacherAction() {
        assertTrue(
            runCatching {
                ExerciseReviewPublicReasonUiModel.TeacherDecision(
                    action = ExerciseReviewTeacherActionUi.MarkInvalid,
                    reasonCode = ExerciseReviewPublicReasonCodeUi.AuthenticityRequiresClarification
                )
            }.isFailure
        )
        assertTrue(
            runCatching {
                ExerciseReviewPublicReasonUiModel.TeacherDecision(
                    action = ExerciseReviewTeacherActionUi.ReturnForSupplement,
                    reasonCode = ExerciseReviewPublicReasonCodeUi.ConfirmedReuseOrMisuse
                )
            }.isFailure
        )
    }

    @Test
    fun publicSupplementalNoteIsKeptExactlyAsEntered() {
        val originalLanguageNote = "  请补一张原始照片。 Keep this exact punctuation!  "
        val decision = ExerciseReviewPublicReasonUiModel.TeacherDecision(
            action = ExerciseReviewTeacherActionUi.ReturnForSupplement,
            reasonCode = ExerciseReviewPublicReasonCodeUi.UnclearEvidence,
            publicSupplementalNote = originalLanguageNote
        )

        assertEquals(originalLanguageNote, decision.publicSupplementalNote)
    }

    @Test
    fun systemDeadlineMissedIsSeparateFromTeacherCatalogAndHasNoTeacherNote() {
        val reason: ExerciseReviewPublicReasonUiModel =
            ExerciseReviewPublicReasonUiModel.SystemSupplementDeadlineMissed

        assertFalse(reason is ExerciseReviewPublicReasonUiModel.TeacherDecision)
        assertEquals(
            "补证逾期",
            ExerciseReviewPublicReasonUiModel.SystemSupplementDeadlineMissed.ChineseLabel
        )
        assertEquals(
            "Supplementary evidence deadline missed",
            ExerciseReviewPublicReasonUiModel.SystemSupplementDeadlineMissed.EnglishLabel
        )
        assertFalse(
            ExerciseReviewPublicReasonCodeUi.entries.any {
                it.chineseLabel ==
                    ExerciseReviewPublicReasonUiModel.SystemSupplementDeadlineMissed.ChineseLabel ||
                    it.englishLabel ==
                    ExerciseReviewPublicReasonUiModel.SystemSupplementDeadlineMissed.EnglishLabel
            }
        )
    }

    @Test
    fun legacyFreeTextStaysANoteAndDoesNotBecomeAFixedReason() {
        val model = ExerciseReviewPublicReasonUiModel.FixedCategoryUnavailable(
            publicSupplementalNote = "Legacy public text"
        )

        assertEquals("Legacy public text", model.publicSupplementalNote)
        assertNull(
            ExerciseReviewPublicReasonCodeUi.entries.singleOrNull {
                it.englishLabel == model.publicSupplementalNote
            }
        )
    }
}
