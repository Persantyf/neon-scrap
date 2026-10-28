# NEON SCRAP — LAST ORBIT

**[Jugar aquí](https://persantyf.github.io/neon-scrap/)**

Juego incremental web (español) sobre una estación orbital que empieza recogiendo chatarra a mano y termina siendo una megafábrica autónoma. Vite + React + TypeScript, sin backend ni recursos externos: los gráficos son SVG/Canvas propios, el sonido se sintetiza con WebAudio y las fuentes van empaquetadas.

## Cómo jugar en local

```bash
npm install
npm run dev          # http://localhost:5179
```

Otros comandos:

| Comando | Qué hace |
| --- | --- |
| `npm test` | Pruebas automatizadas (economía, persistencia y ritmo con un bot) |
| `npm run balance` | Solo las pruebas de ritmo, imprimiendo los hitos del bot |
| `npm run build` | Comprobación de tipos + build de producción en `dist/` |
| `npm run preview` | Sirve la build de producción |
| `npm run smoke` | Prueba en navegador real (Chrome/Edge local) contra `npm run dev` |
| `npm run smoke:flow` | Flujo completo (prestigio, offline, barrido de botones) contra `npm run preview` |

Las pruebas de navegador usan `puppeteer-core` con el Chrome o Edge instalado; no descargan navegadores. Las capturas se guardan en `smoke-shots/`.

## El bucle de juego

1. **Recuperar** chatarra pulsando la estación (o el botón RECUPERAR).
2. **Drones** y primeras mejoras (Guantes magnéticos, Servobrazo…).
3. **Energía**: paneles solares → clasificadores → **fundiciones** (chatarra → aleaciones) → **laboratorios** (aleaciones → datos) → **módulos de fabricación** (bonificación global). Las máquinas consumidoras pueden pausarse.
4. **Investigación** con datos: desbloquea reactores, arrastreros, sectores, ranuras de módulo y el acceso al núcleo.
5. **Expediciones**: 4 sectores con encuentros de 2–3 opciones (riesgo, coste, botín y probabilidad visibles). El botín escala con tu producción. Casco a 0 = vuelves con la mitad.
6. **Módulos raros** (12, cuatro rarezas): solo los equipados actúan; los duplicados suben de nivel.
7. **Sobrecarga**: ×3 a toda la producción durante 15 s, 60 s de enfriamiento (mejorable).
8. **Reiniciar el núcleo**: fragmentos = ⌊(log₁₀(chatarra del ciclo) − 6)² × multiplicador⌋. Cada fragmento obtenido da +5 % de producción permanente y se gasta en 11 mejoras del núcleo (inicio con máquinas, autoconstrucción, ranura extra, coordenadas de sectores…).

Directivas (32 encadenadas y luego automáticas) marcan siempre el siguiente objetivo; 38 logros (algunos secretos) dan +2 % cada uno.

### Ritmo medido (bot activo, 3 clics/s, compras inmediatas)

Primer dron ~10 s · Guantes ~10 s · primera fundición ~4,4 min · radar/primera expedición ~9,6 min · prestigio disponible ~19 min (5 fragmentos), ~27 min para 8. Un jugador humano irá algo más lento, lo que sitúa el primer reinicio en la franja de 20–30 min. El segundo ciclo es 3–4 veces más rápido.

## Organización del código

```
src/
  game/                 Lógica pura, sin React (testeable en Node)
    types.ts            Tipos del estado y de los eventos
    balance.ts          Constantes de ritmo: offline, Sobrecarga, prestigio, guardado…
    content/            Datos del juego: máquinas, mejoras, investigación, módulos,
                        sectores y encuentros, mejoras del núcleo, logros, directivas
    effects.ts          Efectos declarativos compartidos y su texto legible
    modifiers.ts        Todos los multiplicadores calculados en un único sitio
    formulas.ts         Costes, compra múltiple/máximo, niveles Mk, fórmula del prestigio
    simulation.ts       Paso de simulación: energía, cadenas de conversión, temporizadores
    actions.ts          Acciones del jugador (comprar, investigar, Sobrecarga, módulos…)
    expeditions.ts      Reglas de expediciones y botín
    prestige.ts         Reinicio del núcleo: qué se pierde y qué se conserva
    progression.ts      Directivas, logros y avisos de desbloqueo
    save.ts             Serialización, validación, migraciones y progreso offline
    info.ts             Datos derivados para la UI (producción por unidad, eficiencia)
    format.ts           Formateo de números, tasas y tiempos
  ui/                   React: solo presenta y llama a acciones
    store.ts            Bucle basado en tiempo real, autoguardado, eventos → UI
    Station.tsx         Estación SVG que crece con cada instalación + partículas
    …View.tsx           Investigación, expediciones, módulos, núcleo y registro
tests/                  Vitest: economía, guardado/offline, ritmo con bot
scripts/                Pruebas de humo en navegador real
```

Para **añadir contenido** basta con editar `src/game/content/*`: una máquina nueva se define con coste, crecimiento, producción, consumo, requisitos y umbrales Mk; una mejora o investigación, con una lista de `Effect`. Para **reequilibrar**, los números están en `content/*` y `balance.ts`; `npm run balance` muestra el efecto en los hitos.

## Decisiones técnicas

- **Tiempo real, no ticks**: cada fotograma simula el tiempo transcurrido desde el anterior (troceado en pasos de ≤ 1 s y partido en el instante exacto en que termina la Sobrecarga). Si el navegador frena la pestaña, el siguiente fotograma recupera lo perdido; ausencias de más de 60 s muestran resumen.
- **Offline**: misma simulación que en vivo, en pasos de 2 s, con un máximo de 8 h. Incluye energía, baterías y consumos de las cadenas.
- **Guardado**: `localStorage` con sobre `{game, version, savedAt, state}`, autoguardado cada 15 s, al ocultar la pestaña y tras acciones importantes. Exportar/importar JSON con validación completa (ids desconocidos fuera, sin negativos ni NaN, coherencia entre totales). Una partida dañada se aparta con otra clave en vez de perderse. Esquema v2 con migración desde v1.
- **Números grandes**: `number` de doble precisión (hasta ~1e308), saneado en cada paso; el formato usa sufijos K/M/B/T… y notación científica a partir de 1e36.

## Pendiente / ideas

- Más sectores y encuentros; eventos aleatorios en la propia estación.
- Gráfica por recurso seleccionable y comparativa entre ciclos.
- La economía tras el tercer o cuarto reinicio está menos probada que los dos primeros ciclos.
