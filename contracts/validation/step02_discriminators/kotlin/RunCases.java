// Standalone JVM probe of generated models, not an Android or Backend implementation.
import bnbu.cr005.review.*;
import com.google.gson.*;
import com.google.gson.stream.*;
import java.io.IOException;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;

public final class RunCases {
  public static void main(String[] args) throws Exception {
    JsonObject input=JsonParser.parseString(Files.readString(Path.of(args[0]))).getAsJsonObject();
    JsonObject schemas=input.getAsJsonObject("spec").getAsJsonObject("components").getAsJsonObject("schemas");
    Gson gson=new GsonBuilder().serializeNulls()
      .registerTypeAdapter(LocalDate.class,new TypeAdapter<LocalDate>() {
        public void write(JsonWriter w,LocalDate v) throws IOException {w.value(v.toString());}
        public LocalDate read(JsonReader r) throws IOException {return LocalDate.parse(r.nextString());}
      })
      .registerTypeAdapter(OffsetDateTime.class,new TypeAdapter<OffsetDateTime>() {
        public void write(JsonWriter w,OffsetDateTime v) throws IOException {w.value(DateTimeFormatter.ISO_INSTANT.format(v));}
        public OffsetDateTime read(JsonReader r) throws IOException {return OffsetDateTime.parse(r.nextString());}
      })
      .registerTypeAdapterFactory(new CreateStudentApplicationRequest.CustomTypeAdapterFactory())
      .registerTypeAdapterFactory(new ReviseEnduranceRuleTableRequestChange.CustomTypeAdapterFactory())
      .registerTypeAdapterFactory(new ReviseEnduranceRuleTableRequest.CustomTypeAdapterFactory())
      .registerTypeAdapterFactory(new SwitchSystemModeRequest.CustomTypeAdapterFactory())
      .registerTypeAdapterFactory(new ClosedFieldGuardFactory(schemas)).create();
    JsonArray results=new JsonArray();int passed=0,roundtrips=0;
    for(JsonElement item:input.getAsJsonArray("cases")) {
      JsonObject test=item.getAsJsonObject();
      String schema=test.get("schema").getAsString();
      JsonElement payload=test.get("payload");
      Class<?> type=Class.forName("bnbu.cr005.review."+schema);
      boolean expected=test.get("expectedValid").getAsBoolean();
      Object decoded=null;boolean accepted;String diagnostic="";
      try {decoded=gson.fromJson(payload,type);accepted=true;}
      catch(Exception e) {accepted=false;diagnostic=e.getClass().getSimpleName();}
      if(expected && accepted) {
        Object instance;
        if(decoded instanceof CreateStudentApplicationRequest v)instance=v.getActualInstance();
        else if(decoded instanceof SwitchSystemModeRequest v)instance=v.getActualInstance();
        else instance=((ReviseEnduranceRuleTableRequest)decoded).getChange().getActualInstance();
        JsonObject node=schemas.getAsJsonObject(schema);
        JsonObject body=payload.getAsJsonObject();
        if(schema.equals("ReviseEnduranceRuleTableRequest")){node=node.getAsJsonObject("properties").getAsJsonObject("change");body=body.getAsJsonObject("change");}
        String prop=node.getAsJsonObject("discriminator").get("propertyName").getAsString();
        String ref=node.getAsJsonObject("discriminator").getAsJsonObject("mapping").get(body.get(prop).getAsString()).getAsString();
        if(!ref.endsWith("/"+instance.getClass().getSimpleName()))throw new AssertionError("Wrong generated branch");
        if(!gson.toJsonTree(decoded,type).equals(payload))throw new AssertionError("Wire changed during roundtrip");
        roundtrips++;
      }
      boolean pass=accepted==expected;if(pass)passed++;
      JsonObject row=new JsonObject();row.addProperty("name",test.get("name").getAsString());
      row.addProperty("expectedValid",expected);row.addProperty("actualValid",accepted);row.addProperty("passed",pass);
      row.addProperty("diagnostic",diagnostic);results.add(row);
    }
    JsonObject report=new JsonObject();report.add("candidateSha256",input.get("candidateSha256"));
    report.addProperty("passed",passed);report.addProperty("total",results.size());report.addProperty("roundtrips",roundtrips);report.add("cases",results);
    Files.writeString(Path.of(args[1]),new GsonBuilder().setPrettyPrinting().create().toJson(report)+"\n");
    System.out.println("Kotlin/JVM cases: "+passed+"/"+results.size()+"; roundtrips: "+roundtrips);
    if(passed!=results.size() || roundtrips!=7)System.exit(1);
  }
}
