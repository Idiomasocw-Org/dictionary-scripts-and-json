# Dictionary Scripts and JSON

Repositorio organizado para el procesamiento de listas de vocabulario (Oxford, Longman, academic) y generación de metadatos JSON para videos.

## Estructura del Repositorio

El repositorio sigue una arquitectura de flujo de datos clara:

- **`/raw_vocabulary_data`**: Archivos fuente originales en formato `.txt` o `.pdf`. Estos archivos no se procesan directamente, son la base de datos cruda.
- **`/scripts`**: Scripts de procesamiento (Node.js) para limpiar, expandir y consolidar el vocabulario.
- **`/transformed_vocabulary_data`**: Resultados finales en formato `.csv` listos para ser usados o subidos a AWS. Incluye el archivo consolidado `master-vocab.csv`.
- **`/json`**: Contratos JSON y metadata específica para videos (series y películas).
- **`/backups_or_duplicates`**: Almacén temporal de versiones anteriores o archivos identificados como duplicados.

## Flujo de Trabajo

Para añadir o actualizar vocabulario:

1. Colocar el archivo de texto en `/raw_vocabulary_data`.
2. Ejecutar los scripts de procesamiento:
   ```bash
   node scripts/process-copia.js      # Extrae y genera CSVs individuales
   node scripts/global-clean-csv.js   # Limpieza básica de etiquetas
   node scripts/deep-clean-csv.js     # Limpieza profunda de ruido y metadatos
   ```
3. El archivo `master-vocab.csv` se actualizará automáticamente con los nuevos lemas únicos.

## Notas Técnicas

- Se ha corregido un bug crítico que truncaba palabras terminadas en "n" o "v" (como *accommodation* -> *accommodatio*) al confundirlas con etiquetas gramaticales.
- El sistema utiliza rutas relativas (`__dirname`), por lo que los scripts pueden ejecutarse en cualquier entorno sin necesidad de modificar rutas locales.
