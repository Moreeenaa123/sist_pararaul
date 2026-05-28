

// ==================== BASE DE DATOS EN MEMORIA ====================
let db = {
  docentes: [
    { id:1, apellido:'Ramírez',   nombre:'Carlos', legajo:'D-001', materia:'Matemática', turno:'Mañana',     telefono:'011-2345-6789' },
    { id:2, apellido:'López',     nombre:'Ana',    legajo:'D-002', materia:'Lengua',     turno:'Mañana',     telefono:'011-3456-7890' },
    { id:3, apellido:'Fernández', nombre:'Jorge',  legajo:'D-003', materia:'Historia',   turno:'Tarde',      telefono:'011-4567-8901' },
    { id:4, apellido:'Martínez',  nombre:'Sofía',  legajo:'D-004', materia:'Biología',   turno:'Tarde',      telefono:'011-5678-9012' },
    { id:5, apellido:'González',  nombre:'Pablo',  legajo:'D-005', materia:'Ed. Física', turno:'Vespertino', telefono:'011-6789-0123' },
  ],
  asistencias: [
    { id:1, docId:1, fecha:hoy(), hora:'07:30', estado:'Presente',  obs:'' },
    { id:2, docId:2, fecha:hoy(), hora:'07:50', estado:'Tardanza',  obs:'15 min tarde' },
  ],
  faltas: [
    { id:1, docId:3, fecha:hoy(), tipo:'Injustificada', motivo:'Sin aviso', cubierta:'No' },
  ],
  licencias: [
    { id:1, docId:4, tipo:'Enfermedad', desde:hace(3), hasta:sumar(4), obs:'Certificado médico', estado:'Activa' },
  ],
  suplencias: [
    { id:1, titular:4, suplente:'Pérez, Laura', desde:hace(3), hasta:sumar(4), motivo:'Licencia médica', estado:'Activa' },
  ],
  nid: { d:6, a:3, f:2, l:2, s:2 }
};

let _turnoFiltro = '';
let _faltaFiltro = '';
let _docFiltro   = '';
let _activeTab   = 'tab-faltas';
let _curPage     = 'home';

// ==================== UTILIDADES ====================
function hoy()    { return new Date().toISOString().split('T')[0]; }
function hace(n)  { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; }
function sumar(n) { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0]; }
function fmt(iso) { if(!iso) return '—'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
function dias(a,b){ return Math.max(0, Math.round((new Date(b)-new Date(a))/86400000)+1); }
function nomDoc(id){ const d=db.docentes.find(x=>x.id===id); return d?`${d.apellido}, ${d.nombre}`:'—'; }
function inDoc(id) { const d=db.docentes.find(x=>x.id===id); return d?(d.apellido[0]+d.nombre[0]):'?'; }
function colorAvatar(id) {
  const cols = ['#4338CA','#0D9488','#059669','#7C3AED','#B91C1C','#1D4ED8','#D97706'];
  return cols[id % cols.length];
}

// ==================== NAVEGACIÓN ====================
const fabMap = {
  home:       null,
  docentes:   'sheet-docente',
  novedades:  null,
  asistencia: 'sheet-asistencia',
  reportes:   null
};
const subtitles = {
  home:       'Gestión de personal',
  docentes:   'Nómina docente',
  novedades:  'Faltas · Licencias · Suplencias',
  asistencia: 'Registro diario',
  reportes:   'Estadísticas'
};

function navTo(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  el.classList.add('active');
  document.getElementById('topbar-sub').textContent = subtitles[page];
  _curPage = page;
  const fab = document.getElementById('fab');
  fab.style.display = fabMap[page] ? 'flex' : 'none';
  renderPage(page);
}

function fabAction() {
  const sheet = fabMap[_curPage];
  if (sheet) abrirSheet(sheet);
}

function renderPage(p) {
  if      (p === 'home')       renderHome();
  else if (p === 'docentes')   renderDocentes();
  else if (p === 'novedades')  renderNovedadesTab();
  else if (p === 'asistencia') renderAsistencia();
  else if (p === 'reportes')   renderReportes();
}

// ==================== HOME / DASHBOARD ====================
function renderHome() {
  const h     = hoy();
  const ahora = new Date();
  const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  document.getElementById('hero-date').textContent =
    `${DIAS[ahora.getDay()]} ${ahora.getDate()} de ${MESES[ahora.getMonth()]}`;

  const presentes = db.asistencias.filter(a => a.fecha===h && a.estado==='Presente').length;
  const faltasH   = db.faltas.filter(f => f.fecha===h).length;
  const licAct    = db.licencias.filter(l => l.estado==='Activa').length;

  document.getElementById('hero-stats').innerHTML = `
    <div class="hero-stat"><div class="hero-stat-val">${presentes}</div><div class="hero-stat-lbl">Presentes</div></div>
    <div class="hero-stat"><div class="hero-stat-val">${faltasH}</div><div class="hero-stat-lbl">Faltas</div></div>
    <div class="hero-stat"><div class="hero-stat-val">${licAct}</div><div class="hero-stat-lbl">Licencias</div></div>
  `;

  // Alertas
  let alertas = '';
  const sinCubrir = db.faltas.filter(f => f.fecha===h && f.cubierta==='No');
  if (sinCubrir.length > 0)
    alertas += `<div class="alert aw"><i class="ti ti-alert-triangle"></i><div>${sinCubrir.length} hora(s) sin cubrir hoy. <b>Asignar suplencia.</b></div></div>`;
  if (licAct > 0)
    alertas += `<div class="alert ai"><i class="ti ti-info-circle"></i><div>${licAct} docente(s) con licencia activa.</div></div>`;
  document.getElementById('alertas').innerHTML = alertas;

  // Novedades hoy
  const novs = [
    ...db.asistencias.filter(a => a.fecha===h).map(a => ({
      icon:  a.estado==='Presente' ? 'ti-check' : 'ti-clock',
      color: a.estado==='Presente' ? '#059669'  : '#D97706',
      text:  `${nomDoc(a.docId)} — ${a.estado}`,
      sub:   a.hora || ''
    })),
    ...db.faltas.filter(f => f.fecha===h).map(f => ({
      icon:  'ti-calendar-x', color: '#DC2626',
      text:  `${nomDoc(f.docId)} — Falta ${f.tipo}`,
      sub:   f.motivo || ''
    }))
  ];

  document.getElementById('novedades-list').innerHTML = novs.length === 0
    ? '<div class="empty" style="padding:20px"><i class="ti ti-check"></i><p>Sin novedades hoy</p></div>'
    : novs.map(n => `
        <div class="list-item" style="cursor:default">
          <div style="width:38px;height:38px;border-radius:11px;background:${n.color}20;display:flex;align-items:center;justify-content:center;color:${n.color};font-size:18px;flex-shrink:0">
            <i class="ti ${n.icon}"></i>
          </div>
          <div class="item-body">
            <div class="item-title" style="font-size:13.5px">${n.text}</div>
            ${n.sub ? `<div class="item-sub">${n.sub}</div>` : ''}
          </div>
        </div>`).join('');

  // Movimientos recientes
  const movs = [
    ...db.asistencias.slice(-4).map(a => ({
      doc: nomDoc(a.docId), tipo: 'Asistencia', fecha: a.fecha,
      badge: `<span class="badge ${a.estado==='Presente'?'bg':a.estado==='Tardanza'?'ba':'br'}">${a.estado}</span>`
    })),
    ...db.faltas.slice(-2).map(f => ({
      doc: nomDoc(f.docId), tipo: 'Falta', fecha: f.fecha,
      badge: `<span class="badge br">${f.tipo}</span>`
    })),
    ...db.licencias.slice(-2).map(l => ({
      doc: nomDoc(l.docId), tipo: 'Licencia', fecha: l.desde,
      badge: `<span class="badge bb">${l.estado}</span>`
    })),
  ].sort((a,b) => b.fecha.localeCompare(a.fecha)).slice(0, 6);

  document.getElementById('movs-list').innerHTML = movs.length === 0
    ? '<div class="empty" style="padding:20px"><i class="ti ti-history"></i><p>Sin movimientos</p></div>'
    : movs.map(m => `
        <div class="list-item" style="cursor:default">
          <div class="item-body">
            <div class="item-title" style="font-size:13.5px">${m.doc}</div>
            <div class="item-sub"><span class="tag">${m.tipo}</span> · ${fmt(m.fecha)}</div>
          </div>
          <div class="item-right">${m.badge}</div>
        </div>`).join('');

  // Badge de notificaciones
  const nb = document.getElementById('notif-badge');
  nb.style.display = (sinCubrir.length > 0 || licAct > 0) ? 'block' : 'none';
}

// ==================== DOCENTES ====================
function renderDocentes() {
  const lista = db.docentes.filter(d =>
    (_docFiltro === '' || (d.apellido + ' ' + d.nombre + ' ' + d.materia)
      .toLowerCase().includes(_docFiltro.toLowerCase())) &&
    (_turnoFiltro === '' || d.turno === _turnoFiltro)
  );

  if (lista.length === 0) {
    document.getElementById('lista-docentes').innerHTML =
      '<div class="empty"><i class="ti ti-users"></i><p>Sin docentes</p></div>';
    return;
  }

  document.getElementById('lista-docentes').innerHTML = lista.map(d => `
    <div class="list-item">
      <div class="item-avatar" style="background:${colorAvatar(d.id)}">${d.apellido[0]}${d.nombre[0]}</div>
      <div class="item-body">
        <div class="item-title">${d.apellido}, ${d.nombre}</div>
        <div class="item-sub">${d.materia} · <span class="tag">${d.turno}</span></div>
      </div>
      <div class="action-btns">
        <button class="abtn abtn-edit" onclick="editDoc(${d.id})" title="Editar"><i class="ti ti-pencil"></i></button>
        <button class="abtn abtn-del"  onclick="delDoc(${d.id})"  title="Eliminar"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join('');
}

function filtrarDoc(v) { _docFiltro = v; renderDocentes(); }

function filtroTurno(v) {
  _turnoFiltro = v;
  document.querySelectorAll('#chips-turno .chip').forEach(c => {
    c.classList.toggle('active', c.textContent === (v || 'Todos'));
  });
  renderDocentes();
}

function editDoc(id) {
  const d = db.docentes.find(x => x.id === id);
  if (!d) return;
  document.getElementById('d-ap').value    = d.apellido;
  document.getElementById('d-nom').value   = d.nombre;
  document.getElementById('d-leg').value   = d.legajo;
  document.getElementById('d-turno').value = d.turno;
  document.getElementById('d-mat').value   = d.materia;
  document.getElementById('d-tel').value   = d.telefono;
  document.getElementById('sheet-docente').dataset.editId = id;
  document.getElementById('sheet-doc-title').textContent = 'Editar docente';
  abrirSheet('sheet-docente');
}

function delDoc(id) {
  if (!confirm('¿Eliminar este docente?')) return;
  db.docentes = db.docentes.filter(d => d.id !== id);
  renderDocentes(); renderHome();
  toast('Docente eliminado');
}

// ==================== NOVEDADES (tabs) ====================
function switchTab(tabId, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['tab-faltas','tab-licencias','tab-suplencias'].forEach(id => {
    document.getElementById(id).style.display = id === tabId ? 'block' : 'none';
  });
  _activeTab = tabId;
  renderNovedadesTab();
}

function renderNovedadesTab() {
  if      (_activeTab === 'tab-faltas')     renderFaltas();
  else if (_activeTab === 'tab-licencias')  renderLicencias();
  else                                      renderSuplencias();
}

// ---- Faltas ----
function filtroFalta(v) {
  _faltaFiltro = v;
  document.querySelectorAll('#tab-faltas .chips .chip').forEach(c => {
    c.classList.toggle('active', c.textContent === (v || 'Todas'));
  });
  renderFaltas();
}

function renderFaltas() {
  const lista = db.faltas
    .filter(f => _faltaFiltro === '' || f.tipo === _faltaFiltro)
    .sort((a,b) => b.fecha.localeCompare(a.fecha));

  if (lista.length === 0) {
    document.getElementById('lista-faltas').innerHTML =
      '<div class="empty"><i class="ti ti-calendar-check"></i><p>Sin faltas registradas</p></div>';
    return;
  }

  document.getElementById('lista-faltas').innerHTML = lista.map(f => `
    <div class="list-item">
      <div class="item-avatar" style="background:#DC2626">${inDoc(f.docId)}</div>
      <div class="item-body">
        <div class="item-title">${nomDoc(f.docId)}</div>
        <div class="item-sub">${fmt(f.fecha)} · ${f.motivo || 'Sin motivo'}</div>
      </div>
      <div class="item-right">
        <span class="badge ${f.tipo==='Injustificada'?'br':f.tipo==='Justificada'?'ba':'bgr'}">${f.tipo}</span>
        <span class="badge ${f.cubierta==='Sí'?'bg':f.cubierta==='Parcial'?'ba':'br'}">
          ${f.cubierta==='Sí'?'Cubierta':f.cubierta==='Parcial'?'Parcial':'Sin cubrir'}
        </span>
      </div>
    </div>`).join('');
}

// ---- Licencias ----
function renderLicencias() {
  const lista = db.licencias.sort((a,b) => b.desde.localeCompare(a.desde));

  if (lista.length === 0) {
    document.getElementById('lista-licencias').innerHTML =
      '<div class="empty"><i class="ti ti-file-off"></i><p>Sin licencias</p></div>';
    return;
  }

  document.getElementById('lista-licencias').innerHTML = lista.map(l => `
    <div class="list-item">
      <div class="item-avatar" style="background:#D97706">${inDoc(l.docId)}</div>
      <div class="item-body">
        <div class="item-title">${nomDoc(l.docId)}</div>
        <div class="item-sub">${l.tipo} · ${fmt(l.desde)} → ${fmt(l.hasta)}</div>
      </div>
      <div class="item-right">
        <span class="badge ${l.estado==='Activa'?'bb':'bgr'}">${l.estado}</span>
        <div class="action-btns" style="margin-top:4px">
          ${l.estado==='Activa' ? `<button class="abtn abtn-ok" onclick="finLic(${l.id})" title="Finalizar"><i class="ti ti-check"></i></button>` : ''}
          <button class="abtn abtn-del" onclick="delLic(${l.id})" title="Eliminar"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>`).join('');
}

function finLic(id) {
  const l = db.licencias.find(x => x.id === id);
  if (l) { l.estado = 'Finalizada'; renderLicencias(); renderHome(); toast('Licencia finalizada'); }
}
function delLic(id) {
  if (!confirm('¿Eliminar licencia?')) return;
  db.licencias = db.licencias.filter(l => l.id !== id);
  renderLicencias(); renderHome(); toast('Eliminado');
}

// ---- Suplencias ----
function renderSuplencias() {
  const lista = db.suplencias.sort((a,b) => b.desde.localeCompare(a.desde));

  if (lista.length === 0) {
    document.getElementById('lista-suplencias').innerHTML =
      '<div class="empty"><i class="ti ti-user-x"></i><p>Sin suplencias</p></div>';
    return;
  }

  document.getElementById('lista-suplencias').innerHTML = lista.map(s => `
    <div class="list-item">
      <div class="item-avatar" style="background:#7C3AED">${inDoc(s.titular)}</div>
      <div class="item-body">
        <div class="item-title">${nomDoc(s.titular)}</div>
        <div class="item-sub">Suplente: <b>${s.suplente}</b></div>
        <div class="item-sub" style="margin-top:2px">${fmt(s.desde)} → ${fmt(s.hasta)}</div>
      </div>
      <div class="item-right">
        <span class="badge ${s.estado==='Activa'?'bp':'bgr'}">${s.estado}</span>
        <div class="action-btns" style="margin-top:4px">
          ${s.estado==='Activa' ? `<button class="abtn abtn-ok" onclick="finSup(${s.id})" title="Finalizar"><i class="ti ti-check"></i></button>` : ''}
          <button class="abtn abtn-del" onclick="delSup(${s.id})" title="Eliminar"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>`).join('');
}

function finSup(id) {
  const s = db.suplencias.find(x => x.id === id);
  if (s) { s.estado = 'Finalizada'; renderSuplencias(); renderHome(); toast('Suplencia finalizada'); }
}
function delSup(id) {
  if (!confirm('¿Eliminar suplencia?')) return;
  db.suplencias = db.suplencias.filter(s => s.id !== id);
  renderSuplencias(); renderHome(); toast('Eliminado');
}

// ==================== ASISTENCIA ====================
function renderAsistencia() {
  const ff    = document.getElementById('filtro-fecha').value;
  const lista = db.asistencias
    .filter(a => ff === '' || a.fecha === ff)
    .sort((a,b) => b.fecha.localeCompare(a.fecha));

  if (lista.length === 0) {
    document.getElementById('lista-asistencia').innerHTML =
      '<div class="empty"><i class="ti ti-calendar-stats"></i><p>Sin registros para esta fecha</p></div>';
    return;
  }

  document.getElementById('lista-asistencia').innerHTML = lista.map(a => `
    <div class="list-item" style="cursor:default">
      <div class="item-avatar" style="background:${colorAvatar(a.docId)}">${inDoc(a.docId)}</div>
      <div class="item-body">
        <div class="item-title">${nomDoc(a.docId)}</div>
        <div class="item-sub">${fmt(a.fecha)} · ${a.hora || '—'} ${a.obs ? '· ' + a.obs : ''}</div>
      </div>
      <div class="item-right">
        <span class="badge ${a.estado==='Presente'?'bg':a.estado==='Tardanza'?'ba':'br'}">${a.estado}</span>
      </div>
    </div>`).join('');
}

// ==================== REPORTES ====================
function renderReportes() {
  const totalF  = db.faltas.length;
  const injust  = db.faltas.filter(f => f.tipo === 'Injustificada').length;
  const licAct  = db.licencias.filter(l  => l.estado === 'Activa').length;
  const supAct  = db.suplencias.filter(s => s.estado === 'Activa').length;

  document.getElementById('rep-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--red-bg);color:var(--red)"><i class="ti ti-calendar-x"></i></div>
      <div class="stat-val">${totalF}</div><div class="stat-lbl">Faltas totales</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--amber-bg);color:var(--amber)"><i class="ti ti-alert-circle"></i></div>
      <div class="stat-val">${injust}</div><div class="stat-lbl">Injustificadas</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--blue-bg);color:var(--blue)"><i class="ti ti-file-certificate"></i></div>
      <div class="stat-val">${licAct}</div><div class="stat-lbl">Lic. activas</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--purple-bg);color:var(--purple)"><i class="ti ti-user-check"></i></div>
      <div class="stat-val">${supAct}</div><div class="stat-lbl">Suplencias</div>
    </div>
  `;

  // Faltas por docente
  const byDoc = {};
  db.faltas.forEach(f => { const n = nomDoc(f.docId); byDoc[n] = (byDoc[n] || 0) + 1; });
  const sorted = Object.entries(byDoc).sort((a,b) => b[1] - a[1]);
  document.getElementById('rep-faltas').innerHTML = sorted.length === 0
    ? '<div class="empty" style="padding:20px"><i class="ti ti-mood-happy"></i><p>Sin faltas registradas</p></div>'
    : sorted.map(([n,c]) => `
        <div class="list-item" style="cursor:default">
          <div class="item-body"><div class="item-title" style="font-size:13.5px">${n}</div></div>
          <span class="badge ${c>=3?'br':c>=2?'ba':'bgr'}">${c} falta${c>1?'s':''}</span>
        </div>`).join('');

  // Licencias activas
  const licActList = db.licencias.filter(l => l.estado === 'Activa');
  document.getElementById('rep-licencias').innerHTML = licActList.length === 0
    ? '<div class="empty" style="padding:20px"><i class="ti ti-check"></i><p>Sin licencias activas</p></div>'
    : licActList.map(l => `
        <div class="list-item" style="cursor:default">
          <div class="item-body">
            <div class="item-title" style="font-size:13.5px">${nomDoc(l.docId)}</div>
            <div class="item-sub">${l.tipo} · hasta ${fmt(l.hasta)}</div>
          </div>
          <span class="badge bb">Activa</span>
        </div>`).join('');
}

// ==================== SHEETS (abrir / cerrar) ====================
function abrirSheet(id) {
  poblarSelects();
  setFechasDefault();
  document.getElementById(id).classList.add('open');
}
function cerrarSheet(id) {
  const el = document.getElementById(id);
  el.classList.remove('open');
  delete el.dataset.editId;
  if (id === 'sheet-docente') {
    document.getElementById('sheet-doc-title').textContent = 'Nuevo docente';
    // limpiar campos
    ['d-ap','d-nom','d-leg','d-mat','d-tel'].forEach(fId => {
      const el = document.getElementById(fId); if (el) el.value = '';
    });
  }
}

// Cerrar tocando el fondo
document.querySelectorAll('.sheet-overlay').forEach(s => {
  s.addEventListener('click', function(e) { if (e.target === this) cerrarSheet(this.id); });
});

function poblarSelects() {
  const opts = db.docentes
    .sort((a,b) => a.apellido.localeCompare(b.apellido))
    .map(d => `<option value="${d.id}">${d.apellido}, ${d.nombre}</option>`).join('');
  ['a-doc','f-doc','l-doc','s-tit'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = opts;
  });
}

function setFechasDefault() {
  const h = hoy();
  ['a-fecha','f-fecha','l-desde','l-hasta','s-desde','s-hasta'].forEach(id => {
    const el = document.getElementById(id); if (el && !el.value) el.value = h;
  });
  const horaEl = document.getElementById('a-hora');
  if (horaEl && !horaEl.value) {
    const n = new Date();
    horaEl.value = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
  }
}

// ==================== GUARDAR ====================
function guardarDocente() {
  const ap  = document.getElementById('d-ap').value.trim();
  const nom = document.getElementById('d-nom').value.trim();
  if (!ap || !nom) { alert('Apellido y nombre son obligatorios.'); return; }

  const s   = document.getElementById('sheet-docente');
  const eid = s.dataset.editId;

  if (eid) {
    const d = db.docentes.find(x => x.id === parseInt(eid));
    if (d) {
      d.apellido  = ap;
      d.nombre    = nom;
      d.legajo    = document.getElementById('d-leg').value;
      d.turno     = document.getElementById('d-turno').value;
      d.materia   = document.getElementById('d-mat').value;
      d.telefono  = document.getElementById('d-tel').value;
    }
    toast('Docente actualizado');
  } else {
    db.docentes.push({
      id:       db.nid.d++,
      apellido: ap,
      nombre:   nom,
      legajo:   document.getElementById('d-leg').value || `D-00${db.nid.d}`,
      materia:  document.getElementById('d-mat').value,
      turno:    document.getElementById('d-turno').value,
      telefono: document.getElementById('d-tel').value
    });
    toast('Docente agregado ✓');
  }

  cerrarSheet('sheet-docente');
  renderDocentes(); renderHome();
}

function guardarAsistencia() {
  const docId = parseInt(document.getElementById('a-doc').value);
  const fecha = document.getElementById('a-fecha').value;
  if (!docId || !fecha) { alert('Completá los campos obligatorios.'); return; }

  db.asistencias.push({
    id:     db.nid.a++,
    docId,  fecha,
    hora:   document.getElementById('a-hora').value,
    estado: document.getElementById('a-estado').value,
    obs:    document.getElementById('a-obs').value
  });
  cerrarSheet('sheet-asistencia');
  renderAsistencia(); renderHome();
  toast('Asistencia registrada ✓');
}

function guardarFalta() {
  const docId = parseInt(document.getElementById('f-doc').value);
  const fecha = document.getElementById('f-fecha').value;
  if (!docId || !fecha) { alert('Completá los campos obligatorios.'); return; }

  db.faltas.push({
    id:      db.nid.f++,
    docId,   fecha,
    tipo:    document.getElementById('f-tipo').value,
    motivo:  document.getElementById('f-mot').value,
    cubierta:document.getElementById('f-cub').value
  });
  cerrarSheet('sheet-falta');
  renderFaltas(); renderHome();
  toast('Falta registrada ✓');
}

function guardarLicencia() {
  const docId = parseInt(document.getElementById('l-doc').value);
  const desde = document.getElementById('l-desde').value;
  const hasta = document.getElementById('l-hasta').value;
  if (!docId || !desde || !hasta) { alert('Completá los campos obligatorios.'); return; }

  db.licencias.push({
    id:     db.nid.l++,
    docId,
    tipo:   document.getElementById('l-tipo').value,
    desde,  hasta,
    obs:    document.getElementById('l-obs').value,
    estado: 'Activa'
  });
  cerrarSheet('sheet-licencia');
  renderLicencias(); renderHome();
  toast('Licencia registrada ✓');
}

function guardarSuplencia() {
  const titId = parseInt(document.getElementById('s-tit').value);
  const sup   = document.getElementById('s-sup').value.trim();
  const desde = document.getElementById('s-desde').value;
  if (!titId || !sup || !desde) { alert('Completá los campos obligatorios.'); return; }

  db.suplencias.push({
    id:      db.nid.s++,
    titular: titId,
    suplente:sup,
    desde,
    hasta:   document.getElementById('s-hasta').value,
    motivo:  document.getElementById('s-mot').value,
    estado:  'Activa'
  });
  cerrarSheet('sheet-suplencia');
  renderSuplencias(); renderHome();
  toast('Suplencia asignada ✓');
}

// ==================== NOTIFICACIONES ====================
function showNotifs() {
  const sinCubrir = db.faltas.filter(f => f.fecha === hoy() && f.cubierta === 'No').length;
  const licAct    = db.licencias.filter(x => x.estado === 'Activa').length;
  if (sinCubrir === 0 && licAct === 0) {
    toast('Sin notificaciones pendientes');
    return;
  }
  let msg = '';
  if (sinCubrir > 0) msg += `⚠️ ${sinCubrir} hora(s) sin cubrir hoy\n`;
  if (licAct > 0)    msg += `ℹ️ ${licAct} licencia(s) activa(s)`;
  alert(msg.trim());
}

// ==================== TOAST ====================
function toast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ==================== INICIALIZACIÓN ====================
document.getElementById('filtro-fecha').value = hoy();
document.getElementById('fab').style.display  = 'none';
renderHome();
