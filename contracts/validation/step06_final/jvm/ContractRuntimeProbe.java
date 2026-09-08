// Isolated generated-model probe; not an Android app or Backend implementation.
import com.google.gson.*;
import com.google.gson.reflect.TypeToken;
import com.google.gson.stream.*;
import dev.harrel.jsonschema.Validator;
import dev.harrel.jsonschema.ValidatorFactory;
import dev.harrel.jsonschema.FormatEvaluatorFactory;
import dev.harrel.jsonschema.providers.GsonNode;
import java.io.IOException;
import java.net.URI;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.lang.reflect.Method;
import java.util.*;

public final class ContractRuntimeProbe {
  static final String PACKAGE="bnbu.cr005.review.";
  static JsonObject schemas;
  // Gson's default EnumTypeAdapter writes @SerializedName as a JSON string,
  // including numeric wire enums. Preserve the actual generated enum's Number value.
  static final class ScalarEnumFactory implements TypeAdapterFactory {
    public <T> TypeAdapter<T> create(Gson gson,TypeToken<T> type) {
      Class<?> raw=type.getRawType();if(!raw.isEnum() || !raw.getName().startsWith(PACKAGE))return null;
      final Method getValue;
      try {getValue=raw.getMethod("getValue");}catch(NoSuchMethodException e){return null;}
      Object[] constants=raw.getEnumConstants();if(constants.length==0)return null;
      final boolean numeric;
      try {Object v=getValue.invoke(constants[0]);numeric=v instanceof Number;if(!numeric && !(v instanceof Boolean))return null;}catch(Exception e){throw new IllegalStateException(e);}
      return new TypeAdapter<T>() {
        @SuppressWarnings("unchecked") public T read(JsonReader r)throws IOException {
          if(r.peek()!=(numeric?JsonToken.NUMBER:JsonToken.BOOLEAN))throw new JsonParseException("Scalar enum requires its declared JSON type");
          Object scalar=numeric?new java.math.BigDecimal(r.nextString()):r.nextBoolean();
          try {for(Object value:constants)if(numeric?((java.math.BigDecimal)scalar).compareTo(new java.math.BigDecimal(getValue.invoke(value).toString()))==0:scalar.equals(getValue.invoke(value)))return (T)value;}
          catch(ReflectiveOperationException e){throw new JsonParseException(e);}
          throw new JsonParseException("Unknown numeric enum value");
        }
        public void write(JsonWriter w,T value)throws IOException {
          try {Object v=getValue.invoke(value);if(numeric)w.value((Number)v);else w.value((Boolean)v);}catch(ReflectiveOperationException e){throw new JsonParseException(e);}
        }
      }.nullSafe();
    }
  }
  static JsonElement translate(JsonElement x) {
    if(x.isJsonObject()) {JsonObject y=new JsonObject();for(var e:x.getAsJsonObject().entrySet())y.add(e.getKey(),translate(e.getValue()));return y;}
    if(x.isJsonArray()) {JsonArray y=new JsonArray();for(var e:x.getAsJsonArray())y.add(translate(e));return y;}
    if(x.isJsonPrimitive() && x.getAsJsonPrimitive().isString() && x.getAsString().startsWith("#/components/schemas/"))return new JsonPrimitive(x.getAsString().replace("#/components/schemas/","#/$defs/"));
    return x.deepCopy();
  }
  static final class SchemaGuard implements TypeAdapterFactory {
    final Validator validator;final URI base;
    // Message-scoped identity sidecar: Gson/Kotlin nullable members otherwise lose
    // the distinction between an omitted optional property and an explicit null.
    // Never save/replay values or repair invalid input. Clear between messages.
    final IdentityHashMap<Object,Set<String>> present=new IdentityHashMap<>();
    SchemaGuard(JsonObject document,String sha) {
      validator=new ValidatorFactory().withJsonNodeFactory(new GsonNode.Factory()).withEvaluatorFactory(new FormatEvaluatorFactory())
        .withSchemaResolver(uri->{
          String prefix="https://json-schema.org/draft/2020-12/";
          // The library's built-in resolver reads its bundled draft2020-12.json;
          // returning empty allows that resolver, which performs no network I/O.
          if(uri.startsWith(prefix))return dev.harrel.jsonschema.SchemaResolver.Result.empty();
          throw new IllegalStateException("Network/schema fallback prohibited: "+uri);
        }).createValidator();
      JsonObject root=new JsonObject();root.addProperty("$schema","https://json-schema.org/draft/2020-12/schema");root.add("$defs",translate(document));
      base=URI.create("urn:bnbu:step06:"+sha);validator.registerSchema(base,root);
    }
    void check(JsonElement value,String name) {
      var result=validator.validate(URI.create(base+"#/$defs/"+name),value);
      if(!result.isValid())throw new JsonParseException(name+": "+result.getErrors());
    }
    public <T> TypeAdapter<T> create(Gson gson,TypeToken<T> type) {
      String name=type.getRawType().getSimpleName();
      if(!type.getRawType().getPackageName().equals(PACKAGE.substring(0,PACKAGE.length()-1)) || !schemas.has(name))return null;
      TypeAdapter<T> delegate=gson.getDelegateAdapter(this,type);TypeAdapter<JsonElement> elements=gson.getAdapter(JsonElement.class);
      return new TypeAdapter<T>() {
        public T read(JsonReader reader)throws IOException {
          JsonElement wire=elements.read(reader);check(wire,name);T value=delegate.fromJsonTree(wire);
          if(value!=null && wire.isJsonObject())present.put(value,new HashSet<>(wire.getAsJsonObject().keySet()));return value;
        }
        public void write(JsonWriter writer,T value)throws IOException {
          JsonElement wire=delegate.toJsonTree(value);JsonObject schema=schemas.getAsJsonObject(name);
          if(wire.isJsonObject() && schema.has("properties")) {
            Set<String> required=new HashSet<>();if(schema.has("required"))for(JsonElement k:schema.getAsJsonArray("required"))required.add(k.getAsString());
            Set<String> fields=present.get(value);
            for(String key:new ArrayList<>(wire.getAsJsonObject().keySet())) {
              // Omitted optional nulls stay omitted. Explicit nulls are never removed.
              // For newly constructed models, a null optional nonnullable member means omit.
              if(required.contains(key) || !wire.getAsJsonObject().get(key).isJsonNull())continue;
              JsonObject prop=schema.getAsJsonObject("properties").getAsJsonObject(key);
              if(fields!=null?!fields.contains(key):!allowsNull(prop))wire.getAsJsonObject().remove(key);
            }
          }
          check(wire,name);elements.write(writer,wire);
        }
      }.nullSafe();
    }
  }
  static boolean allowsNull(JsonObject node) {
    node=deref(node);if(node.has("type")) {
      JsonElement t=node.get("type");if(t.isJsonPrimitive())return t.getAsString().equals("null");
      if(t.isJsonArray())for(JsonElement e:t.getAsJsonArray())if(e.getAsString().equals("null"))return true;
    }
    for(String key:List.of("anyOf","oneOf"))if(node.has(key))for(JsonElement e:node.getAsJsonArray(key))if(allowsNull(e.getAsJsonObject()))return true;
    return false;
  }
  static JsonObject deref(JsonObject node) {return node.has("$ref")?deref(schemas.getAsJsonObject(node.get("$ref").getAsString().replace("#/components/schemas/",""))):node;}
  static void branchCheck(JsonObject node,JsonElement wire,Object decoded)throws Exception {
    node=deref(node);if(wire==null || wire.isJsonNull() || decoded==null)return;
    if(node.has("discriminator")) {
      JsonObject disc=node.getAsJsonObject("discriminator");String key=wire.getAsJsonObject().get(disc.get("propertyName").getAsString()).getAsString();
      String expected=disc.getAsJsonObject("mapping").get(key).getAsString().replace("#/components/schemas/","");
      Object branch=decoded.getClass().getMethod("getActualInstance").invoke(decoded);
      if(!branch.getClass().getSimpleName().equals(expected))throw new AssertionError("Wrong generated branch "+expected);
      branchCheck(schemas.getAsJsonObject(expected),wire,branch);return;
    }
    if(wire.isJsonObject() && node.has("properties"))for(var e:wire.getAsJsonObject().entrySet()) {
      JsonObject prop=node.getAsJsonObject("properties").getAsJsonObject(e.getKey());
      if(prop==null || (!prop.has("discriminator") && !prop.has("$ref")))continue;
      Method getter=decoded.getClass().getMethod("get"+Character.toUpperCase(e.getKey().charAt(0))+e.getKey().substring(1));
      branchCheck(prop,e.getValue(),getter.invoke(decoded));
    }
  }
  public static void main(String[] args)throws Exception {
    JsonObject input=JsonParser.parseString(Files.readString(Path.of(args[0]))).getAsJsonObject();
    schemas=input.getAsJsonObject("spec").getAsJsonObject("components").getAsJsonObject("schemas");
    GsonBuilder builder=new GsonBuilder().serializeNulls().setStrictness(Strictness.STRICT).registerTypeAdapterFactory(new ScalarEnumFactory())
      .registerTypeAdapter(LocalDate.class,new TypeAdapter<LocalDate>() {
        public void write(JsonWriter w,LocalDate v)throws IOException {w.value(v.toString());}
        public LocalDate read(JsonReader r)throws IOException {return LocalDate.parse(r.nextString());}
      }.nullSafe())
      .registerTypeAdapter(OffsetDateTime.class,new TypeAdapter<OffsetDateTime>() {
        public void write(JsonWriter w,OffsetDateTime v)throws IOException {w.value(DateTimeFormatter.ISO_INSTANT.format(v));}
        public OffsetDateTime read(JsonReader r)throws IOException {return OffsetDateTime.parse(r.nextString());}
      }.nullSafe());
    for(JsonElement n:input.getAsJsonArray("wrapperFactories")) {
      Class<?> factory=Class.forName(PACKAGE+n.getAsString()+"$CustomTypeAdapterFactory");builder.registerTypeAdapterFactory((TypeAdapterFactory)factory.getConstructor().newInstance());
    }
    SchemaGuard guard=new SchemaGuard(schemas,input.get("candidateSha256").getAsString());
    Gson gson=builder.registerTypeAdapterFactory(guard).create();JsonArray results=new JsonArray();int passed=0,roundtrips=0;
    for(JsonElement e:input.getAsJsonArray("cases")) {
      guard.present.clear();
      JsonObject test=e.getAsJsonObject();String schema=test.get("schema").getAsString();JsonElement wire=test.get("payload");
      boolean expected=test.get("expectedValid").getAsBoolean();boolean accepted=false,roundtrip=false;String diagnostic="";
      try {
        // Validation occurs in the JVM against the same full schema before DTO decoding.
        guard.check(wire,schema);Class<?> type=Class.forName(PACKAGE+schema);Object decoded=gson.fromJson(wire,type);accepted=true;
        if(expected) {branchCheck(schemas.getAsJsonObject(schema),wire,decoded);JsonElement out=gson.toJsonTree(decoded,type);roundtrip=out.equals(wire);
          if(!roundtrip)diagnostic="wire changed: "+out;else roundtrips++;}
      } catch(Exception|AssertionError ex) {diagnostic=ex.getClass().getSimpleName()+": "+ex.getMessage();if(!accepted)accepted=false;}
      boolean pass=accepted==expected && (!expected || roundtrip);if(pass)passed++;
      JsonObject row=new JsonObject();row.add("name",test.get("name"));row.addProperty("schema",schema);row.addProperty("expectedValid",expected);row.addProperty("actualValid",accepted);row.addProperty("roundtrip",roundtrip);row.addProperty("passed",pass);row.addProperty("diagnostic",diagnostic);results.add(row);
    }
    JsonObject report=new JsonObject();report.add("candidateSha256",input.get("candidateSha256"));report.addProperty("total",results.size());report.addProperty("passed",passed);report.addProperty("roundtrips",roundtrips);report.add("cases",results);
    Files.writeString(Path.of(args[1]),new GsonBuilder().setPrettyPrinting().create().toJson(report)+"\n");
    System.out.println("Generated Kotlin + strict JVM schema boundary: "+passed+"/"+results.size()+"; roundtrips="+roundtrips);
    if(passed!=results.size()){int shown=0;for(JsonElement e:results)if(!e.getAsJsonObject().get("passed").getAsBoolean() && shown++<12)System.out.println(e);System.exit(1);}
  }
}
