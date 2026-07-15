void setup() {
  Serial.begin(115200);
  Serial2.begin(115200, SERIAL_8N1, 16, 17);
  
  delay(2000);
  
  // Limpiar buffer
  while(Serial2.available()) Serial2.read();
  
  Serial.println("========================================");
  Serial.println("Configuración SIM7670G");
  Serial.println("========================================\n");
  
  // Test 1: Comando básico
  sendCommand("AT");
  
  // Test 2: Desactivar eco
  sendCommand("ATE0");
  
  // Test 3: Verificar SIM
  sendCommand("AT+CPIN?");
  
  // Test 4: Verificar señal
  sendCommand("AT+CSQ");
  
  // Test 5: Verificar registro
  sendCommand("AT+CREG?");
  
  Serial.println("========================================");
  Serial.println("Configuración completada");
  Serial.println("Ahora puedes escribir comandos AT");
  Serial.println("========================================\n");
}

void sendCommand(String cmd) {
  Serial.print("Enviando: ");
  Serial.println(cmd);
  
  Serial2.print(cmd);
  Serial2.print("\r\n");
  
  delay(1000);
  
  Serial.print("Respuesta: ");
  while(Serial2.available()) {
    Serial.write(Serial2.read());
  }
  Serial.println();
}

void loop() {
  // Modo interactivo
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() > 0) {
      sendCommand(cmd);
    }
  }
  
  if (Serial2.available()) {
    Serial.write(Serial2.read());
  }
}
