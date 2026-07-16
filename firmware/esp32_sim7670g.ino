#include <HardwareSerial.h>

// ---------------- CONFIGURACIÓN DEL SIM7670G ----------------
// Pines para comunicación Serial con el SIM7670G
// Usar UART2 hardware (TX2=GPIO17, RX2=GPIO16)
#define SIM_SERIAL Serial2
#define SIM_BAUD 115200

// Configuración de APN
// IMPORTANTE: Cambia esto si usas Telcel ("internet.itelcel.com") o Movistar ("internet.movistar.mx")
const char* apn = "modem.nextel.com.mx"; 

// URL del servidor (Railway) - HTTPS directo, sin proxy intermedio en Hostinger
const char* serverUrl = "https://cfe-production.up.railway.app/api/esp32/sensor-data";
const char* pingUrl = "https://cfe-production.up.railway.app/api/esp32/ping";

// ---------------- CONFIGURACIÓN DE SENSORES ----------------
// Sensor 1 (Cuchilla 1)
#define TRIG_PIN_1 5
#define ECHO_PIN_1 18

// Sensor 2 (Cuchilla 2)
#define TRIG_PIN_2 19
#define ECHO_PIN_2 21

// Sensor 3 (Cuchilla 3)
#define TRIG_PIN_3 32
#define ECHO_PIN_3 33

// Umbral de distancia (cm)
const int DISTANCE_THRESHOLD_CM = 30;

// Botón físico (BOTÓN BOOT integrado, GPIO 0) para disparo manual del ping
#define BOOT_BUTTON_PIN 0

// Identificadores del Chip
const String CHIP_NUMBER = "CHIPVALLA";
const String TRIPLE_ID = "TDCHIPVALLA_1763769173506";

// Estado anterior
int estadoAnteriorCuchilla1 = -1;
int estadoAnteriorCuchilla2 = -1;
int estadoAnteriorCuchilla3 = -1;

const unsigned long DEBOUNCE_TIME = 200; 
unsigned long ultimaLectura = 0;

// Registro del último envío exitoso (datos o ping)
unsigned long ultimoEnvioExitoso = 0;

void setup() {
  Serial.begin(115200);
  
  // Iniciar SIM7670G en UART2 (TX2=17, RX2=16)
  SIM_SERIAL.begin(SIM_BAUD, SERIAL_8N1, 16, 17);
  delay(1000);

  Serial.println("========================================");
  Serial.println("Iniciando Sistema de Monitoreo");
  Serial.println("========================================");
  
  // Pines sensores
  pinMode(TRIG_PIN_1, OUTPUT); pinMode(ECHO_PIN_1, INPUT);
  pinMode(TRIG_PIN_2, OUTPUT); pinMode(ECHO_PIN_2, INPUT);
  pinMode(TRIG_PIN_3, OUTPUT); pinMode(ECHO_PIN_3, INPUT);

  // Configurar botón BOOT para trigger manual (con pull-up interno)
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);

  // Inicializar SIM
  initSIM7670G();
  
  Serial.println("✅ Sistema listo. Esperando cambios en los sensores...");
  ultimoEnvioExitoso = millis();
}


// Función auxiliar para enviar comandos AT y esperar respuesta
String sendATCommand(String command, int timeout = 2000, boolean debug = true) {
  if (debug) {
    Serial.print("Enviando: ");
    Serial.println(command);
  }
  
  // Limpiar buffer
  while(SIM_SERIAL.available()) SIM_SERIAL.read();
  
  SIM_SERIAL.print(command);
  SIM_SERIAL.print("\r\n");
  
  String response = "";
  long int time = millis();
  
  while ((time + timeout) > millis()) {
    while (SIM_SERIAL.available()) {
      char c = SIM_SERIAL.read();
      response += c;
    }
  }
  
  if (debug) {
    Serial.println("Respuesta:");
    Serial.println(response);
  }
  
  return response;
}

void initSIM7670G() {
  Serial.println("🔧 Configurando SIM7670G...");
  
  sendATCommand("AT");
  sendATCommand("ATE0"); 
  sendATCommand("AT+CMEE=2"); // Habilitar errores verbose globalmente
  
  // 2. Verificar SIM
  String cpin = sendATCommand("AT+CPIN?", 3000);
  if (cpin.indexOf("READY") == -1) {
    Serial.println("❌ Error: Tarjeta SIM no detectada o con PIN");
    while(1); 
  }
  
  // 3. Esperar registro (soporta estado 6)
  Serial.println("📡 Buscando red celular...");
  bool conectado = false;
  int intentos = 0;
  
  while (!conectado && intentos < 60) { 
    String creg = sendATCommand("AT+CREG?", 2000, false); 
    if (creg.indexOf(",1") > 0 || creg.indexOf(",5") > 0 || creg.indexOf(",6") > 0) {
      conectado = true;
      Serial.println("✅ Registrado en la red celular");
    } else {
      Serial.print(".");
      delay(2000);
      intentos++;
    }
  }
  
  Serial.println("📊 Diagnóstico de Señal:");
  sendATCommand("AT+CSQ");    // Fuerza de señal
  sendATCommand("AT+CPSI?");  // Tipo de red (LTE/GSM) y banda
  sendATCommand("AT+COPS?");  // Operador conectado

  // Configuración SSL para HTTPS directo a Railway (ya no se usa proxy HTTP en Hostinger)
  sendATCommand("AT+CSSLCFG=\"sslversion\",0,3", 2000, true);  // 3 = TLS 1.2
  sendATCommand("AT+CSSLCFG=\"authmode\",0,0", 2000, true);    // 0 = no verificar certificado del servidor
  
  // 5. Activar datos
  Serial.println("📶 Activando datos móviles...");
  sendATCommand("AT+CGACT=1,1", 5000);
  
  String ip = sendATCommand("AT+CGPADDR=1");
  if (ip.indexOf(".") > 0) {
    Serial.println("✅ Conexión de datos ACTIVADA");
  } else {
    Serial.println("⚠️ Advertencia: No se obtuvo IP");
  }
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
  Serial.println("\n--------------------------------");
  Serial.println("📤 Iniciando Transacción HTTPS (directo a Railway)");
  Serial.println("--------------------------------");

  String jsonPayload = "{";
  jsonPayload += "\"chipNumber\": \"" + CHIP_NUMBER + "\",";
  jsonPayload += "\"tripleDisparoId\": \"" + TRIPLE_ID + "\",";
  jsonPayload += "\"cuchilla1\": " + String(estado1) + ",";
  jsonPayload += "\"cuchilla2\": " + String(estado2) + ",";
  jsonPayload += "\"cuchilla3\": " + String(estado3);
  jsonPayload += "}";

  int dataLen = jsonPayload.length();

  // 1. Inicializar HTTP
  sendATCommand("AT+HTTPINIT", 1000, true); 
  
  // URL HTTPS directa a Railway (sin proxy intermedio en Hostinger)
  sendATCommand("AT+HTTPPARA=\"URL\",\"" + String(serverUrl) + "\"", 1000, true);
  sendATCommand("AT+HTTPSSL=1", 1000, true);
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 1000, true);
  
  // 2. Enviar Datos
  Serial.println(">> Enviando: AT+HTTPDATA=" + String(dataLen) + ",5000");
  SIM_SERIAL.print("AT+HTTPDATA=" + String(dataLen) + ",5000\r\n");
  
  // Esperar DOWNLOAD
  delay(500);
  bool downloadPrompt = false;
  long waitStart = millis();
  while(millis() - waitStart < 3000) {
    while(SIM_SERIAL.available()) {
      char c = SIM_SERIAL.read();
      Serial.write(c);
      if(c == 'D') downloadPrompt = true; 
    }
  }
  
  Serial.println("\n>> Enviando Payload JSON...");
  SIM_SERIAL.print(jsonPayload);
  
  Serial.println("\n>> Esperando confirmación de datos...");
  // Esperar el OK de la carga de datos
  long waitData = millis();
  bool dataConfirmed = false;
  while(millis() - waitData < 5000) { 
    if(SIM_SERIAL.available()) {
      char c = SIM_SERIAL.read();
      Serial.write(c);
      if(c == 'K') { 
        dataConfirmed = true; 
        delay(100); 
        while(SIM_SERIAL.available()) Serial.write(SIM_SERIAL.read());
        break; 
      }
    }
  }

  // Pequeña pausa de seguridad
  delay(500);

  // 3. Ejecutar POST
  Serial.println("\n>> Ejecutando POST (AT+HTTPACTION=1)...");
  
  // Habilitar errores verbose por si acaso falla
  SIM_SERIAL.println("AT+CMEE=2");
  delay(100);
  while(SIM_SERIAL.available()) SIM_SERIAL.read(); 
  
  SIM_SERIAL.println("AT+HTTPACTION=1");
  
  // 4. ESPERAR RESPUESTA (Modo Debug Total)
  Serial.println(">> Esperando resultado (+HTTPACTION)...");
  
  long time = millis();
  String buffer = "";
  bool exito = false;
  
  while ((time + 20000) > millis()) {
    if (SIM_SERIAL.available()) {
      char c = SIM_SERIAL.read();
      Serial.write(c); // VER CADA CARÁCTER EN VIVO
      buffer += c;
      
      // Chequear éxito
      if (buffer.indexOf(",200,") > 0 || buffer.indexOf(",201,") > 0) {
        exito = true;
        break; 
      }
      
      // Chequear error explícito 
      if (buffer.indexOf("ERROR") > 0) {
        // Dar tiempo a ver si viene descripción detallada
        delay(500);
        while(SIM_SERIAL.available()) {
             char c = SIM_SERIAL.read();
             Serial.write(c);
             buffer += c;
        }
        break; 
      }
    }
  }
  
  Serial.println("\n--------------------------------");
  if (exito) {
    Serial.println("✅ ENVÍO EXITOSO (Status 200/201)");
    ultimoEnvioExitoso = millis();
  } else {
    Serial.println("❌ FALLÓ EL ENVÍO (Timeout o Error)");
    Serial.println("Buffer final: " + buffer);
    
    // Debug extra
    SIM_SERIAL.println("AT+HTTPREAD");
    delay(1000);
    while(SIM_SERIAL.available()) Serial.write(SIM_SERIAL.read());
  }
  
}

void enviarPing() {
  Serial.println("\n--------------------------------");
  Serial.println("📤 Iniciando Ping HTTPS (directo a Railway)");
  Serial.println("--------------------------------");

  String jsonPayload = "{\"chipNumber\":\"" + CHIP_NUMBER + "\"}";
  int dataLen = jsonPayload.length();

  // 1. Inicializar HTTP
  sendATCommand("AT+HTTPINIT", 1000, true); 
  
  // URL HTTPS directa a Railway para ping (sin proxy intermedio en Hostinger)
  sendATCommand("AT+HTTPPARA=\"URL\",\"" + String(pingUrl) + "\"", 1000, true);
  sendATCommand("AT+HTTPSSL=1", 1000, true);
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 1000, true);
  
  // 2. Enviar Datos
  Serial.println(">> Enviando: AT+HTTPDATA=" + String(dataLen) + ",5000");
  SIM_SERIAL.print("AT+HTTPDATA=" + String(dataLen) + ",5000\r\n");
  
  // Esperar DOWNLOAD
  delay(500);
  long waitStart = millis();
  while(millis() - waitStart < 3000) {
    while(SIM_SERIAL.available()) {
      char c = SIM_SERIAL.read();
      Serial.write(c);
    }
  }
  
  Serial.println("\n>> Enviando Payload JSON de Ping...");
  SIM_SERIAL.print(jsonPayload);
  
  Serial.println("\n>> Esperando confirmación de datos...");
  long waitData = millis();
  while(millis() - waitData < 5000) { 
    if(SIM_SERIAL.available()) {
      char c = SIM_SERIAL.read();
      Serial.write(c);
      if(c == 'K') { 
        delay(100); 
        while(SIM_SERIAL.available()) Serial.write(SIM_SERIAL.read());
        break; 
      }
    }
  }

  delay(500);

  // 3. Ejecutar POST
  Serial.println("\n>> Ejecutando POST de Ping (AT+HTTPACTION=1)...");
  SIM_SERIAL.println("AT+HTTPACTION=1");
  
  // 4. ESPERAR RESPUESTA
  Serial.println(">> Esperando resultado (+HTTPACTION)...");
  
  long time = millis();
  String buffer = "";
  bool exito = false;
  
  while ((time + 20000) > millis()) {
    if (SIM_SERIAL.available()) {
      char c = SIM_SERIAL.read();
      Serial.write(c);
      buffer += c;
      
      if (buffer.indexOf(",200,") > 0 || buffer.indexOf(",201,") > 0) {
        exito = true;
        break; 
      }
      
      if (buffer.indexOf("ERROR") > 0) {
        delay(500);
        while(SIM_SERIAL.available()) {
             buffer += (char)SIM_SERIAL.read();
        }
        break; 
      }
    }
  }
  
  Serial.println("\n--------------------------------");
  if (exito) {
    Serial.println("✅ PING EXITOSO (Status 200/201)");
    ultimoEnvioExitoso = millis();
  } else {
    Serial.println("❌ PING FALLÓ (Timeout o Error)");
    Serial.println("Buffer final: " + buffer);
  }
  
  // Cerrar siempre
  sendATCommand("AT+HTTPTERM", 1000, true);
  Serial.println("--------------------------------\n");
}

void loop() {
  unsigned long tiempoActual = millis();
  
  // 1. Trigger manual del ping por Serial (tecleando 'p' o 'P')
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == 'p' || c == 'P') {
      Serial.println("\n[Manual] Ping solicitado por comando Serial.");
      enviarPing();
    }
  }
  
  // 2. Trigger manual del ping por botón físico BOOT (GPIO 0)
  if (digitalRead(BOOT_BUTTON_PIN) == LOW) {
    delay(50); // Antirrebote simple
    if (digitalRead(BOOT_BUTTON_PIN) == LOW) {
      Serial.println("\n[Manual] Ping solicitado por botón BOOT (GPIO 0).");
      enviarPing();
      // Esperar a que se suelte el botón para evitar múltiples envíos
      while (digitalRead(BOOT_BUTTON_PIN) == LOW) {
        delay(10);
      }
    }
  }
  
  if (tiempoActual - ultimaLectura < DEBOUNCE_TIME) {
    delay(10);
    return;
  }
  
  ultimaLectura = tiempoActual;

  int dist1 = readDistance(TRIG_PIN_1, ECHO_PIN_1);
  int dist2 = readDistance(TRIG_PIN_2, ECHO_PIN_2);
  int dist3 = readDistance(TRIG_PIN_3, ECHO_PIN_3);

  if (dist1 < 0 || dist2 < 0 || dist3 < 0) {
    delay(50);
    return; 
  }

  int estadoActualCuchilla1 = (dist1 > 0 && dist1 < DISTANCE_THRESHOLD_CM) ? 1 : 0;
  int estadoActualCuchilla2 = (dist2 > 0 && dist2 < DISTANCE_THRESHOLD_CM) ? 1 : 0;
  int estadoActualCuchilla3 = (dist3 > 0 && dist3 < DISTANCE_THRESHOLD_CM) ? 1 : 0;

  bool hayCambio = false;
  
  if (estadoAnteriorCuchilla1 == -1) {
    hayCambio = true;
    Serial.println("🔄 Estado Inicial");
  } else if (estadoActualCuchilla1 != estadoAnteriorCuchilla1 || 
             estadoActualCuchilla2 != estadoAnteriorCuchilla2 ||
             estadoActualCuchilla3 != estadoAnteriorCuchilla3) {
    hayCambio = true;
    Serial.println("⚠️ CAMBIO DETECTADO");
  }

  if (hayCambio) {
    enviarDatos(estadoActualCuchilla1, estadoActualCuchilla2, estadoActualCuchilla3);
    
    estadoAnteriorCuchilla1 = estadoActualCuchilla1;
    estadoAnteriorCuchilla2 = estadoActualCuchilla2;
    estadoAnteriorCuchilla3 = estadoActualCuchilla3;
  }

  delay(50);
}
