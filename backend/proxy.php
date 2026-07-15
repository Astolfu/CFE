<?php
// proxy.php
// Este archivo recibe datos por HTTP plano del ESP32 y los reenvía por HTTPS seguro a Render.

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// 1. Recibir los datos crudos del ESP32
$json = file_get_contents('php://input');

// Log para depuración (opcional, crea un archivo log.txt en el servidor)
// file_put_contents('log.txt', date('Y-m-d H:i:s') . " - Recibido: " . $json . "\n", FILE_APPEND);

if (empty($json)) {
    http_response_code(400);
    echo json_encode(["error" => "No data received"]);
    exit();
}

// 2. Definir destino (Backend en Render)
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : 'sensor-data';
if ($endpoint === 'ping') {
    $url = 'https://backendtp-264r.onrender.com/api/esp32/ping';
} else {
    $url = 'https://backendtp-264r.onrender.com/api/esp32/sensor-data';
}

// 3. Configurar cURL para hacer el puente
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); // Hostinger sí tiene certificados modernos

// 4. Ejecutar envío a Render
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    $error_msg = curl_error($ch);
    http_response_code(500);
    echo json_encode(["error" => "Proxy cURL Error: " . $error_msg]);
} else {
    // 5. Devolver la respuesta de Render al ESP32
    http_response_code($httpCode);
    echo $response;
}

curl_close($ch);
?>
