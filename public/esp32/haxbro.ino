#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* HAXBRO_API = "https://haxbro.hatchable.site/api/chat";
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

String haxbro(String question, String mode = "normal") {
  HTTPClient http;
  http.begin(HAXBRO_API);
  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<512> request;
  request["prompt"] = question;
  request["mode"] = mode;
  String payload;
  serializeJson(request, payload);
  int code = http.POST(payload);
  if (code == 200) {
    String response = http.getString();
    http.end();
    StaticJsonDocument<4096> doc;
    if (deserializeJson(doc, response) == DeserializationError::Ok) return doc["response"].as<String>();
    return response;
  }
  http.end();
  return "Error: " + String(code);
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\\nHAxBRO ESP32 online");
}

void loop() {
  // Connect your INMP441 wake-word/audio pipeline here.
  // Wake word: "Hey HAxBRO"
  delay(1000);
}