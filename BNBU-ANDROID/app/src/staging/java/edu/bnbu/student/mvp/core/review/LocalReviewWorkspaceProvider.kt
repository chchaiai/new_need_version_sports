package edu.bnbu.student.mvp.core.review

import edu.bnbu.student.mvp.core.model.StudentWorkspace

/** Staging never exposes the password-free local review fixture. */
internal object LocalReviewWorkspaceProvider {
    val workspaceFactory: (() -> StudentWorkspace)? = null
}
