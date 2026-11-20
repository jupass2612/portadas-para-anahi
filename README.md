# Portadas para Anahí

Mosaico pixel art: arma portadas de álbum usando fotos como pixeles, con animación.

## Cómo usarlo

1. Pon las fotos en `fotos/` (jpg, png o webp; entre más fotos y más variedad de colores, mejor queda — 50+ ideal).
2. Pon las portadas en `portadas/` (cuadradas de preferencia).
3. Cambia el título en `config.json` si quieres.
4. Haz push a `main`.

## Activar GitHub Pages (solo la primera vez)

En el repo: **Settings → Pages → Source: GitHub Actions**.
Cada push corre el workflow, genera `manifest.json` y publica en
`https://<usuario>.github.io/<repo>/`.

## Notas

- Las fotos de iPhone en HEIC no abren en el navegador; pásalas a JPG antes de subirlas.
- Si el repo es público, las fotos en `fotos/` quedan públicas. También se pueden subir desde la página con los botones (no se guardan en ningún lado).
- Para probar en local: `python3 generar_manifest.py && python3 -m http.server`.
