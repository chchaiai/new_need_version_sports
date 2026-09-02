package edu.bnbu.student.mvp.core.data

import edu.bnbu.student.mvp.core.model.StudentWorkspace
import edu.bnbu.student.mvp.core.network.LoginResponse
import edu.bnbu.student.mvp.core.network.MarkReadResponse
import edu.bnbu.student.mvp.core.network.StudentLoginRequest
import edu.bnbu.student.mvp.core.network.SubmitRecordResponse
import edu.bnbu.student.mvp.core.network.SubmitSportRecordRequest

interface StudentRepository {
    /** Synchronous fallback — prefer [loadWorkspaceAsync] for all real code paths. */
    fun loadWorkspace(): StudentWorkspace

    /** Fetch the full student workspace from the backend. */
    suspend fun loadWorkspaceAsync(): StudentWorkspace

    /** Authenticate against the backend. */
    suspend fun login(payload: StudentLoginRequest): LoginResponse

    /** Submit a new sport record. Returns [Result] for error handling. */
    suspend fun submitRecord(payload: SubmitSportRecordRequest): Result<SubmitRecordResponse>

    /** Mark a notification as read. Returns [Result] for error handling. */
    suspend fun markNotificationRead(id: String): Result<MarkReadResponse>
}
