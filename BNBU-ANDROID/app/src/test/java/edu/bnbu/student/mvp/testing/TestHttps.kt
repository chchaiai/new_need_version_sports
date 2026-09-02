package edu.bnbu.student.mvp.testing

import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockWebServer
import okhttp3.tls.HandshakeCertificates
import okhttp3.tls.HeldCertificate

/** Keeps non-local unit-test variants on HTTPS without trusting arbitrary certificates. */
object TestHttps {
    private val heldCertificate = HeldCertificate.Builder()
        .commonName("localhost")
        .addSubjectAlternativeName("localhost")
        .addSubjectAlternativeName("127.0.0.1")
        .build()

    private val serverCertificates = HandshakeCertificates.Builder()
        .heldCertificate(heldCertificate)
        .build()

    private val clientCertificates = HandshakeCertificates.Builder()
        .addTrustedCertificate(heldCertificate.certificate)
        .build()

    fun newServer(): MockWebServer = MockWebServer().apply {
        useHttps(serverCertificates.sslSocketFactory(), false)
    }

    fun clientBuilder(baseClient: OkHttpClient? = null): OkHttpClient.Builder =
        (baseClient?.newBuilder() ?: OkHttpClient.Builder())
            .sslSocketFactory(clientCertificates.sslSocketFactory(), clientCertificates.trustManager)
}
