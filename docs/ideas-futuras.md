# Ideas para futuras actualizaciones

Tareas pendientes apuntadas por Iván (18 y 19-11-2026), numeradas y por
secciones. **Nada de esto está hecho ni se desarrolla todavía:** antes de
empezar cualquiera hay que verla con Iván y, si cambia el alcance, actualizar
DISENO.md («Alcance de la versión actual»). Al terminar una, pasa abajo a
«Hechas».

## Pendientes

### 🏢 Empresa y expansión

1. [ ] **Nombre de la empresa.** A partir de 3 taxis, poder ponerle nombre a
   tu empresa.
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
5. [ ] **Alquilar coche.** Poder alquilar uno cuando tienes una licencia sin
   coche, como alternativa a comprarlo.
6. [ ] **Kilometraje de cada coche.** Enseñar los kilómetros acumulados de
   cada vehículo.
7. [ ] **Avería definitiva.** Una probabilidad de que el coche se rompa del
   todo según su uso y sus kilómetros, que obligue a comprar otro. Se apoya en
   la 6 (hace falta guardar los kilómetros de cada coche).
8. [ ] **Skin del coche.** Más adelante en la partida, personalizar el aspecto
   del coche si conduces tú.

### 👨‍✈️ Conductores y contrataciones

9. [ ] **Más variedad de conductores.** Más nombres de personajes y más
   retratos (`js/retratos.js`).
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

### ⭐️ Clientes y eventos

13. [ ] **Eventos guiados.** Darle contexto al juego y una pequeña historia.
    Hay un análisis previo en [propuesta-eventos.md](propuesta-eventos.md),
    con seis preguntas por decidir al final.
14. [ ] **Valoraciones de clientes.** Opiniones aleatorias de los clientes
    sobre las carreras.
15. [ ] **Anécdotas reales.** Cosas que nos han pasado de verdad, convertidas
    en situaciones o eventos del juego. Encaja con la 13.

### 🖥️ Interfaz y experiencia de usuario

Ninguna pendiente.

## Hechas

- [x] **Avisos de conductores solo en su sitio** (🖥️, 19-11-2026). Los
  mensajes de lo que les pasa a los conductores (subir de nivel, encontrar un
  objeto, bajas, averías…) salen solo en Calle y Conductores.
