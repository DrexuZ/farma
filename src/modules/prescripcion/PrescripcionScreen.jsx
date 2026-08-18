import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

// ─── PRESCRIPCIÓN AEMPS (referencia farmacéutica internacional) ──────────────
// Buscador de los 30.615 medicamentos de la Base de Datos de Prescripción de
// la AEMPS (España), generado desde los XML oficiales (tools/build_prescripcion.py).
// Búsqueda 100% client-side (sin API): carga on-demand de /data/prescripcion.json
// + diccionarios de apoyo. Referencia de solo lectura: no toca inventario.

// Cache a nivel módulo: sobrevive a desmontar/montar la pestaña
let cacheDatos = null;
let cachePromesa = null;

const normalizar = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function cargarDatos() {
  if (cacheDatos) return Promise.resolve(cacheDatos);
  if (!cachePromesa) {
    cachePromesa = Promise.all([
      fetch('/data/prescripcion.json').then((r) => r.json()),
      fetch('/data/prescripcion-dic.json').then((r) => r.json()),
    ]).then(([meds, dic]) => {
      // Índice de búsqueda precomputado: nombre + principios activos + laboratorio
      const indice = meds.map((m) =>
        normalizar(`${m.nom} ${m.pa} ${dic.labs[m.lt]?.n || ''}`)
      );
      cacheDatos = { meds, dic, indice };
      return cacheDatos;
    });
  }
  return cachePromesa;
}

// Definición de flags (orden alfabético, coincide con build_prescripcion.py)
const FLAGS = {
  R: { label: 'Con receta', cls: 'bg-red-100 text-red-700' },
  G: { label: 'Genérico (EFG)', cls: 'bg-emerald-100 text-emerald-700' },
  S: { label: 'Sustituible', cls: 'bg-teal-100 text-teal-700' },
  H: { label: 'Uso hospitalario', cls: 'bg-indigo-100 text-indigo-700' },
  P: { label: 'Psicotrópico', cls: 'bg-purple-100 text-purple-700' },
  E: { label: 'Estupefaciente', cls: 'bg-fuchsia-100 text-fuchsia-700' },
  B: { label: 'Biosimilar', cls: 'bg-cyan-100 text-cyan-700' },
  C: { label: 'Comercializado', cls: 'bg-green-100 text-green-700' },
  T: { label: 'Triángulo negro', cls: 'bg-gray-800 text-white' },
  O: { label: 'Huérfano', cls: 'bg-amber-100 text-amber-700' },
  D: { label: 'Afecta conducción', cls: 'bg-orange-100 text-orange-700' },
  M: { label: 'Control médico especial', cls: 'bg-rose-100 text-rose-700' },
  I: { label: 'Importación paralela', cls: 'bg-slate-100 text-slate-700' },
};

const LIMITE_PAGINA = 60;

export default function PrescripcionScreen() {
  const [datos, setDatos] = useState(null); // { meds, dic, indice }
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [filtroReceta, setFiltroReceta] = useState(''); // '' | 'R' | 'L'
  const [filtroGenerico, setFiltroGenerico] = useState(''); // '' | 'G' | 'M'
  const [filtroComercializado, setFiltroComercializado] = useState(''); // '' | 'C' | 'N'
  const [filtroHospitalario, setFiltroHospitalario] = useState(false);
  const [filtroBiosimilar, setFiltroBiosimilar] = useState(false);
  const [filtroAtc, setFiltroAtc] = useState(''); // letra nivel 1
  const [limite, setLimite] = useState(LIMITE_PAGINA);
  const [detalle, setDetalle] = useState(null); // medicamento seleccionado

  // Carga on-demand al montar
  useEffect(() => {
    let vivo = true;
    cargarDatos()
      .then((d) => { if (vivo) setDatos(d); })
      .catch(() => { if (vivo) setErrorCarga('No se pudo cargar la base de prescripción. Reintenta recargando la página.'); });
    return () => { vivo = false; };
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Grupos ATC nivel 1 (para el filtro)
  const gruposAtc = useMemo(() => {
    if (!datos) return [];
    return Object.entries(datos.dic.atc)
      .filter(([codigo]) => codigo.length === 1)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([codigo, desc]) => ({ codigo, desc }));
  }, [datos]);

  // Resultados filtrados
  const resultados = useMemo(() => {
    if (!datos) return [];
    const q = normalizar(busquedaAplicada);
    const terms = q ? q.split(/\s+/).filter(Boolean) : [];
    const out = [];
    for (let i = 0; i < datos.meds.length; i++) {
      const m = datos.meds[i];
      // Filtros
      if (filtroReceta === 'R' && !m.f.includes('R')) continue;
      if (filtroReceta === 'L' && m.f.includes('R')) continue;
      if (filtroGenerico === 'G' && !m.f.includes('G')) continue;
      if (filtroGenerico === 'M' && m.f.includes('G')) continue;
      if (filtroComercializado === 'C' && !m.f.includes('C')) continue;
      if (filtroComercializado === 'N' && m.f.includes('C')) continue;
      if (filtroHospitalario && !m.f.includes('H')) continue;
      if (filtroBiosimilar && !m.f.includes('B')) continue;
      if (filtroAtc && m.atc[0] !== filtroAtc) continue;
      // Búsqueda: todos los términos deben aparecer en el índice
      if (terms.length && !terms.every((t) => datos.indice[i].includes(t))) continue;
      out.push(m);
      if (out.length >= 2000) break; // tope de seguridad
    }
    return out;
  }, [datos, busquedaAplicada, filtroReceta, filtroGenerico, filtroComercializado, filtroHospitalario, filtroBiosimilar, filtroAtc]);

  // Reset del límite al cambiar búsqueda/filtros
  useEffect(() => { setLimite(LIMITE_PAGINA); }, [busquedaAplicada, filtroReceta, filtroGenerico, filtroComercializado, filtroHospitalario, filtroBiosimilar, filtroAtc]);

  // Cerrar detalle con Escape
  useEffect(() => {
    if (!detalle) return;
    const onKey = (e) => { if (e.key === 'Escape') setDetalle(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detalle]);

  const hayFiltros = busquedaAplicada || filtroReceta || filtroGenerico || filtroComercializado || filtroHospitalario || filtroBiosimilar || filtroAtc;

  const limpiarFiltros = () => {
    setBusqueda(''); setFiltroReceta(''); setFiltroGenerico(''); setFiltroComercializado('');
    setFiltroHospitalario(false); setFiltroBiosimilar(false); setFiltroAtc('');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (errorCarga) {
    return (
      <section className="h-full flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl border border-red-200 p-8 shadow-sm">
          <span className="text-5xl mb-3 block">⚠️</span>
          <p className="font-bold text-gray-800">{errorCarga}</p>
        </div>
      </section>
    );
  }

  if (!datos) {
    return (
      <section className="h-full flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-500">Cargando base de prescripción AEMPS (30.615 medicamentos)…</p>
      </section>
    );
  }

  const dic = datos.dic;
  const labTitular = (m) => dic.labs[m.lt]?.n || '—';
  const formaFarm = (m) => dic.ff[m.ff] || '—';
  const viasTxt = (m) => (m.vias ? m.vias.split(',').map((v) => dic.vias[v]).filter(Boolean).join(' · ') : '—');
  const sitReg = (m) => dic.sr[m.sr] || '—';
  const atcDesc = (m) => dic.atc[m.atc] || '';

  return (
    <section className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-800">💊 Prescripción AEMPS</h2>
          <p className="text-sm text-gray-500">
            Base de Datos de Prescripción de la Agencia Española del Medicamento · referencia profesional de 30.615 especialidades.
          </p>
        </div>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg whitespace-nowrap">Fuente: AEMPS · España</span>
      </div>

      {/* Búsqueda + filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre comercial, principio activo o laboratorio… (ej: amoxicilina, ibuprofeno, Pfizer)"
            className="w-full p-3 pr-24 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Dispensación</label>
            <select className="w-full mt-1 p-1.5 border border-gray-300 rounded-lg text-xs outline-none" value={filtroReceta} onChange={(e) => setFiltroReceta(e.target.value)}>
              <option value="">Todas</option>
              <option value="R">Con receta</option>
              <option value="L">Venta libre</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Tipo</label>
            <select className="w-full mt-1 p-1.5 border border-gray-300 rounded-lg text-xs outline-none" value={filtroGenerico} onChange={(e) => setFiltroGenerico(e.target.value)}>
              <option value="">Todos</option>
              <option value="G">Genérico (EFG)</option>
              <option value="M">Marca</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Estado</label>
            <select className="w-full mt-1 p-1.5 border border-gray-300 rounded-lg text-xs outline-none" value={filtroComercializado} onChange={(e) => setFiltroComercializado(e.target.value)}>
              <option value="">Todos</option>
              <option value="C">Comercializado</option>
              <option value="N">No comercializado</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Grupo ATC</label>
            <select className="w-full mt-1 p-1.5 border border-gray-300 rounded-lg text-xs outline-none" value={filtroAtc} onChange={(e) => setFiltroAtc(e.target.value)}>
              <option value="">Todos</option>
              {gruposAtc.map((g) => <option key={g.codigo} value={g.codigo}>{g.codigo} · {g.desc.slice(0, 28)}</option>)}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-1.5 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 accent-brand-500 mb-0.5" checked={filtroHospitalario} onChange={(e) => setFiltroHospitalario(e.target.checked)} />
            <span className="text-xs font-bold text-gray-600">Uso hospitalario</span>
          </label>
          <label className="flex items-end gap-2 pb-1.5 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 accent-brand-500 mb-0.5" checked={filtroBiosimilar} onChange={(e) => setFiltroBiosimilar(e.target.checked)} />
            <span className="text-xs font-bold text-gray-600">Biosimilar</span>
          </label>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-500 font-bold">
            {resultados.length === 2000 ? '2.000+ resultados (afina la búsqueda)' : `${resultados.length.toLocaleString('es-BO')} resultados`}
          </p>
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="text-[11px] font-bold text-brand-600 hover:text-brand-700">✕ Limpiar filtros</button>
          )}
        </div>
      </div>

      {/* Tabla de resultados */}
      {resultados.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
          <span className="text-5xl mb-3">💊</span>
          <p className="font-bold">Sin resultados</p>
          <p className="text-xs mt-1">Prueba con otro término o limpia los filtros.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm border border-gray-200/70">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 text-left z-10">
              <tr className="uppercase text-[9px] text-gray-500 font-bold tracking-wider">
                <th className="px-3 py-2">Medicamento</th>
                <th className="px-3 py-2">Principios activos</th>
                <th className="px-3 py-2">Laboratorio</th>
                <th className="px-3 py-2">ATC</th>
                <th className="px-3 py-2">Señales</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {resultados.slice(0, limite).map((m) => (
                <tr key={m.n} className="border-t border-gray-100 hover:bg-brand-50/50 transition-colors cursor-pointer" onClick={() => setDetalle(m)}>
                  <td className="px-3 py-2.5">
                    <p className="font-bold text-gray-800 leading-tight">{m.nom}</p>
                    <p className="text-[10px] text-gray-400">{m.con}</p>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[260px]">{m.pa || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{labTitular(m)}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700" title={atcDesc(m)}>{m.atc || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {m.f.includes('R') && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 mr-1">RECETA</span>}
                    {m.f.includes('G') && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 mr-1">EFG</span>}
                    {m.f.includes('H') && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 mr-1">HOSP</span>}
                    {m.f.includes('B') && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-100 text-cyan-700 mr-1">BIO</span>}
                    {!m.f.includes('C') && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-500">NO COMERC.</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={(e) => { e.stopPropagation(); setDetalle(m); }} className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold py-1 px-2.5 rounded-lg text-[10px] transition-all duration-200">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {resultados.length > limite && (
            <div className="p-3 text-center border-t border-gray-100">
              <button onClick={() => setLimite((l) => l + LIMITE_PAGINA)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-xl text-xs transition-all">
                Ver más ({(resultados.length - limite).toLocaleString('es-BO')} restantes)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL DETALLE ── */}
      {detalle && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in" onClick={() => setDetalle(null)}>
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[640px] max-w-full max-h-[90vh] overflow-y-auto animate-scale-in border border-gray-200/50" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4 gap-3">
              <div>
                <h3 className="text-lg font-black text-gray-800 leading-tight">{detalle.nom}</h3>
                <p className="text-xs text-gray-500 mt-1">{detalle.con}</p>
              </div>
              <button type="button" onClick={() => setDetalle(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2 shrink-0">✕</button>
            </div>

            {/* Badges de señales */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {detalle.f.split('').map((fl) => FLAGS[fl] && (
                <span key={fl} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${FLAGS[fl].cls}`}>{FLAGS[fl].label}</span>
              ))}
            </div>

            {/* Ficha técnica */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">⚗️ Principios activos</p>
                <p className="text-gray-800 font-bold">{detalle.pa || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">💊 Forma farmacéutica</p>
                <p className="text-gray-800 font-bold">{formaFarm(detalle)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">🏭 Laboratorio titular</p>
                <p className="text-gray-800 font-bold">{labTitular(detalle)}</p>
                {dic.labs[detalle.lt]?.l && <p className="text-[10px] text-gray-500">{dic.labs[detalle.lt].l}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">🚚 Comercializador</p>
                <p className="text-gray-800 font-bold">{dic.labs[detalle.lc]?.n || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">🧬 Código ATC</p>
                <p className="text-gray-800 font-bold">{detalle.atc}</p>
                {atcDesc(detalle) && <p className="text-[10px] text-gray-500">{atcDesc(detalle)}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">🩺 Vías de administración</p>
                <p className="text-gray-800 font-bold">{viasTxt(detalle)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">📋 Situación de registro</p>
                <p className="text-gray-800 font-bold">{sitReg(detalle)}</p>
                <p className="text-[10px] text-gray-500">Autorizado: {detalle.fa || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">🆔 Identificadores</p>
                <p className="text-gray-800 font-bold">Nº Nacional: {detalle.n}</p>
                <p className="text-[10px] text-gray-500">CIMA: {detalle.nd}</p>
              </div>
            </div>

            {/* Problemas de suministro */}
            {detalle.ps && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                <p className="text-[10px] font-black text-amber-700 uppercase mb-1">⚠️ Problemas de suministro</p>
                <p className="text-amber-800">{detalle.ps}</p>
              </div>
            )}

            {/* Documentación oficial */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <a
                href={`https://cima.aemps.es/cima/pdfs/es/ft/${detalle.nd}/${detalle.nd}_ft.pdf`}
                target="_blank" rel="noreferrer"
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs text-center transition-all active:scale-95 shadow-md"
              >
                📄 Ficha técnica (PDF)
              </a>
              <a
                href={`https://cima.aemps.es/cima/pdfs/es/p/${detalle.nd}/${detalle.nd}_p.pdf`}
                target="_blank" rel="noreferrer"
                className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs text-center transition-all active:scale-95 shadow-md"
              >
                📑 Prospecto (PDF)
              </a>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-3">
              Documentación alojada en CIMA (AEMPS). Datos de referencia — no sustituyen el criterio profesional.
            </p>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
