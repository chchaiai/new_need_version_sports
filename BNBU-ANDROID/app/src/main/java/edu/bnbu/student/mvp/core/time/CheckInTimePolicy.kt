package edu.bnbu.student.mvp.core.time

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

internal val BeijingCheckInZoneId: ZoneId = ZoneId.of("Asia/Shanghai")

internal fun currentBeijingBusinessDate(): LocalDate = LocalDate.now(BeijingCheckInZoneId)

internal fun String?.toBeijingBusinessDate(): LocalDate? {
    val value = this?.trim().orEmpty()
    return runCatching {
        Instant.parse(value).atZone(BeijingCheckInZoneId).toLocalDate()
    }.getOrNull() ?: value.take(10)
        .takeIf { it.matches(Regex("\\d{4}-\\d{2}-\\d{2}")) }
        ?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
}

internal fun String?.studentLocalRecordDateText(
    locale: Locale,
    zoneId: ZoneId = ZoneId.systemDefault()
): String? {
    val value = this?.trim()?.takeIf(String::isNotEmpty) ?: return null
    return runCatching {
        Instant.parse(value)
            .atZone(zoneId)
            .format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(locale))
    }.getOrNull() ?: value.substringBefore(' ').takeIf(String::isNotBlank)
}

internal fun String?.studentLocalRecordDateTimeText(
    locale: Locale,
    zoneId: ZoneId = ZoneId.systemDefault()
): String? {
    val value = this?.trim()?.takeIf(String::isNotEmpty) ?: return null
    return runCatching {
        Instant.parse(value)
            .atZone(zoneId)
            .format(
                DateTimeFormatter
                    .ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)
                    .withLocale(locale)
            )
    }.getOrNull() ?: value
}

internal fun String?.studentLocalRecordTimeText(
    locale: Locale,
    zoneId: ZoneId = ZoneId.systemDefault()
): String? {
    val value = this?.trim()?.takeIf(String::isNotEmpty) ?: return null
    return runCatching {
        Instant.parse(value)
            .atZone(zoneId)
            .format(DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(locale))
    }.getOrNull() ?: value.substringAfter('T')
        .substringBeforeLast('Z')
        .take(5)
        .ifBlank { value }
}
