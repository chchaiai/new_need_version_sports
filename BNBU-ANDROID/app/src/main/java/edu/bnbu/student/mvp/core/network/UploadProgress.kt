package edu.bnbu.student.mvp.core.network

import kotlin.math.max
import kotlin.math.min
import okhttp3.MediaType
import okhttp3.RequestBody
import okio.BufferedSink
import okio.ForwardingSink
import okio.buffer

/** Actual request-body bytes written to the network stack. */
data class UploadProgress(
    val bytesSent: Long,
    val totalBytes: Long
) {
    init {
        require(bytesSent >= 0L) { "Uploaded bytes cannot be negative." }
        require(totalBytes > 0L) { "Upload size must be positive." }
        require(bytesSent <= totalBytes) { "Uploaded bytes cannot exceed the upload size." }
    }

    val fraction: Float
        get() = (bytesSent.toDouble() / totalBytes.toDouble()).toFloat().coerceIn(0f, 1f)

    val percent: Int
        get() = (fraction * 100f).toInt().coerceIn(0, 100)
}

/** Counts bytes without buffering the whole image or video in memory. */
internal class ProgressRequestBody(
    private val delegate: RequestBody,
    private val onProgress: (UploadProgress) -> Unit
) : RequestBody() {
    override fun contentType(): MediaType? = delegate.contentType()

    override fun contentLength(): Long = delegate.contentLength().also { length ->
        require(length > 0L) { "Upload request body must have a known positive length." }
    }

    override fun writeTo(sink: BufferedSink) {
        val total = contentLength()
        var sent = 0L
        var lastPercent = -1

        fun publish(force: Boolean = false) {
            val bounded = min(max(sent, 0L), total)
            val progress = UploadProgress(bounded, total)
            if (force || progress.percent != lastPercent) {
                lastPercent = progress.percent
                onProgress(progress)
            }
        }

        publish(force = true)
        val countingSink = object : ForwardingSink(sink) {
            override fun write(source: okio.Buffer, byteCount: Long) {
                super.write(source, byteCount)
                sent += byteCount
                publish()
            }
        }.buffer()
        delegate.writeTo(countingSink)
        countingSink.flush()
        sent = total
        publish(force = true)
    }
}
