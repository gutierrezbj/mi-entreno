# Mi Entreno

PWA privada, mobile-first, para registrar circuitos funcionales, marcas y progresión personal, desplegable en un VPS propio.

## Documentación
- [SPEC.md](SPEC.md): alcance técnico, datos y criterios de aceptación.
- [AGENTS.md](AGENTS.md): instrucciones para Codex.

## Punto de partida
- 20/10/2026: regreso al entrenamiento; una ronda en cada uno de tres bloques. Tiempo desconocido. Esfuerzo alto.
- Límite de referencia: 45 minutos para el circuito.
- Cuerda: complemento opcional, meta futura de hasta 25 minutos, no requisito obligatorio.
- Meta: constancia, registrar lo realizado y progresar sin penalizar sesiones parciales.

**Importante:** la rutina de la pizarra debe permanecer editable y algunos complementarios están pendientes de confirmación.

## MVP del Issue #1

Implementado con Next.js App Router, TypeScript, PostgreSQL 17 y Drizzle. Incluye acceso privado, constructor por bloques (crear/editar/duplicar/eliminar y reordenar con botones), objetivos y rondas, cronómetro con pausa, resultados reales por ejercicio/ronda, extras opcionales, recuperación local, guardado parcial e histórico con el plan original. Durante una sesión aparece el último valor registrado para el mismo ejercicio y unidad; no mezcla metros, repeticiones y tiempos.

Cada bloque organiza la rutina inicial en cuatro supersets: Air Bike + burpees, remo + sentadillas, cinta + lunges y Ski + complementario. Las tarjetas distinguen máquina, peso corporal y trabajo con carga mediante texto e iconos, tanto en el plan como durante el entrenamiento. El constructor permite crear supersets, reagrupar ejercicios, cambiar su tipo y mover una pareja completa. Los complementarios mantienen su estado «por confirmar»; la cinta del último bloque se identifica como máquina y no se convierte en un ejercicio corporal.

Durante el entrenamiento puedes marcar cada ejercicio como hecho. Si aún no has introducido un valor, el botón dice explícitamente «He hecho [objetivo] [unidad]» y ese toque confirma la cantidad; las cargas nunca se rellenan solas. Si has anotado otra cantidad, «Marcar como hecho» conserva ese valor. Desmarcar mantiene la anotación como parcial. Una barra persistente muestra los ejercicios confirmados de la sesión y lleva al siguiente pendiente; también hay avance de ronda, contadores por superset y una línea del valor real frente al objetivo de cada ejercicio. Parciales y omitidos se muestran aparte y no cuentan como completados. Los extras opcionales quedan fuera del denominador del circuito.

La fecha inicial es un registro retrospectivo: tres rondas declaradas, **sin resultados individuales ni duración medida**. Los 45 minutos son una referencia. Los complementarios siguen marcados «por confirmar» hasta que se revisen.

### Desarrollo

Requisitos: Node.js 24, npm y Docker Compose. Copia `.env.example` a `.env`, establece una contraseña PostgreSQL aleatoria hexadecimal (por ejemplo, `openssl rand -hex 24`) y actualiza también `DATABASE_URL`. Ejecuta `npm run password` para generar `AUTH_PASSWORD_HASH`; la contraseña se introduce sin mostrarla. Define `AUTH_USERNAME` y `APP_ORIGIN=http://localhost:3000`.

```sh
npm ci
docker compose -f compose.yaml -f compose.dev.yaml up -d db
node --env-file=.env --import tsx scripts/migrate.ts
node --env-file=.env --import tsx scripts/seed.ts
npm run dev
```

Abre http://localhost:3000. Next carga `.env` automáticamente; los scripts de base de datos necesitan `--env-file` o variables exportadas. El seed se puede repetir: no reinicia rutinas editadas ni duplica la sesión inicial. No cambies `AUTH_USERNAME` para crear otro usuario: esta instancia es de una sola persona.

### Pruebas

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
docker compose -f compose.test.yaml up -d --wait
npm run test:local
docker compose -f compose.test.yaml down
```

`test:local` configura credenciales exclusivas de prueba, aplica migraciones y seed, ejecuta la integración PostgreSQL y abre Chromium con viewport móvil contra la compilación de producción. No lee `.env`. La base `mi_entreno_test` usa un contenedor con almacenamiento temporal, puerto 54329, y la prueba de persistencia rechaza otras bases. Para repetir E2E, reinicia el contenedor desechable con `down` y `up`: la prueba deja una sesión intencionalmente para verificar el histórico. Las pruebas rechazan reutilizar un servidor ya abierto. Para conservar la vista previa en el puerto 3000, usa `TEST_PORT=3100 npm run test:local`.

La CI ejecuta estos controles en cada PR. Capturas y trazas de los fallos se guardan como artefactos. Las capturas de la ejecución local están en `test-results/`; contienen datos ficticios de pruebas y no se versionan por defecto.

### Ejecutar Docker localmente

Con `.env` configurado:

```sh
docker compose up -d --build
docker compose ps
```

La aplicación escucha solamente en `127.0.0.1:3000`. `migrate` debe terminar con código 0; `app` arranca después. No expongas PostgreSQL: el override `compose.dev.yaml` es exclusivo para desarrollo. El contenedor de la app usa un usuario sin privilegios.

### Despliegue en VPS (manual; no ejecutado por esta PR)

1. Instala Docker/Compose, apunta un dominio al VPS y permite TCP 80/443 en su firewall.
2. Copia el repositorio y crea `.env` con secretos propios. Restringe el archivo: `chmod 600 .env`.
3. Establece `DOMAIN=entreno.tudominio.example` y `APP_ORIGIN=https://entreno.tudominio.example`. El origen debe coincidir exactamente, sin barra final. Usa HTTPS para cookies seguras y PWA; no uses el modo HTTP local desde una red pública.
4. Ejecuta `docker compose --profile https up -d --build`. Caddy obtiene y renueva HTTPS. No hay workflow de despliegue automático.
5. Comprueba `docker compose ps`, abre el dominio, inicia sesión y registra una sesión de prueba. Verifica que sigue en el histórico tras reiniciar `app`.
6. En Safari iPhone: Compartir → Añadir a pantalla de inicio. Hay manifiesto e iconos; la instalación, los temporizadores suspendidos por iOS y el uso en hardware real requieren validación manual. No se afirma compatibilidad Apple Watch.

Antes de cada actualización realiza un backup. Las migraciones tienen registro y bloqueo transaccional. Para futuras migraciones, añade archivos/versiones al ejecutor; nunca modifiques una migración ya aplicada. Cambiar `POSTGRES_PASSWORD` en `.env` **no cambia** por sí solo la contraseña de un volumen ya inicializado: realiza la rotación en PostgreSQL también.

### Backup y restauración

Los datos sincronizados están en el volumen PostgreSQL. Guarda backups cifrados fuera del VPS; no los subas a Git. También conserva `.env` en un gestor de secretos. Los borradores y sesiones pendientes viven en el dispositivo y no se incluyen en `pg_dump`.

```sh
mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/mi-entreno.dump
# Verificar el archivo sin restaurarlo:
docker compose exec -T db pg_restore --list < backups/mi-entreno.dump
# Restaurar sobre una instancia de recuperación, con la app detenida:
docker compose stop app
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < backups/mi-entreno.dump
docker compose up -d app
```

Ensaya la restauración en una instancia aislada antes de depender del backup. `--clean` reemplaza datos existentes: úsalo únicamente sobre el destino que quieras restaurar. Para revocar todas las sesiones de acceso, vacía `auth_sessions` en la base y rota la contraseña si procede. La contraseña nueva no revoca automáticamente las cookies existentes.

### Cobertura offline y límites de este incremento

- Cada cambio del entrenamiento se guarda en `localStorage` del propietario. Recupera la sesión y el estado de pausa al volver a entrar. El cronómetro usa marcas de tiempo; no depende de que el navegador mantenga un intervalo activo.
- Con la app ya abierta se puede anotar y finalizar sin red. El histórico local muestra «Pendiente de sincronizar». Se reintenta al recuperar conexión, al abrir la app o con el botón Sincronizar. El servidor acepta reintentos idénticos por UUID y rechaza contenido conflictivo con HTTP 409, conservando la copia local.
- Una segunda pestaña no puede sobrescribir silenciosamente un borrador cambiado: exige recarga. Si se agota el almacenamiento, se detiene la operación y se avisa.
- **Abrir o recargar toda la app sin red requiere volver a conectar**. El service worker solo guarda una página pública de ayuda; nunca cachea HTML autenticado, respuestas privadas ni credenciales. El arranque offline completo y la sincronización de borradores entre dispositivos quedan para el siguiente incremento del Issue #1.
- Usa un dispositivo y perfil de navegador privados: el borrador local no está cifrado. No borres datos del sitio antes de sincronizar. Salir elimina la copia local y requiere resolver la sesión activa y los pendientes primero.
- Importación/exportación general CSV/JSON, estadísticas ampliadas, arrastrar y soltar, galería, reconocimiento de pizarras y Apple Health quedan fuera de este PR. La exportación de emergencia solo se ofrece si falla la recuperación del registro local.

Consulta [la arquitectura](docs/architecture.md) para las extensiones previstas en #2 y #3.
