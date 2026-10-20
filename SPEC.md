# Especificación MVP — Mi Entreno

## Producto
PWA privada mobile-first para registrar entrenamiento funcional en gimnasio, con despliegue self-hosted en VPS. Interfaz oscura, controles grandes y rápida entrada de datos. No crear red social, recomendaciones médicas ni registro calórico en esta fase.

## Stack sugerido
Next.js App Router, TypeScript, PostgreSQL, Drizzle ORM, autenticación segura para una sola persona, Docker Compose y reverse proxy HTTPS. PWA instalable en iPhone. Datos locales durante el entreno y sincronización idempotente posterior si no hay red.

## Flujo principal
1. Ver rutina y objetivos editables.
2. Comenzar sesión, cronometrar tiempo activo, pausa/reanudación.
3. Registrar por ejercicio y ronda: objetivo y real, reps, metros, segundos, carga kg, notas; permitir omitir o marcar parcial.
4. Finalizar o guardar una sesión parcial sin penalización.
5. Consultar histórico, comparación y evolución.
6. Añadir extra opcional (ej. cuerda), independiente del circuito.
7. Exportar/importar CSV y JSON.

## Modelo de datos
User, WorkoutTemplate, Block, ExerciseDefinition, PrescribedExercise, WorkoutSession, ExerciseResult, ExtraActivity. Guardar timestamps, unidad original, objetivo, valor real, orden, status y notas. No confundir plantilla con resultados. Resultados sincronizables mediante identificadores estables y política de no duplicación.

## Rutina inicial: transcripción editable
| Ejercicio | Bloque 1 | Bloque 2 | Bloque 3 | Unidad |
| --- | ---: | ---: | ---: | --- |
| Air Bike | 400 | 600 | 800 | m |
| Burpees | 5 | 10 | 15 | reps |
| Remo | 200 | 300 | 400 | m |
| Sentadillas | 5 | 15 | 25 | reps |
| Cinta | 250 | 300 | 350 | m |
| Lunges | 20 | 30 | 40 | reps |
| Ski | 200 | 300 | 400 | m |
| Complementario (por confirmar) | 20 sit-ups | 20 thrusters | cinta 300 m | mixto |

Los últimos complementarios son una transcripción incierta de la imagen y deberán quedar marcados como **por confirmar**. No deducir un porcentaje de ejercicios completados por el usuario sin registro real.

### Sesión inicial
2026-10-20, una ronda de cada bloque (tres bloques), tiempo desconocido, esfuerzo intenso, mucha sudoración, vuelta al entrenamiento tras un periodo largo. Límite objetivo 45 minutos, **no tiempo efectivo registrado**. Cuerda hasta 25 min: aspiración futura, opcional, progresiva; no consta que se hiciera ese día.

## Reglas de producto
- Nunca inventar pesos, tiempos, resultados, calorías o volumen completado.
- Permitir cambiar rutinas y objetivos sin modificar el histórico.
- La UX funciona con poca cobertura; recuperar sesión activa tras cierre inesperado.
- Las sesiones incompletas cuentan como registros legítimos.
- Mostrar resultados por unidades coherentes y fechas localizadas.
- Proteger datos privados y secretos.
- Preferir MVP vertical operativo a funciones superficiales.

## Criterios de aceptación
- Nueva instancia desplegable documentada con Docker Compose y migraciones.
- Autenticación de uso privado.
- Flujo completo plantilla -> inicio -> registro -> pausa -> guardar -> histórico.
- Datos iniciales presentes, ambigüedades etiquetadas y editables.
- Tests para cálculo de progreso, sesiones parciales, pausa/reanudación, importación y sincronización sin duplicados.
- README con .env.example, backup/restauración, despliegue VPS y acceso PWA.


## Diseño ampliado: biblioteca y constructor (fase siguiente al flujo básico)
- Entidades independientes: catálogo de ejercicios, plantillas de rutina y sesiones ejecutadas.
- Crear ejercicios propios con nombre, categoría, instrucciones, unidad de medida, fotos/ilustraciones opcionales y variantes.
- Constructor visual: crear bloques, reordenar ejercicios (incluido drag & drop accesible), rondas, repeticiones, metros, tiempo, peso y descansos; duplicar rutina y versionarla.
- Reemplazar ejercicios durante una sesión cuando un equipo esté ocupado, conservando el plan original y el ejercicio efectivo.
- Galería visual: imágenes con derechos claros (licencias o generación propia). Nunca tratar fotografías de mockups como assets licenciados ni estadísticas de muestra como reales.
- Importar rutina desde fotografía de pizarra con IA en fase posterior: extracción propuesta, unidades y orden; revisión y confirmación humana obligatoria antes de guardar, marcar dudas.
- El editor debe funcionar sin IA ni imágenes; la rutina inicial debe poder reproducirse de principio a fin.

## Apple Watch y Apple Health — fase de investigación e integración
- Una PWA web no tiene acceso directo a HealthKit ni a los sensores/entrenamientos del Apple Watch.
- Estudiar companion app nativa iOS (Swift/SwiftUI + HealthKit) y, si resulta necesario para datos en vivo, watchOS con WorkoutKit/HealthKit y sesiones HKWorkoutSession.
- Primer objetivo: importar con autorización explícita los entrenamientos, duración y frecuencia cardíaca disponible desde Apple Health, respetando orígenes y duplicados; valorar energía activa con advertencias de estimación.
- Si se requiere lectura en tiempo real, diseñar después app watchOS y sincronización con backend; requerirá permisos, firma/desarrollo Apple y pruebas en hardware real.
- Opcionalidad estricta: app plenamente usable sin reloj ni datos de Salud; permisos mínimos, revocación, privacidad, cifrado y eliminación de registros importados.
- No afirmar compatibilidad o sincronización hasta haberla probado en iPhone/Watch reales.
