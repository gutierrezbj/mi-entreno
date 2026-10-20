# Instrucciones para Codex — Mi Entreno

Lee README.md y SPEC.md antes de empezar. Implementa el MVP mobile-first; evita añadir funcionalidades no solicitadas.

## Principios
- Construir incrementos funcionales con tests.
- No inventar marcas, tiempos, pesos, kcal gastadas o datos personales.
- Rutina inicial editable; complementarios marcados por confirmar.
- Sesiones incompletas válidas; no penalizarlas.
- Priorizar UX de móvil en gimnasio: botones grandes, contraste, guardado rápido y recuperación de sesión.
- Cuerda y otras actividades como extras opcionales.
- Guardado offline con reconciliación idempotente; evitar duplicación.
- Seguridad básica real: autenticación, validación servidor, secretos fuera de Git, backups documentados.

## Orden de trabajo
1. Arquitectura y modelo de datos, migraciones y seed.
2. Autenticación privada y CRUD de rutina.
3. Cronómetro, sesiones, registros reales por ejercicio y persistencia.
4. Histórico y comparación de marcas.
5. PWA instalable, modo offline y sincronización.
6. Tests, revisión, documentación de despliegue en VPS.

## Entrega
Abrir PR(s) con descripción, pruebas ejecutadas, capturas si corresponde y pasos de despliegue. No declarar éxito si las pruebas o el despliegue no se han verificado. No introducir secretos ni datos de salud en logs de producción.

## Definición de terminado
El usuario puede abrir la PWA desde iPhone, ver tres bloques editables, empezar una sesión, registrar resultados parciales, terminar y consultarla después.


## Ampliaciones ordenadas
- Biblioteca de ejercicios + constructor visual de rutinas editables; mantener separación entre plan y ejecución.
- Fotos/animaciones propias o con licencia, nunca extraídas del mockup como activos reales.
- Importación de pizarras por foto con revisión manual en fase posterior.
- Apple Watch: NO prometer conexión desde PWA. Estudiar app compañera iOS con HealthKit y, para datos en vivo, watchOS nativa; consentimiento y privacidad.
- Estas ampliaciones no deben bloquear el primer MVP usable.
