package edu.bnbu.student.mvp.feature.exemption

import edu.bnbu.student.mvp.core.data.ApiStudentRepository

/** Loads short-lived, authorized image URLs without exposing the API adapter to the UI. */
internal class LoadExemptionProofPreviewsUseCase(
    private val repository: ApiStudentRepository
) {
    suspend operator fun invoke(mediaIds: List<String>): Map<String, String> =
        repository.loadExemptionProofPreviews(mediaIds)
}
