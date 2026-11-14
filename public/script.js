(() => {
  'use strict';
  const $ = (s) => document.querySelector(s), PAGE_SIZE = 10;
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const state = { rows: [], columns: [], filtered: [], charts: {}, page: 1, sort: 'data', direction: -1, toast: 0 };
  const required = ['id_venda', 'data', 'quantidade', 'preco_unitario'];

  function keyName(value) {
    return String(value ?? '').replace(/^﻿/, '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, '_');
  }
  function validDate(value) {
    const text = String(value ?? '').trim();
    let m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/), y, mo, d;
    if (m) [, y, mo, d] = m;
    else { m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) return null; [, d, mo, y] = m; }
    const dt = new Date(Date.UTC(+y, +mo - 1, +d));
    return dt.getUTCFullYear() === +y && dt.getUTCMonth() === +mo - 1 && dt.getUTCDate() === +d ? `${y}-${mo}-${d}` : null;
  }
  function numeric(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    let text = String(value ?? '').trim().replace(/\s/g, '');
    if (!text) return null;
    if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(text)) text = text.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d+,\d+$/.test(text)) text = text.replace(',', '.');
    const n = Number(text); return Number.isFinite(n) ? n : null;
  }
  function parseRows(records, headers) {
    const headerMap = new Map(headers.map((h) => [keyName(h), h]));
    const absent = required.filter((h) => !headerMap.has(h));
    if (absent.length) throw Error(`Colunas essenciais ausentes: ${absent.join(', ')}.`);
    const columns = [...new Set(headers.map(keyName))], reasons = {};
    let rejected = 0;
    const rows = [];
    for (const input of records) {
      const raw = {};
      for (const [name, original] of headerMap) raw[name] = input[original] ?? '';
      let invalid = false;
      const reason = (label) => { reasons[label] = (reasons[label] || 0) + 1; invalid = true; };
      if (String(raw.id_venda ?? '').trim() === '') reason('ID de venda ausente');
      const date = validDate(raw.data);
      if (!String(raw.data ?? '').trim()) reason('data ausente'); else if (!date) reason('data inválida');
      const qty = numeric(raw.quantidade);
      if (!String(raw.quantidade ?? '').trim()) reason('quantidade ausente'); else if (qty === null || qty < 0) reason('quantidade inválida');
      const price = numeric(raw.preco_unitario);
      if (!String(raw.preco_unitario ?? '').trim()) reason('preço unitário ausente'); else if (price === null || price < 0) reason('preço unitário inválido');
      if (invalid) { rejected++; continue; }
      const row = { ...raw, id_venda: String(raw.id_venda).trim(), data: date, quantidade: qty, preco_unitario: price };
      row._faturamento = qty * price; rows.push(row);
    }
    return { rows, columns, rejected, reasons };
  }
  function resetFilters() {
    $('#date-start').value = ''; $('#date-end').value = ''; $('#category').value = ''; $('#region').value = ''; $('#search').value = '';
    state.page = 1; state.sort = 'data'; state.direction = -1;
  }
  function loadDataset(records, headers, label, parseErrors = 0) {
    const parsed = parseRows(records, headers);
    if (!parsed.rows.length) throw Error('Nenhum registro válido foi encontrado. Confira os campos obrigatórios e seus valores.');
    state.rows = parsed.rows; state.columns = parsed.columns; state.source = label;
    state.rejected = parsed.rejected + parseErrors; state.reasons = { ...parsed.reasons };
    if (parseErrors) state.reasons['erro de leitura do CSV'] = parseErrors;
    resetFilters(); fillFilters(); showSource(); showQuality(); render();
  }
  function fillFilters() {
    const category = $('#category'); category.replaceChildren(new Option('Todas as categorias', ''));
    [...new Set(state.rows.map((r) => String(r.categoria || '').trim() || 'Sem categoria'))].sort((a,b) => a.localeCompare(b,'pt-BR')).forEach((x) => category.add(new Option(x,x)));
    const select = $('#region'), has = state.columns.includes('regiao');
    select.replaceChildren(new Option(has ? 'Todas as regiões' : 'Não disponível nesta base', ''));
    select.disabled = !has;
    $('#region-hint').textContent = has ? 'Filtra registros com região preenchida.' : 'A base n\u00e3o possui coluna de região.';
    if (has) [...new Set(state.rows.map(r => String(r.regiao || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR')).forEach(x => select.add(new Option(x,x)));
  }
  function showSource() {
    $('#source-label').textContent = state.source;
    const dates = state.rows.map(r => r.data).sort();
    const fmt = (d) => new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${d}T00:00:00Z`)).replace('.','');
    $('#date-range').textContent = `${fmt(dates[0])} ? ${fmt(dates.at(-1))}`;
  }
  function showQuality() {
    const optional = ['categoria','regiao'].filter(x => !state.columns.includes(x));
    const details = Object.entries(state.reasons).map(([k,v]) => `${v} ${k}`).join('; ');
    $('#quality').textContent = state.rejected ? `${integer.format(state.rejected)} registro(s) descartado(s)${details ? ` ? ${details}.` : '.'}${optional.length ? ` Campo(s) não disponíveis: ${optional.join(', ')}.` : ''}` : `${integer.format(state.rows.length)} linhas válidas. Nenhum registro foi descartado.${optional.length ? ` Campo(s) não disponíveis: ${optional.join(', ')}.` : ''}`;
  }
  function filterRows() {
    const start=$('#date-start').value,end=$('#date-end').value,cat=$('#category').value,reg=$('#region').value;
    state.filtered=state.rows.filter(r=>(!start||r.data>=start)&&(!end||r.data<=end)&&(!cat||(String(r.categoria||'').trim()||'Sem categoria')===cat)&&(!reg||String(r.regiao||'').trim()===reg));
  }
  const preferred=['id_venda','data','dia_semana','periodo','produto','categoria','regiao','quantidade','preco_unitario','forma_pagamento','canal','tempo_espera_min','avaliacao'];
  const labels={id_venda:'ID da venda',data:'Data',dia_semana:'Dia da semana',periodo:'Período',produto:'Produto',categoria:'Categoria',regiao:'Região',quantidade:'Quantidade',preco_unitario:'Preço unitário',forma_pagamento:'Forma de pagamento',canal:'Canal',tempo_espera_min:'Espera (min)',avaliacao:'Avaliação',_faturamento:'Faturamento'};
  const columns=()=>[...preferred.filter(x=>state.columns.includes(x)),...state.columns.filter(x=>!preferred.includes(x)),'_faturamento'];
  const colLabel=(x)=>labels[x]||x.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
  function cell(key,value){if(value===''||value==null)return '?';if(key==='_faturamento'||key==='preco_unitario')return money.format(+value);if(key==='data'){const [y,m,d]=String(value).split('-');return `${d}/${m}/${y}`;}if(['quantidade','tempo_espera_min'].includes(key))return integer.format(+value);return String(value);}
  function sortedRows(){
    const query=$('#search').value.trim().toLocaleLowerCase('pt-BR'), cols=columns();
    const rows=state.filtered.filter(r=>!query||cols.some(k=>cell(k,r[k]).toLocaleLowerCase('pt-BR').includes(query)));
    rows.sort((a,b)=>{const x=a[state.sort],y=b[state.sort];return ((typeof x==='number'&&typeof y==='number')?x-y:String(x??'').localeCompare(String(y??''),'pt-BR',{numeric:true,sensitivity:'base'}))*state.direction;});
    return rows;
  }
  function renderTable(){
    const rows=sortedRows(), defs=columns(), pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE)); state.page=Math.min(state.page,pages);
    const head=$('#table-head'), tr=document.createElement('tr'); head.replaceChildren();
    defs.forEach(k=>{const th=document.createElement('th'),b=document.createElement('button'),s=document.createElement('span');b.type='button';b.dataset.sort=k;b.textContent=colLabel(k);s.className='sort';s.textContent=state.sort===k?(state.direction>0?'?':'?'):'?';b.append(s);th.append(b);tr.append(th);});head.append(tr);
    const body=$('#table-body');body.replaceChildren();
    rows.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE).forEach(r=>{const line=document.createElement('tr');defs.forEach(k=>{const td=document.createElement('td');td.textContent=cell(k,r[k]);if(k==='_faturamento')td.className='currency';line.append(td);});body.append(line);});
    const empty=!rows.length;$('#empty-table').hidden=!empty;$('#table-scroll').hidden=empty;
    $('#record-count').textContent=`${integer.format(state.filtered.length)} ${state.filtered.length===1?'registro':'registros'} no resultado${$('#search').value.trim()?` ? ${integer.format(rows.length)} correspondem ? pesquisa`:''}`;
    const from=empty?0:(state.page-1)*PAGE_SIZE+1,to=Math.min(state.page*PAGE_SIZE,rows.length);
    $('#page-summary').textContent=rows.length?`Mostrando ${integer.format(from)}?${integer.format(to)} de ${integer.format(rows.length)} registros`:'Exibindo 0 registros';$('#page-label').textContent=`${state.page} / ${pages}`;$('#previous').disabled=state.page<=1||empty;$('#next').disabled=state.page>=pages||empty;
  }
  function aggregate(rows,key){const sums=new Map();rows.forEach(r=>{const k=String(r[key]??'').trim()||`Sem ${colLabel(key).toLowerCase()}`;sums.set(k,(sums.get(k)||0)+r._faturamento);});return [...sums].sort((a,b)=>b[1]-a[1]);}
  function compact(value){const n=Number(value);if(Math.abs(n)>=1e6)return `R$ ${(n/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})} mi`;if(Math.abs(n)>=1000)return `R$ ${(n/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})} mil`;return `R$ ${n.toLocaleString('pt-BR',{maximumFractionDigits:0})}`;}
  function draw(name,canvas,type,names,values,color,horizontal=false){
    if(!window.Chart)return;if(state.charts[name])state.charts[name].destroy();
    const opts={responsive:true,maintainAspectRatio:false,interaction:{intersect:false,mode:'index'},plugins:{legend:{display:false},tooltip:{backgroundColor:'#0a111c',titleColor:'#edf3fb',bodyColor:'#c4d2e3',borderColor:'#2b4461',borderWidth:1,padding:10,callbacks:{label:c=>` ${money.format(c.parsed.y??c.parsed.x??0)}`}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#91a4bb',font:{family:'Plus Jakarta Sans',size:9},maxRotation:0}},y:{beginAtZero:true,border:{display:false,dash:[3,4]},grid:{color:'rgba(145,164,187,.13)'},ticks:{color:'#91a4bb',font:{family:'Plus Jakarta Sans',size:9},callback:compact}}}};
    if(horizontal){opts.indexAxis='y';opts.scales.x=opts.scales.y;opts.scales.y={grid:{display:false},border:{display:false},ticks:{color:'#b3c1d2',font:{family:'Plus Jakarta Sans',size:10}}};}
    state.charts[name]=new Chart(canvas,{type,data:{labels:names,datasets:[{data:values,borderColor:color,backgroundColor:type==='line'?'rgba(48,107,172,.12)':color,borderWidth:type==='line'?2.5:0,pointRadius:type==='line'?3:0,pointHoverRadius:5,pointBackgroundColor:'#fff',pointBorderColor:color,pointBorderWidth:2,fill:type==='line',tension:.32,borderRadius:type==='bar'?4:0,barThickness:'flex',maxBarThickness:32}]},options:opts});
  }
  function renderCharts(){
    const monthly=new Map();state.filtered.forEach(r=>{const m=r.data.slice(0,7);monthly.set(m,(monthly.get(m)||0)+r._faturamento);});
    const months=[...monthly.keys()].sort(), formatter=new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric',timeZone:'UTC'});
    draw('monthly',$('#monthly-chart'),'line',months.map(m=>formatter.format(new Date(`${m}-01T00:00:00Z`)).replace('.','')),months.map(m=>monthly.get(m)),'#67adfa');
    const cats=aggregate(state.filtered,'categoria');draw('category',$('#category-chart'),'bar',cats.map(x=>x[0]),cats.map(x=>x[1]),'#4387cc',true);
    const hasReg=state.columns.includes('regiao');$('#region-empty').hidden=hasReg;$('#region-chart').hidden=!hasReg;
    if(hasReg){const a=aggregate(state.filtered,'regiao');draw('region',$('#region-chart'),'bar',a.map(x=>x[0]),a.map(x=>x[1]),'#43a6d5',true);$('#region-note').textContent='Regiões vazias são agrupadas como “Sem região”.';}else if(state.charts.region){state.charts.region.destroy();delete state.charts.region;}
    const hasChannel=state.columns.includes('canal');$('#channel-empty').hidden=hasChannel;$('#channel-chart').hidden=!hasChannel;
    if(hasChannel){const a=aggregate(state.filtered,'canal');draw('channel',$('#channel-chart'),'bar',a.map(x=>x[0]),a.map(x=>x[1]),'#788fce',true);}else if(state.charts.channel){state.charts.channel.destroy();delete state.charts.channel;}
  }
  function render(){filterRows();const revenue=state.filtered.reduce((s,r)=>s+r._faturamento,0), ids=new Set(state.filtered.map(r=>r.id_venda)), units=state.filtered.reduce((s,r)=>s+r.quantidade,0);$('#revenue').textContent=money.format(revenue);$('#sales').textContent=integer.format(ids.size);$('#units').textContent=integer.format(units);$('#ticket').textContent=money.format(ids.size?revenue/ids.size:0);renderCharts();renderTable();}
  function toast(message,error=false){const el=$('#toast');el.textContent=message;el.classList.toggle('error',error);el.classList.add('visible');clearTimeout(state.toast);state.toast=setTimeout(()=>el.classList.remove('visible'),4200);}
  function exportCsv(){
    const rows=sortedRows(),defs=columns();
    if(!rows.length){toast('Não há registros para exportar.',true);return;}
    const escape=v=>{const value=String(v??'');return /[",\r\n]/.test(value)?`"${value.replace(/"/g,'""')}"`:value;};
    const lines=[defs.map(k=>escape(colLabel(k))).join(',')];
    rows.forEach(r=>lines.push(defs.map(k=>escape(k==='_faturamento'?r[k].toFixed(2):(r[k]??''))).join(',')));
    const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='vendas-filtradas.csv';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast(`${integer.format(rows.length)} registro(s) exportado(s), conforme filtros e pesquisa.`);
  }
  function importFile(file){if(!window.Papa){toast('Papa Parse não carregou. Verifique a conexão com a internet.',true);return;}Papa.parse(file,{header:true,skipEmptyLines:'greedy',encoding:'UTF-8',transformHeader:h=>h.replace(/^﻿/,'').trim(),complete:result=>{try{loadDataset(result.data,result.meta.fields||[],file.name,result.errors.length);toast(`${integer.format(state.rows.length)} registros válidos importados de ${file.name}.`);}catch(e){toast(e.message,true);}},error:e=>toast(`N\u00e3o foi poss\u00edvel ler o CSV: ${e.message}`,true)});}
  function wire(){['#date-start','#date-end','#category','#region'].forEach(s=>$(s).addEventListener('change',()=>{state.page=1;render();}));$('#clear').addEventListener('click',()=>{resetFilters();render();toast('Filtros e pesquisa limpos.');});$('#search').addEventListener('input',()=>{state.page=1;renderTable();});$('#table-head').addEventListener('click',e=>{const b=e.target.closest('button[data-sort]');if(!b)return;if(state.sort===b.dataset.sort)state.direction*=-1;else{state.sort=b.dataset.sort;state.direction=1;}state.page=1;renderTable();});$('#previous').addEventListener('click',()=>{state.page--;renderTable();});$('#next').addEventListener('click',()=>{state.page++;renderTable();});$('#export').addEventListener('click',exportCsv);$('#import-button').addEventListener('click',()=>$('#csv-file').click());$('#csv-file').addEventListener('change',e=>{if(e.target.files[0])importFile(e.target.files[0]);e.target.value='';});}
  function boot(){wire();try{const rows=window.DADOS_INICIAIS||[];if(!rows.length)throw Error('Dados iniciais não carregaram. Confira o arquivo dados-iniciais.js.');loadDataset(rows,Object.keys(rows[0]),'Base fornecida pelo projeto');if(!window.Chart)toast('Os gráficos precisam de internet para carregar o Chart.js.',true);else if(!window.Papa)toast('A importação CSV precisa de internet para carregar o Papa Parse.',true);}catch(e){$('#quality').textContent=e.message;$('#empty-table').hidden=false;$('#empty-table').innerHTML=`<b>N\u00e3o foi poss\u00edvel iniciar o painel</b><span>${e.message}</span>`;}}
  boot();
})();
