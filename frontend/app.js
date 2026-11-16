'use strict';
// URL por defecto: API publicada en Render. Se puede cambiar en la interfaz.
const DEFAULT_API = 'https://pib-insight.onrender.com';
const fallbackLabels = ['Importaciones totales','Consumo total','Consumo de hogares','Consumo final del Gobierno','Formación bruta de capital','Formación bruta de capital fijo','Demanda final interna','Exportaciones totales'];
// Copia local de la base (2001–2011) para mostrar los años antes de conectar; al conectar se usa /config.
const FALLBACK_HISTORY = {"2001":{"pib":8.3057,"entradas":[19.69771,9.75928,9.96325,8.91929,16.57009,18.04236,10.76538,4.71255]},"2002":{"pib":8.6216,"entradas":[6.58631,7.38114,7.87743,5.31767,16.88254,17.97297,8.85824,4.58679]},"2003":{"pib":11.0149,"entradas":[21.85425,9.18887,9.46755,8.00199,20.2188,20.20424,11.02999,24.20074]},"2004":{"pib":13.0045,"entradas":[8.19769,10.5987,9.94163,13.43507,17.59665,17.50978,11.86348,14.33698]},"2005":{"pib":10.5257,"entradas":[8.74064,8.9687,8.57341,10.62247,14.96022,15.42005,10.10708,11.04739]},"2006":{"pib":12.8594,"entradas":[23.38644,11.17779,11.2845,10.73961,25.03816,23.99169,13.92731,18.13455]},"2007":{"pib":12.2882,"entradas":[8.2104,11.90951,11.9232,11.85302,15.41538,16.73318,12.6728,5.29612]},"2008":{"pib":11.5909,"entradas":[14.02616,9.65112,9.44792,10.49017,13.5962,14.42234,10.53095,21.1218]},"2009":{"pib":5.7158,"entradas":[-5.20776,6.61865,5.72492,10.2741,2.23574,4.52043,5.61407,-6.01007]},"2010":{"pib":7.8148,"entradas":[6.59784,7.35372,7.17747,8.04484,9.62439,5.94936,7.85752,6.15906]},"2011":{"pib":11.2041,"entradas":[26.92707,8.70852,9.45146,5.80843,20.07746,14.82463,11.20139,28.41322]}};

const $ = id => document.getElementById(id);
let settings = null;          // respuesta de /config
let selectedYear = null;      // año histórico cargado en el formulario (null = valores manuales)
let allPredictions = null;    // {anio: predicho} tras "Predecir todos los años"
const api = $('apiUrl');
api.value = localStorage.getItem('pib_api_url') || DEFAULT_API;

function history() {
  if (settings?.historico?.length) return settings.historico;
  return Object.entries(FALLBACK_HISTORY).map(([anio, d]) => ({anio: Number(anio), pib: d.pib, entradas: d.entradas}));
}
function apiBase() { return api.value.trim().replace(/\/+$/, ''); }
function status(label, type = '') { $('status').className = 'status ' + type; $('status').textContent = '● ' + label; }

function buildFields() {
  const container = $('fields'); container.replaceChildren();
  const first = history()[0];
  for (let i = 0; i < 8; i++) {
    const c = settings?.campos?.[i], field = document.createElement('div'); field.className = 'field';
    const label = document.createElement('label'); label.htmlFor = 'x' + (i + 1);
    label.innerHTML = '<span>X' + (i + 1) + '</span> ' + (c?.nombre || fallbackLabels[i]);
    const input = document.createElement('input'); input.type = 'number'; input.step = 'any'; input.required = true; input.id = 'x' + (i + 1);
    input.value = Number(first.entradas[i]).toFixed(3); input.setAttribute('aria-label', c?.nombre || fallbackLabels[i]);
    // Si el usuario edita un valor, ya no es un año histórico exacto.
    input.addEventListener('input', () => markYear(null));
    const hint = document.createElement('small'); hint.textContent = c ? `Rango histórico: ${c.min} a ${c.max}%` : 'Introducir variación anual (%)';
    field.append(label, input, hint); container.append(field);
  }
  markYear(String(first.anio));
}

function buildPresets() {
  const wrap = $('presets'); wrap.replaceChildren();
  for (const h of history()) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'preset'; b.dataset.year = String(h.anio); b.textContent = h.anio;
    b.addEventListener('click', () => preset(String(h.anio)));
    wrap.append(b);
  }
  markYear(selectedYear);
}

function markYear(year) {
  selectedYear = year;
  document.querySelectorAll('.preset').forEach(b => b.classList.toggle('active', b.dataset.year === year));
  drawChart();
}

function preset(year) {
  const row = history().find(x => String(x.anio) === year); if (!row) return;
  row.entradas.forEach((v, i) => $('x' + (i + 1)).value = Number(v).toFixed(3));
  markYear(year);
  $('resultValue').textContent = '—';
  $('resultNote').textContent = `Indicadores de ${year} cargados. Pulsa Generar predicción.`;
  $('warnings').hidden = true;
}

function drawChart() {
  const list = history(); if (!list?.length) return;
  const svg = $('historyPlot'); svg.replaceChildren(); const ns = 'http://www.w3.org/2000/svg';
  const w = 360, h = 160, m = {l: 28, r: 10, t: 11, b: 25};
  const ys = list.map(x => Number(x.pib));
  const preds = allPredictions ? list.map(x => allPredictions[x.anio]) : [];
  const values = ys.concat(preds.filter(v => Number.isFinite(v)));
  const min = Math.floor(Math.min(...values) - 1), max = Math.ceil(Math.max(...values) + 1);
  const sx = i => m.l + i * (w - m.l - m.r) / (ys.length - 1), sy = v => h - m.b - (v - min) * (h - m.t - m.b) / (max - min);
  function el(name, attrs, text) { const n = document.createElementNS(ns, name); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text !== undefined) n.textContent = text; svg.append(n); return n; }
  [0, .5, 1].forEach(t => { const v = min + (max - min) * t, y = sy(v); el('line', {x1: m.l, x2: w - m.r, y1: y, y2: y, stroke: '#e7edf5'}); el('text', {x: 0, y: y + 4, fill: '#93a0b1', 'font-size': '10'}, v.toFixed(0) + '%'); });
  const path = ys.map((v, i) => (i ? 'L' : 'M') + sx(i) + ',' + sy(v)).join(' ');
  el('path', {d: path + ` L${sx(ys.length - 1)},${h - m.b} L${sx(0)},${h - m.b} Z`, fill: '#e8f0ff'});
  el('path', {d: path, fill: 'none', stroke: '#315ff4', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'});
  if (allPredictions) {
    const pp = preds.map((v, i) => (i ? 'L' : 'M') + sx(i) + ',' + sy(v)).join(' ');
    el('path', {d: pp, fill: 'none', stroke: '#2ab8c9', 'stroke-width': '2', 'stroke-dasharray': '5 4'});
    preds.forEach((v, i) => el('rect', {x: sx(i) - 3, y: sy(v) - 3, width: 6, height: 6, fill: '#2ab8c9'}));
  }
  ys.forEach((v, i) => {
    const sel = String(list[i].anio) === selectedYear;
    el('circle', {cx: sx(i), cy: sy(v), r: sel ? 5.5 : 3.3, fill: sel ? '#305df4' : '#fff', stroke: '#305df4', 'stroke-width': '2'});
    if (i % 2 === 0 || sel) el('text', {x: sx(i), y: h - 5, 'text-anchor': 'middle', fill: sel ? '#305df4' : '#8793a5', 'font-size': '10', 'font-weight': sel ? '700' : '400'}, String(list[i].anio));
  });
  $('predLegend').hidden = !allPredictions;
}

async function connect() {
  const url = apiBase(); if (!/^https?:\/\//i.test(url)) { status('URL inválida'); return; }
  localStorage.setItem('pib_api_url', url); status('Conectando…', 'wait'); $('connectBtn').disabled = true;
  try {
    const response = await fetch(url + '/health'); if (!response.ok) throw Error('HTTP ' + response.status);
    const r = await fetch(url + '/config'); if (!r.ok) throw Error('No se pudo cargar /config');
    settings = await r.json(); allPredictions = null; $('allTable').hidden = true;
    buildFields(); buildPresets(); status('API conectada', 'ok');
    $('resultNote').textContent = 'Servicio en línea. Elige un año o ajusta los indicadores y pulsa Generar predicción.';
  } catch (err) {
    status('Sin conexión');
    $('resultNote').textContent = 'No se pudo conectar a ' + url + '. Si usas Render Free, puede tardar cerca de un minuto en activarse. Detalle: ' + err.message;
  } finally { $('connectBtn').disabled = false; }
}

async function callPredict(values) {
  const r = await fetch(apiBase() + '/predict', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({entradas: values})});
  if (!r.ok) throw Error('Error HTTP ' + r.status + ' — verifica que el backend esté activo');
  return r.json();
}

async function predict(event) {
  event.preventDefault();
  const values = Array.from({length: 8}, (_, i) => Number($('x' + (i + 1)).value));
  if (values.some(x => !Number.isFinite(x))) { $('resultNote').textContent = 'Introduce ocho valores numéricos válidos.'; return; }
  $('predictBtn').disabled = true; $('predictBtn').innerHTML = 'Consultando el modelo…';
  $('resultNote').textContent = 'Consultando la red neuronal alojada en la nube…'; $('warnings').hidden = true;
  try {
    const ans = await callPredict(values);
    const pred = Number(ans.pib_estimado_pct);
    $('resultValue').textContent = pred.toFixed(2);
    const row = selectedYear && history().find(x => String(x.anio) === selectedYear);
    if (row) {
      const err = pred - Number(row.pib);
      $('resultNote').textContent = `Año ${row.anio} · PIB real: ${Number(row.pib).toFixed(2)} % · Predicho: ${pred.toFixed(2)} % · Diferencia: ${err >= 0 ? '+' : ''}${err.toFixed(2)} puntos.`;
    } else {
      $('resultNote').textContent = ans.nota || 'Estimación académica generada por la red neuronal.';
    }
    if (ans.advertencias?.length) { $('warnings').hidden = false; $('warnings').textContent = '⚠ ' + ans.advertencias.join(' '); }
  } catch (err) { $('resultValue').textContent = '—'; $('resultNote').textContent = 'No se pudo calcular: ' + err.message; }
  finally { $('predictBtn').disabled = false; $('predictBtn').innerHTML = 'Generar predicción <span>→</span>'; }
}

async function predictAll() {
  const btn = $('allBtn'); btn.disabled = true; btn.textContent = 'Prediciendo 11 años…';
  try {
    const list = history();
    const answers = await Promise.all(list.map(h => callPredict(h.entradas.map(Number))));
    allPredictions = {};
    const body = $('allRows'); body.replaceChildren();
    let sumAbs = 0;
    list.forEach((h, i) => {
      const pred = Number(answers[i].pib_estimado_pct), real = Number(h.pib), err = pred - real;
      allPredictions[h.anio] = pred; sumAbs += Math.abs(err);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${h.anio}</td><td>${real.toFixed(2)}</td><td>${pred.toFixed(2)}</td><td>${err >= 0 ? '+' : ''}${err.toFixed(2)}</td>`;
      tr.addEventListener('click', () => preset(String(h.anio)));
      body.append(tr);
    });
    $('allMae').textContent = (sumAbs / list.length).toFixed(2);
    $('allTable').hidden = false; drawChart();
  } catch (err) {
    $('resultNote').textContent = 'No se pudieron predecir todos los años: ' + err.message;
  } finally { btn.disabled = false; btn.textContent = 'Predecir todos los años'; }
}

$('connectBtn').addEventListener('click', connect);
$('predictForm').addEventListener('submit', predict);
$('allBtn').addEventListener('click', predictAll);
buildFields(); buildPresets(); connect();
