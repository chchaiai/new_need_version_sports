package edu.bnbu.student.mvp.feature.grades

import edu.bnbu.student.mvp.core.model.GradeRow

/**
 * v8.0 blocks the complete legacy grade projection from every student-facing surface.
 *
 * The old DTO remains in the shared model until Contract migration, but neither publication state
 * nor a masked numeric field can make it eligible for display in the Android student app.
 */
internal fun GradeRow.isStudentGradeDisclosureBlocked(): Boolean = true
