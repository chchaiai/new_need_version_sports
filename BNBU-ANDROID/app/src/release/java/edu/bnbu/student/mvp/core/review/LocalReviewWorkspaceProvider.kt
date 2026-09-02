package edu.bnbu.student.mvp.core.review

import edu.bnbu.student.mvp.core.model.StudentWorkspace

/** Production never packages or exposes the password-free local review fixture. */
internal object LocalReviewWorkspaceProvider {
    val workspaceFactory: (() -> StudentWorkspace)? = null
}
