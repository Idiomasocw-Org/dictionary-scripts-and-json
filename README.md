# OCW Video Tools — Metadata & Upload

Breve conjunto de utilidades para mantener el "contrato JSON" y subir archivos a S3.

Instalación:

```bash
cd dictionary-scripts-and-json
npm install
```

Crear metadata (ejemplo):

```bash
node scripts/create_metadata.js \
  --title "Cosmos Ep1" --year 2014 --genre "Documentary" \
  --description "About the universe" --s3_path "s3://ocw-academy-raw-videos/en/cosmos/season1/ep1.mp4" \
  --duration 180 --captions false --out examples/sample-video-metadata.json
```

Subir archivo a S3 (usa credenciales configuradas):

```bash
node scripts/upload_s3.js --file ./ep1.mp4 --bucket ocw-academy-raw-videos --key en/cosmos/season1/ep1.mp4
```

FFmpeg recorte rápido (ejemplo):

```bash
ffmpeg -ss 01:15:30 -to 01:25:00 -i raw_movie.mp4 -c copy clipped_video.mp4
ffmpeg -i clipped_video.mp4 -vn -c:a libmp3lame -q:a 2 audio.mp3
```

Contrato JSON (esquema): `schema/video-contract.json`

Siguientes pasos recomendados:
- Validar JSON con el esquema (puedes usar `ajv` si quieres).
- Añadir flags para `start_time` y `end_time` en `create_metadata.js` si quieres registrar recortes.
- Añadir soporte de `--profile` para `upload_s3.js` si necesitas perfiles de AWS.
