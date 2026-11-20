# Genera manifest.json con las fotos y portadas del repo
import json
import os

EXT = ('.jpg', '.jpeg', '.png', '.webp', '.gif')

def listar(carpeta):
    if not os.path.isdir(carpeta):
        return []
    return sorted(
        f'{carpeta}/{f}' for f in os.listdir(carpeta)
        if f.lower().endswith(EXT)
    )

config = {}
if os.path.exists('config.json'):
    with open('config.json', encoding='utf-8') as f:
        config = json.load(f)

manifest = {
    'titulo': config.get('titulo', ''),
    'subtitulo': config.get('subtitulo', ''),
    'ajustes': config.get('ajustes', {}),
    'fotos': listar('fotos'),
    'portadas': listar('portadas'),
}

with open('manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print(f"{len(manifest['fotos'])} fotos, {len(manifest['portadas'])} portadas")
