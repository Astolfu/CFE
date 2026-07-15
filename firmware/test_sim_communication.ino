void setup() {
  Serial.begin(115200);
  Serial2.begin(115200, SERIAL_8N1, 17, 16); // RX=17, TX=16 (INVERTIDO)
  
  Serial.println("========================================");
  Serial.println("Test de Comunicación SIM7670G");
  Serial.println("========================================");
  Serial.println("Escribe 'AT' y presiona Enter");
  Serial.println("Deberías ver 'OK' como respuesta");
  Serial.println("========================================\n");
}

void loop() {
  // Enviar lo que escribas en el monitor serial al SIM
  if (Serial.available()) {
    char c = Serial.read();
    Serial2.write(c);
    Serial.write(c); // Echo local
  }
  
  // Mostrar lo que responda el SIM
  if (Serial2.available()) {
    char c = Serial2.read();
    Serial.write(c);
  }
}
