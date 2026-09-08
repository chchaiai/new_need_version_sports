package edu.bnbu.student.contractvalidation

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/** Transport value plus explicit display conversion. Never used to authorize a write. */
data class StudentInstant private constructor(val wire: String) : Comparable<StudentInstant> {
    init {
        require(wire.matches(Regex("[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]+)?Z")) &&
            WireDateTime.isRfc3339(wire)) { "Invalid Contract UTC timestamp" }
    }
    fun shanghaiLabel(): String {
        val leap = wire.substring(17, 19) == "60"
        val whole = wire.substring(0, 17) + if (leap) "59" else wire.substring(17, 19)
        val local = LocalDateTime.parse(whole).atOffset(ZoneOffset.UTC)
            .atZoneSameInstant(ZoneId.of("Asia/Shanghai"))
        val prefix = local.format(DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:"))
        val fraction = wire.substring(19, wire.length - 1)
        return prefix + (if (leap) "60" else local.format(DateTimeFormatter.ofPattern("ss"))) + fraction + " Asia/Shanghai"
    }

    override fun compareTo(other: StudentInstant): Int {
        // All inputs are canonical UTC with fixed-width calendar components. Compare fractional
        // digits after zero-padding, never through milliseconds, Double or bounded nanoseconds.
        val whole = wire.substring(0, 19).compareTo(other.wire.substring(0, 19))
        if (whole != 0) return whole
        val a = wire.substring(19, wire.length - 1).removePrefix(".")
        val b = other.wire.substring(19, other.wire.length - 1).removePrefix(".")
        return a.padEnd(maxOf(a.length, b.length), '0').compareTo(b.padEnd(maxOf(a.length, b.length), '0'))
    }

    companion object {
        fun fromWire(wire: String): StudentInstant {
            return StudentInstant(wire)
        }
    }
}

/** A business/test date is not an instant; no timezone conversion or missing-date backfill. */
fun studentDate(wire: String): String {
    require(wire.matches(Regex("[0-9]{4}-[0-9]{2}-[0-9]{2}"))) { "Invalid calendar date" }
    LocalDate.parse(wire)
    return wire
}
