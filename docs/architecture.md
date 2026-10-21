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

## Supersets y material

Cada ejercicio prescrito admite `supersetId` y `equipment` (`machine`, `bodyweight`, `weighted`, `unspecified`). Son campos opcionales para mantener compatibles los snapshots y la cola offline anteriores: validar una sesión antigua no añade defaults ni cambia su hash de deduplicación. Las nuevas sesiones y las rutinas guardadas desde el constructor conservan los campos explícitos.

`lib/structure.ts` comparte la agrupación entre el plan, el constructor y el entrenamiento. Las prescripciones de la rutina inicial anterior al cambio se pueden presentar agrupadas a partir de sus identificadores conocidos, sin modificar el histórico almacenado. No se deduce el material de la unidad, del nombre o del orden de ejercicios personalizados; estos permanecen sin clasificar hasta que se editen. Las prescripciones inciertas siguen etiquetadas y no se infieren cargas.

## Marcado y avance

`lib/tracking.ts` calcula el avance a partir de los resultados existentes: número de ejercicios/rondas marcados como `done` con valor real, sin sumar unidades diferentes y sin incluir extras. No se persisten porcentajes derivados ni se modifican snapshots. La barra individual compara el valor registrado con su propio objetivo, limita el relleno visual al 100% y conserva valores que superen el objetivo; un objetivo cero no genera división ni porcentaje. El porcentaje se redondea hacia abajo para no mostrar 100% antes de alcanzar el objetivo o confirmar todos los ejercicios.

El botón de confirmación rápida indica explícitamente el objetivo que el usuario declara realizado. No copia la carga prescrita; la carga real sigue siendo un dato independiente. Desmarcar conserva métricas y notas como parcial. El siguiente pendiente respeta orden de bloques, rondas y supersets, admite parciales y salta ejercicios hechos u omitidos. El navegador recupera el bloque de ese pendiente al restaurar el borrador. Los lectores de pantalla reciben estado de marcado, etiquetas de avance y foco al navegar al siguiente.

## Pantallas móviles

`components/dashboard.tsx` mantiene la sesión y la cola local por encima de las pantallas de `components/screens/`. La navegación cambia la presentación sin crear ni finalizar una sesión; salir de Entrenamiento para consultar la portada o el histórico conserva el borrador y el cronómetro. El resumen posterior al guardado refleja la sesión realmente guardada, incluidos parciales y pendientes de sincronizar.

`workoutSequence` comparte el orden entre el siguiente pendiente y la navegación ejercicio a ejercicio. El modo Circuito completo presenta esos mismos resultados agrupados por supersets. Los controles de incremento parten de un campo vacío; solo una interacción explícita introduce un valor. Las ilustraciones SVG se escribieron para la app; el material declarado sigue siendo la clasificación del plan, independiente de la imagen.

`lib/insights.ts` calcula actividad semanal con fechas locales y promedios únicamente sobre duraciones medidas. La portada utiliza una imagen local original: [procedencia y prompt](assets/training-hero.md). No se extraen imágenes del mockup ni se crean resultados, metas semanales, calorías, medidas corporales o identidad personal para rellenar la interfaz. Estas pantallas no añaden campos persistidos ni alteran la compatibilidad de las sesiones anteriores.
