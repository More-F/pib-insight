'use strict';
const fallbackLabels=['Importaciones totales','Consumo total','Consumo de hogares','Consumo final del Gobierno','Formación bruta de capital','Formación bruta de capital fijo','Demanda final interna','Exportaciones totales'];
const sampleValues={
  '2007':[8.210396,11.909511,11.923203,11.853023,15.415375,16.733176,12.672802,5.29612],
  '2009':[-5.207761,6.618651,5.724916,10.274099,2.235735,4.520426,5.614066,-6.010068],
  '2011':[26.927068,8.708518,9.451463,5.808435,20.077461,14.824632,11.201393,28.413217]
};
const $=id=>document.getElementById(id);
let settings=null;
const api=$('apiUrl');
api.value=localStorage.getItem('pib_api_url')||'http://127.0.0.1:8000';
function status(label,type=''){$('status').className='status '+type;$('status').textContent='● '+label;}
function buildFields(){
  const container=$('fields');container.replaceChildren();
  for(let i=0;i<8;i++){
    const c=settings?.campos?.[i],field=document.createElement('div');field.className='field';
    const label=document.createElement('label');label.htmlFor='x'+(i+1);
    label.innerHTML='<span>X'+(i+1)+'</span> '+(c?.nombre||fallbackLabels[i]);
    const input=document.createElement('input');input.type='number';input.step='any';input.required=true;input.id='x'+(i+1);
    input.value=sampleValues['2007'][i].toFixed(3);input.setAttribute('aria-label',c?.nombre||fallbackLabels[i]);
    const hint=document.createElement('small');hint.textContent=c?`Rango histórico: ${c.min} a ${c.max}%`:'Introducir variación anual (%)';
    field.append(label,input,hint);container.append(field);
  }
}
function preset(year){const example=settings?.historico?.find(x=>String(x.anio)===year)?.entradas||sampleValues[year];if(!example)return;example.forEach((v,i)=>$('x'+(i+1)).value=Number(v).toFixed(3));document.querySelectorAll('.preset').forEach(b=>b.style.borderColor=b.dataset.year===year?'#305df4':'#d5ddeb');}
function drawChart(list){
  if(!list?.length)return;
  const svg=$('historyPlot');svg.replaceChildren();const ns='http://www.w3.org/2000/svg';
  const w=360,h=160,m={l:28,r:10,t:11,b:25};const ys=list.map(x=>Number(x.pib));
  const min=Math.floor(Math.min(...ys)-1),max=Math.ceil(Math.max(...ys)+1);
  const sx=i=>m.l+i*(w-m.l-m.r)/(ys.length-1),sy=v=>h-m.b-(v-min)*(h-m.t-m.b)/(max-min);
  function el(name,attrs,text){const n=document.createElementNS(ns,name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;svg.append(n);return n;}
  [0,.5,1].forEach(t=>{const v=min+(max-min)*t,y=sy(v);el('line',{x1:m.l,x2:w-m.r,y1:y,y2:y,stroke:'#e7edf5'});el('text',{x:0,y:y+4,fill:'#93a0b1','font-size':'10'},v.toFixed(0)+'%');});
  const path=ys.map((v,i)=>(i?'L':'M')+sx(i)+','+sy(v)).join(' ');
  const under=path+` L${sx(ys.length-1)},${h-m.b} L${sx(0)},${h-m.b} Z`;
  el('path',{d:under,fill:'#e8f0ff'});el('path',{d:path,fill:'none',stroke:'#315ff4','stroke-width':'3','stroke-linecap':'round','stroke-linejoin':'round'});
  ys.forEach((v,i)=>{el('circle',{cx:sx(i),cy:sy(v),r:3.3,fill:'#fff',stroke:'#305df4','stroke-width':'2'});if(i===0||i===ys.length-1||i===5)el('text',{x:sx(i),y:h-5,'text-anchor':'middle',fill:'#8793a5','font-size':'10'},String(list[i].anio));});
}
async function connect(){
  const url=api.value.trim().replace(/\/+$/,'');if(!/^https?:\/\//i.test(url)){status('URL inválida');return;}
  localStorage.setItem('pib_api_url',url);status('Conectando…','wait');$('connectBtn').disabled=true;
  try{
    const response=await fetch(url+'/health');if(!response.ok)throw Error('HTTP '+response.status);
    const r=await fetch(url+'/config');if(!r.ok)throw Error('No se pudo cargar /config');
    settings=await r.json();buildFields();drawChart(settings.historico);status('API conectada','ok');$('resultNote').textContent='Servicio en línea. Ajusta los indicadores y pulsa Generar predicción.';
  }catch(err){status('Sin conexión');$('resultNote').textContent='No se pudo conectar a '+url+'. Si usas Render Free, puede tardar cerca de un minuto en activarse. Detalle: '+err.message;}
  finally{$('connectBtn').disabled=false;}
}
async function predict(event){
  event.preventDefault();const values=Array.from({length:8},(_,i)=>Number($('x'+(i+1)).value));
  if(values.some(x=>!Number.isFinite(x))){$('resultNote').textContent='Introduce ocho valores numéricos válidos.';return;}
  const url=api.value.trim().replace(/\/+$/,'');$('predictBtn').disabled=true;$('predictBtn').innerHTML='Consultando el modelo…';
  $('resultNote').textContent='Consultando la red neuronal alojada en la nube…';$('warnings').hidden=true;
  try{const r=await fetch(url+'/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entradas:values})});if(!r.ok)throw Error('Error HTTP '+r.status+' — verifica que el backend esté activo');const ans=await r.json();$('resultValue').textContent=Number(ans.pib_estimado_pct).toFixed(2);$('resultNote').textContent=ans.nota||'Estimación académica generada por la red neuronal.';if(ans.advertencias?.length){$('warnings').hidden=false;$('warnings').textContent='⚠ '+ans.advertencias.join(' ');}}
  catch(err){$('resultValue').textContent='—';$('resultNote').textContent='No se pudo calcular: '+err.message;}
  finally{$('predictBtn').disabled=false;$('predictBtn').innerHTML='Generar predicción <span>→</span>';}
}
$('connectBtn').addEventListener('click',connect);$('predictForm').addEventListener('submit',predict);document.querySelectorAll('.preset').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.year)));
buildFields();connect();
