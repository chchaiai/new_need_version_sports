// Review prototype only: enforce closed field sets directly from the same input schema.
// This is not a complete JSON Schema validator and introduces no private request DTO.
import com.google.gson.*;
import com.google.gson.reflect.TypeToken;
import com.google.gson.stream.*;
import java.io.IOException;
import java.util.Map;
import java.util.Set;

public final class ClosedFieldGuardFactory implements TypeAdapterFactory {
  private final JsonObject schemas;
  private final Set<String> roots=Set.of("CreateStudentApplicationRequest","ReviseEnduranceRuleTableRequest","SwitchSystemModeRequest");
  public ClosedFieldGuardFactory(JsonObject schemas){ this.schemas=schemas; }
  public <T> TypeAdapter<T> create(Gson gson, TypeToken<T> type) {
    String name=type.getRawType().getSimpleName();
    if(!type.getRawType().getPackageName().equals("bnbu.cr005.review") || !roots.contains(name)) return null;
    TypeAdapter<T> delegate=gson.getDelegateAdapter(this,type);
    TypeAdapter<JsonElement> elements=gson.getAdapter(JsonElement.class);
    return new TypeAdapter<T>() {
      public T read(JsonReader reader) throws IOException {
        JsonElement input=elements.read(reader);
        check(input,schemas.getAsJsonObject(name),"$");
        return delegate.fromJsonTree(input);
      }
      public void write(JsonWriter writer,T value) throws IOException { delegate.write(writer,value); }
    };
  }
  private void check(JsonElement value,JsonObject schema,String at) {
    if(schema.has("$ref")) {
      String ref=schema.get("$ref").getAsString();
      if(!ref.startsWith("#/components/schemas/")) throw new JsonParseException("Unsupported review reference "+ref);
      check(value,schemas.getAsJsonObject(ref.substring("#/components/schemas/".length())),at);return;
    }
    if(schema.has("discriminator")) {
      JsonObject discriminator=schema.getAsJsonObject("discriminator");
      String property=discriminator.get("propertyName").getAsString();
      if(!value.isJsonObject() || !value.getAsJsonObject().has(property)) throw new JsonParseException(at+": missing discriminator");
      JsonElement wire=value.getAsJsonObject().get(property);
      if(!wire.isJsonPrimitive() || !wire.getAsJsonPrimitive().isString()) throw new JsonParseException(at+": discriminator must be string");
      JsonObject mapping=discriminator.getAsJsonObject("mapping");
      if(mapping==null || !mapping.has(wire.getAsString())) throw new JsonParseException(at+": unknown discriminator");
      JsonObject branch=new JsonObject();branch.addProperty("$ref",mapping.get(wire.getAsString()).getAsString());
      check(value,branch,at);return;
    }
    if(value==null || value.isJsonNull()) return; // required/null/enum checks remain with generated adapters and protocol validation.
    if(schema.has("anyOf")) {
      for(JsonElement variant:schema.getAsJsonArray("anyOf")) {
        JsonObject alternative=variant.getAsJsonObject();
        if(alternative.has("type") && alternative.get("type").isJsonPrimitive() && alternative.get("type").getAsString().equals("null")) continue;
        check(value,alternative,at);
      }
    }
    if(value.isJsonArray() && schema.has("items")) {
      int i=0;for(JsonElement item:value.getAsJsonArray())check(item,schema.getAsJsonObject("items"),at+"/"+(i++));
    }
    if(value.isJsonObject() && schema.has("properties")) {
      JsonObject fields=schema.getAsJsonObject("properties");
      boolean closed=schema.has("additionalProperties") && schema.get("additionalProperties").isJsonPrimitive() && !schema.get("additionalProperties").getAsBoolean();
      for(Map.Entry<String,JsonElement> field:value.getAsJsonObject().entrySet()) {
        if(closed && !fields.has(field.getKey()))throw new JsonParseException(at+": undeclared field "+field.getKey());
        if(fields.has(field.getKey()))check(field.getValue(),fields.getAsJsonObject(field.getKey()),at+"/"+field.getKey());
      }
    }
  }
}
