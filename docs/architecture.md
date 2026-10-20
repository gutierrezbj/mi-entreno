# Arquitectura del primer incremento

## Límites y persistencia

- `lib/model.ts`: validación compartida Zod y reglas puras de temporizador, progreso, snapshots y comparación. Los valores no anotados son `null`, nunca cero implícito. `partial` es un registro válido, no un fallo.
- `lib/local.ts`: borrador y cola local versionados por propietario; ID de sesión generado al comenzar. Un guardado fallido no elimina la copia local. No hay service worker con credenciales ni escrituras ocultas.
- `lib/repository.ts`: persistencia Drizzle. Plantillas con versión optimista, sesiones inmutables, deduplicación mediante PK UUID y digest canónico. Todas las consultas están limitadas al propietario; no se confía en un userId enviado por el navegador.
- `db/schema.ts`: usuarios, catálogo de definiciones, plantillas, sesiones y sesiones de autenticación. Blocks, PrescribedExercise, ExerciseResult y ExtraActivity son entidades tipadas con UUID dentro de agregados JSONB. Mantenerlos en el mismo documento permite guardar sesión + plan de forma atómica sin joins ni resultados huérfanos. El servidor valida IDs, pertenencia al bloque, ronda, unidad y límites. Las futuras consultas analíticas pueden normalizar estos agregados sin cambiar sus IDs.
- El catálogo inicial es independiente del plan. Los ejercicios propios del constructor tienen identidad estable dentro del plan; renombrarlos genera una identidad nueva para no comparar por accidente ejercicios distintos. La promoción de esos ejercicios a una biblioteca compartida editable se implementará en #2. Cambiar objetivos o rondas conserva la identidad del ejercicio y crea una nueva versión de plantilla.
- Las sesiones guardan una copia del plan. Eliminar o modificar la plantilla nunca cambia el histórico. El seed retrospectivo guarda solo lo declarado y no usa la referencia temporal como duración real.

## Autenticación y seguridad

Una cuenta configurada en el servidor, sin registro público. Contraseña con scrypt y sal; comparación de tiempo constante. Cookie opaca aleatoria de 256 bits, HttpOnly, SameSite=Strict, Secure con origen HTTPS. Solo se guarda el hash del token; caduca a los siete días. Logout revoca el token. Diez intentos por ventana de quince minutos en PostgreSQL, con incremento atómico compartido entre procesos. Es un límite global adecuado a esta instancia privada, pero no un servicio multiusuario: un atacante puede agotar una ventana. Puede añadirse protección de red en el proxy si se expone públicamente.

Escrituras JSON con comprobación exacta de Origin, límites de tamaño y validación de esquema. Sin datos de salud ni credenciales en logs. Consultas parametrizadas. API `no-store`; CSP, antiframing y nosniff. La CSP admite scripts inline que necesita Next en este MVP; un nonce por petición sería un refuerzo posterior. No hay imágenes externas cargadas por la app ni integraciones activas.

## Issue #2: biblioteca e importación de pizarra

`ExerciseDefinition` dispone de categoría, instrucciones, unidad y medios con URL/licencia. Un ejercicio prescrito añade objetivo, carga, descanso y marca de incertidumbre. El constructor funciona sin imágenes ni IA. La reordenación por botones es accesible desde teclado y pantalla táctil; el drag & drop queda para #2.

La importación futura debe producir un borrador de plantilla, nunca resultados de entrenamiento: conservar fotografía/origen según consentimiento, proponer unidades/orden, marcar dudas y exigir revisión humana antes de llamar al guardado normal. No extraer fotos de un mockup. Las sustituciones durante una sesión requerirán un campo de ejercicio efectivo separado del `prescribedId`; no reescribir el snapshot original.

## Issue #3: Apple Health / Watch

No existe acceso directo a HealthKit ni a sensores Watch desde esta PWA. No hay botón de conexión ficticio. La extensión propuesta es una app iOS SwiftUI/HealthKit con autorización granular; watchOS solo si se necesitan datos en vivo, con firma, distribución y pruebas en hardware real.

La tabla de sesiones reserva `source` y `external_id`, con índice único por propietario/origen/ID externo. El API web acepta únicamente `source=manual`: una app compañera necesitará un endpoint y autenticación propios, importación con origen verificable, consentimiento, revocación y eliminación selectiva de datos importados. No reutilizar la cookie de navegador ni aceptar una fuente HealthKit arbitraria desde el API actual. Los datos importados deben conservar su procedencia y no sumar dos veces una misma actividad.

Los campos externos son una preparación del almacenamiento, no una integración. La investigación y el ADR completo de factibilidad de #3 siguen pendientes. Ninguna función del MVP requiere reloj.
