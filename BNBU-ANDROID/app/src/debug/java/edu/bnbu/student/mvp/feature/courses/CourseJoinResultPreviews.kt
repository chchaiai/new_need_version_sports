package edu.bnbu.student.mvp.feature.courses

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import edu.bnbu.student.mvp.core.designsystem.interfaceText

private class CourseJoinResultPreviewProvider : PreviewParameterProvider<CourseJoinResultKind> {
    override val values: Sequence<CourseJoinResultKind> = CourseJoinResultKind.entries.asSequence()
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
private fun CourseJoinResultPreview(
    @PreviewParameter(CourseJoinResultPreviewProvider::class) kind: CourseJoinResultKind
) {
    CourseJoinResultScreen(
        result = CourseJoinResultUiModel(
            kind = kind,
            course = CourseJoinInfo(
                id = "local-design-sample",
                name = interfaceText("示例体育课程", "Sample PE course"),
                teacher = interfaceText("示例教师", "Sample teacher"),
                semester = interfaceText("示例学期", "Sample semester")
            ),
            diagnosticId = if (kind == CourseJoinResultKind.Success) null else "review-sample"
        ),
        onDone = {},
        onRetrySubmission = {},
        onUseAnotherInvitation = {},
        canOpenCourse = true,
        isDesignReview = true
    )
}
