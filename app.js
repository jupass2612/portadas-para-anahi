// Mosaico de portadas armado con fotos
(() => {
  const TAM = 1080;          // resolucion del lienzo
  const TILE = 96;           // tamaño de cada foto ya recortada
  const DUR_TILE = 0.7;      // segundos que tarda cada cuadrito en aparecer
  const DUR_REVELAR = 1.6;

  const $ = (id) => document.getElementById(id);
  const lienzo = $('lienzo');
  const ctx = lienzo.getContext('2d');

  const fotos = [];      // { tile, firma, url }
  const portadas = [];   // { img, url, el }
  let portadaActiva = null;
  let celdas = null;     // resultado del acomodo
  let anim = null;
  let terminado = false;

  // ---------- carga de imagenes ----------

  function cargarImg(url) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => ok(img);
      img.onerror = () => mal(new Error('No se pudo cargar ' + url));
      img.src = url;
    });
  }

  // recorta al centro en cuadrado
  function dibujarCuadrado(c, img, lado) {
    const w = img.naturalWidth, h = img.naturalHeight;
    const m = Math.min(w, h);
    c.drawImage(img, (w - m) / 2, (h - m) / 2, m, m, 0, 0, lado, lado);
  }

  // firma de color 3x3 para comparar con la portada
  function firmaDe(canvas) {
    const t = document.createElement('canvas');
    t.width = t.height = 24;
    const c = t.getContext('2d', { willReadFrequently: true });
    c.drawImage(canvas, 0, 0, 24, 24);
    const d = c.getImageData(0, 0, 24, 24).data;
    const f = new Float32Array(27);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        const b = (Math.floor(y / 8) * 3 + Math.floor(x / 8)) * 3;
        const i = (y * 24 + x) * 4;
        f[b] += d[i]; f[b + 1] += d[i + 1]; f[b + 2] += d[i + 2];
      }
    }
    for (let i = 0; i < 27; i++) f[i] /= 64;
    return f;
  }

  async function agregarFoto(url) {
    try {
      const img = await cargarImg(url);
      const tile = document.createElement('canvas');
      tile.width = tile.height = TILE;
      dibujarCuadrado(tile.getContext('2d'), img, TILE);
      fotos.push({ tile, firma: firmaDe(tile), url });
    } catch (e) {
      console.warn(e.message);
    }
  }

  async function agregarPortada(url, nombre) {
    try {
      const img = await cargarImg(url);
      const el = document.createElement('img');
      el.src = url;
      el.title = nombre || '';
      const p = { img, url, el };
      el.onclick = () => elegirPortada(p);
      $('portadas').appendChild(el);
      portadas.push(p);
    } catch (e) {
      console.warn(e.message);
    }
  }

  function elegirPortada(p) {
    portadaActiva = p;
    portadas.forEach((x) => x.el.classList.toggle('activa', x === p));
    revisarListo();
    if (fotos.length) armar();
  }

  function revisarListo() {
    const listo = fotos.length > 0 && portadaActiva;
    $('btnArmar').disabled = !listo;
    $('vacio').hidden = !!listo;
    if (!fotos.length) estado('Todavía no hay fotos en la carpeta fotos/');
    else if (!portadas.length) estado('Todavía no hay portadas en la carpeta portadas/');
    else if (!portadaActiva) estado('Toca una portada para armarla');
  }

  function estado(txt) { $('estado').textContent = txt; }

  // si no hay manifest, lista las carpetas con la API de GitHub
  async function manifestDesdeGitHub() {
    const usuario = location.hostname.split('.')[0];
    const repo = location.pathname.split('/').filter(Boolean)[0];
    const ext = /\.(jpe?g|png|webp|gif)$/i;
    const listar = async (carpeta) => {
      const r = await fetch(`https://api.github.com/repos/${usuario}/${repo}/contents/${carpeta}`);
      if (!r.ok) return [];
      return (await r.json()).filter((f) => ext.test(f.name)).map((f) => `${carpeta}/${f.name}`);
    };
    let config = {};
    try { config = await (await fetch('config.json', { cache: 'no-store' })).json(); } catch {}
    return { ...config, fotos: await listar('fotos'), portadas: await listar('portadas') };
  }

  // lee manifest.json que genera el workflow de GitHub
  async function cargarManifest() {
    try {
      const r = await fetch('manifest.json', { cache: 'no-store' });
      const m = r.ok ? await r.json() : await manifestDesdeGitHub();
      if (m.titulo) { $('titulo').textContent = m.titulo; document.title = m.titulo; }
      if (m.subtitulo) $('subtitulo').textContent = m.subtitulo;
      estado('Cargando fotos...');
      await Promise.all((m.fotos || []).map((f) => agregarFoto(encodeURI(f))));
      for (const p of m.portadas || []) await agregarPortada(encodeURI(p), p.split('/').pop());
    } catch (e) {
      console.warn('No se encontro manifest.json', e);
    }
  }

  // ---------- acomodo del mosaico ----------

  function calcularCeldas() {
    const n = +$('cuadros').value;
    const lado = n * 3;
    const t = document.createElement('canvas');
    t.width = t.height = lado;
    const c = t.getContext('2d', { willReadFrequently: true });
    dibujarCuadrado(c, portadaActiva.img, lado);
    const d = c.getImageData(0, 0, lado, lado).data;

    const total = n * n;
    const res = new Array(total);
    const usos = new Int32Array(fotos.length);
    const castigo = fotos.length > 1 ? 9 * 3 * 500 / Math.max(1, total / fotos.length) : 0;

    // orden aleatorio para repartir las fotos parejo
    const orden = [...Array(total).keys()].sort(() => Math.random() - 0.5);
    const firma = new Float32Array(27);

    for (const idx of orden) {
      const r = Math.floor(idx / n), col = idx % n;
      let pr = 0, pg = 0, pb = 0;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const i = ((r * 3 + sy) * lado + (col * 3 + sx)) * 4;
          const b = (sy * 3 + sx) * 3;
          firma[b] = d[i]; firma[b + 1] = d[i + 1]; firma[b + 2] = d[i + 2];
          pr += d[i]; pg += d[i + 1]; pb += d[i + 2];
        }
      }

      // vecinos ya asignados para no repetir pegadito
      const vecinos = new Set();
      for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const rr = r + dy, cc = col + dx;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n && res[rr * n + cc]) vecinos.add(res[rr * n + cc].foto);
      }

      let mejor = 0, costoMejor = Infinity;
      for (let p = 0; p < fotos.length; p++) {
        if (fotos.length > 4 && vecinos.has(p)) continue;
        const f = fotos[p].firma;
        let dist = 0;
        for (let k = 0; k < 27; k++) { const q = f[k] - firma[k]; dist += q * q; }
        const costo = dist + usos[p] * castigo;
        if (costo < costoMejor) { costoMejor = costo; mejor = p; }
      }
      usos[mejor]++;
      res[idx] = { foto: mejor, r, c: col, color: [pr / 9 | 0, pg / 9 | 0, pb / 9 | 0], t0: 0 };
    }

    // tiempos de aparicion segun el orden elegido
    const modo = $('orden').value;
    const dur = +$('duracion').value;
    const centro = (n - 1) / 2;
    const maxD = Math.hypot(centro, centro) || 1;
    for (const cel of res) {
      let k;
      const ruido = Math.random();
      if (modo === 'aleatorio') k = ruido;
      else if (modo === 'diagonal') k = (cel.r + cel.c) / (2 * n - 2 || 1) * 0.85 + ruido * 0.15;
      else if (modo === 'lluvia') k = cel.r / n * 0.8 + ruido * 0.2;
      else k = Math.hypot(cel.r - centro, cel.c - centro) / maxD * 0.8 + ruido * 0.2;
      cel.t0 = Math.min(1, k) * Math.max(0.1, dur - DUR_TILE);
    }
    return { n, lista: res, dur };
  }

  // ---------- dibujo ----------

  const salirAtras = (x) => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const suave = (x) => x * x * (3 - 2 * x);

  function dibujar(t) {
    const { n, lista, dur } = celdas;
    const tinte = +$('tinte').value / 100;
    const revelar = +$('revelar').value / 100;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, TAM, TAM);

    // camara: empieza de cerca y se aleja
    const pc = Math.min(1, t / dur);
    const zoom = 1 + 2.2 * Math.pow(1 - suave(pc), 2);
    ctx.setTransform(zoom, 0, 0, zoom, TAM / 2 * (1 - zoom), TAM / 2 * (1 - zoom));

    for (const cel of lista) {
      const p = (t - cel.t0) / DUR_TILE;
      if (p <= 0) continue;
      const x0 = Math.round(cel.c * TAM / n), x1 = Math.round((cel.c + 1) * TAM / n);
      const y0 = Math.round(cel.r * TAM / n), y1 = Math.round((cel.r + 1) * TAM / n);
      const w = x1 - x0, h = y1 - y0;
      const [cr, cg, cb] = cel.color;

      if (p >= 1) {
        ctx.drawImage(fotos[cel.foto].tile, x0, y0, w, h);
        if (tinte > 0) { ctx.fillStyle = `rgba(${cr},${cg},${cb},${tinte})`; ctx.fillRect(x0, y0, w, h); }
        continue;
      }

      // cuadrito entrando con rebote
      const k = Math.max(0.01, salirAtras(p));
      const cx = x0 + w / 2, cy = y0 + h / 2;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p * 2);
      ctx.translate(cx, cy);
      ctx.scale(k, k);
      ctx.rotate((1 - p) * 0.6);
      ctx.drawImage(fotos[cel.foto].tile, -w / 2, -h / 2, w, h);
      if (tinte > 0) { ctx.fillStyle = `rgba(${cr},${cg},${cb},${tinte * p})`; ctx.fillRect(-w / 2, -h / 2, w, h); }
      ctx.restore();
    }

    // al final se asoma la portada original
    const pr = (t - dur) / DUR_REVELAR;
    if (pr > 0 && revelar > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = revelar * suave(Math.min(1, pr));
      ctx.globalCompositeOperation = 'soft-light';
      dibujarCuadrado(ctx, portadaActiva.img, TAM);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = revelar * 0.5 * suave(Math.min(1, pr));
      dibujarCuadrado(ctx, portadaActiva.img, TAM);
      ctx.globalAlpha = 1;
    }
    return t < dur + DUR_REVELAR;
  }

  function armar() {
    if (!fotos.length || !portadaActiva) return;
    cancelAnimationFrame(anim);
    terminado = false;
    $('btnDescargar').disabled = true;
    celdas = calcularCeldas();
    estado(`Armando ${celdas.n * celdas.n} pixeles con ${fotos.length} fotos...`);
    const inicio = performance.now();
    const paso = (ahora) => {
      const sigue = dibujar((ahora - inicio) / 1000);
      if (sigue) anim = requestAnimationFrame(paso);
      else {
        terminado = true;
        $('btnDescargar').disabled = false;
        estado('Listo ❤ toca un pixel para ver la foto');
      }
    };
    anim = requestAnimationFrame(paso);
  }

  // redibuja el final sin animar cuando mueven tinte o revelar
  function redibujarFinal() {
    if (terminado && celdas) dibujar(celdas.dur + DUR_REVELAR + DUR_TILE);
  }

  // ---------- eventos ----------

  $('btnArmar').onclick = armar;

  $('btnDescargar').onclick = () => {
    lienzo.toBlob((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'portada-mosaico.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  };

  const etiquetas = { cuadros: (v) => v, tinte: (v) => v + '%', revelar: (v) => v + '%', duracion: (v) => v + ' s' };
  for (const id of Object.keys(etiquetas)) {
    const v = 'v' + id[0].toUpperCase() + id.slice(1);
    $(id).oninput = () => {
      $(v).textContent = etiquetas[id]($(id).value);
      if (id === 'tinte' || id === 'revelar') redibujarFinal();
    };
  }

  // click en un pixel abre la foto original
  lienzo.onclick = (e) => {
    if (!terminado || !celdas) return;
    const r = lienzo.getBoundingClientRect();
    const c = Math.floor((e.clientX - r.left) / r.width * celdas.n);
    const f = Math.floor((e.clientY - r.top) / r.height * celdas.n);
    const cel = celdas.lista[f * celdas.n + c];
    if (!cel) return;
    $('visorImg').src = fotos[cel.foto].url;
    $('visor').hidden = false;
  };
  $('visor').onclick = () => { $('visor').hidden = true; };

  cargarManifest().then(revisarListo);
})();
