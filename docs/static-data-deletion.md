# Borrado de datos estáticos

Los botones de borrado han sido eliminados intencionalmente de la UI para todos los datos estáticos
(items, blueprints, decompositions, factories, refineries, asteroid types, locations).

## Por qué no hay borrado desde la UI

Los datos estáticos están interrelacionados con datos de usuario (stocks, packs). Borrar un item,
por ejemplo, puede destruir silenciosamente el inventario de todos los usuarios que lo tengan.
El seed tampoco borra — solo actualiza mediante upsert — así que un item eliminado de `seed.json`
simplemente se queda huérfano en la BD sin que nadie lo detecte.

## Cómo abordar el borrado en el futuro

Antes de implementar cualquier borrado de datos estáticos, hay que diseñar un plan que contemple:

### Opción A — Borrado directo con comprobación de dependencias
El sistema verifica si el registro tiene datos de usuario asociados. Si los tiene, bloquea el borrado
y muestra exactamente qué usuarios se verían afectados. Si no tiene dependencias, permite el borrado.

**Implementación**: añadir comprobación en la API antes del `delete`, retornando 409 con detalle
de las dependencias si las hay.

### Opción B — Soft delete con flag `isRetired`
En lugar de borrar, se marca el registro como retirado (`isRetired: true`). El item desaparece de
la UI para nuevas operaciones pero los datos históricos de usuario siguen siendo válidos.

**Implementación**: añadir campo `isRetired` al schema, filtrar en todas las queries de la app,
migración correspondiente. Los stocks y packs existentes siguen funcionando; solo se impide añadir
nuevas referencias al item retirado.

### Opción C — Migración de datos de usuario antes de borrar
Si el item debe desaparecer completamente, primero se migran o eliminan explícitamente los datos de
usuario que lo referencian, con confirmación del administrador.

**Implementación**: script de migración específico por caso, con backup previo y reversión posible.

## Recomendación

Para la mayoría de casos, la **Opción B** (soft delete) es la más segura y proporciona mejor
experiencia: los datos históricos permanecen coherentes y el borrado es reversible.

La **Opción A** es adecuada cuando se tiene certeza de que el dato no tiene uso activo y se quiere
mantener el schema limpio.

La **Opción C** solo tiene sentido para limpiezas masivas planificadas con antelación.
