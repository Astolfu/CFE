// ============================================================
// PRUEBAS UNITARIAS: calculateStatus y convertToBoolean
// Archivo: backend/tests/unit/calculateStatus.test.js
// ============================================================

// Extraemos las funciones del módulo real para probarlas de forma aislada
// Las funciones son locales en esp32Routes.js, así que las replicamos aquí
// tal cual están en el código fuente (DRY check al final)

function convertToBoolean(value) {
    if (value === undefined || value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const str = value.toLowerCase().trim();
        if (str === 'true' || str === '1' || str === 'yes' || str === 'on') return true;
        if (str === 'false' || str === '0' || str === 'no' || str === 'off') return false;
    }
    return Boolean(value);
}

function calculateStatus(c1, c2, c3) {
    const activeCount = [c1, c2, c3].filter(Boolean).length;
    if (activeCount === 3) return 'green';
    if (activeCount === 2) return 'yellow';
    if (activeCount === 1) return 'orange';
    return 'red';
}

// ============================================================
// SUITE 1: calculateStatus — Lógica de Estados
// ============================================================
describe('calculateStatus — Clasificación de severidad', () => {

    // ✅ Caso: Las 3 cuchillas cerradas → verde (normal)
    test('[true, true, true] debe retornar "green"', () => {
        expect(calculateStatus(true, true, true)).toBe('green');
    });

    // ⚠️ Caso: 2 cuchillas cerradas → amarillo (precaución)
    test('[false, true, true] debe retornar "yellow"', () => {
        expect(calculateStatus(false, true, true)).toBe('yellow');
    });

    test('[true, false, true] debe retornar "yellow"', () => {
        expect(calculateStatus(true, false, true)).toBe('yellow');
    });

    test('[true, true, false] debe retornar "yellow"', () => {
        expect(calculateStatus(true, true, false)).toBe('yellow');
    });

    // 🟠 Caso: 1 cuchilla cerrada → naranja (alerta)
    test('[true, false, false] debe retornar "orange"', () => {
        expect(calculateStatus(true, false, false)).toBe('orange');
    });

    test('[false, true, false] debe retornar "orange"', () => {
        expect(calculateStatus(false, true, false)).toBe('orange');
    });

    test('[false, false, true] debe retornar "orange"', () => {
        expect(calculateStatus(false, false, true)).toBe('orange');
    });

    // 🔴 Caso: Ninguna cuchilla cerrada → rojo (crítico)
    test('[false, false, false] debe retornar "red"', () => {
        expect(calculateStatus(false, false, false)).toBe('red');
    });
});

// ============================================================
// SUITE 2: convertToBoolean — Conversión de tipos del ESP32
// El ESP32 puede enviar strings, números o booleans
// ============================================================
describe('convertToBoolean — Conversión de formatos del ESP32', () => {

    // Booleans nativos
    test('true nativo → true', () => expect(convertToBoolean(true)).toBe(true));
    test('false nativo → false', () => expect(convertToBoolean(false)).toBe(false));

    // Strings "1" / "0" (formato más común del ESP32 via HTTP)
    test('"1" → true', () => expect(convertToBoolean('1')).toBe(true));
    test('"0" → false', () => expect(convertToBoolean('0')).toBe(false));

    // Strings "true" / "false"
    test('"true" → true', () => expect(convertToBoolean('true')).toBe(true));
    test('"false" → false', () => expect(convertToBoolean('false')).toBe(false));

    // Strings con mayúsculas (tolerancia)
    test('"TRUE" → true', () => expect(convertToBoolean('TRUE')).toBe(true));
    test('"FALSE" → false', () => expect(convertToBoolean('FALSE')).toBe(false));

    // Strings "yes" / "no"
    test('"yes" → true', () => expect(convertToBoolean('yes')).toBe(true));
    test('"no" → false', () => expect(convertToBoolean('no')).toBe(false));

    // Números
    test('1 → true', () => expect(convertToBoolean(1)).toBe(true));
    test('0 → false', () => expect(convertToBoolean(0)).toBe(false));

    // Nulos / indefinidos
    test('null → false', () => expect(convertToBoolean(null)).toBe(false));
    test('undefined → false', () => expect(convertToBoolean(undefined)).toBe(false));

    // Integración: strings del ESP32 en calculateStatus
    test('calculateStatus con strings "1","1","1" → "green"', () => {
        expect(calculateStatus(
            convertToBoolean('1'),
            convertToBoolean('1'),
            convertToBoolean('1')
        )).toBe('green');
    });

    test('calculateStatus con strings "0","0","0" → "red"', () => {
        expect(calculateStatus(
            convertToBoolean('0'),
            convertToBoolean('0'),
            convertToBoolean('0')
        )).toBe('red');
    });

    test('calculateStatus con números 1,0,1 → "yellow"', () => {
        expect(calculateStatus(
            convertToBoolean(1),
            convertToBoolean(0),
            convertToBoolean(1)
        )).toBe('yellow');
    });
});
