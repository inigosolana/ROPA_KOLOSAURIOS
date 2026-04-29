/* =============================================
   APP.JS – Gestor de Equipación del Equipo
   ============================================= */

// ── Catálogo de opciones ──────────────────────
// ── Catálogo de opciones y precios ───────────
const ARTICULOS = {
  'CHUBASQUERO': 15.48,
  'PANTALON PASEO': 14.48,
  'MOCHILA': 24.13,
  'SUDADERA': 33.78,
  'CAMISETA PASEO': 24.13,
  'CAMISETA JUEGO': 24.13,
  'PANTALON JUEGO': 23.16,
  'GORRA': 4.83
};

const ARTICULO_NAMES = Object.keys(ARTICULOS);

const COLORES = ['Azul', 'Amarilla', 'Naranja', 'Rosa', 'Negro'];
const TALLAS  = ['S', 'M', 'L', 'XL', '2XL'];

// ── Estado global (persiste en localStorage) ──
let orders = JSON.parse(localStorage.getItem('equipacion_orders') || '[]');
// Cada order: { id, player, items: [{id, articulo, color, talla, nombre, dorsal}] }

let itemIdCounter = 1;

// ── Utilidades ────────────────────────────────
function saveState() {
  localStorage.setItem('equipacion_orders', JSON.stringify(orders));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function showToast(msg, type = 'default') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.classList.remove('show'); }, 3000);
}

// ── Navegación ────────────────────────────────
function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(`view-${view}`).classList.add('active');
  document.getElementById(`btn-nav-${view === 'form' ? 'form' : 'dash'}`).classList.add('active');

  if (view === 'dashboard') {
    renderTable();
    updateKPIs();
  }
  updateBadge();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateBadge() {
  const totalItems = orders.reduce((acc, o) => acc + o.items.length, 0);
  const badge = document.getElementById('badge-count');
  if (totalItems > 0) {
    badge.textContent = totalItems;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ── Formulario: prendas ───────────────────────
let formItems = [];   // [{id, articulo, color, genero, talla, nombre, dorsal}]

function needsColor(articulo) {
  if (!articulo) return false;
  return articulo.includes('CAMISETA') || articulo.includes('PANTALON');
}

function needsGender(articulo) {
  if (!articulo) return false;
  // Chubasquero es unisex, Mochila/Gorra no suelen llevar género
  return articulo.includes('CAMISETA') || articulo.includes('PANTALON') || articulo === 'SUDADERA';
}

function createItemHTML(item) {
  const idx = formItems.indexOf(item) + 1;
  const hasColor = needsColor(item.articulo);
  const hasGender = needsGender(item.articulo);
  
  return `
    <div class="item-card" id="item-${item.id}">
      <div class="item-card-header">
        <div class="item-number">${idx}</div>
        <span class="item-title">Prenda #${idx}</span>
        <button class="btn-remove" title="Eliminar prenda" onclick="removeItem('${item.id}')">✕</button>
      </div>

      <div class="form-row cols-2" style="margin-bottom:14px">
        <div class="form-group">
          <label for="art-${item.id}">Artículo *</label>
          <select id="art-${item.id}" onchange="onArticleChange('${item.id}', this.value)">
            <option value="">— Elige artículo —</option>
            ${ARTICULO_NAMES.map(a => `<option value="${a}"${item.articulo === a ? ' selected' : ''}>${a}</option>`).join('')}
          </select>
        </div>
        <div class="form-group ${hasColor ? '' : 'hidden'}" id="group-color-${item.id}">
          <label for="col-${item.id}">Color *</label>
          <select id="col-${item.id}">
            <option value="">— Elige color —</option>
            ${COLORES.map(c => `<option value="${c}"${item.color === c ? ' selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row cols-2" style="margin-bottom:14px">
        <div class="form-group ${hasGender ? '' : 'hidden'}" id="group-gender-${item.id}">
          <label>Corte / Género *</label>
          <div class="gender-pills">
            <button type="button" class="gender-pill ${item.genero === 'CHICO' ? 'selected' : ''}" onclick="selectGender('${item.id}', 'CHICO', this)">CHICO</button>
            <button type="button" class="gender-pill ${item.genero === 'CHICA' ? 'selected' : ''}" onclick="selectGender('${item.id}', 'CHICA', this)">CHICA</button>
          </div>
        </div>
        <div class="form-group">
          <label>Talla *</label>
          <div class="size-pills" id="pills-${item.id}">
            ${TALLAS.map(t => `
              <button
                type="button"
                class="size-pill${item.talla === t ? ' selected' : ''}"
                onclick="selectTalla('${item.id}', '${t}', this)"
              >${t}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="form-row cols-2">
        <div class="form-group">
          <label for="nom-${item.id}">Nombre serigrafiado</label>
          <input id="nom-${item.id}" type="text" placeholder="Ej: CARLOS" value="${item.nombre}" />
        </div>
        <div class="form-group">
          <label for="dor-${item.id}">Dorsal</label>
          <input id="dor-${item.id}" type="text" inputmode="numeric" placeholder="Ej: 10" value="${item.dorsal}" />
        </div>
      </div>
    </div>
  `;
}

function renderFormItems() {
  const container = document.getElementById('items-container');
  container.innerHTML = formItems.map(createItemHTML).join('');
  document.getElementById('item-counter').textContent =
    formItems.length === 1 ? '1 prenda' : `${formItems.length} prendas`;
  updatePriceDisplay();
  setupFormListeners();
}

function onArticleChange(itemId, articulo) {
  const item = formItems.find(i => i.id === itemId);
  if (item) item.articulo = articulo;
  
  // Mostrar/Ocultar campos condicionales
  const colorGroup = document.getElementById(`group-color-${itemId}`);
  const genderGroup = document.getElementById(`group-gender-${itemId}`);
  
  if (needsColor(articulo)) colorGroup.classList.remove('hidden');
  else colorGroup.classList.add('hidden');
  
  if (needsGender(articulo)) genderGroup.classList.remove('hidden');
  else genderGroup.classList.add('hidden');
  
  updatePriceDisplay();
}

function selectGender(itemId, genero, btn) {
  const container = btn.parentElement;
  container.querySelectorAll('.gender-pill').forEach(p => p.classList.remove('selected'));
  btn.classList.add('selected');
  const item = formItems.find(i => i.id === itemId);
  if (item) item.genero = genero;
  updatePriceDisplay();
}

function selectTalla(itemId, talla, btn) {
  const container = document.getElementById(`pills-${itemId}`);
  container.querySelectorAll('.size-pill').forEach(p => p.classList.remove('selected'));
  btn.classList.add('selected');
  const item = formItems.find(i => i.id === itemId);
  if (item) item.talla = talla;
  updatePriceDisplay();
}

// Leer valores actuales del DOM para cada item
function readFormItems() {
  return formItems.map(item => {
    const articulo = document.getElementById(`art-${item.id}`)?.value || '';
    const color    = document.getElementById(`col-${item.id}`)?.value || '';
    const nombre   = document.getElementById(`nom-${item.id}`)?.value.trim() || '';
    const dorsal   = document.getElementById(`dor-${item.id}`)?.value.trim() || '';
    const talla    = item.talla || '';
    const genero   = item.genero || '';
    return { ...item, articulo, color, nombre, dorsal, talla, genero };
  });
}

// ── Lógica de Packs y Precios ─────────────────
function calculateOrderTotal(items) {
  let total = 0;
  const counts = {
    'CAMISETA JUEGO': 0,
    'PANTALON JUEGO': 0,
    'SUDADERA': 0,
    'GORRA': 0
  };

  // Otros artículos se cobran individualmente de entrada
  items.forEach(it => {
    if (counts.hasOwnProperty(it.articulo)) {
      counts[it.articulo]++;
    } else if (it.articulo) {
      total += ARTICULOS[it.articulo] || 0;
    }
  });

  let appliedPacks = [];

  // 1. Pack 4 Camisetas + 2 Pantalones + 1 Sudadera (118.69€)
  while (counts['CAMISETA JUEGO'] >= 4 && counts['PANTALON JUEGO'] >= 2 && counts['SUDADERA'] >= 1) {
    total += 118.69;
    counts['CAMISETA JUEGO'] -= 4;
    counts['PANTALON JUEGO'] -= 2;
    counts['SUDADERA'] -= 1;
    appliedPacks.push("Pack 4 Camisetas + 2 Pantalones + 1 Sudadera");
  }

  // 2. Pack 4 Camisetas + 2 Pantalones (88.78€)
  while (counts['CAMISETA JUEGO'] >= 4 && counts['PANTALON JUEGO'] >= 2) {
    total += 88.78;
    counts['CAMISETA JUEGO'] -= 4;
    counts['PANTALON JUEGO'] -= 2;
    appliedPacks.push("Pack 4 Camisetas + 2 Pantalones");
  }

  // 3. Pack 2 Camisetas + 1 Pantalón + 1 Sudadera (84.91€)
  while (counts['CAMISETA JUEGO'] >= 2 && counts['PANTALON JUEGO'] >= 1 && counts['SUDADERA'] >= 1) {
    total += 84.91;
    counts['CAMISETA JUEGO'] -= 2;
    counts['PANTALON JUEGO'] -= 1;
    counts['SUDADERA'] -= 1;
    appliedPacks.push("Pack Equipaje + Sudadera");
  }

  // 4. Pack 3 Camisetas + 1 Pantalón (65.62€)
  while (counts['CAMISETA JUEGO'] >= 3 && counts['PANTALON JUEGO'] >= 1) {
    total += 65.62;
    counts['CAMISETA JUEGO'] -= 3;
    counts['PANTALON JUEGO'] -= 1;
    appliedPacks.push("Pack 3 Camisetas + 1 Pantalón");
  }

  // 5. Pack 2 Camisetas + 1 Pantalón (55€ - Equipaje)
  while (counts['CAMISETA JUEGO'] >= 2 && counts['PANTALON JUEGO'] >= 1) {
    total += 55.00;
    counts['CAMISETA JUEGO'] -= 2;
    counts['PANTALON JUEGO'] -= 1;
    appliedPacks.push("Equipaje (2 Cam. + 1 Pant.)");
  }

  // 6. Pack 2 Gorras (7.72€)
  while (counts['GORRA'] >= 2) {
    total += 7.72;
    counts['GORRA'] -= 2;
    appliedPacks.push("Pack 2 Gorras");
  }

  // Resto de artículos sueltos que quedaron
  for (const art in counts) {
    total += counts[art] * ARTICULOS[art];
  }

  return { total, appliedPacks };
}

function updatePriceDisplay() {
  const items = readFormItems();
  const validItems = items.filter(it => it.articulo);
  
  const detailsContainer = document.getElementById('price-details');
  const totalPriceEl = document.getElementById('total-price');
  const packMsgEl = document.getElementById('pack-discount-msg');

  if (validItems.length === 0) {
    detailsContainer.innerHTML = '<p class="empty-price-msg">Añade prendas para ver el total</p>';
    totalPriceEl.textContent = '0.00€';
    packMsgEl.classList.add('hidden');
    return;
  }

  const { total, appliedPacks } = calculateOrderTotal(validItems);
  
  // Render details
  let html = '<ul class="price-list">';
  
  // List valid items
  validItems.forEach(it => {
    html += `<li><span>${it.articulo}</span> <span>${ARTICULOS[it.articulo].toFixed(2)}€</span></li>`;
  });
  
  html += '</ul>';
  
  detailsContainer.innerHTML = html;
  totalPriceEl.textContent = `${total.toFixed(2)}€`;

  if (appliedPacks.length > 0) {
    packMsgEl.classList.remove('hidden');
    // Optional: show which packs were applied
    // detailsContainer.innerHTML += `<p class="packs-summary">Packs detectados: ${appliedPacks.join(', ')}</p>`;
  } else {
    packMsgEl.classList.add('hidden');
  }
}

function setupFormListeners() {
  const form = document.getElementById('view-form');
  // Escuchar cambios en cualquier input/select para actualizar el precio
  form.querySelectorAll('select, input').forEach(el => {
    if (!el._hasListener) {
      el.addEventListener('change', updatePriceDisplay);
      el.addEventListener('input', updatePriceDisplay);
      el._hasListener = true;
    }
  });
}

// ── Submit de pedido ──────────────────────────
function submitOrder() {
  const playerName = document.getElementById('player-name').value.trim();

  if (!playerName) {
    showToast('⚠️ Escribe el nombre del jugador', 'error');
    document.getElementById('player-name').focus();
    return;
  }

  if (formItems.length === 0) {
    showToast('⚠️ Añade al menos una prenda', 'error');
    return;
  }

  const items = readFormItems();

  // Validaciones
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const num = i + 1;
    if (!it.articulo) { showToast(`⚠️ Prenda #${num}: elige artículo`, 'error'); return; }
    if (needsColor(it.articulo) && !it.color)    { showToast(`⚠️ Prenda #${num}: elige color`, 'error');    return; }
    if (needsGender(it.articulo) && !it.genero)   { showToast(`⚠️ Prenda #${num}: elige corte (chico/chica)`, 'error'); return; }
    if (!it.talla)    { showToast(`⚠️ Prenda #${num}: elige talla`, 'error');    return; }
  }

  const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'stripe';

  const order = {
    id: genId(),
    player: playerName,
    date: new Date().toLocaleString('es-ES'),
    payment: paymentMethod.toUpperCase(),
    items: items.map(it => ({
      id:       it.id,
      articulo: it.articulo,
      color:    it.color,
      talla:    it.talla,
      genero:   it.genero,
      nombre:   it.nombre,
      dorsal:   it.dorsal,
    })),
  };

  orders.push(order);
  saveState();

  // Mensaje final personalizado por pago
  let msg = '✅ Pedido enviado correctamente';
  if (paymentMethod === 'transferencia') {
    msg = '✅ Pedido registrado. Por favor, realiza la transferencia al ES12 3456...';
  } else if (paymentMethod === 'stripe' || paymentMethod === 'paypal') {
    msg = `✅ Pedido registrado. Redirigiendo a pasarela de pago (${paymentMethod})...`;
  }

  showToast(msg, 'success');

  // Reset form
  document.getElementById('player-name').value = '';
  formItems = [];
  renderFormItems();

  updateBadge();

  setTimeout(() => showView('dashboard'), 800);
}

// ── Dashboard ─────────────────────────────────
function updateKPIs() {
  const totalItems   = orders.reduce((acc, o) => acc + o.items.length, 0);
  const uniquePlayers = new Set(orders.map(o => o.player)).size;

  document.getElementById('kpi-total').textContent   = totalItems;
  document.getElementById('kpi-players').textContent = uniquePlayers;
  document.getElementById('kpi-orders').textContent  = orders.length;
}

function renderTable() {
  const filter = (document.getElementById('filter-input')?.value || '').toLowerCase();
  const tbody  = document.getElementById('orders-tbody');

  // Flatten: una fila por prenda
  const rows = [];
  orders.forEach(order => {
    order.items.forEach(item => {
      rows.push({ orderId: order.id, itemId: item.id, player: order.player, ...item });
    });
  });

  const filtered = filter
    ? rows.filter(r =>
        r.player.toLowerCase().includes(filter)   ||
        r.articulo.toLowerCase().includes(filter) ||
        r.color.toLowerCase().includes(filter)    ||
        r.nombre.toLowerCase().includes(filter)   ||
        String(r.dorsal).includes(filter)
      )
    : rows;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr id="empty-row">
        <td colspan="7" class="empty-cell">
          <div class="empty-state">
            <div class="empty-icon">${filter ? '🔎' : '📭'}</div>
            <p>${filter ? 'Sin resultados para "' + filter + '"' : 'Aún no hay pedidos registrados.'}</p>
            ${!filter ? `<button class="btn-ghost" onclick="showView('form')">Realizar primer pedido</button>` : ''}
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td class="td-player">${escHtml(r.player)}</td>
      <td class="td-article">
        <div style="font-weight:600">${escHtml(r.articulo)}</div>
        <div style="font-size:0.75rem; color:var(--text-3)">${escHtml(r.genero)}</div>
      </td>
      <td>
        ${needsColor(r.articulo) 
          ? `<span class="tag tag-color">${escHtml(r.color)}</span>` 
          : '<span style="color:var(--text-3)">—</span>'}
      </td>
      <td><span class="tag tag-size">${escHtml(r.talla)}</span></td>
      <td>${escHtml(r.nombre) || '<span style="color:var(--text-3)">—</span>'}</td>
      <td>
        ${r.dorsal
          ? `<div class="dorsal-chip">${escHtml(r.dorsal)}</div>`
          : '<span style="color:var(--text-3)">—</span>'}
      </td>
      <td>
        <button class="btn-delete-row" title="Eliminar prenda" onclick="confirmDeleteItem('${r.orderId}','${r.itemId}')">🗑</button>
      </td>
    </tr>
  `).join('');
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Eliminar item ─────────────────────────────
let pendingDelete = null;

function confirmDeleteItem(orderId, itemId) {
  pendingDelete = { orderId, itemId };
  document.getElementById('modal-text').textContent = '¿Seguro que quieres eliminar esta prenda del pedido?';
  document.getElementById('modal-overlay').classList.remove('hidden');
}

document.getElementById('modal-confirm').addEventListener('click', () => {
  if (!pendingDelete) return;
  const { orderId, itemId } = pendingDelete;
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.items = order.items.filter(i => i.id !== itemId);
    if (order.items.length === 0) {
      orders = orders.filter(o => o.id !== orderId);
    }
    saveState();
    renderTable();
    updateKPIs();
    updateBadge();
    showToast('🗑 Prenda eliminada', 'default');
  }
  closeModal();
});

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  pendingDelete = null;
}

// ── Exportar datos ────────────────────────────

/**
 * Genera las filas con las columnas exactas requeridas:
 * articulo | color | talla | nombre | dorsal | total
 *
 * "total" = número de unidades. Aquí cada fila es 1 prenda → total = 1.
 * Si en el futuro se añade campo cantidad, se puede ajustar.
 */
function buildExportRows() {
  const rows = [];
  orders.forEach(order => {
    order.items.forEach(item => {
      rows.push({
        articulo: item.articulo,
        color:    item.color,
        talla:    item.talla,
        nombre:   item.nombre,
        dorsal:   item.dorsal,
      });
    });
  });
  return rows;
}

function exportCSV() {
  const rows = buildExportRows();
  if (rows.length === 0) {
    showToast('⚠️ No hay pedidos para exportar', 'error');
    return;
  }

  const headers = ['articulo', 'color', 'talla', 'nombre', 'dorsal'];

  // Escape CSV cell (handles commas/quotes/newlines)
  const escCell = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csvLines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escCell(r[h])).join(',')),
  ];

  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, 'pedidos_equipacion.csv');
  showToast('✅ CSV exportado correctamente', 'success');
}

function exportExcel() {
  const rows = buildExportRows();
  if (rows.length === 0) {
    showToast('⚠️ No hay pedidos para exportar', 'error');
    return;
  }

  // SheetJS
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['articulo', 'color', 'talla', 'nombre', 'dorsal'],
  });

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 22 }, // articulo
    { wch: 12 }, // color
    { wch: 8  }, // talla
    { wch: 18 }, // nombre
    { wch: 8  }, // dorsal
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, 'pedidos_equipacion.xlsx');
  showToast('✅ Excel exportado correctamente', 'success');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 200);
}

function addItem() {
  const newItem = { id: genId(), articulo: '', color: '', genero: '', talla: '', nombre: '', dorsal: '' };
  formItems.push(newItem);
  renderFormItems();
  // Scroll al nuevo item
  setTimeout(() => {
    const el = document.getElementById(`item-${newItem.id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

function removeItem(id) {
  formItems = formItems.filter(i => i.id !== id);
  renderFormItems();
}

/**
 * Agregación para Chubasqueros y Pantalones de Paseo
 */
function buildAggregatedRows() {
  const aggregated = {}; // key: "articulo|genero|talla" -> count

  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.articulo === 'CHUBASQUERO' || item.articulo === 'PANTALON PASEO') {
        const gen = item.articulo === 'CHUBASQUERO' ? 'UNISEX' : (item.genero || '—');
        const key = `${item.articulo}|${gen}|${item.talla}`;
        aggregated[key] = (aggregated[key] || 0) + 1;
      }
    });
  });

  return Object.keys(aggregated).map(key => {
    const [articulo, genero, talla] = key.split('|');
    return { articulo, genero, talla, cantidad: aggregated[key] };
  });
}

function exportAggregated() {
  const rows = buildAggregatedRows();
  if (rows.length === 0) {
    showToast('⚠️ No hay chubasqueros o pantalones de paseo para exportar', 'error');
    return;
  }

  // SheetJS
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['articulo', 'genero', 'talla', 'cantidad'],
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resumen_Produccion');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, 'produccion_chubasqueros_paseo.xlsx');
  showToast('✅ Excel de producción exportado correctamente', 'success');
}

// ── Init ──────────────────────────────────────
(function init() {
  // Añadir la primera prenda vacía por defecto
  addItem();
  updateBadge();
})();
