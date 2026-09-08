import dev.harrel.jsonschema.*;
import edu.bnbu.student.contractvalidation.WireDateTime;
import java.util.Optional;
import java.math.BigInteger;

/** Enforces the declared RFC3339 and OpenAPI integer formats before DTO coercion. */
public final class Phase6FormatEvaluatorFactory implements EvaluatorFactory {
    private final FormatEvaluatorFactory fallback = new FormatEvaluatorFactory();

    @Override public Optional<Evaluator> create(SchemaParsingContext context, String keyword, JsonNode node) {
        if (keyword.equals("format") && node.isString() && node.asString().equals("date-time")) {
            return Optional.of((evaluationContext, value) ->
                    !value.isString() || WireDateTime.isRfc3339(value.asString())
                            ? Evaluator.Result.success()
                            : Evaluator.Result.failure("Invalid RFC3339 date-time"));
        }
        if (keyword.equals("format") && node.isString()
                && (node.asString().equals("int32") || node.asString().equals("int64"))) {
            boolean int32 = node.asString().equals("int32");
            BigInteger minimum = BigInteger.valueOf(int32 ? Integer.MIN_VALUE : Long.MIN_VALUE);
            BigInteger maximum = BigInteger.valueOf(int32 ? Integer.MAX_VALUE : Long.MAX_VALUE);
            return Optional.of((evaluationContext, value) -> {
                if (!value.isNumber()) return Evaluator.Result.success(); // type assertion handles other JSON types
                try {
                    BigInteger number = value.asNumber().toBigIntegerExact();
                    return number.compareTo(minimum) >= 0 && number.compareTo(maximum) <= 0
                            ? Evaluator.Result.success()
                            : Evaluator.Result.failure("Integer outside declared OpenAPI " + node.asString() + " range");
                } catch (ArithmeticException invalid) {
                    return Evaluator.Result.failure("Declared integer format requires an integral value");
                }
            });
        }
        return fallback.create(context, keyword, node);
    }
}
