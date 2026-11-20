# Genera manifest.json con las fotos y portadas del repo
import json
import os

EXT = ('.jpg', '.jpeg', '.png', '.webp', '.gif')

def listar(carpeta, ext=EXT):
    if not os.path.isdir(carpeta):
        return []
    return sorted(
        f'{carpeta}/{f}' for f in os.listdir(carpeta)
        if f.lower().endswith(ext)
    )

config = {}
if os.path.exists('config.json'):
    with open('config.json', encoding='utf-8') as f:
        config = json.load(f)

manifest = {
    'titulo': config.get('titulo', ''),
    'subtitulo': config.get('subtitulo', ''),
    'ajustes': config.get('ajustes', {}),
    # si no viene en config, toma el primer audio de musica/
    'musica': config.get('musica') or next(iter(listar('musica', ('.mp3', '.m4a', '.ogg', '.wav'))), ''),
    'fotos': listar('fotos'),
    'portadas': listar('portadas'),
}

with open('manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print(f"{len(manifest['fotos'])} fotos, {len(manifest['portadas'])} portadas")
