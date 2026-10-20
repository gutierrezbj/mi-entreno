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
