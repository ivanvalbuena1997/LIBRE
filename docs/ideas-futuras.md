# Ideas para futuras actualizaciones

Tareas pendientes apuntadas por Iván (18, 19 y 22-11-2026), numeradas y por
secciones. **Nada de esto está hecho ni se desarrolla todavía:** antes de
empezar cualquiera hay que verla con Iván y, si cambia el alcance, actualizar
DISENO.md («Alcance de la versión actual»). Al terminar una, pasa abajo a
«Hechas».

## Pendientes

### 🏢 Empresa y expansión

1. [x] **Nombre de la empresa.** Hecho el 20-11-2026 (ver «Hechas»).
2. [ ] **Sedes en otras ciudades y países.** Abrir sedes en distintas
   ciudades y países. Ojo: DISENO.md deja «otras ciudades» fuera del alcance
   actual, así que habría que cambiarlo allí.
3. [ ] **Salir a Bolsa.** A partir de 10 taxis, salir a Bolsa y poder invertir
   o arriesgar dinero en el mercado bursátil.

### 🚗 Vehículos y personalización

4. [ ] **Tiers de vehículos.** Varios modelos de coche con cualidades
   distintas (consumo, demanda, averías…) en lugar de uno solo. Ojo: hoy
   DISENO.md deja «otros vehículos» fuera del alcance, así que habría que
   cambiarlo allí.
5. [x] **Alquilar coche.** Hecho el 20-11-2026 (ver «Hechas»).
6. [x] **Kilometraje de cada coche.** Hecho el 19-11-2026 (ver «Hechas»).
7. [x] **Avería definitiva.** Hecho el 19-11-2026 (ver «Hechas»).
8. [ ] **Skin del coche.** Más adelante en la partida, personalizar el aspecto
   del coche si conduces tú.

### 👨‍✈️ Conductores y contrataciones

9. [x] **Más variedad de conductores.** Hecho el 20-11-2026 (ver «Hechas»).
10. [ ] **Conductores de ETT.** Contratar a un conductor temporal por un
    precio reducido que solo trabaja unas jornadas, para no tener el coche
    parado mientras encuentras a uno fijo.
11. [ ] **Pagar por más candidatos.** Pagar para que salgan ofertas de
    conductores nuevas sin esperar al día siguiente (hoy cambian al cerrar la
    caja y tras cada contrato).

### 📈 Progresión y estadísticas

12. [ ] **Nivel de cuenta.** Un nivel del jugador que refleje cómo avanza la
    partida. Ojo: si llevara reinicios con premio, se parecería al
    «prestigio», que DISENO.md deja fuera del alcance actual.

16. [x] **Lo que te ha hecho ganar cada mejora.** Hecho el 22-11-2026, solo
    las fáciles (ver «Hechas»).

### ⭐️ Clientes y eventos

13. [ ] **Eventos guiados.** Darle contexto al juego y una pequeña historia.
    Hay un análisis previo en [propuesta-eventos.md](propuesta-eventos.md),
    con seis preguntas por decidir al final.
14. [ ] **Valoraciones de clientes.** Opiniones aleatorias de los clientes
    sobre las carreras.
15. [ ] **Anécdotas reales.** Cosas que nos han pasado de verdad, convertidas
    en situaciones o eventos del juego. Encaja con la 13.

### 🌳 Mejoras nuevas

17. [x] **Modo incógnito.** Hecho el 20-11-2026 (ver «Hechas»).
18. [x] **Rebajar la tasa de la SL.** Hecho el 22-11-2026 (ver «Hechas»).
19. [ ] **Revisar la Oficina de gestión.** Con el bot arreglado
    (21-11-2026), el perfil Gestor deja el volante con una sola licencia y
    se hunde: a los 150 minutos, 333 € por jornada frente a 602 € del
    Equilibrado ([analisis-progresion.md](analisis-progresion.md)). Opciones:
    que el juego desaconseje dejar el volante tan pronto o que la Oficina
    compense más.

### 🖥️ Interfaz y experiencia de usuario

Ninguna pendiente.

## Hechas

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
