package edu.bnbu.student.contractvalidation;

import java.time.DateTimeException;
import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** RFC3339 format check without converting or rounding the original wire value.
 * Contract-specific uppercase T/Z restrictions remain enforced by its schema pattern.
 * A format check cannot certify a leap-second announcement or a server clock.
 */
public final class WireDateTime {
    private static final Pattern FORMAT = Pattern.compile(
            "([0-9]{4})-([0-9]{2})-([0-9]{2})[Tt]([0-9]{2}):([0-9]{2}):([0-9]{2})"
            + "(?:\\.[0-9]+)?([Zz]|[+-][0-9]{2}:[0-9]{2})");

    private WireDateTime() {}

    public static boolean isRfc3339(String wire) {
        Matcher match = FORMAT.matcher(wire);
        if (!match.matches()) return false;
        try {
            int second = Integer.parseInt(match.group(6));
            if (second > 60) return false;
            // Calendar validity and hour/minute bounds use Java's strict date construction.
            // The fractional digits are validated by the grammar, never parsed into a bounded float.
            LocalDateTime time = LocalDateTime.of(Integer.parseInt(match.group(1)),
                    Integer.parseInt(match.group(2)), Integer.parseInt(match.group(3)),
                    Integer.parseInt(match.group(4)), Integer.parseInt(match.group(5)), Math.min(second, 59));
            String zone = match.group(7);
            int offsetMinutes = 0;
            if (!zone.equalsIgnoreCase("Z")) {
                int hours = Integer.parseInt(zone.substring(1, 3));
                int minutes = Integer.parseInt(zone.substring(4, 6));
                if (hours > 23 || minutes > 59) return false;
                offsetMinutes = (hours * 60 + minutes) * (zone.charAt(0) == '-' ? -1 : 1);
            }
            if (second == 60) {
                LocalDateTime utc = time.minusMinutes(offsetMinutes);
                // RFC3339 section5.7: the inserted second follows the last minute of a UTC month.
                // Checking the announcement itself is outside schema format validation.
                return utc.getHour() == 23 && utc.getMinute() == 59
                        && utc.getDayOfMonth() == utc.toLocalDate().lengthOfMonth();
            }
            return true;
        } catch (DateTimeException | NumberFormatException invalid) {
            return false;
        }
    }
}
