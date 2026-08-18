import { useState } from 'react';
import { apiPost } from '../../lib/api';

// ─── LOGIN HÍBRIDO DEL ECOSISTEMA FARMA NOVA ────────────────────────────────
// Flujo de 3 pasos:
//   1) Usuario + contraseña  → identifica a la persona, su rol y sucursales
//   2) Selector de sucursal  → solo si tiene varias asignadas (roles altos)
//   3) PIN + fondo inicial   → abre la caja ATADA a la sucursal del turno
//
// Al terminar escribe la sesión en localStorage con las MISMAS claves que
// consume el resto de la app (cajaAbierta, sesionCajaId, …) más las nuevas
// (usuarioId, sucursalId, sucursalNombre).

const PASOS = { CREDENCIALES: 1, SUCURSAL: 2, CAJA: 3 };

export default function LoginScreen({ onSesionIniciada }) {
  const [paso, setPaso] = useState(PASOS.CREDENCIALES);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Paso 1: credenciales
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usuario, setUsuario] = useState(null); // { id, nombreCompleto, rol, sucursales[] }

  // Paso 2: sucursal
  const [sucursalElegida, setSucursalElegida] = useState(null);

  // Paso 3: caja
  const [pin, setPin] = useState('');
  const [fondo, setFondo] = useState('');

  // ── Paso 1: validar credenciales ────────────────────────────────────────
  const iniciarSesion = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) return setError('Ingrese usuario y contraseña.');
    setCargando(true);
    try {
      const datos = await apiPost('/api/v1/Auth/login', { username: username.trim(), password });
      // Guardamos el JWT emitido por la API (lo usan todos los fetch vía fetchAuth/api.js)
      if (datos.token) localStorage.setItem('token', datos.token);
      setUsuario(datos);
      if (!datos.sucursales || datos.sucursales.length === 0) {
        setError('Su usuario no tiene sucursales asignadas. Contacte al administrador.');
      } else if (datos.sucursales.length === 1) {
        // Cajeros (o admin de una sola sucursal): directo a abrir caja
        setSucursalElegida(datos.sucursales[0]);
        setPaso(PASOS.CAJA);
      } else {
        setPaso(PASOS.SUCURSAL);
      }
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  // ── Paso 3: abrir caja atada a la sucursal ──────────────────────────────
  const abrirCaja = async (e) => {
    e.preventDefault();
    setError('');
    if (!pin.trim()) return setError('Ingrese su PIN de cajero.');
    setCargando(true);
    try {
      const datos = await apiPost('/api/v1/Caja/abrir', {
        pinAcceso: pin.trim(),
        montoApertura: parseFloat(fondo) || 0,
        sucursalId: sucursalElegida?.id || null,
      });

      // Persistimos la sesión con las claves que consume toda la app
      localStorage.setItem('cajaAbierta', 'true');
      localStorage.setItem('sesionCajaId', datos.sesionId || datos.SesionId);
      localStorage.setItem('cajeroNombre', datos.cajero || datos.Cajero || usuario.nombreCompleto);
      localStorage.setItem('rolUsuario', datos.rol || datos.Rol || usuario.rol);
      localStorage.setItem('fondoInicial', (parseFloat(fondo) || 0).toString());
      localStorage.setItem('ventasEfectivoTurno', '0');
      localStorage.setItem('usuarioId', usuario.id);
      localStorage.setItem('usuarioUsername', usuario.username);
      localStorage.setItem('sucursalId', sucursalElegida?.id || '');
      localStorage.setItem('sucursalNombre', sucursalElegida ? `${sucursalElegida.codigo} · ${sucursalElegida.nombre}` : '');

      onSesionIniciada();
    } catch (err) {
      setError(err.message || 'No se pudo abrir la caja.');
    } finally {
      setCargando(false);
    }
  };

  const volver = (aPaso) => { setError(''); setPaso(aPaso); };

  return (
    <div className="min-h-screen bg-brand-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Marca */}
        <div className="text-center mb-6 animate-fade-in-down">
          <img src="/logofarma.png" alt="FarmaGO" className="h-16 w-auto mx-auto mb-3 object-contain drop-shadow-lg" />
          <h1 className="text-3xl font-black text-white tracking-wider drop-shadow">FarmaGO</h1>
          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">
            {paso === PASOS.CREDENCIALES && 'Sistema de gestión de farmacias'}
            {paso === PASOS.SUCURSAL && `Hola, ${usuario?.nombreCompleto?.split(' ')[0] || ''}`}
            {paso === PASOS.CAJA && `${sucursalElegida?.codigo || ''} · ${sucursalElegida?.nombre || ''}`}
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-white/40 p-7 animate-scale-in">

          {/* Indicador de pasos */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[PASOS.CREDENCIALES, PASOS.SUCURSAL, PASOS.CAJA].map((n) => (
              <span key={n} className={`h-1.5 rounded-full transition-all duration-300 ${paso >= n ? 'w-8 bg-brand-500' : 'w-4 bg-gray-200'}`} />
            ))}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl px-3 py-2.5 animate-fade-in">
              ⚠️ {error}
            </div>
          )}

          {/* ── PASO 1: credenciales ── */}
          {paso === PASOS.CREDENCIALES && (
            <form onSubmit={iniciarSesion} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Usuario</label>
                <input
                  type="text"
                  autoFocus
                  autoComplete="username"
                  placeholder="ej: admin.scz"
                  className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Contraseña</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={cargando}
                className="bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-black py-3 rounded-xl text-sm shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {cargando ? 'Validando…' : 'Ingresar →'}
              </button>
            </form>
          )}

          {/* ── PASO 2: selector de sucursal ── */}
          {paso === PASOS.SUCURSAL && usuario && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500 font-bold text-center mb-1">
                ¿En qué sucursal operas hoy?
              </p>
              {usuario.sucursales.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSucursalElegida(s); setError(''); setPaso(PASOS.CAJA); }}
                  className="flex items-center justify-between gap-3 p-3.5 border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 rounded-xl text-left transition-all duration-150 active:scale-[0.99] group"
                >
                  <div>
                    <p className="text-sm font-black text-gray-800 group-hover:text-brand-700">{s.nombre}</p>
                    <p className="text-[11px] text-gray-500 font-semibold">{s.codigo} · {s.ciudad}</p>
                  </div>
                  <span className="text-brand-500 text-xl font-black opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
              ))}
              <button onClick={() => volver(PASOS.CREDENCIALES)} className="mt-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                ← Cambiar de usuario
              </button>
            </div>
          )}

          {/* ── PASO 3: abrir caja ── */}
          {paso === PASOS.CAJA && (
            <form onSubmit={abrirCaja} className="flex flex-col gap-4">
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-center">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Turno en</p>
                <p className="text-sm font-black text-blue-800">{sucursalElegida?.nombre}</p>
                <p className="text-[11px] text-blue-500 font-bold">{sucursalElegida?.codigo} · {sucursalElegida?.ciudad}</p>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">PIN de cajero</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  maxLength={8}
                  placeholder="••••"
                  className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-lg font-black tracking-[0.5em] text-center outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Fondo inicial (Bs.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  value={fondo}
                  onChange={(e) => setFondo(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={cargando}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black py-3 rounded-xl text-sm shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {cargando ? 'Abriendo caja…' : '🔓 Abrir caja y comenzar'}
              </button>
              {usuario?.sucursales?.length > 1 && (
                <button type="button" onClick={() => volver(PASOS.SUCURSAL)} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                  ← Elegir otra sucursal
                </button>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-blue-200/70 text-[10px] font-bold mt-5 tracking-wider">
          FarmaNova · Ecosistema NovaSolum
        </p>
      </div>
    </div>
  );
}