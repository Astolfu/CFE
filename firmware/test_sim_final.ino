void setup() {
  Serial.begin(115200);
  Serial2.begin(115200, SERIAL_8N1, 16, 17); // RX=16, TX=17 (CRUZADO)
  
  delay(2000); // Esperar a que el módulo esté listo
  
  // Limpiar buffer
  while(Serial2.available()) {
    Serial2.read();
  }
  
  Serial.println("========================================");
  Serial.println("Test Final SIM7670G - 115200 bps");
  Serial.println("========================================\n");
  
  // Enviar comando AT limpio
  Serial.println("Enviando: AT");
  Serial2.print("AT\r\n"); // Usar print con \r\n manual
  
  delay(1000);
  
  Serial.println("Respuesta del módulo:");
  while(Serial2.available()) {
    Serial.write(Serial2.read());
  }
  
  Serial.println("\n========================================");
  Serial.println("Si ves 'OK' arriba, ¡funciona!");
  Serial.println("========================================\n");
}

void loop() {
  // Modo interactivo
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    Serial.print("Enviando: ");
    Serial.println(cmd);
    Serial2.print(cmd);
    Serial2.print("\r\n");
    delay(500);
  }
  
  if (Serial2.available()) {
    Serial.write(Serial2.read());
  }
}
