# Ideas para futuras actualizaciones

Tareas pendientes apuntadas por Iván el 18-11-2026. **Nada de esto está hecho
ni se desarrolla todavía:** antes de empezar cualquiera hay que verla con Iván
y, si cambia el alcance, actualizar DISENO.md («Alcance de la versión actual»).

- [ ] **Tiers de vehículos.** Varios modelos de coche con cualidades distintas
  (consumo, demanda, averías…) en lugar de uno solo. Ojo: hoy DISENO.md deja
  «otros vehículos» fuera del alcance, así que habría que cambiarlo allí.
- [ ] **Eventos guiados.** Darle contexto al juego y una pequeña historia.
  Hay un análisis previo en [propuesta-eventos.md](propuesta-eventos.md), con
  seis preguntas por decidir al final.
- [ ] **Más variedad de conductores.** Más nombres de personajes y más
  retratos (`js/retratos.js`).
- [ ] **Alquilar coche.** Poder alquilar uno cuando tienes una licencia sin
  coche, como alternativa a comprarlo.
- [ ] **Conductores de ETT.** Contratar a un conductor temporal por un precio
  reducido que solo trabaja unas jornadas, para no tener el coche parado
  mientras encuentras a uno fijo.

## Ideas apuntadas por Iván el 19-11-2026

### 🏢 Empresa y expansión

- [ ] **Nombre de la empresa.** A partir de 3 taxis, poder ponerle nombre a
  tu empresa.
- [ ] **Sedes en otras ciudades y países.** Abrir sedes en distintas
  ciudades y países. Ojo: DISENO.md deja «otras ciudades» fuera del alcance
  actual, así que habría que cambiarlo allí.
- [ ] **Salir a Bolsa.** A partir de 10 taxis, salir a Bolsa y poder invertir
  o arriesgar dinero en el mercado bursátil.

### 🚗 Vehículos y personalización

- [ ] **Kilometraje de cada coche.** Enseñar los kilómetros acumulados de cada
  vehículo.
- [ ] **Avería definitiva.** Una probabilidad de que el coche se rompa del
  todo según su uso y sus kilómetros, que obligue a comprar otro. Se apoya en
  la idea anterior (hace falta guardar los kilómetros de cada coche).
- [ ] **Skin del coche.** Más adelante en la partida, personalizar el aspecto
  del coche si conduces tú.

### 👨‍✈️ Conductores y contrataciones

- [ ] **Pagar por más candidatos.** Pagar para que salgan ofertas de
  conductores nuevas sin esperar al día siguiente (hoy cambian al cerrar la
  caja y tras cada contrato).

### 📈 Progresión y estadísticas

- [ ] **Nivel de cuenta.** Un nivel del jugador que refleje cómo avanza la
  partida. Ojo: si llevara reinicios con premio, se parecería al
  «prestigio», que DISENO.md deja fuera del alcance actual.

### ⭐️ Clientes y eventos

- [ ] **Valoraciones de clientes.** Opiniones aleatorias de los clientes sobre
  las carreras.
- [ ] **Anécdotas reales.** Cosas que nos han pasado de verdad, convertidas en
  situaciones o eventos del juego. Encaja con los eventos guiados de arriba
  ([propuesta-eventos.md](propuesta-eventos.md)).

### 🖥️ Interfaz y experiencia de usuario

- [x] **Avisos de conductores solo en su sitio.** Hecho el 19-11-2026: salen en Calle y Conductores. Que los mensajes de lo que
  les pasa a los conductores (subir de nivel, encontrar un objeto, bajas,
  averías…) no salgan en otras pantallas, sino solo en su apartado.
