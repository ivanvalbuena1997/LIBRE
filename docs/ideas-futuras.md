# Ideas para futuras actualizaciones

Tareas pendientes apuntadas por Iván (18, 19, 22, 23 y 24-11-2026), numeradas y por
secciones; las hechas, tachadas. **Las pendientes no se desarrollan todavía:** antes de
empezar cualquiera hay que verla con Iván y, si cambia el alcance, actualizar
DISENO.md («Alcance de la versión actual»). Al terminar una, pasa abajo a
«Hechas».

## Pendientes

### 🏢 Empresa y expansión

1. [x] ~~**Nombre de la empresa.**~~ Hecho el 20-11-2026 (ver «Hechas»).
2. [ ] **Sedes en otras ciudades y países.** Abrir sedes en distintas
   ciudades y países. Ojo: DISENO.md deja «otras ciudades» fuera del alcance
   actual, así que habría que cambiarlo allí.
3. [ ] **Salir a Bolsa.** A partir de 10 taxis, salir a Bolsa y poder invertir
   o arriesgar dinero en el mercado bursátil.

### 🚗 Vehículos y personalización

4. [x] ~~**Tiers de vehículos.**~~ Hecho el 24-11-2026 como las gamas de
   coche (idea 23, ver «Hechas»).
5. [x] ~~**Alquilar coche.**~~ Hecho el 20-11-2026 (ver «Hechas»).
6. [x] ~~**Kilometraje de cada coche.**~~ Hecho el 19-11-2026 (ver «Hechas»).
7. [x] ~~**Avería definitiva.**~~ Hecho el 19-11-2026 (ver «Hechas»).
8. [ ] **Skin del coche.** Más adelante en la partida, personalizar el aspecto
   del coche si conduces tú.

### 👨‍✈️ Conductores y contrataciones

9. [x] ~~**Más variedad de conductores.**~~ Hecho el 20-11-2026 (ver «Hechas»).
10. [ ] **Conductores de ETT.** Contratar a un conductor temporal por un
    precio reducido que solo trabaja unas jornadas, para no tener el coche
    parado mientras encuentras a uno fijo.
11. [x] ~~**Pagar por más candidatos.**~~ Hecho el 22-11-2026 (ver «Hechas»).

### 📈 Progresión y estadísticas

12. [x] ~~**Nivel de cuenta.**~~ Hecho el 24-11-2026 como el nivel de tu
    personaje con su prestigio (ver «Hechas»).

16. [x] ~~**Lo que te ha hecho ganar cada mejora.**~~ Hecho el 22-11-2026, solo
    las fáciles (ver «Hechas»).

20. [ ] **Revisar tu personaje para que sea más entretenido.** Plan de la
    fase 2 (Iván, 23-11-2026: el jugador está deseando dejar el volante
    porque su personaje se queda muy por debajo de los conductores):
    - [x] 21 · Racha (B1) y la rama de mejoras de tu personaje (24-11-2026).
    - [x] 12 · Nivel de cuenta con prestigio (24-11-2026).
    - [x] Tu cara y tu nombre, editables, y la hoja del personaje
      rediseñada (24-11-2026).
    - [ ] 13 y 15 · Personajes guía con su historia que te entregan tus
      objetos (no se compran) y guían el juego.
    - [ ] Café a voluntad (B2): parar a tomar un café cuando quieras (y,
      quizá, mandar a descansar a un conductor).

21. [x] ~~**Racha.**~~ Hecha el 23 y 24-11-2026 (ver «Hechas»).
22. [ ] ~~Decisiones durante la carrera.~~ Descartada (Iván, 23-11-2026: no
    la quiere; el «sí» anterior fue una errata). Tampoco las ofertas de la
    emisora.

23. [x] ~~**Gamas de coche.**~~ Hecho el 24-11-2026 (ver «Hechas»).

### ⭐️ Clientes y eventos

13. [ ] **Eventos guiados.** Darle contexto al juego y una pequeña historia.
    Hay un análisis previo en [propuesta-eventos.md](propuesta-eventos.md),
    con seis preguntas por decidir al final.
14. [ ] **Valoraciones de clientes.** Opiniones aleatorias de los clientes
    sobre las carreras.
15. [ ] **Anécdotas reales.** Cosas que nos han pasado de verdad, convertidas
    en situaciones o eventos del juego. Encaja con la 13.

### 🌳 Mejoras nuevas

17. [x] ~~**Modo incógnito.**~~ Hecho el 20-11-2026 (ver «Hechas»).
18. [x] ~~**Rebajar la tasa de la SL.**~~ Hecho el 22-11-2026 (ver «Hechas»).
19. [x] ~~**Revisar la Oficina de gestión.**~~ Cerrada el 23-11-2026 sin cambios (ver «Hechas»).

### 🖥️ Interfaz y experiencia de usuario

Ninguna pendiente.

## Hechas

- [x] **12. Nivel de cuenta y prestigio** (📈, 24-11-2026). Tu personaje
  sube de nivel con experiencia (4 por carrera tuya, 1 por carrera de un
  conductor, 1 por legendario vendido); el nivel N da N puntos de
  prestigio. Desde el nivel 3, «Empezar de cero»: gastas los puntos en
  mejoras del personaje (300 puntos entre todas), las únicas que se
  conservan, con tu cara y tu nombre. Medido con el bot: unos 11 reinicios
  de 4–6 h llegando al nivel 7 ([analisis-prestigio.md](analisis-prestigio.md)).
  Prestigio dentro del alcance por decisión de Iván (DISENO.md).

- [x] **4 y 23. Gamas de coche** (🚗, 24-11-2026). Toyota Corolla
  (1.500 €), Tesla Model 3 (3.500 €: eléctrico, −60 % de averías, −20 % de
  cansancio; Híbridos y GLP no le afectan) y Mercedes Clase S (5.000 €:
  propinas 2,2 veces más a menudo y un 65 % mayores, −55 % de impagos y
  ≈ +16,5 % de clientes en Centro y Aeropuerto; gasta un 30 % más y sus
  reparaciones cuestan un 50 % más). Se desbloquean con las mejoras del
  personaje y se eligen al comprar coche. Detalle y medidas en DISENO.md.

- [x] **21. Racha** (📈, 23 y 24-11-2026). Encadenar tus carreras sube el
  importe un 1 % cada una, hasta +10 %; la ventana para encadenar se
  estrecha de 1 s a 0,5 s; taxímetro de recreativa (luces, brillo y
  sonidos). Se consigue como mejora del personaje (Racha, con Racha larga y
  Reflejos de taxista).

- [x] **19. Revisar la Oficina de gestión** (🌳, 23-11-2026). Medido: la
  Oficina en sí rinde mucho; lo que cuesta un 15–20 % es dejar el volante.
  Iván: «es el precio a pagar por dejar el volante», así que no se cambia ni
  se avisa ([analisis-progresion.md](analisis-progresion.md)).

- [x] **11. Pagar por más candidatos** (👨‍✈️, 22-11-2026). Mejora
  «Cazatalentos» (25.000 €, la última de Conductores y jornada): «Buscar
  otros candidatos» por 1.000 €, el doble cada vez en el mismo día, y de
  vuelta a 1.000 € al cerrar la caja.

- [x] **18. Rebajar la tasa de la SL** (🌳, 22-11-2026). «Gestoría propia»,
  al final de Taller y seguros (tras el Leasing) y solo con la SL montada:
  3 niveles de 3.000 / 4.500 / 7.000 € que dejan la tasa en 7 / 4 / 1 € por
  conductor y jornada.

- [x] **16. Lo que te ha hecho ganar cada mejora** (📈, 22-11-2026). Solo
  las que se cuentan directamente (Iván: «el resto no lo vamos a indicar»):
  Publicidad y esterillas (ganado); combustible, seguro, averías, pinchazos
  y Leasing (ahorrado). Las de demanda, búsqueda, zonas, propinas, Jornada
  larga, Taquillas, Curso de zonas, RRHH, Oficina y Emisora no enseñan nada.

- [x] **1. Nombre de la empresa** (🏢, 20-11-2026). Para la 4.ª licencia hay
  que montar una SL (3.000 € y 10 € por conductor y jornada) y ponerle nombre
  a la flota, que sale en una placa junto al logo. Pendiente: una mejora que
  rebaje la tasa diaria.

- [x] **9. Más variedad de conductores** (👨‍✈️, 20-11-2026). 32 personajes
  (antes 16) y accesorios nuevos: gafas de sol, gorra, pajarita, traje con
  corbata y pendientes.

- [x] **17. Modo incógnito** (🌳, 20-11-2026). Mejora de 15.000 € tras la
  Oficina: los conductores de nivel 10 trabajan en la libranza de su
  licencia; un «pesetas» puede pillarlos (2 % por turno, 2.000 € de multa).

- [x] **5. Alquilar coche** (🚗, 20-11-2026). Una licencia sin coche puede
  alquilar uno 3 días por 400 €, alargarlo o comprar uno propio encima. No se
  gasta y se devuelve solo al acabar.

- [x] **7. Avería definitiva** (🚗, 19-11-2026). Desde 130.000 km el coche
  puede romperse del todo (también el tuyo, sin bloquear nunca la partida):
  va al desguace por 50 € y la licencia se queda sin coche. Las averías
  normales suben con los km. «Renovar coche» en la hoja del coche (tocar
  sus km), con el día cerrado: el viejo vale menos cuantos más km. Antes,
  la velocidad en vacío pasó a 72 km/h ([analisis-km.md](analisis-km.md)).

- [x] **6. Kilometraje de cada coche** (🚗, 19-11-2026). Cada coche lleva sus
  km bajo la placa de su licencia; el inicial sale usado (85.000–100.000 km)
  y los comprados, nuevos. Estadísticas suma los km de la flota.
- [x] **Avisos de conductores solo en su sitio** (🖥️, 19-11-2026). Los
  mensajes de lo que les pasa a los conductores (subir de nivel, encontrar un
  objeto, bajas, averías…) salen solo en Calle y Conductores.
