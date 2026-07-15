// --------------------------------------------------------
// CÓDIGO FINAL DE RESPALDO (WIFI)
// --------------------------------------------------------
#include <WiFi.h>
#include <HTTPClient.h>

// ---------------- CONFIGURACIÓN DE RED ----------------
const char* ssid = "TU_RED_WIFI";        // <--- PON TU NOMBRE DE WIFI
const char* password = "TU_CONTRASEÑA";  // <--- PON TU CONTRASEÑA

// URL del servidor (Render)
const char* serverUrl = "https://backendtp-264r.onrender.com/api/esp32/sensor-data";

// ---------------- CONFIGURACIÓN DE SENSORES ----------------
// Sensor 1 (Cuchilla 1) NO CAMBIAR PINES
#define TRIG_PIN_1 26 // Antes 5, pero 26 es mejor si usaste la config del SIM
#define ECHO_PIN_1 25 // Antes 18

// Sensor 2 (Cuchilla 2)
#define TRIG_PIN_2 33 // Verifica tus conexiones
#define ECHO_PIN_2 32

// Sensor 3 (Cuchilla 3)
#define TRIG_PIN_3 13
#define ECHO_PIN_3 12

// Umbral de distancia para considerar la cuchilla "Activa" (Cerrada)
const int DISTANCE_THRESHOLD_CM = 10;

// Identificadores del Chip
const String CHIP_NUMBER = "CHIPVALLA";
const String TRIPLE_ID = "TDCHIPVALLA_1763769173506"; // ID Real de la base de datos

// Variables para almacenar el estado anterior
int estadoAnteriorCuchilla1 = -1;
int estadoAnteriorCuchilla2 = -1;
int estadoAnteriorCuchilla3 = -1;

// Tiempo mínimo entre lecturas //cambios de hoy*******+
const unsigned long DEBOUNCE_TIME = 200; 
unsigned long ultimaLectura = 0;

// Temporizador no bloqueante para el envío de ping
unsigned long ultimoEnvioExitoso = 0;
const unsigned long PING_INTERVAL = 60000; // 60 segundos

void setup() {
  Serial.begin(115200);
  
  // Configurar pines de sensores
  pinMode(TRIG_PIN_1, OUTPUT); pinMode(ECHO_PIN_1, INPUT);
  pinMode(TRIG_PIN_2, OUTPUT); pinMode(ECHO_PIN_2, INPUT);
  pinMode(TRIG_PIN_3, OUTPUT); pinMode(ECHO_PIN_3, INPUT);

  // Conectar a WiFi
  WiFi.begin(ssid, password);
  Serial.println("Conectando a WiFi...");
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Conectado al WiFi");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ No se pudo conectar al WiFi (Verifica nombre/clave)");
  }
  
  Serial.println("✅ Sistema WIFI listo. Esperando cambios en los sensores...");
  ultimoEnvioExitoso = millis();
}

int readDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000); 
  if (duration == 0) return -1; 
  return duration * 0.034 / 2;
}

void enviarDatos(int estado1, int estado2, int estado3) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi desconectado, intentando reconectar...");
    WiFi.reconnect();
    return;
  }

  HTTPClient http;
  
  // Render soporta HTTPS, el ESP32 suele manejarlo bien con los últimos cores
  // Si falla, se puede intentar setInsecure()
  http.begin(serverUrl); 
  http.addHeader("Content-Type", "application/json");
  
  // Construir JSON (IGUAL AL DEL SIM)
  String jsonPayload = "{";
  jsonPayload += "\"chipNumber\": \"" + CHIP_NUMBER + "\",";
  jsonPayload += "\"tripleDisparoId\": \"" + TRIPLE_ID + "\",";
  jsonPayload += "\"cuchilla1\": " + String(estado1) + ",";
  jsonPayload += "\"cuchilla2\": " + String(estado2) + ",";
  jsonPayload += "\"cuchilla3\": " + String(estado3);
  jsonPayload += "}";

  Serial.println("📤 Enviando datos por WiFi: " + jsonPayload);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✅ Código HTTP: " + String(httpResponseCode));
    Serial.println("Respuesta del Server: " + response);
    if (httpResponseCode == 200 || httpResponseCode == 201) {
      ultimoEnvioExitoso = millis();
    }
  } else {
    Serial.print("❌ Error en el envío: ");
    Serial.println(httpResponseCode); // Error negativo es error de conexión interna
  }
}

void enviarPing() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi desconectado, no se puede enviar ping.");
    return;
  }

  HTTPClient http;
  
  // Construir la URL del ping reemplazando el endpoint de datos por el de ping
  String pingUrl = String(serverUrl);
  pingUrl.replace("sensor-data", "ping");
  
  http.begin(pingUrl); 
  http.addHeader("Content-Type", "application/json");
  
  String jsonPayload = "{\"chipNumber\":\"" + CHIP_NUMBER + "\"}";
  Serial.println("📤 Enviando Ping por WiFi: " + jsonPayload);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode == 200 || httpResponseCode == 201) {
    String response = http.getString();
    Serial.println("✅ Ping exitoso (HTTP: " + String(httpResponseCode) + ")");
    Serial.println("Respuesta del Server: " + response);
    ultimoEnvioExitoso = millis();
  } else {
    Serial.print("❌ Error en el envío del Ping: ");
    Serial.println(httpResponseCode);
  }
  http.end();
}

void loop() {
  unsigned long tiempoActual = millis();
  
  // Enviar ping únicamente si en los últimos 60 segundos no ha ocurrido un envío de estado exitoso
  if (tiempoActual - ultimoEnvioExitoso >= PING_INTERVAL) {
    enviarPing();
  }
  
  if (tiempoActual - ultimaLectura < DEBOUNCE_TIME) {
    delay(10);
    return;
  }
  
  ultimaLectura = tiempoActual;

  // 1. Leer sensores
  int dist1 = readDistance(TRIG_PIN_1, ECHO_PIN_1);
  int dist2 = readDistance(TRIG_PIN_2, ECHO_PIN_2);
  int dist3 = readDistance(TRIG_PIN_3, ECHO_PIN_3);

  // Validar lecturas (ignorar errores)
  if (dist1 < 0 || dist2 < 0 || dist3 < 0) {
    delay(50);
    return; 
  }

  // 2. Determinar estado actual
  int estadoActualCuchilla1 = (dist1 > 0 && dist1 < DISTANCE_THRESHOLD_CM) ? 1 : 0;
  int estadoActualCuchilla2 = (dist2 > 0 && dist2 < DISTANCE_THRESHOLD_CM) ? 1 : 0;
  int estadoActualCuchilla3 = (dist3 > 0 && dist3 < DISTANCE_THRESHOLD_CM) ? 1 : 0;

  // 3. Detectar cambios
  bool hayCambio = false;
  
  if (estadoAnteriorCuchilla1 == -1) {
    hayCambio = true;
    Serial.println("🔄 Estado Inicial (WiFi System)");
  } else if (estadoActualCuchilla1 != estadoAnteriorCuchilla1 || 
             estadoActualCuchilla2 != estadoAnteriorCuchilla2 ||
             estadoActualCuchilla3 != estadoAnteriorCuchilla3) {
    hayCambio = true;
    Serial.println("⚠️ CAMBIO DETECTADO");
  }

  // 4. Enviar solo si hay cambio
  if (hayCambio) {
    enviarDatos(estadoActualCuchilla1, estadoActualCuchilla2, estadoActualCuchilla3);
    
    estadoAnteriorCuchilla1 = estadoActualCuchilla1;
    estadoAnteriorCuchilla2 = estadoActualCuchilla2;
    estadoAnteriorCuchilla3 = estadoActualCuchilla3;
  }

  delay(50);
}
