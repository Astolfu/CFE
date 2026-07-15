void setup() {
  Serial.begin(115200);
  Serial.println("========================================");
  Serial.println("Auto-detección de Baudrate SIM7670G");
  Serial.println("========================================\n");
}

void testBaudRate(int baudRate) {
  Serial.print("Probando ");
  Serial.print(baudRate);
  Serial.println(" bps...");
  
  Serial2.end(); // Cerrar conexión anterior
  Serial2.begin(baudRate, SERIAL_8N1, 16, 17); // RX=16, TX=17 (CRUZADO)
  delay(500);
  
  // Enviar AT
  Serial2.println("AT");
  delay(500);
  
  // Leer respuesta
  String response = "";
  while (Serial2.available()) {
    char c = Serial2.read();
    response += c;
    Serial.write(c);
  }
  
  if (response.indexOf("OK") >= 0) {
    Serial.println("\n✅ ¡BAUDRATE CORRECTO ENCONTRADO!");
    Serial.print("Usa: ");
    Serial.print(baudRate);
    Serial.println(" bps");
    while(1); // Detener aquí
  } else {
    Serial.println("❌ No funciona\n");
  }
}

void loop() {
  testBaudRate(9600);
  delay(1000);
  
  testBaudRate(19200);
  delay(1000);
  
  testBaudRate(38400);
  delay(1000);
  
  testBaudRate(57600);
  delay(1000);
  
  testBaudRate(115200);
  delay(1000);
  
  testBaudRate(230400);
  delay(1000);
  
  testBaudRate(460800);
  delay(1000);
  
  Serial.println("========================================");
  Serial.println("⚠️ No se encontró baudrate correcto");
  Serial.println("Verifica las conexiones físicas");
  Serial.println("========================================\n");
  delay(5000);
}
