import { useState, useEffect, useRef } from 'react';

const moleculasIniciales = [
  "Paracetamol",
  "Ibuprofeno",
  "Amoxicilina",
  "Diclofenaco",
  "Loratadina",
  "Omeprazol",
  "Losartán"
];

const concentracionesIniciales = [
  "10 mg",
  "50 mg",
  "100 mg",
  "400 mg",
  "500 mg",
  "800 mg",
  "1 g",
  "500 mg / 5 ml"
];

const presentacionesIniciales = [
  "Caja x 10 Comprimidos",
  "Caja x 20 Comprimidos",
  "Caja x 50 Comprimidos",
  "Caja x 100 Comprimidos",
  "Frasco Jarabe 100ml",
  "Frasco Jarabe 120ml",
  "Ampolla Inyectable",
  "Tubo Crema/Ungüento",
  "Gotas"
];

// ─── MOTOR DE BÚSQUEDA INTELIGENTE PARA FARMACIA ──────────────────────────────
// Normaliza acentos/mayúsculas para que el cajero pueda escribir "paracetamol"
// y encontrar "Paracetamól", "PARACETAMOL", etc.
const normalizarTexto = (texto) => String(texto ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

// Puntúa cada producto contra la consulta. Devuelve -1 si NO coincide,
// 0+ si coincide (mayor = más relevante). Busca en nombre comercial,
// nombre genérico, concentración, presentación, SKU, código de barras y marca.
const puntuarProducto = (producto, consulta) => {
  const tokens = consulta.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  const campos = {
    nombre: normalizarTexto(producto.nombre),
    generico: normalizarTexto(producto.nombreGenerico),
    concentracion: normalizarTexto(producto.concentracion),
    presentacion: normalizarTexto(producto.presentacion),
    sku: normalizarTexto(producto.sku),
    codigo: normalizarTexto(producto.codigoBarras),
    marca: normalizarTexto(producto.marca)
  };
  const textoCompleto = Object.values(campos).join(' ');

  // TODAS las palabras de la consulta deben aparecer en algún campo
  if (!tokens.every((token) => textoCompleto.includes(token))) return -1;

  let puntaje = 0;
  const consultaNormalizada = consulta.trim();
  if (campos.nombre.includes(consultaNormalizada)) puntaje += 500;
  if (campos.generico.includes(consultaNormalizada)) puntaje += 300;
  if (campos.nombre.includes(tokens[0])) puntaje += 100;
  if (campos.generico.includes(tokens[0])) puntaje += 80;
  tokens.forEach((token) => {
    if (campos.nombre.includes(token)) puntaje += 10;
    if (campos.generico.includes(token)) puntaje += 8;
    if (campos.sku.includes(token)) puntaje += 6;
    if (campos.codigo.includes(token)) puntaje += 6;
    const posicion = textoCompleto.indexOf(token);
    if (posicion >= 0) puntaje += Math.max(0, 10 - posicion * 0.05);
  });

  // Los productos agotados quedan detrás de los disponibles ante empates
  return puntaje + (producto.stock > 0 ? 20 : 0);
};

function CreatableSelect({ label, options: initialOptions, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState(initialOptions);
  const containerRef = useRef(null);

  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val) => {
    onChange(val);
    setSearch('');
    setIsOpen(false);
  };

  const handleCreate = () => {
    const trimmed = search.trim();
    if (trimmed) {
      if (!options.some(o => o.toLowerCase() === trimmed.toLowerCase())) {
        const newOptions = [...options, trimmed];
        setOptions(newOptions);
      }
      onChange(trimmed);
      setSearch('');
      setIsOpen(false);
    }
  };

  const showCreateOption = search.trim() !== '' && !options.some(o => o.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="relative text-left" ref={containerRef}>
      <label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>
      <div className="relative mt-1">
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            className="w-full p-2 pr-8 border border-gray-300 rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be] text-gray-800"
            value={isOpen ? search : (value || '')}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setSearch(value || '');
              setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (showCreateOption) {
                  handleCreate();
                } else if (filteredOptions.length > 0) {
                  handleSelect(filteredOptions[0]);
                }
              } else if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-2 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            onClick={() => {
              if (!isOpen) setSearch(value || '');
              setIsOpen(!isOpen);
            }}
          >
            <span className="text-[8px]">{isOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {isOpen && (
          <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
            {filteredOptions.map((option, idx) => (
              <div
                key={idx}
                className={`p-2 text-xs cursor-pointer hover:bg-gray-100 ${value === option ? 'bg-blue-50 font-bold text-[#1b6f8f]' : 'text-gray-700'}`}
                onClick={() => handleSelect(option)}
              >
                {option}
              </div>
            ))}
            {showCreateOption && (
              <div
                className="p-2 text-xs cursor-pointer bg-green-50 hover:bg-green-100 text-green-700 font-bold border-t border-green-100"
                onClick={handleCreate}
              >
                ✨ Añadir "{search.trim()}"
              </div>
            )}
            {filteredOptions.length === 0 && !showCreateOption && (
              <div className="p-2 text-xs text-gray-400 italic text-center">No hay opciones</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetalleFila({ etiqueta, valor, expandido }) {
  return (
    <div className={expandido ? "col-span-2" : ""}>
      <dt className="font-bold text-gray-500 uppercase">{etiqueta}</dt>
      <dd className="text-gray-800 mt-0.5 break-words">{valor || '—'}</dd>
    </div>
  );
}

function App() {
  // --------------------------------------------------------------------------
  // 1. ESTADOS DE CONTROL PRINCIPAL Y SESIÓN
  // --------------------------------------------------------------------------
  const [pantallaBloqueada, setPantallaBloqueada] = useState(localStorage.getItem('cajaAbierta') !== 'true');
  const [sesionCajaId, setSesionCajaId] = useState(localStorage.getItem('sesionCajaId') || null);
  const [cajeroNombre, setCajeroNombre] = useState(localStorage.getItem('cajeroNombre') || '');
  const [rolUsuario, setRolUsuario] = useState(localStorage.getItem('rolUsuario') || 'CAJERO');

  const [fondoInicial, setFondoInicial] = useState(parseFloat(localStorage.getItem('fondoInicial')) || 0);
  const [ventasEfectivoTurno, setVentasEfectivoTurno] = useState(parseFloat(localStorage.getItem('ventasEfectivoTurno')) || 0);

  const [pinAcceso, setPinAcceso] = useState('');
  const [montoApertura, setMontoApertura] = useState('');
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [errorLogin, setErrorLogin] = useState('');

  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [montoCierreReal, setMontoCierreReal] = useState('');
  const [cargandoCierre, setCargandoCierre] = useState(false);
  const [reporteCierre, setReporteCierre] = useState(null);

  const [pestañaActiva, setPestañaActiva] = useState('pos');

  // --------------------------------------------------------------------------
  // 2. ESTADOS DE INVENTARIO Y CATÁLOGO
  // --------------------------------------------------------------------------
  const [alertasLotes, setAlertasLotes] = useState([]);
  const [cargandoLotes, setCargandoLotes] = useState(false);

  const [mostrarModalIngreso, setMostrarModalIngreso] = useState(false);
  const [productosLookup, setProductosLookup] = useState([]);
  const [formularioLote, setFormularioLote] = useState({
    productoId: '',
    numeroLote: '',
    fechaVencimiento: '',
    cantidad: '',
    costoUnitario: ''
  });
  const [cargandoGuardarLote, setCargandoGuardarLote] = useState(false);

  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [cargandoGuardarProducto, setCargandoGuardarProducto] = useState(false);
  const [formularioProducto, setFormularioProducto] = useState({
    sku: '',
    codigoBarras: '',
    nombreComercial: '',
    nombreGenerico: '',
    concentracion: '',
    presentacion: '',
    precioVenta: '',
    precioCompra: '',
    fechaActualizacionPrecio: new Date().toISOString().substring(0, 10),
    stockMinimo: '5',
    controlado: false,
    categoriaId: '',
    fotoUrl: '',
    marca: '',
    distribuidor: '',
    paisOrigen: '',
    registroSanitario: '',
    composicion: ''
  });

  const [subTabInventario, setSubTabInventario] = useState('lotes'); // 'lotes' o 'productos'
  const [productosMaestros, setProductosMaestros] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [productoEditandoId, setProductoEditandoId] = useState(null); // null = nuevo, string = id para editar

  const [modalAjuste, setModalAjuste] = useState({ visible: false, lote: null, variacion: '', motivo: 'MERMA_CADUCIDAD' });
  const [tipoAjuste, setTipoAjuste] = useState('VARIACION'); // [NEW] 'VARIACION' o 'ABSOLUTO'
  const [cargandoAjuste, setCargandoAjuste] = useState(false);

  const [catalogo, setCatalogo] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // --------------------------------------------------------------------------
  // 3. ESTADOS DE TRANSACCIONES Y CLIENTES
  // --------------------------------------------------------------------------
  const [carrito, setCarrito] = useState([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteNitCi, setClienteNitCi] = useState('');
  const [clienteId, setClienteId] = useState(null);
  const [estadoCliente, setEstadoCliente] = useState('');
  const [historialCompras, setHistorialCompras] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [mostrarModalQR, setMostrarModalQR] = useState(false);
  const [ticketVenta, setTicketVenta] = useState(null);

  // --------------------------------------------------------------------------
  // 4. ESTADOS DE REPORTES Y AUDITORÍA
  // --------------------------------------------------------------------------
  const [datosDashboard, setDatosDashboard] = useState(null);
  const [cargandoDashboard, setCargandoDashboard] = useState(false);
  const [errorDashboard, setErrorDashboard] = useState(null); // [NEW] Manejo de error de dashboard

  const [listaVentas, setListaVentas] = useState([]);
  const [cargandoListaVentas, setCargandoListaVentas] = useState(false);
  const [busquedaVentas, setBusquedaVentas] = useState('');
  const [paginaVentas, setPaginaVentas] = useState(1);
  const itemsPorPagina = 12;

  const [historialCajas, setHistorialCajas] = useState([]);

  // [NEW] Filtros dinámicos para Ventas
  const [filtroMetodoVenta, setFiltroMetodoVenta] = useState('TODOS');
  const [filtroEstadoVenta, setFiltroEstadoVenta] = useState('TODOS');

  // [NEW] Filtros dinámicos para POS Catalog
  const [filtroRecetaPOS, setFiltroRecetaPOS] = useState('TODOS'); // 'TODOS', 'LIBRE', 'CONTROLADO'
  const [ordenPrecioPOS, setOrdenPrecioPOS] = useState('NINGUNO'); // 'NINGUNO', 'ASC', 'DESC'

  // [NEW] Filtros dinámicos para Inventario (Lotes)
  const [busquedaLotes, setBusquedaLotes] = useState('');
  const [filtroEstadoLote, setFiltroEstadoLote] = useState('TODOS'); // 'TODOS', 'VENCIDO', 'CRÍTICO', 'ADVERTENCIA', 'BUENO'

  // [NEW] Filtros dinámicos para Inventario (Medicamentos Base)
  const [busquedaProductosBase, setBusquedaProductosBase] = useState('');
  const [filtroRecetaBase, setFiltroRecetaBase] = useState('TODOS'); // 'TODOS', 'LIBRE', 'CONTROLADO'

  // [NEW] Categorías dinámicas, fotos referenciales y búsqueda de imágenes
  const [categorias, setCategorias] = useState([]);
  const [categoriaActivaPOS, setCategoriaActivaPOS] = useState('TODOS'); // 'TODOS' o id de categoría
  const [vistaPOS, setVistaPOS] = useState('categorias'); // 'categorias' (grid) o 'productos' (drill-down)
  const [cargandoCategorias, setCargandoCategorias] = useState(false);

  const [modalCategorias, setModalCategorias] = useState({ visible: false, editando: null });
  const [formularioCategoria, setFormularioCategoria] = useState({ nombre: '', icono: '🏷️', orden: 0 });
  const [cargandoGuardarCategoria, setCargandoGuardarCategoria] = useState(false);
  const [cargandoEliminarCategoria, setCargandoEliminarCategoria] = useState(false);

  const [modalBuscarImagen, setModalBuscarImagen] = useState({ visible: false, productoId: null, productoNombre: '', consulta: '' });
  const [resultadosImagenes, setResultadosImagenes] = useState([]);
  const [cargandoImagenes, setCargandoImagenes] = useState(false);
  const [usandoImagen, setUsandoImagen] = useState(false);

  // [NEW] Edición rápida de foto/categoría desde el POS
  const [modalEdicionRapida, setModalEdicionRapida] = useState({ visible: false, producto: null });
  const [fotoRapida, setFotoRapida] = useState(null);
  const [categoriaRapida, setCategoriaRapida] = useState('');
  const [guardandoRapida, setGuardandoRapida] = useState(false);

  // [NEW] Detalle completo del producto (desde el POS)
  const [modalDetalleProducto, setModalDetalleProducto] = useState(null);

  // [NEW] CRM Médico: Proveedores, Visitadores y Seguimientos
  const [subTabCRM, setSubTabCRM] = useState('proveedores'); // 'proveedores' | 'visitadores' | 'seguimientos'
  const [proveedores, setProveedores] = useState([]);
  const [visitadores, setVisitadores] = useState([]);
  const [seguimientos, setSeguimientos] = useState([]);
  const [proximosSeguimientos, setProximosSeguimientos] = useState([]);
  const [cargandoCRM, setCargandoCRM] = useState(false);
  const [modalProveedor, setModalProveedor] = useState({ visible: false, editando: null });
  const [formularioProveedor, setFormularioProveedor] = useState({ nombre: '', tipo: 'LABORATORIO', contactoPrincipal: '', telefono: '', email: '', direccion: '', activo: true });
  const [modalVisitador, setModalVisitador] = useState({ visible: false, editando: null });
  const [formularioVisitador, setFormularioVisitador] = useState({ nombre: '', empresa: '', telefono: '', email: '', zona: '', activo: true });
  const [modalSeguimiento, setModalSeguimiento] = useState({ visible: false, editando: null, entidadTipo: 'VISITADOR', entidadId: null, entidadNombre: '' });
  const [formularioSeguimiento, setFormularioSeguimiento] = useState({ fecha: '', tipo: 'VISITA', asunto: '', notas: '', resultado: '', proximoSeguimiento: '' });
  const [cargandoGuardarCRM, setCargandoGuardarCRM] = useState(false);
  const [historialSeguimientos, setHistorialSeguimientos] = useState([]);
  const [modalHistorial, setModalHistorial] = useState({ visible: false, entidadTipo: null, entidadId: null, entidadNombre: '' });

  // [NEW] Foto pendiente en el modal de producto (se aplica al guardar). tipos: 'archivo' | 'url' | 'quitar'
  const [fotoPendiente, setFotoPendiente] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // [NEW] Estados para Editar/Anular Ventas
  const [ventaEditando, setVentaEditando] = useState(null);
  const [mostrarModalEditarVenta, setMostrarModalEditarVenta] = useState(false);
  const [formularioEditarVenta, setFormularioEditarVenta] = useState({ clienteNombre: '', clienteNitCi: '', tipoPago: 'EFECTIVO' });
  const [cargandoEditarVenta, setCargandoEditarVenta] = useState(false);

  const [ventaAnulando, setVentaAnulando] = useState(null);
  const [mostrarModalAnularVenta, setMostrarModalAnularVenta] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [cargandoAnulacion, setCargandoAnulacion] = useState(false);

  // 🔴 URL dinámica de la API
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5169';

  // --------------------------------------------------------------------------
  // 5. OPERACIONES DE CONTROL DE CAJA
  // --------------------------------------------------------------------------
  const manejarAperturaCaja = async (e) => {
    e.preventDefault();
    setCargandoLogin(true);
    setErrorLogin('');
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Caja/abrir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinAcceso: pinAcceso, montoApertura: parseFloat(montoApertura) || 0 })
      });
      if (respuesta.ok) {
        const datos = await respuesta.json();
        const fondo = parseFloat(montoApertura) || 0;

        // 🔴 BLINDAJE DE SEGURIDAD: Acepta tanto 'rol' como 'Rol' desde el servidor
        const rolDetectado = datos.rol || datos.Rol || 'CAJERO';

        localStorage.setItem('cajaAbierta', 'true');
        localStorage.setItem('sesionCajaId', datos.sesionId);
        localStorage.setItem('cajeroNombre', datos.cajero);
        localStorage.setItem('fondoInicial', fondo.toString());
        localStorage.setItem('ventasEfectivoTurno', '0');
        localStorage.setItem('rolUsuario', rolDetectado);

        setRolUsuario(rolDetectado);
        setFondoInicial(fondo);
        setVentasEfectivoTurno(0);
        setMontoApertura('');
        setSesionCajaId(datos.sesionId);
        setCajeroNombre(datos.cajero);
        setPantallaBloqueada(false);
      } else {
        const err = await respuesta.json();
        setErrorLogin(err.error || 'PIN incorrecto o inactivo');
      }
    } catch (error) {
      setErrorLogin('Error de conexión con el servidor.');
    } finally {
      setCargandoLogin(false);
    }
  };

  const manejarCierreCaja = async (e) => {
    e.preventDefault();
    setCargandoCierre(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Caja/cerrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesionId: sesionCajaId, montoCierreReal: parseFloat(montoCierreReal) || 0 })
      });
      if (respuesta.ok) {
        const informe = await respuesta.json();
        setReporteCierre(informe);
      } else {
        const errText = await respuesta.text();
        alert(`❌ Servidor C# dice:\n\n${errText}`);
        if (errText.includes("no existe") || errText.includes("ya está cerrada")) {
          // Forzar bloqueo local y limpieza de caché si el servidor ya cerró o invalidó la sesión
          confirmarBloqueo();
        }
      }
    } catch (error) {
      alert(`⚠️ Excepción en React: ${error.message}`);
    } finally {
      setCargandoCierre(false);
    }
  };

  const confirmarBloqueo = () => {
    localStorage.removeItem('cajaAbierta');
    localStorage.removeItem('sesionCajaId');
    localStorage.removeItem('cajeroNombre');
    localStorage.removeItem('fondoInicial');
    localStorage.removeItem('ventasEfectivoTurno');
    localStorage.removeItem('rolUsuario');

    setFondoInicial(0);
    setVentasEfectivoTurno(0);
    setRolUsuario('CAJERO');
    setPantallaBloqueada(true);
    setSesionCajaId(null);
    setCajeroNombre('');
    setPinAcceso('');
    setMontoApertura('');
    setMontoCierreReal('');
    setMostrarModalCierre(false);
    setReporteCierre(null);
    setCarrito([]);
    setPestañaActiva('pos');
  };

  // --------------------------------------------------------------------------
  // 6. SOLICITUDES DE CARGA DE DATOS
  // --------------------------------------------------------------------------
  const cargarCatalogo = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Pos/catalogo`);
      if (respuesta.ok) { const datos = await respuesta.json(); setCatalogo(datos); }
    } catch (error) { console.error(error); } finally { setCargando(false); }
  };

  const cargarAlertasLotes = async () => {
    setCargandoLotes(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Inventario/alertas-vencimiento`);
      if (respuesta.ok) { const datos = await respuesta.json(); setAlertasLotes(datos); }
    } catch (error) { console.error(error); } finally { setCargandoLotes(false); }
  };

  const cargarDashboard = async () => {
    setCargandoDashboard(true);
    setErrorDashboard(null);
    try {
      const [resDash, resCajas] = await Promise.all([
        fetch(`${API_URL}/api/v1/Reportes/dashboard`),
        fetch(`${API_URL}/api/v1/Caja/historial`)
      ]);
      if (!resDash.ok) throw new Error("Fallo al cargar las métricas gerenciales.");
      if (!resCajas.ok) throw new Error("Fallo al cargar el historial de arqueos de caja.");
      
      const datos = await resDash.json();
      const datosCajas = await resCajas.json();
      
      setDatosDashboard(datos);
      setHistorialCajas(datosCajas);
    } catch (error) {
      console.error(error);
      setErrorDashboard(error.message || "Error de conexión con el servidor.");
    } finally {
      setCargandoDashboard(false);
    }
  };

  const cargarHistorialVentas = async () => {
    setCargandoListaVentas(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Ventas/historial`);
      if (respuesta.ok) { const datos = await respuesta.json(); setListaVentas(datos); setPaginaVentas(1); }
    } catch (error) { console.error(error); } finally { setCargandoListaVentas(false); }
  };

  // --------------------------------------------------------------------------
  // 6.5. CATEGORÍAS, FOTOS REFERENCIALES Y BÚSQUEDA DE IMÁGENES
  // --------------------------------------------------------------------------
  const cargarCategorias = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Categorias`);
      if (respuesta.ok) { const datos = await respuesta.json(); setCategorias(datos); }
    } catch (error) { console.error(error); } finally { setCargandoCategorias(false); }
  };

  const abrirModalCategorias = () => {
    setFormularioCategoria({ nombre: '', icono: '🏷️', orden: categorias.length + 1 });
    setModalCategorias({ visible: true, editando: null });
    cargarCategorias();
  };

  const iniciarEdicionCategoria = (categoria) => {
    setFormularioCategoria({ nombre: categoria.nombre, icono: categoria.icono || '🏷️', orden: categoria.orden });
    setModalCategorias({ visible: true, editando: categoria });
  };

  const guardarCategoria = async (e) => {
    e.preventDefault();
    if (!formularioCategoria.nombre.trim()) return alert("Debe indicar el nombre de la categoría.");
    setCargandoGuardarCategoria(true);
    try {
      const url = modalCategorias.editando
        ? `${API_URL}/api/v1/Categorias/${modalCategorias.editando.id}`
        : `${API_URL}/api/v1/Categorias`;
      const metodo = modalCategorias.editando ? 'PUT' : 'POST';
      const respuesta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formularioCategoria.nombre,
          icono: formularioCategoria.icono,
          orden: parseInt(formularioCategoria.orden) || 0
        })
      });
      if (respuesta.ok) {
        alert(modalCategorias.editando ? "✅ Categoría actualizada." : "✅ Categoría creada.");
        setModalCategorias({ visible: false, editando: null });
        cargarCategorias();
      } else {
        const err = await respuesta.json();
        alert(`❌ ${err.error || 'No se pudo guardar la categoría.'}`);
      }
    } catch { alert("⚠️ Error de conexión."); } finally { setCargandoGuardarCategoria(false); }
  };

  const manejarEliminarCategoria = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría? Solo se podrá si no tiene productos asignados.')) return;
    setCargandoEliminarCategoria(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Categorias/${id}`, { method: 'DELETE' });
      if (respuesta.ok) {
        alert("🗑️ Categoría eliminada.");
        cargarCategorias();
      } else {
        const err = await respuesta.json();
        alert(`❌ ${err.error || 'No se pudo eliminar la categoría.'}`);
      }
    } catch { alert("⚠️ Error de conexión."); } finally { setCargandoEliminarCategoria(false); }
  };

  const buscarImagenesEnInternet = async (consulta) => {
    setCargandoImagenes(true);
    setResultadosImagenes([]);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Productos/buscar-imagenes?q=${encodeURIComponent(consulta)}`);
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setResultadosImagenes(datos);
      } else {
        const err = await respuesta.json();
        alert(`❌ ${err.error || 'No se pudieron buscar imágenes.'}`);
      }
    } catch { alert("⚠️ Error de conexión al buscar imágenes."); } finally { setCargandoImagenes(false); }
  };

  const subirFotoProducto = async (productoId, archivo) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    const respuesta = await fetch(`${API_URL}/api/v1/Productos/${productoId}/foto`, {
      method: 'POST',
      body: formData
    });
    if (respuesta.ok) {
      const datos = await respuesta.json();
      return datos.fotoUrl;
    }
    const err = await respuesta.json();
    throw new Error(err.error || 'No se pudo subir la foto.');
  };

  const asignarFotoUrlProducto = async (productoId, url) => {
    const respuesta = await fetch(`${API_URL}/api/v1/Productos/${productoId}/foto-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (respuesta.ok) {
      const datos = await respuesta.json();
      return datos.fotoUrl;
    }
    const err = await respuesta.json();
    throw new Error(err.error || 'No se pudo guardar la foto.');
  };

  const eliminarFotoProducto = async (productoId) => {
    const respuesta = await fetch(`${API_URL}/api/v1/Productos/${productoId}/foto`, { method: 'DELETE' });
    if (!respuesta.ok) {
      const err = await respuesta.json();
      throw new Error(err.error || 'No se pudo eliminar la foto.');
    }
  };

  const cambiarCategoriaProducto = async (productoId, categoriaId) => {
    const respuesta = await fetch(`${API_URL}/api/v1/Productos/${productoId}/categoria`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoriaId: categoriaId || null })
    });
    if (!respuesta.ok) {
      const err = await respuesta.json();
      throw new Error(err.error || 'No se pudo cambiar la categoría.');
    }
  };

  const aplicarImagenBuscada = async (imagen) => {
    const { productoId } = modalBuscarImagen;
    setUsandoImagen(true);
    try {
      if (productoId) {
        const nuevoUrl = await asignarFotoUrlProducto(productoId, imagen.url);
        setFotoRapida(nuevoUrl);
        cargarCatalogo();
        cargarProductosMaestros();
      } else {
        setFotoPendiente({ tipo: 'url', datos: imagen.url });
      }
      setModalBuscarImagen({ visible: false, productoId: null, productoNombre: '', consulta: '' });
      setResultadosImagenes([]);
    } catch (error) { alert(`❌ ${error.message}`); } finally { setUsandoImagen(false); }
  };

  // Aplica una foto pendiente a un producto ya guardado (tras crear/editar)
  const aplicarFotoPendienteAlProducto = async (productoId) => {
    if (!fotoPendiente) return;
    setSubiendoFoto(true);
    try {
      if (fotoPendiente.tipo === 'archivo') {
        await subirFotoProducto(productoId, fotoPendiente.datos);
      } else if (fotoPendiente.tipo === 'url') {
        await asignarFotoUrlProducto(productoId, fotoPendiente.datos);
      } else if (fotoPendiente.tipo === 'quitar') {
        await eliminarFotoProducto(productoId);
      }
      setFotoPendiente(null);
    } catch (error) {
      alert(`⚠️ El producto se guardó pero no se pudo aplicar la foto: ${error.message}`);
    } finally {
      setSubiendoFoto(false);
    }
  };

  // [NEW] Edición rápida de foto/categoría desde el POS
  const abrirEdicionRapida = (producto) => {
    setModalEdicionRapida({ visible: true, producto });
    setFotoRapida(producto.fotoUrl || null);
    setCategoriaRapida(producto.categoriaId || '');
  };

  const manejarSubirFotoRapida = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setSubiendoFoto(true);
    try {
      const nuevoUrl = await subirFotoProducto(modalEdicionRapida.producto.id, archivo);
      setFotoRapida(nuevoUrl);
      cargarCatalogo();
      cargarProductosMaestros();
    } catch (error) { alert(`❌ ${error.message}`); }
    finally { setSubiendoFoto(false); e.target.value = ''; }
  };

  const abrirBuscadorDesdeRapida = () => {
    setModalBuscarImagen({ visible: true, productoId: modalEdicionRapida.producto.id, productoNombre: modalEdicionRapida.producto.nombre, consulta: modalEdicionRapida.producto.nombre });
    setResultadosImagenes([]);
  };

  const manejarQuitarFotoRapida = async () => {
    setSubiendoFoto(true);
    try {
      await eliminarFotoProducto(modalEdicionRapida.producto.id);
      setFotoRapida(null);
      cargarCatalogo();
      cargarProductosMaestros();
    } catch (error) { alert(`❌ ${error.message}`); }
    finally { setSubiendoFoto(false); }
  };

  const guardarEdicionRapida = async () => {
    setGuardandoRapida(true);
    try {
      await cambiarCategoriaProducto(modalEdicionRapida.producto.id, categoriaRapida);
      setModalEdicionRapida({ visible: false, producto: null });
      cargarCatalogo();
      cargarProductosMaestros();
    } catch (error) { alert(`❌ ${error.message}`); }
    finally { setGuardandoRapida(false); }
  };

  // [NEW] Búsqueda de imágenes desde el modal de producto (foto pendiente)
  const abrirBuscadorDesdeModal = () => {
    setModalBuscarImagen({ visible: true, productoId: null, productoNombre: formularioProducto.nombreComercial, consulta: formularioProducto.nombreComercial });
    setResultadosImagenes([]);
  };

  // [NEW] Handlers para Edición y Anulación de Ventas
  const iniciarEdicionVenta = (venta) => {
    setVentaEditando(venta);
    setFormularioEditarVenta({
      clienteNombre: venta.cliente,
      clienteNitCi: venta.nit,
      tipoPago: venta.metodo
    });
    setMostrarModalEditarVenta(true);
  };

  const guardarEdicionVenta = async (e) => {
    e.preventDefault();
    setCargandoEditarVenta(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Ventas/${ventaEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNombre: formularioEditarVenta.clienteNombre,
          clienteNitCi: formularioEditarVenta.clienteNitCi,
          tipoPago: formularioEditarVenta.tipoPago
        })
      });
      if (respuesta.ok) {
        alert("✅ Venta editada con éxito.");
        setMostrarModalEditarVenta(false);
        setVentaEditando(null);
        cargarHistorialVentas();
        cargarDashboard();
      } else {
        const err = await respuesta.json();
        alert(`❌ Error: ${err.error || 'No se pudo editar la venta.'}`);
      }
    } catch (error) {
      alert("⚠️ Error de conexión.");
    } finally {
      setCargandoEditarVenta(false);
    }
  };

  const iniciarAnulacionVenta = (venta) => {
    setVentaAnulando(venta);
    setMotivoAnulacion('');
    setMostrarModalAnularVenta(true);
  };

  const procesarAnulacionVenta = async (e) => {
    e.preventDefault();
    if (!motivoAnulacion.trim()) return alert("Debe especificar un motivo de anulación.");
    setCargandoAnulacion(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Ventas/anular/${ventaAnulando.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoAnulacion.trim() })
      });
      if (respuesta.ok) {
        alert("🗑️ Venta anulada, stock restaurado y registrado en auditoría.");
        setMostrarModalAnularVenta(false);
        setVentaAnulando(null);
        cargarHistorialVentas();
        cargarDashboard();
        cargarCatalogo();
        cargarAlertasLotes();
      } else {
        const err = await respuesta.json();
        alert(`❌ Error: ${err.error || 'No se pudo anular la venta.'}`);
      }
    } catch (error) {
      alert("⚠️ Error de conexión.");
    } finally {
      setCargandoAnulacion(false);
    }
  };

  // --------------------------------------------------------------------------
  // 7. ENTRADAS DE INVENTARIO MAESTRO Y LOTES
  // --------------------------------------------------------------------------
  const abrirModalIngresoMercaderia = async () => {
    setMostrarModalIngreso(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Inventario/productos-lookup`);
      if (respuesta.ok) { const datos = await respuesta.json(); setProductosLookup(datos); }
    } catch (error) { console.error(error); }
  };

  const guardarNuevoLote = async (e) => {
    e.preventDefault();
    if (!formularioLote.productoId) return alert("Selecciona un medicamento.");
    setCargandoGuardarLote(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Inventario/ingresar-lote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productoId: formularioLote.productoId, numeroLote: formularioLote.numeroLote, fechaVencimiento: formularioLote.fechaVencimiento, cantidad: parseInt(formularioLote.cantidad), costoUnitario: parseFloat(formularioLote.costoUnitario) }) });
      if (respuesta.ok) {
        alert("✅ Mercadería ingresada correctamente.");
        setMostrarModalIngreso(false);
        setFormularioLote({ productoId: '', numeroLote: '', fechaVencimiento: '', cantidad: '', costoUnitario: '' });
        cargarAlertasLotes();
        cargarCatalogo();
      } else {
        let mensajeError = "No se pudo guardar el lote.";
        try {
          const err = await respuesta.json();
          mensajeError = err.error || err.Error || err.mensaje || err.Mensaje || mensajeError;
        } catch (jsonErr) {
          try {
            const txt = await respuesta.text();
            if (txt) mensajeError = txt;
          } catch (txtErr) {}
        }
        alert(`❌ Error: ${mensajeError}`);
      }
    } catch (error) { alert("⚠️ Error de conexión."); } finally { setCargandoGuardarLote(false); }
  };

  const cargarProductosMaestros = async () => {
    setCargandoProductos(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Inventario/productos`);
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setProductosMaestros(datos);
      }
    } catch (error) {
      console.error("Error al cargar productos maestros:", error);
    } finally {
      setCargandoProductos(false);
    }
  };

  const iniciarEdicionProducto = (producto) => {
    setProductoEditandoId(producto.id);
    setFormularioProducto({
      sku: producto.sku || '',
      codigoBarras: producto.codigoBarras || '',
      nombreComercial: producto.nombreComercial || '',
      nombreGenerico: producto.nombreGenerico || '',
      concentracion: producto.concentracion || '',
      presentacion: producto.presentacion || '',
      precioVenta: producto.precioVenta?.toString() || '',
      precioCompra: producto.precioCompra?.toString() || '',
      fechaActualizacionPrecio: producto.fechaActualizacionPrecio ? producto.fechaActualizacionPrecio.substring(0, 10) : new Date().toISOString().substring(0, 10),
      stockMinimo: producto.stockMinimo?.toString() || '5',
      controlado: producto.controlado || false,
      categoriaId: producto.categoriaId || '',
      fotoUrl: producto.fotoUrl || '',
      marca: producto.marca || '',
      distribuidor: producto.distribuidor || '',
      paisOrigen: producto.paisOrigen || '',
      registroSanitario: producto.registroSanitario || '',
      composicion: producto.composicion || ''
    });
    setFotoPendiente(null);
    setMostrarModalProducto(true);
  };

  const manejarEliminarProducto = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este producto maestro? Esta acción no se puede deshacer y fallará si el producto tiene lotes registrados.")) return;
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Inventario/eliminar-producto/${id}`, {
        method: 'DELETE'
      });
      if (respuesta.ok) {
        alert("🗑️ Producto maestro eliminado con éxito.");
        cargarProductosMaestros();
        cargarCatalogo();
      } else {
        const err = await respuesta.json();
        alert(`❌ Error: ${err.error || 'No se pudo eliminar el producto.'}`);
      }
    } catch (error) {
      alert("⚠️ Error de red al intentar eliminar el producto.");
    }
  };

  // --------------------------------------------------------------------------
  // CRM MÉDICO: Proveedores, Visitadores y Seguimientos
  // --------------------------------------------------------------------------
  const cargarProveedores = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/ProveedoresMedicos`);
      if (respuesta.ok) setProveedores(await respuesta.json());
    } catch { console.error("Error al cargar proveedores"); }
  };

  const cargarVisitadores = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Visitadores`);
      if (respuesta.ok) setVisitadores(await respuesta.json());
    } catch { console.error("Error al cargar visitadores"); }
  };

  const cargarSeguimientos = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Seguimientos`);
      if (respuesta.ok) setSeguimientos(await respuesta.json());
    } catch { console.error("Error al cargar seguimientos"); }
  };

  const cargarProximosSeguimientos = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Seguimientos?proximos=true`);
      if (respuesta.ok) setProximosSeguimientos(await respuesta.json());
    } catch { console.error("Error al cargar próximos seguimientos"); }
  };

  const abrirNuevoProveedor = () => {
    setFormularioProveedor({ nombre: '', tipo: 'LABORATORIO', contactoPrincipal: '', telefono: '', email: '', direccion: '', activo: true });
    setModalProveedor({ visible: true, editando: null });
  };

  const abrirEdicionProveedor = (proveedor) => {
    setFormularioProveedor({
      nombre: proveedor.nombre || '',
      tipo: proveedor.tipo || 'LABORATORIO',
      contactoPrincipal: proveedor.contactoPrincipal || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || '',
      activo: proveedor.activo !== false
    });
    setModalProveedor({ visible: true, editando: proveedor });
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();
    setCargandoGuardarCRM(true);
    try {
      const url = modalProveedor.editando ? `${API_URL}/api/v1/ProveedoresMedicos/${modalProveedor.editando.id}` : `${API_URL}/api/v1/ProveedoresMedicos`;
      const metodo = modalProveedor.editando ? 'PUT' : 'POST';
      const respuesta = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formularioProveedor) });
      if (respuesta.ok) {
        alert(modalProveedor.editando ? "✅ Proveedor actualizado." : "✅ Proveedor registrado.");
        setModalProveedor({ visible: false, editando: null });
        cargarProveedores();
      } else {
        const err = await respuesta.json();
        alert(`❌ ${err.error || 'No se pudo guardar el proveedor.'}`);
      }
    } catch { alert("⚠️ Error de conexión."); } finally { setCargandoGuardarCRM(false); }
  };

  const manejarEliminarProveedor = async (id) => {
    if (!window.confirm("¿Eliminar este proveedor médico? Sus seguimientos quedarán huérfanos.")) return;
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/ProveedoresMedicos/${id}`, { method: 'DELETE' });
      if (respuesta.ok) {
        alert("🗑️ Proveedor eliminado.");
        cargarProveedores();
      } else {
        const err = await respuesta.json();
        alert(`❌ ${err.error || 'No se pudo eliminar.'}`);
      }
    } catch { alert("⚠️ Error de conexión."); }
  };

  const abrirNuevoVisitador = () => {
    setFormularioVisitador({ nombre: '', empresa: '', telefono: '', email: '', zona: '', activo: true });
    setModalVisitador({ visible: true, editando: null });
  };

  const abrirEdicionVisitador = (visitador) => {
    setFormularioVisitador({
      nombre: visitador.nombre || '',
      empresa: visitador.empresa || '',
      telefono: visitador.telefono || '',
      email: visitador.email || '',
      zona: visitador.zona || '',
      activo: visitador.activo !== false
    });
    setModalVisitador({ visible: true, editando: visitador });
  };

  const guardarVisitador = async (e) => {
    e.preventDefault();
    setCargandoGuardarCRM(true);
    try {
      const url = modalVisitador.editando ? `${API_URL}/api/v1/Visitadores/${modalVisitador.editando.id}` : `${API_URL}/api/v1/Visitadores`;
      const metodo = modalVisitador.editando ? 'PUT' : 'POST';
      const respuesta = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formularioVisitador) });
      if (respuesta.ok) {
        alert(modalVisitador.editando ? "✅ Visitador actualizado." : "✅ Visitador registrado.");
        setModalVisitador({ visible: false, editando: null });
        cargarVisitadores();
      } else {
        const err = await respuesta.json();
        alert(`❌ ${err.error || 'No se pudo guardar el visitador.'}`);
      }
    } catch { alert("⚠️ Error de conexión."); } finally { setCargandoGuardarCRM(false); }
  };

  const manejarEliminarVisitador = async (id) => {
    if (!window.confirm("¿Eliminar este visitador/promotor? Sus seguimientos quedarán huérfanos.")) return;
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Visitadores/${id}`, { method: 'DELETE' });
      if (respuesta.ok) {
        alert("🗑️ Visitador eliminado.");
        cargarVisitadores();
      } else {
        const err = await respuesta.json();
        alert(`❌ ${err.error || 'No se pudo eliminar.'}`);
      }
    } catch { alert("⚠️ Error de conexión."); }
  };

  const abrirHistorial = async (tipo, entidad, nombre) => {
    setModalHistorial({ visible: true, entidadTipo: tipo, entidadId: entidad.id, entidadNombre: nombre });
    setHistorialSeguimientos([]);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Seguimientos?entidadTipo=${tipo}&entidadId=${entidad.id}`);
      if (respuesta.ok) setHistorialSeguimientos(await respuesta.json());
    } catch { console.error("Error al cargar historial"); }
  };

  const abrirNuevoSeguimiento = (tipo, entidadId, entidadNombre, existente = null) => {
    setFormularioSeguimiento(existente ? {
      fecha: existente.fecha || new Date().toISOString().slice(0, 10),
      tipo: existente.tipo || 'VISITA',
      asunto: existente.asunto || '',
      notas: existente.notas || '',
      resultado: existente.resultado || '',
      proximoSeguimiento: existente.proximoSeguimiento || ''
    } : { fecha: new Date().toISOString().slice(0, 10), tipo: 'VISITA', asunto: '', notas: '', resultado: '', proximoSeguimiento: '' });
    setModalSeguimiento({ visible: true, editando: existente, entidadTipo: tipo, entidadId, entidadNombre });
  };

  const guardarSeguimiento = async (e) => {
    e.preventDefault();
    setCargandoGuardarCRM(true);
    const payload = {
      entidadTipo: modalSeguimiento.entidadTipo,
      entidadId: modalSeguimiento.entidadId,
      ...formularioSeguimiento
    };
    try {
      const url = modalSeguimiento.editando ? `${API_URL}/api/v1/Seguimientos/${modalSeguimiento.editando.id}` : `${API_URL}/api/v1/Seguimientos`;
      const metodo = modalSeguimiento.editando ? 'PUT' : 'POST';
      const respuesta = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (respuesta.ok) {
        alert(modalSeguimiento.editando ? "✅ Seguimiento actualizado." : "✅ Seguimiento registrado.");
        setModalSeguimiento({ visible: false, editando: null });
        cargarSeguimientos();
        cargarProximosSeguimientos();
        if (modalHistorial.visible) abrirHistorial(modalHistorial.entidadTipo, { id: modalHistorial.entidadId }, modalHistorial.entidadNombre);
      } else {
        const err = await respuesta.json();
        alert(`❌ ${err.error || 'No se pudo guardar el seguimiento.'}`);
      }
    } catch { alert("⚠️ Error de conexión."); } finally { setCargandoGuardarCRM(false); }
  };

  const manejarEliminarSeguimiento = async (id) => {
    if (!window.confirm("¿Eliminar este seguimiento?")) return;
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Seguimientos/${id}`, { method: 'DELETE' });
      if (respuesta.ok) {
        alert("🗑️ Seguimiento eliminado.");
        cargarSeguimientos();
        cargarProximosSeguimientos();
        if (modalHistorial.visible) abrirHistorial(modalHistorial.entidadTipo, { id: modalHistorial.entidadId }, modalHistorial.entidadNombre);
      } else {
        const err = await respuesta.json();
        alert(`❌ ${err.error || 'No se pudo eliminar.'}`);
      }
    } catch { alert("⚠️ Error de conexión."); }
  };

  const nombreEntidadSeguimiento = (seg) => {
    if (!seg) return '—';
    const encontrado = seg.entidadTipo === 'PROVEEDOR'
      ? proveedores.find(p => p.id === seg.entidadId)
      : visitadores.find(v => v.id === seg.entidadId);
    return encontrado ? encontrado.nombre : 'Contacto eliminado';
  };

  const guardarNuevoProductoMaestro = async (e) => {
    e.preventDefault();
    setCargandoGuardarProducto(true);
    const url = productoEditandoId 
      ? `${API_URL}/api/v1/Inventario/editar-producto/${productoEditandoId}`
      : `${API_URL}/api/v1/Inventario/crear-producto`;
    const metodo = productoEditandoId ? 'PUT' : 'POST';
    try {
      const respuesta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: formularioProducto.sku,
          codigoBarras: formularioProducto.codigoBarras,
          nombreComercial: formularioProducto.nombreComercial,
          nombreGenerico: formularioProducto.nombreGenerico,
          concentracion: formularioProducto.concentracion,
          presentacion: formularioProducto.presentacion,
          precioVenta: parseFloat(formularioProducto.precioVenta) || 0,
          precioCompra: parseFloat(formularioProducto.precioCompra) || 0,
          fechaActualizacionPrecio: formularioProducto.fechaActualizacionPrecio ? new Date(formularioProducto.fechaActualizacionPrecio).toISOString() : new Date().toISOString(),
          stockMinimo: parseInt(formularioProducto.stockMinimo) || 5,
          controlado: formularioProducto.controlado,
          categoriaId: formularioProducto.categoriaId || null,
          marca: formularioProducto.marca,
          distribuidor: formularioProducto.distribuidor,
          paisOrigen: formularioProducto.paisOrigen,
          registroSanitario: formularioProducto.registroSanitario,
          composicion: formularioProducto.composicion
        })
      });
      if (respuesta.ok) {
        const datosGuardado = await respuesta.json();
        const idProductoGuardado = productoEditandoId || datosGuardado.id;
        if (fotoPendiente) {
          await aplicarFotoPendienteAlProducto(idProductoGuardado);
        }
        alert(productoEditandoId ? "✨ Producto maestro actualizado con éxito." : "✨ Producto maestro registrado con éxito.");
        setMostrarModalProducto(false);
        setFormularioProducto({ sku: '', codigoBarras: '', nombreComercial: '', nombreGenerico: '', concentracion: '', presentacion: '', precioVenta: '', precioCompra: '', fechaActualizacionPrecio: new Date().toISOString().substring(0, 10), stockMinimo: '5', controlado: false, categoriaId: '', fotoUrl: '', marca: '', distribuidor: '', paisOrigen: '', registroSanitario: '', composicion: '' });
        setProductoEditandoId(null);
        setFotoPendiente(null);
        cargarCatalogo();
        cargarProductosMaestros();
      } else {
        let mensajeError = "No se pudo guardar el producto.";
        try {
          const err = await respuesta.json();
          mensajeError = err.error || err.Error || err.mensaje || err.Mensaje || mensajeError;
        } catch (jsonErr) {
          try {
            const txt = await respuesta.text();
            if (txt) mensajeError = txt;
          } catch (txtErr) {}
        }
        alert(`❌ Error: ${mensajeError}`);
      }
    } catch (error) { alert("⚠️ Error de red o conexión."); } finally { setCargandoGuardarProducto(false); }
  };

  const procesarAjusteInventario = async (e) => {
    e.preventDefault();
    setCargandoAjuste(true);
    try {
      const isAbsolute = tipoAjuste === 'ABSOLUTO';
      const endpoint = isAbsolute 
        ? `${API_URL}/api/v1/Inventario/actualizar-stock-absoluto` 
        : `${API_URL}/api/v1/Inventario/ajustar-stock`;
      
      const payload = isAbsolute
        ? { loteId: modalAjuste.lote.loteId, nuevoStock: parseInt(modalAjuste.variacion), motivo: modalAjuste.motivo }
        : { loteId: modalAjuste.lote.loteId, cantidadVariacion: parseInt(modalAjuste.variacion), motivo: modalAjuste.motivo };

      const respuesta = await fetch(endpoint, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });

      if (respuesta.ok) {
        alert("📊 Inventario ajustado e historial auditado con éxito.");
        setModalAjuste({ visible: false, lote: null, variacion: '', motivo: 'MERMA_CADUCIDAD' });
        setTipoAjuste('VARIACION');
        cargarAlertasLotes();
        cargarCatalogo();
      } else {
        const errText = await respuesta.text(); alert(`❌ Fallo: ${errText}`);
      }
    } catch (error) { alert(`⚠️ Excepción: ${error.message}`); } finally { setCargandoAjuste(false); }
  };

  // --------------------------------------------------------------------------
  // 8. EFECTOS COLATERALES Y ESCUCHAS
  // --------------------------------------------------------------------------
  useEffect(() => { if (!pantallaBloqueada) { cargarCatalogo(); cargarCategorias(); } }, [pantallaBloqueada]);
  useEffect(() => { 
    if (pestañaActiva === 'inventario') {
      if (subTabInventario === 'lotes') {
        cargarAlertasLotes();
      } else {
        cargarProductosMaestros();
        cargarCategorias();
      }
    }
    if (pestañaActiva === 'dashboard') cargarDashboard();
    if (pestañaActiva === 'ventas') cargarHistorialVentas();
    if (pestañaActiva === 'crm') {
      cargarProveedores();
      cargarVisitadores();
      cargarSeguimientos();
      cargarProximosSeguimientos();
    }
  }, [pestañaActiva, subTabInventario, subTabCRM]);

  useEffect(() => {
    if (clienteNitCi.trim().length < 4) { setEstadoCliente(''); setClienteId(null); setHistorialCompras([]); return; }
    const temporizador = setTimeout(async () => {
      setEstadoCliente('Buscando...');
      try {
        const respuesta = await fetch(`${API_URL}/api/v1/clientes/${clienteNitCi}`);
        if (respuesta.ok) {
          const cliente = await respuesta.json(); setClienteNombre(cliente.nombreCompleto); setClienteId(cliente.id); setEstadoCliente('✅ Frecuente');
        } else {
          setClienteId(null); setEstadoCliente('✨ Nuevo'); setHistorialCompras([]);
        }
      } catch (error) { setEstadoCliente('⚠️ Error'); }
    }, 600);
    return () => clearTimeout(temporizador);
  }, [clienteNitCi, API_URL]);

  useEffect(() => {
    if (!clienteId) return;
    const cargarHistorial = async () => {
      setCargandoHistorial(true);
      try {
        const respuesta = await fetch(`${API_URL}/api/v1/clientes/${clienteId}/historial`);
        if (respuesta.ok) { const datos = await respuesta.json(); setHistorialCompras(datos); }
      } catch (error) { console.error(error); } finally { setCargandoHistorial(false); }
    };
    cargarHistorial();
  }, [clienteId, API_URL]);

  // --------------------------------------------------------------------------
  // 9. LÓGICA COMPLETA DEL CARRITO Y COBROS
  // --------------------------------------------------------------------------
  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) return alert(`🚫 "${producto.nombre}" está agotado. No se puede agregar al carrito.`);
    setCarrito((carritoActual) => { const itemExistente = carritoActual.find(item => item.loteId === producto.loteId); if (itemExistente) { return carritoActual.map(item => item.loteId === producto.loteId ? { ...item, cantidad: item.cantidad + 1 } : item); } return [...carritoActual, { ...producto, cantidad: 1 }]; });
  };
  const abrirCategoriaPOS = (id) => { setCategoriaActivaPOS(id); setVistaPOS('productos'); };
  const volverACategoriasPOS = () => { setVistaPOS('categorias'); setCategoriaActivaPOS('TODOS'); setBusqueda(''); };
  // Cuenta productos con stock disponible (para mostrar en las tarjetas de categoría)
  const contarDisponiblesPOS = (id) => catalogo.reduce((acc, p) => acc + (p.stock > 0 && (id === 'TODOS' || p.categoriaId === id) ? 1 : 0), 0);
  // Indica si el estado actual del POS debe mostrar el grid de categorías o los productos
  const enVistaCategorias = vistaPOS === 'categorias';
  const actualizarCantidad = (loteId, cantidadCambio) => { setCarrito((carritoActual) => { return carritoActual.map(item => { if (item.loteId === loteId) { return { ...item, cantidad: item.cantidad + cantidadCambio }; } return item; }).filter(item => item.cantidad > 0); }); };
  const calcularTotal = () => carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0).toFixed(2);
  const iniciarCobro = () => { if (carrito.length === 0) return alert("El carrito está vacío."); if (metodoPago === 'QR') { setMostrarModalQR(true); } else { procesarVentaEnBackend(); } };

  const procesarVentaEnBackend = async () => {
    let idClienteFinal = clienteId;
    if (!idClienteFinal && clienteNitCi.trim() !== '' && clienteNitCi.trim() !== '0') {
      try {
        const res = await fetch(`${API_URL}/api/v1/Clientes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ciNit: clienteNitCi.trim(), nombreCompleto: clienteNombre.trim() === '' ? 'Consumidor Final' : clienteNombre.trim() }) });
        if (res.ok) { const cli = await res.json(); idClienteFinal = cli.id; }
      } catch (error) { console.error(error); }
    }
    const totalVentaCálculo = parseFloat(calcularTotal());
    const payloadVenta = { clienteId: idClienteFinal, sesionCajaId: sesionCajaId, clienteNombre: clienteNombre.trim() === '' ? "Cliente de Mostrador" : clienteNombre, clienteNitCi: clienteNitCi.trim() === '' ? "0" : clienteNitCi, tipoPago: metodoPago, detalles: carrito.map(item => ({ loteId: item.loteId, cantidad: item.cantidad, precioUnitario: item.precio })) };
    try {
      const respuestaVenta = await fetch(`${API_URL}/api/v1/Pos/procesar-venta`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadVenta) });
      if (respuestaVenta.ok) {
        const datos = await respuestaVenta.json();
        if (metodoPago === 'EFECTIVO') {
          const nuevoTotalEfectivo = ventasEfectivoTurno + totalVentaCálculo;
          setVentasEfectivoTurno(nuevoTotalEfectivo);
          localStorage.setItem('ventasEfectivoTurno', nuevoTotalEfectivo.toString());
        }
        setTicketVenta({ factura: datos.factura.numeroFactura, cajero: cajeroNombre, cliente: clienteNombre.trim() === '' ? 'Consumidor Final' : clienteNombre, nit: clienteNitCi.trim() === '' ? '0' : clienteNitCi, metodo: metodoPago, fecha: new Date().toLocaleString(), items: [...carrito], total: totalVentaCálculo.toFixed(2) });
        setCarrito([]); setClienteNombre(''); setClienteNitCi(''); setClienteId(null); setEstadoCliente(''); setHistorialCompras([]); setMostrarModalQR(false); cargarCatalogo();
      } else { const err = await respuestaVenta.json(); alert(`❌ Error: ${err.error}`); }
    } catch (error) { alert("⚠️ Error de red."); }
  };

  // [NEW] Filtros y ordenamiento aplicados dinámicamente al catálogo del POS.
  // Motor de búsqueda para farmacia: busca en nombre, genérico, concentración,
  // presentación, SKU, código de barras y marca, sin distinguir tildes, y
  // ordena por relevancia cuando hay texto de búsqueda.
  const consultaNormalizada = normalizarTexto(busqueda);
  const productosFiltrados = catalogo
    .map((p) => ({ producto: p, puntaje: puntuarProducto(p, consultaNormalizada) }))
    .filter(({ producto, puntaje }) => {
      if (puntaje < 0) return false;
      const coincideReceta = filtroRecetaPOS === 'TODOS' ||
        (filtroRecetaPOS === 'CONTROLADO' && producto.controlado) ||
        (filtroRecetaPOS === 'LIBRE' && !producto.controlado);
      const coincideCategoria = categoriaActivaPOS === 'TODOS' || producto.categoriaId === categoriaActivaPOS;
      return coincideReceta && coincideCategoria;
    })
    .sort((a, b) => {
      if (consultaNormalizada !== '' && b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
      if (ordenPrecioPOS === 'ASC') return a.producto.precio - b.producto.precio;
      if (ordenPrecioPOS === 'DESC') return b.producto.precio - a.producto.precio;
      return 0;
    })
    .map(({ producto }) => producto);

  const obtenerEstiloEstado = (estado) => { switch (estado) { case 'VENCIDO': return 'bg-red-100 text-red-800 border-red-200'; case 'CRÍTICO': return 'bg-orange-100 text-orange-800 border-orange-200'; case 'ADVERTENCIA': return 'bg-yellow-100 text-yellow-800 border-yellow-200'; default: return 'bg-green-100 text-green-800 border-green-200'; } };

  // [NEW] Foto visible en el modal de producto (pendiente o ya guardada) y su ícono
  const fotoProductoVisible = fotoPendiente?.tipo === 'archivo'
    ? fotoPendiente.urlPreview
    : fotoPendiente?.tipo === 'url'
      ? fotoPendiente.datos
      : fotoPendiente?.tipo === 'quitar'
        ? null
        : formularioProducto.fotoUrl;
  const iconoCategoriaSeleccionada = categorias.find(c => c.id === formularioProducto.categoriaId)?.icono || '💊';

  // [NEW] Filtro dinámico para Lotes Físicos e Inventario
  const lotesFiltrados = alertasLotes.filter(l => {
    const coincideBusqueda = l.producto.toLowerCase().includes(busquedaLotes.toLowerCase());
    const coincideEstado = filtroEstadoLote === 'TODOS' || l.estado === filtroEstadoLote;
    return coincideBusqueda && coincideEstado;
  });

  // [NEW] Filtro dinámico para Medicamentos Base (Catálogo Maestro)
  const productosBaseFiltrados = productosMaestros.filter(p => {
    const coincideBusqueda = 
      p.nombreComercial.toLowerCase().includes(busquedaProductosBase.toLowerCase()) || 
      (p.nombreGenerico && p.nombreGenerico.toLowerCase().includes(busquedaProductosBase.toLowerCase())) || 
      p.sku.toLowerCase().includes(busquedaProductosBase.toLowerCase());
    const coincideReceta = filtroRecetaBase === 'TODOS' || 
      (filtroRecetaBase === 'CONTROLADO' && p.controlado) || 
      (filtroRecetaBase === 'LIBRE' && !p.controlado);
    return coincideBusqueda && coincideReceta;
  });

  // [NEW] Filtro dinámico para Historial de Ventas (Metodo Pago + Estado Factura + Búsqueda)
  const ventasFiltradas = listaVentas.filter(v => {
    const coincideBusqueda = v.cliente.toLowerCase().includes(busquedaVentas.toLowerCase()) || v.fecha.includes(busquedaVentas) || v.nit.includes(busquedaVentas);
    const coincideMetodo = filtroMetodoVenta === 'TODOS' || v.metodo === filtroMetodoVenta;
    const coincideEstado = filtroEstadoVenta === 'TODOS' || 
      (filtroEstadoVenta === 'ANULADA' && v.estadoSiat === 'ANULADA') || 
      (filtroEstadoVenta === 'EMITIDA' && v.estadoSiat !== 'ANULADA');
    return coincideBusqueda && coincideMetodo && coincideEstado;
  });

  const totalPaginasVentas = Math.ceil(ventasFiltradas.length / itemsPorPagina);
  const indiceUltimoItem = paginaVentas * itemsPorPagina;
  const indicePrimerItem = indiceUltimoItem - itemsPorPagina;
  const ventasPaginadas = ventasFiltradas.slice(indicePrimerItem, indiceUltimoItem);

  const exportarExcel = () => {
    const cabeceras = ['ID Venta,Cliente,NIT/CI,Monto Total (Bs),Metodo Pago,Fecha Transaccion\n'];
    const filas = ventasFiltradas.map(v => `${v.id},"${v.cliente}",${v.nit},${v.total.toFixed(2)},${v.metodo},"${v.fecha}"`);
    const contenidoCSV = cabeceras.concat(filas).join('\n');
    const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a'); enlace.href = url; enlace.setAttribute('download', `Reporte_Ventas_PharmCRM_${new Date().getTime()}.csv`); document.body.appendChild(enlace); enlace.click(); document.body.removeChild(enlace);
  };

  const exportarInventarioCSV = () => {
    if (subTabInventario === 'lotes') {
      const cabeceras = ['Producto,Stock,Caducidad,Ventas,Devueltos,Mermas,Estado\n'];
      const filas = lotesFiltrados.map(l => `"${l.producto}",${l.stock},"${l.fechaVencimiento}",${l.ventas || 0},${l.devueltos || 0},${l.mermas || 0},"${l.estado}"`);
      const contenidoCSV = cabeceras.concat(filas).join('\n');
      const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a'); enlace.href = url; enlace.setAttribute('download', `Inventario_Lotes_${new Date().getTime()}.csv`); document.body.appendChild(enlace); enlace.click(); document.body.removeChild(enlace);
    } else {
      const cabeceras = ['SKU,Nombre Comercial,Nombre Generico,Concentracion,Presentacion,Precio Compra (Bs),Precio Venta (Bs),Margen (%),Fecha Actualizacion,Receta\n'];
      const filas = productosBaseFiltrados.map(p => {
        const pCompra = p.precioCompra || 0;
        const pVenta = p.precioVenta || 0;
        const margen = pVenta > 0 ? (((pVenta - pCompra) / pVenta) * 100).toFixed(1) + '%' : '0%';
        return `"${p.sku}","${p.nombreComercial}","${p.nombreGenerico || ''}","${p.concentracion || ''}","${p.presentacion || ''}",${pCompra.toFixed(2)},${pVenta.toFixed(2)},"${margen}","${p.fechaActualizacionPrecio ? new Date(p.fechaActualizacionPrecio).toLocaleDateString() : 'N/A'}",${p.controlado ? 'CONTROLADO' : 'LIBRE'}`;
      });
      const contenidoCSV = cabeceras.concat(filas).join('\n');
      const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a'); enlace.href = url; enlace.setAttribute('download', `Inventario_Productos_${new Date().getTime()}.csv`); document.body.appendChild(enlace); enlace.click(); document.body.removeChild(enlace);
    }
  };

  const exportarDashboardCSV = () => {
    let csv = '\uFEFF';
    csv += 'PANEL DE CONTROL GERENCIAL\n\n';
    csv += 'KPI,Valor\n';
    csv += `Ingresos Brutos (Bs),${(datosDashboard?.kpis?.totalIngresos || 0).toFixed(2)}\n`;
    csv += `Ventas Exitosas,${datosDashboard?.kpis?.totalTransacciones || 0}\n`;
    csv += `Ticket Promedio (Bs),${(datosDashboard?.kpis?.ticketPromedio || 0).toFixed(2)}\n`;
    csv += `Total Mermas (unid.),${datosDashboard?.kpis?.totalMermas || 0}\n`;
    csv += `Total Devoluciones (unid.),${datosDashboard?.kpis?.totalDevoluciones || 0}\n\n`;
    csv += 'INGRESOS POR METODO DE PAGO\n';
    csv += 'Metodo,Monto (Bs),Cantidad,Porcentaje\n';
    (datosDashboard?.metodosPago || []).forEach(m => {
      csv += `${m.Metodo || m.metodo},${(m.Monto || m.monto || 0).toFixed(2)},${m.Cantidad || m.cantidad || 0},${m.Porcentaje || m.porcentaje || 0}\n`;
    });
    csv += '\nULTIMAS VENTAS\n';
    csv += 'Cliente,Monto (Bs),Metodo,Fecha\n';
    (datosDashboard?.ventasRecientes || []).forEach(v => {
      csv += `"${v.Cliente || v.cliente}",${(v.Monto || v.monto || 0).toFixed(2)},${v.Metodo || v.metodo},"${v.Fecha || v.fecha}"\n`;
    });
    csv += '\nAJUSTES RECIENTES\n';
    csv += 'Motivo,Cantidad,Fecha\n';
    (datosDashboard?.ajustesRecientes || []).forEach(a => {
      csv += `"${a.Motivo || a.motivo}",${a.Cantidad || a.cantidad},"${a.Fecha || a.fecha}"\n`;
    });
    csv += '\nAUDITORIA DE TURNOS Y ARQUEOS DE CAJA\n';
    csv += 'Cajero,Apertura,Cierre,Teorico (Bs),Entregado (Bs),Desfase (Bs),Estado\n';
    historialCajas.forEach(c => {
      const teorico = Number(c.fondoInicial || c.FondoInicial || 0) + Number(c.ventas || c.Ventas || 0);
      csv += `"${c.cajero || c.Cajero}","${c.fechaApertura || c.FechaApertura}","${c.fechaCierre || c.FechaCierre}",${teorico.toFixed(2)},${Number(c.montoEntregado || c.MontoEntregado || 0).toFixed(2)},${Number(c.desfase || c.Desfase || 0).toFixed(2)},"${c.estadoFinal || c.EstadoFinal}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a'); enlace.href = url; enlace.setAttribute('download', `Reporte_Dashboard_${new Date().getTime()}.csv`); document.body.appendChild(enlace); enlace.click(); document.body.removeChild(enlace);
  };

  // --------------------------------------------------------------------------
  // RENDER 1: PANTALLA DE BLOQUEO EN BASE A #2596be
  // --------------------------------------------------------------------------
  if (pantallaBloqueada) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans relative overflow-hidden bg-brand-gradient">
        {/* Blobs decorativos animados */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-float"></div>
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-brand-300/20 blur-3xl animate-float" style={{ animationDelay: '1.2s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-accent-400/10 blur-3xl animate-float" style={{ animationDelay: '2.4s' }}></div>

        <div className="relative z-10 bg-white/85 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-96 flex flex-col items-center animate-fade-in-up border border-white/60">
          <div className="w-20 h-20 rounded-2xl bg-brand-gradient shadow-lg flex items-center justify-center mb-4 animate-pop">
            <img src="/logofarma.png" alt="Logo" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-brand-gradient mb-1">FarmaGO</h1>
          <p className="text-gray-500 text-xs mb-6 text-center font-medium">Sistema de Gestión y Punto de Venta</p>
          <form onSubmit={manejarAperturaCaja} className="w-full flex flex-col gap-4">
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">PIN de Acceso</label>
              <input type="password" maxLength="4" required placeholder="••••" className="w-full p-3 border border-gray-300 rounded-xl text-center text-2xl tracking-widest outline-none transition-all focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(37,150,190,0.15)]" value={pinAcceso} onChange={(e) => setPinAcceso(e.target.value)} />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Fondo Inicial de Caja (Bs.)</label>
              <input type="number" step="0.10" required placeholder="Fondo Inicial de Caja (Bs.)" className="w-full p-3 border border-gray-300 rounded-xl text-lg font-semibold outline-none transition-all focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(37,150,190,0.15)]" value={montoApertura} onChange={(e) => setMontoApertura(e.target.value)} />
            </div>
            {errorLogin && (
              <div className="text-red-500 text-sm font-semibold text-center bg-red-50 border border-red-100 p-2.5 rounded-xl animate-fade-in-down flex items-center justify-center gap-2">
                <span>⚠️</span> {errorLogin}
              </div>
            )}
            <button type="submit" disabled={cargandoLogin} className="w-full btn-primary py-3.5 rounded-xl text-base mt-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {cargandoLogin ? (
                <span className="flex items-center justify-center gap-2"><span className="spinner !border-white/30 !border-t-white"></span> Validando...</span>
              ) : '🔓 Abrir Caja'}
            </button>
          </form>
          <p className="text-[10px] text-gray-400 mt-6 text-center">FarmaSCZ • Santa Cruz de la Sierra, Bolivia</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER 2: INTERFAZ GENERAL TOTALMENTE DESCOMPRIMIDA
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col font-sans relative" style={{ background: 'linear-gradient(160deg, #f0f7fb 0%, #f8fafc 40%, #eef4f9 100%)' }}>

      {/* MODAL AJUSTE DE INVENTARIO */}
      {modalAjuste.visible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[400px] animate-scale-in border border-gray-200/50">
            <h3 className="text-xl font-black text-gray-800 mb-1">⚖️ Ajuste de Inventario</h3>
            <p className="text-xs text-gray-500 mb-4">Registra la variación para: <strong>{modalAjuste.lote?.producto}</strong></p>
            
            {/* [NEW] Selector de tipo de ajuste */}
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
              <button 
                type="button" 
                onClick={() => { setTipoAjuste('VARIACION'); setModalAjuste({ ...modalAjuste, variacion: '' }); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${tipoAjuste === 'VARIACION' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                🔢 Variación (+/-)
              </button>
              <button 
                type="button" 
                onClick={() => { setTipoAjuste('ABSOLUTO'); setModalAjuste({ ...modalAjuste, variacion: modalAjuste.lote?.stock.toString() || '' }); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${tipoAjuste === 'ABSOLUTO' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                🎯 Fijar Stock Real
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-600">Stock Actual en Sistema:</span>
              <span className="text-lg font-black text-[#2596be]">{modalAjuste.lote?.stock} unid.</span>
            </div>
            <form onSubmit={procesarAjusteInventario} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Motivo del Ajuste (Auditoría)</label>
                <select required className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2596be]" value={modalAjuste.motivo} onChange={(e) => setModalAjuste({ ...modalAjuste, motivo: e.target.value })}>
                  <option value="MERMA_CADUCIDAD">Baja: Producto Caducado</option>
                  <option value="MERMA_DANO">Baja: Empaque Dañado / Roto</option>
                  <option value="DEVOLUCION_CLIENTE">Ingreso: Devolución de Cliente</option>
                  <option value="ERROR_INGRESO">Corrección: Error en el conteo</option>
                  <option value="EXTRAVIO">Merma: Pérdida o Extravío</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase mb-1 flex justify-between">
                  <span>{tipoAjuste === 'VARIACION' ? 'Variación Matemática' : 'Nuevo Stock Físico Real'}</span>
                  <span className="text-gray-400 font-normal">{tipoAjuste === 'VARIACION' ? 'Ej. -2 o +5' : 'Conteo absoluto final'}</span>
                </label>
                <input 
                  type="number" 
                  required 
                  placeholder={tipoAjuste === 'VARIACION' ? "-1" : "Ej. 15"} 
                  className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center font-bold outline-none focus:ring-2 focus:ring-[#2596be]" 
                  value={modalAjuste.variacion} 
                  onChange={(e) => setModalAjuste({ ...modalAjuste, variacion: e.target.value })} 
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => { setModalAjuste({ visible: false, lote: null, variacion: '', motivo: 'MERMA_CADUCIDAD' }); setTipoAjuste('VARIACION'); }} className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-xl text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={cargandoAjuste} className="w-2/3 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-xl text-sm transition-colors shadow-md">
                  {cargandoAjuste ? 'Procesando...' : '💾 Confirmar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TICKET COMPROBANTE DE FACTURACIÓN */}
      {ticketVenta && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center print:static print:bg-transparent print:backdrop-blur-none print:p-0 print:m-0 print:block">
          <div className="bg-white p-6 w-80 text-black font-mono text-sm rounded-lg relative print:w-full print:bg-transparent print:p-0 print:shadow-none">
            <div className="text-center mb-4">
              <h2 className="text-xl font-black uppercase">FarmaGO</h2>
              <p className="text-xs">Santa Cruz, Bolivia</p>
              <p className="text-xs mt-2 font-bold">TICKET: {ticketVenta.factura}</p>
              <p className="text-xs text-gray-500">{ticketVenta.fecha}</p>
            </div>
            <hr className="border-dashed border-gray-400 my-2" />
            <div className="mb-2 text-xs">
              <p><strong>Cajero:</strong> {ticketVenta.cajero}</p>
              <p><strong>Cliente:</strong> {ticketVenta.cliente}</p>
              <p><strong>NIT/CI:</strong> {ticketVenta.nit}</p>
              <p><strong>Pago:</strong> {ticketVenta.metodo}</p>
            </div>
            <hr className="border-dashed border-gray-400 my-2" />
            <table className="w-full text-xs mb-2">
              <thead>
                <tr className="border-b border-dashed border-gray-400">
                  <th className="text-left pb-1">Cant</th>
                  <th className="text-left pb-1">Desc</th>
                  <th className="text-right pb-1">SubT</th>
                </tr>
              </thead>
              <tbody>
                {ticketVenta.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="pt-1 align-top">{item.cantidad}</td>
                    <td className="pt-1 pr-2 leading-tight">{item.nombre}</td>
                    <td className="text-right pt-1 align-top">{(item.cantidad * item.precio).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <hr className="border-dashed border-gray-400 my-2" />
            <div className="flex justify-between font-black text-base mt-2"><span>TOTAL:</span><span>Bs. {ticketVenta.total}</span></div>
            <div className="mt-6 flex gap-2 print:hidden">
              <button onClick={() => window.print()} className="w-1/2 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-lg transition-colors">🖨️ Imprimir</button>
              <button onClick={() => setTicketVenta(null)} className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 rounded-lg transition-colors">Nueva Venta</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QR DE PAGO ESTÁTICO */}
      {mostrarModalQR && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-96 flex flex-col items-center animate-scale-in border border-gray-200/50">
            <h3 className="text-xl font-black text-gray-800 mb-1">Cobro por QR</h3>
            <p className="text-xs text-gray-500 mb-4 text-center">El cliente debe escanear y digitar el monto exacto.</p>

            {/* 1. EL QR ESTÁTICO DE TU CLIENTE */}
            <div className="bg-white p-2 rounded-2xl border-2 border-dashed border-brand-400 mb-4 shadow-sm animate-pop">
              {/* Asegúrate de que el nombre aquí coincida con el archivo que guardaste en la carpeta public */}
              <img src="/qrfarma.png" alt="QR del Cliente" className="w-56 h-56 object-contain rounded" />
            </div>

            {/* 2. INSTRUCCIÓN CLARA DEL MONTO GIGANTE */}
            <div className="w-full bg-brand-100/60 border border-brand-300/40 p-4 rounded-2xl flex flex-col items-center mb-6 shadow-inner">
              <span className="text-[11px] font-bold text-brand-700 uppercase tracking-widest mb-1">Monto a Transferir</span>
              <span className="text-4xl font-black text-brand-gradient">Bs. {calcularTotal()}</span>
            </div>

            <div className="flex gap-2 w-full">
              <button onClick={() => setMostrarModalQR(false)} className="w-1/3 bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-bold transition-colors text-sm text-gray-700">Cancelar</button>
              <button onClick={procesarVentaEnBackend} className="w-2/3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-3 rounded-xl font-bold shadow-md transition-all duration-200 text-sm">✅ Confirmar Recepción</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INFORME DE ARQUEO DE CIERRE */}
      {mostrarModalCierre && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-96 animate-scale-in border border-gray-200/50">
            {!reporteCierre ? (
              <form onSubmit={manejarCierreCaja} className="flex flex-col gap-4">
                <h3 className="text-xl font-black text-gray-800">🔒 Procesar Arqueo</h3>
                <input type="number" step="0.10" required autoFocus placeholder="0.00" className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-xl font-bold text-center outline-none transition-all focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]" value={montoCierreReal} onChange={(e) => setMontoCierreReal(e.target.value)} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMostrarModalCierre(false)} className="w-1/2 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-bold transition-colors">Cancelar</button>
                  <button type="submit" className="w-1/2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold transition-colors">Cerrar Caja</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col">
                <h3 className="text-xl font-black text-center mb-4 text-gray-800">📊 Reporte de Turno</h3>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 font-mono text-sm space-y-2 mb-6 shadow-inner">
                  <div className="flex justify-between text-gray-600"><span>Fondo Inicial:</span> <span>Bs. {Number(reporteCierre.fondoInicial || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Ventas Turno:</span> <span>Bs. {Number(reporteCierre.ventasRegistradas || 0).toFixed(2)}</span></div>
                  <hr className="border-gray-300 my-2" />
                  <div className="flex justify-between font-bold text-gray-800"><span>Deberías tener:</span> <span>Bs. {Number(reporteCierre.dineroEsperado || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-gray-800"><span>Entregaste:</span> <span>Bs. {Number(reporteCierre.dineroEntregado || 0).toFixed(2)}</span></div>
                  <hr className="border-gray-300 my-2" />
                  <div className={`flex justify-between text-lg font-black ${(reporteCierre.desfase || 0) === 0 ? 'text-brand-600' : (reporteCierre.desfase) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <span>Balance:</span> <span>Bs. {Number(reporteCierre.desfase || 0).toFixed(2)}</span>
                  </div>
                  <p className={`text-center text-xs font-bold uppercase mt-1 ${(reporteCierre.desfase || 0) === 0 ? 'text-brand-600' : (reporteCierre.desfase) < 0 ? 'text-red-500' : 'text-green-500'}`}>({reporteCierre.resultado || 'Desconocido'})</p>
                </div>
                <button onClick={confirmarBloqueo} className="w-full bg-gray-800 hover:bg-black text-white font-bold py-3 rounded-xl shadow-md transition-all">Aceptar y Bloquear</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL INGRESO DE STOCK FÍSICO POR LOTE */}
      {mostrarModalIngreso && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-96 animate-scale-in border border-gray-200/50">
            <h3 className="text-xl font-black text-gray-800 mb-2">📦 Ingresar Lote Físico</h3>
            <form onSubmit={guardarNuevoLote} className="flex flex-col gap-3">
              <div>
                <select required className="w-full p-2 border border-gray-300 rounded-xl text-sm outline-none transition-all focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)]" value={formularioLote.productoId} onChange={(e) => setFormularioLote({ ...formularioLote, productoId: e.target.value })}>
                  <option value="">-- Elige un producto --</option>
                  {productosLookup.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input type="text" required placeholder="Nro Lote" className="w-1/2 p-2 border border-gray-300 rounded-xl text-sm outline-none transition-all focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)]" value={formularioLote.numeroLote} onChange={(e) => setFormularioLote({ ...formularioLote, numeroLote: e.target.value })} />
                <input type="date" required className="w-1/2 p-2 border border-gray-300 rounded-xl text-sm outline-none transition-all focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)]" value={formularioLote.fechaVencimiento} onChange={(e) => setFormularioLote({ ...formularioLote, fechaVencimiento: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <input type="number" required min="1" placeholder="Cantidad" className="w-1/2 p-2 border border-gray-300 rounded-xl text-sm outline-none transition-all focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)]" value={formularioLote.cantidad} onChange={(e) => setFormularioLote({ ...formularioLote, cantidad: e.target.value })} />
                <input type="number" step="0.01" required min="0" placeholder="Costo Unitario" className="w-1/2 p-2 border border-gray-300 rounded-xl text-sm outline-none transition-all focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)]" value={formularioLote.costoUnitario} onChange={(e) => setFormularioLote({ ...formularioLote, costoUnitario: e.target.value })} />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setMostrarModalIngreso(false)} className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-xl text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={cargandoGuardarLote} className="w-2/3 btn-primary py-2 rounded-xl text-sm">📥 Ingresar Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR DE PRODUCTO MAESTRO */}
      {mostrarModalProducto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[450px] max-h-[90vh] overflow-y-auto animate-scale-in border border-gray-200/50">
            <h3 className="text-xl font-black text-gray-800 mb-1">
              {productoEditandoId ? "✏️ Editar Producto Maestro" : "✨ Nuevo Producto Maestro"}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {productoEditandoId ? "Modifica los datos del medicamento base en el catálogo." : "Registra la definición base en el catálogo de la farmacia."}
            </p>
            <form onSubmit={guardarNuevoProductoMaestro} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">SKU Comercial</label>
                  <input type="text" required placeholder="Ej. SKU-1001" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.sku} onChange={(e) => setFormularioProducto({ ...formularioProducto, sku: e.target.value })} />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Código de Barras</label>
                  <input type="text" placeholder="Opcional" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.codigoBarras} onChange={(e) => setFormularioProducto({ ...formularioProducto, codigoBarras: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre Comercial</label>
                <input type="text" required placeholder="Ej. Paracetamol Delta" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.nombreComercial} onChange={(e) => setFormularioProducto({ ...formularioProducto, nombreComercial: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <CreatableSelect
                    label="Molécula (Genérico)"
                    options={moleculasIniciales}
                    value={formularioProducto.nombreGenerico}
                    onChange={(val) => setFormularioProducto({ ...formularioProducto, nombreGenerico: val })}
                    placeholder="-- Seleccionar o Escribir --"
                  />
                </div>
                <div className="w-1/2">
                  <CreatableSelect
                    label="Concentración"
                    options={concentracionesIniciales}
                    value={formularioProducto.concentracion}
                    onChange={(val) => setFormularioProducto({ ...formularioProducto, concentracion: val })}
                    placeholder="-- Seleccionar o Escribir --"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-full">
                  <CreatableSelect
                    label="Presentación Física"
                    options={presentacionesIniciales}
                    value={formularioProducto.presentacion}
                    onChange={(val) => setFormularioProducto({ ...formularioProducto, presentacion: val })}
                    placeholder="-- Seleccionar o Escribir --"
                  />
                </div>
              </div>

              {/* SECCIÓN PRECIOS Y MÁRGENES (PROTECCIÓN CONTRA FLUCTUACIÓN USD) */}
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                <div className="text-[10px] font-black text-[#1b6f8f] uppercase mb-2 flex justify-between items-center">
                  <span>💵 Control de Precios y Proveedor</span>
                  <span className="text-[9px] text-gray-500 font-normal">Soporte fluctuación USD / Costos</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Precio Compra (Bs.)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" className="w-full mt-1 p-2 border rounded text-xs outline-none font-bold bg-white focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.precioCompra} onChange={(e) => setFormularioProducto({ ...formularioProducto, precioCompra: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Precio Venta (Bs.) *</label>
                    <input type="number" step="0.01" required min="0" placeholder="0.00" className="w-full mt-1 p-2 border rounded text-xs outline-none font-bold bg-white focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.precioVenta} onChange={(e) => setFormularioProducto({ ...formularioProducto, precioVenta: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Fecha Act. Precio</label>
                    <input type="date" className="w-full mt-1 p-2 border rounded text-xs outline-none bg-white focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.fechaActualizacionPrecio} onChange={(e) => setFormularioProducto({ ...formularioProducto, fechaActualizacionPrecio: e.target.value })} />
                  </div>
                </div>
                {formularioProducto.precioVenta && formularioProducto.precioCompra && parseFloat(formularioProducto.precioVenta) > 0 && (
                  <div className="mt-2 text-[10px] font-bold text-gray-600 flex justify-between items-center bg-white p-2 rounded-lg border border-blue-100 shadow-sm">
                    <span>Margen Comercial Calculado:</span>
                    <span className={`px-2 py-0.5 rounded font-black ${((parseFloat(formularioProducto.precioVenta) - parseFloat(formularioProducto.precioCompra)) / parseFloat(formularioProducto.precioVenta)) * 100 < 15 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {(((parseFloat(formularioProducto.precioVenta) - parseFloat(formularioProducto.precioCompra)) / parseFloat(formularioProducto.precioVenta)) * 100).toFixed(1)}% ({((parseFloat(formularioProducto.precioVenta) - parseFloat(formularioProducto.precioCompra))).toFixed(2)} Bs. utilidad)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Marca</label>
                  <input type="text" placeholder="Ej. AMINO HEPAT" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.marca} onChange={(e) => setFormularioProducto({ ...formularioProducto, marca: e.target.value })} />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Distribuidor</label>
                  <input type="text" placeholder="Ej. INTI ETICOS" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.distribuidor} onChange={(e) => setFormularioProducto({ ...formularioProducto, distribuidor: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">País de Origen</label>
                  <input type="text" placeholder="Ej. BOLIVIA" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.paisOrigen} onChange={(e) => setFormularioProducto({ ...formularioProducto, paisOrigen: e.target.value })} />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Registro Sanitario</label>
                  <input type="text" placeholder="Ej. NN 93829 2025" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.registroSanitario} onChange={(e) => setFormularioProducto({ ...formularioProducto, registroSanitario: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Composición</label>
                <textarea rows="2" placeholder="Ej. L-ORNITINA 3GR" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.composicion} onChange={(e) => setFormularioProducto({ ...formularioProducto, composicion: e.target.value })} />
              </div>
              <div className="flex gap-2 items-center">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Stock Mínimo</label>
                  <input type="number" min="1" required className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.stockMinimo} onChange={(e) => setFormularioProducto({ ...formularioProducto, stockMinimo: e.target.value })} />
                </div>
                <div className="w-1/2 flex items-center h-full pt-4 pl-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                    <input type="checkbox" className="rounded border-gray-300 text-[#2596be] focus:ring-[#2596be] w-4 h-4" checked={formularioProducto.controlado} onChange={(e) => setFormularioProducto({ ...formularioProducto, controlado: e.target.checked })} />
                    🚨 Requiere Receta
                  </label>
                </div>
              </div>

              {/* [NEW] Foto referencial del producto */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Foto Referencial</label>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-24 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {fotoProductoVisible ? (
                      <img src={fotoProductoVisible} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{iconoCategoriaSeleccionada}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="px-2 py-1.5 bg-[#2596be]/10 text-[#1b6f8f] rounded-lg text-xs font-bold text-center cursor-pointer hover:bg-[#2596be]/20 transition-colors">
                      🖼️ Subir desde PC
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const archivo = e.target.files[0];
                        if (!archivo) return;
                        setFotoPendiente({ tipo: 'archivo', datos: archivo, urlPreview: URL.createObjectURL(archivo) });
                        e.target.value = '';
                      }} />
                    </label>
                    <button type="button" onClick={abrirBuscadorDesdeModal} className="px-2 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">🔎 Buscar en internet</button>
                    {fotoProductoVisible && (
                      <button type="button" onClick={() => setFotoPendiente({ tipo: 'quitar' })} className="px-2 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">🗑️ Quitar foto</button>
                    )}
                  </div>
                </div>
              </div>

              {/* [NEW] Categoría del producto (como en app de delivery) */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex justify-between">
                  <span>Categoría</span>
                  <button type="button" onClick={abrirModalCategorias} className="text-[#1b6f8f] underline">Gestionar categorías</button>
                </label>
                <select className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700" value={formularioProducto.categoriaId || ''} onChange={(e) => setFormularioProducto({ ...formularioProducto, categoriaId: e.target.value })}>
                  <option value="">-- Sin categoría --</option>
                  {categorias.map((cat) => (<option key={cat.id} value={cat.id}>{cat.icono} {cat.nombre}</option>))}
                </select>
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => { setMostrarModalProducto(false); setProductoEditandoId(null); setFotoPendiente(null); }} className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-lg text-xs transition-colors">Cancelar</button>
                <button type="submit" disabled={cargandoGuardarProducto} className="w-2/3 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-lg text-xs shadow-md transition-colors">
                  {cargandoGuardarProducto ? 'Guardando...' : productoEditandoId ? '💾 Guardar Cambios' : '✨ Registrar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* [NEW] MODAL EDITAR VENTA */}
      {mostrarModalEditarVenta && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-96 animate-scale-in border border-gray-200/50">
            <h3 className="text-xl font-black text-gray-800 mb-1">✏️ Editar Venta</h3>
            <p className="text-xs text-gray-500 mb-4">Modifica los datos del cliente y forma de pago de la venta.</p>
            <form onSubmit={guardarEdicionVenta} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Cliente / Razón Social</label>
                <input 
                  type="text" 
                  required 
                  className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" 
                  value={formularioEditarVenta.clienteNombre} 
                  onChange={(e) => setFormularioEditarVenta({ ...formularioEditarVenta, clienteNombre: e.target.value })} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">NIT / CI</label>
                <input 
                  type="text" 
                  required 
                  className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" 
                  value={formularioEditarVenta.clienteNitCi} 
                  onChange={(e) => setFormularioEditarVenta({ ...formularioEditarVenta, clienteNitCi: e.target.value })} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Forma de Pago</label>
                <select 
                  className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700" 
                  value={formularioEditarVenta.tipoPago} 
                  onChange={(e) => setFormularioEditarVenta({ ...formularioEditarVenta, tipoPago: e.target.value })}
                >
                  <option value="EFECTIVO">💵 Efectivo</option>
                  <option value="QR">📱 QR</option>
                  <option value="TARJETA">💳 Tarjeta</option>
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => { setMostrarModalEditarVenta(false); setVentaEditando(null); }} 
                  className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={cargandoEditarVenta} 
                  className="w-2/3 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-lg text-xs shadow-md transition-colors"
                >
                  {cargandoEditarVenta ? 'Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* [NEW] MODAL ANULAR VENTA (SIAT + RESTAURACIÓN DE INVENTARIO) */}
      {mostrarModalAnularVenta && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[400px] animate-scale-in border border-gray-200/50">
            <h3 className="text-xl font-black text-red-600 mb-1">⚠️ Anulación y Devolución de Factura</h3>
            <p className="text-xs text-gray-500 mb-4">Esta operación es irreversible e implica las siguientes acciones automáticas:</p>
            
            <ul className="text-xs text-gray-600 bg-red-50 border border-red-200 p-3 rounded-lg space-y-1.5 mb-4 font-semibold animate-pulse">
              <li>🔄 Reversión total de la factura en Impuestos (SIAT).</li>
              <li>📦 Devolución automática de cantidades al stock físico de cada lote.</li>
              <li>📊 Registro de auditoría inmutable en el historial de ajustes.</li>
            </ul>

            <form onSubmit={procesarAnulacionVenta} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Detalle/Motivo de la Eliminación (SIAT)</label>
                <textarea 
                  required 
                  rows="3"
                  placeholder="Ej. Error en los datos de facturación del cliente / devolución de medicamento..." 
                  className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-red-500 bg-white" 
                  value={motivoAnulacion} 
                  onChange={(e) => setMotivoAnulacion(e.target.value)} 
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button 
                  type="button" 
                  onClick={() => { setMostrarModalAnularVenta(false); setVentaAnulando(null); }} 
                  className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={cargandoAnulacion} 
                  className="w-2/3 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg text-xs shadow-md transition-colors"
                >
                  {cargandoAnulacion ? 'Procesando Reversión...' : '🗑️ Proceder con la Anulación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BÚSQUEDA DE IMÁGENES EN INTERNET */}
      {modalBuscarImagen.visible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[720px] max-w-[95vw] max-h-[85vh] flex flex-col animate-scale-in border border-gray-200/50">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-black text-gray-800">🔎 Buscar imagen en internet</h3>
                <p className="text-xs text-gray-500 mt-1">Resultados de <strong>Brave Search</strong> y <strong>CIMA (AEMPS - España)</strong> para <strong>{modalBuscarImagen.productoNombre || 'tu búsqueda'}</strong>. Haz clic en una imagen para asignarla.</p>
              </div>
              <button type="button" onClick={() => setModalBuscarImagen({ visible: false, productoId: null, productoNombre: '', consulta: '' })} className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2">✕</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); buscarImagenesEnInternet(modalBuscarImagen.consulta); }} className="flex gap-2 mb-4">
              <input type="text" placeholder="Ej. Paracetamol 500 mg" className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2596be]" value={modalBuscarImagen.consulta} onChange={(e) => setModalBuscarImagen({ ...modalBuscarImagen, consulta: e.target.value })} />
              <button type="submit" disabled={cargandoImagenes} className="bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-md whitespace-nowrap">
                {cargandoImagenes ? 'Buscando...' : '🔍 Buscar'}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto">
              {cargandoImagenes ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500"><span className="spinner spinner-lg mb-3"></span><p className="font-medium">Buscando imágenes...</p></div>
              ) : resultadosImagenes.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10 italic">Escribe un término y presiona Buscar para ver resultados.</p>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {resultadosImagenes.map((img, idx) => (
                    <button type="button" key={idx} onClick={() => aplicarImagenBuscada(img)} disabled={usandoImagen} className="relative aspect-square bg-gray-100 border border-gray-200 rounded-lg overflow-hidden hover:border-[#2596be] hover:shadow-md transition-all group">
                      <img src={img.thumbUrl} alt={img.titulo || ''} loading="lazy" className="w-full h-full object-cover" />
                      {img.ancho > 0 && (
                        <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white">{img.ancho}×{img.alto}</span>
                      )}
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center text-white font-bold text-xs opacity-0 group-hover:opacity-100">
                        {usandoImagen ? 'Aplicando...' : '✔ Usar'}
                      </span>
                      <span className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 bg-black/55 text-white text-[9px] truncate text-left">{img.licencia || img.fuente || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL GESTIÓN DE CATEGORÍAS */}
      {modalCategorias.visible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[560px] max-w-[95vw] max-h-[85vh] flex flex-col animate-scale-in border border-gray-200/50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-gray-800">🗂️ Gestionar Categorías</h3>
                <p className="text-xs text-gray-500 mt-1">Agrupa los productos como en una app de delivery para farmacia.</p>
              </div>
              <button type="button" onClick={() => setModalCategorias({ visible: false, editando: null })} className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2">✕</button>
            </div>

            <form onSubmit={guardarCategoria} className="flex gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <input type="text" value={formularioCategoria.icono} onChange={(e) => setFormularioCategoria({ ...formularioCategoria, icono: e.target.value })} className="w-16 p-2 border border-gray-300 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-[#2596be]" placeholder="🏷️" title="Emoji del ícono" />
              <input type="text" value={formularioCategoria.nombre} onChange={(e) => setFormularioCategoria({ ...formularioCategoria, nombre: e.target.value })} className="flex-1 p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2596be]" placeholder="Nombre de la categoría" required />
              <input type="number" value={formularioCategoria.orden} onChange={(e) => setFormularioCategoria({ ...formularioCategoria, orden: e.target.value })} className="w-20 p-2 border border-gray-300 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-[#2596be]" placeholder="Orden" title="Orden de aparición" />
              <button type="submit" disabled={cargandoGuardarCategoria} className="bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-md whitespace-nowrap">
                {cargandoGuardarCategoria ? 'Guardando...' : modalCategorias.editando ? '💾 Actualizar' : '➕ Agregar'}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              {cargandoCategorias ? (
                <p className="text-center text-gray-400 py-10">Cargando categorías...</p>
              ) : categorias.length === 0 ? (
                <p className="text-center text-gray-400 py-10 italic">Aún no hay categorías. Crea la primera arriba.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold border-b">
                      <th className="p-3">Ícono</th>
                      <th className="p-3">Nombre</th>
                      <th className="p-3 text-center">Orden</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((cat) => (
                      <tr key={cat.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-xl">{cat.icono}</td>
                        <td className="p-3 font-bold text-sm text-gray-800">{cat.nombre}</td>
                        <td className="p-3 text-center text-sm text-gray-500">{cat.orden}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button type="button" onClick={() => iniciarEdicionCategoria(cat)} className="bg-[#2596be] hover:bg-[#1b6f8f] text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors">✏️ Editar</button>
                            <button type="button" onClick={() => manejarEliminarCategoria(cat.id)} disabled={cargandoEliminarCategoria} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors">🗑️ Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN RÁPIDA DESDE EL POS (FOTO + CATEGORÍA) */}
      {modalEdicionRapida.visible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[440px] max-w-[95vw] animate-scale-in border border-gray-200/50">
            <h3 className="text-xl font-black text-gray-800 mb-1">⚙️ Edición Rápida</h3>
            <p className="text-xs text-gray-500 mb-4">Cambia la foto referencial y la categoría de <strong>{modalEdicionRapida.producto?.nombre}</strong></p>

            <div className="mb-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Foto Referencial</label>
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {fotoRapida ? (
                    <img src={fotoRapida} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{modalEdicionRapida.producto?.categoriaIcono || '💊'}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="px-2 py-1.5 bg-[#2596be]/10 text-[#1b6f8f] rounded-lg text-xs font-bold text-center cursor-pointer hover:bg-[#2596be]/20 transition-colors">
                    🖼️ Subir desde PC
                    <input type="file" accept="image/*" className="hidden" onChange={manejarSubirFotoRapida} />
                  </label>
                  <button type="button" onClick={abrirBuscadorDesdeRapida} className="px-2 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">🔎 Buscar en internet</button>
                  {fotoRapida && (
                    <button type="button" onClick={manejarQuitarFotoRapida} className="px-2 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">🗑️ Quitar foto</button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex justify-between">
                <span>Categoría</span>
                <button type="button" onClick={() => { setModalEdicionRapida({ visible: false, producto: null }); abrirModalCategorias(); }} className="text-[#1b6f8f] underline">Gestionar categorías</button>
              </label>
              <select className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700" value={categoriaRapida || ''} onChange={(e) => setCategoriaRapida(e.target.value)}>
                <option value="">-- Sin categoría --</option>
                {categorias.map((cat) => (<option key={cat.id} value={cat.id}>{cat.icono} {cat.nombre}</option>))}
              </select>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setModalEdicionRapida({ visible: false, producto: null })} className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-xl text-sm transition-colors">Cancelar</button>
              <button type="button" onClick={guardarEdicionRapida} disabled={subiendoFoto || guardandoRapida} className="w-2/3 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-xl text-sm transition-colors shadow-md">
                {subiendoFoto || guardandoRapida ? 'Guardando...' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE COMPLETO DEL PRODUCTO (desde el POS) */}
      {modalDetalleProducto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in" onClick={() => setModalDetalleProducto(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-[400px] max-w-[95vw] max-h-[85vh] overflow-y-auto animate-scale-in border border-gray-200/50" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-32 bg-gray-100 flex items-center justify-center overflow-hidden rounded-t-2xl">
              {modalDetalleProducto.fotoUrl ? (
                <img src={modalDetalleProducto.fotoUrl} alt={modalDetalleProducto.nombre} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl">{modalDetalleProducto.categoriaIcono || '💊'}</span>
              )}
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 shadow-sm text-gray-700">{modalDetalleProducto.controlado ? '🚨 Rx' : '🟢 Venta Libre'}</span>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start gap-2 mb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-800 leading-tight">{modalDetalleProducto.nombre}</h3>
                  {modalDetalleProducto.categoriaNombre && (
                    <p className="text-xs text-gray-500 mt-0.5">{modalDetalleProducto.categoriaIcono} {modalDetalleProducto.categoriaNombre}</p>
                  )}
                </div>
                <button type="button" onClick={() => setModalDetalleProducto(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2">✕</button>
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div className="col-span-2 bg-blue-50/70 rounded-xl p-2.5 border border-blue-100 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Precio Venta / Compra</span>
                    <span className="font-black text-[#2596be] text-sm">Bs. {Number(modalDetalleProducto.precio || modalDetalleProducto.precioVenta || 0).toFixed(2)} / <span className="text-gray-600 text-xs">Bs. {Number(modalDetalleProducto.precioCompra || 0).toFixed(2)}</span></span>
                  </div>
                  {modalDetalleProducto.precioCompra > 0 && (
                    <div className="flex justify-between items-center text-[10px] font-bold border-t border-blue-200/50 pt-1 mt-0.5">
                      <span className="text-gray-500">Utilidad y Margen:</span>
                      <span className="text-green-700 bg-green-100 px-1.5 py-0.5 rounded font-black">
                        +{((modalDetalleProducto.precioVenta || modalDetalleProducto.precio || 0) - modalDetalleProducto.precioCompra).toFixed(2)} Bs. ({((((modalDetalleProducto.precioVenta || modalDetalleProducto.precio || 0) - modalDetalleProducto.precioCompra) / (modalDetalleProducto.precioVenta || modalDetalleProducto.precio || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                  {modalDetalleProducto.fechaActualizacionPrecio && (
                    <div className="text-[9px] text-gray-400 text-right mt-0.5">
                      Actualizado: {new Date(modalDetalleProducto.fechaActualizacionPrecio).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <DetalleFila etiqueta="Stock" valor={modalDetalleProducto.stock} />
                <DetalleFila etiqueta="SKU" valor={modalDetalleProducto.sku} />
                <DetalleFila etiqueta="Código de Barras" valor={modalDetalleProducto.codigoBarras} />
                <DetalleFila etiqueta="Concentración" valor={modalDetalleProducto.concentracion} />
                <DetalleFila etiqueta="Presentación" valor={modalDetalleProducto.presentacion} />
                <DetalleFila etiqueta="Marca" valor={modalDetalleProducto.marca} />
                <DetalleFila etiqueta="Distribuidor" valor={modalDetalleProducto.distribuidor} />
                <DetalleFila etiqueta="País de Origen" valor={modalDetalleProducto.paisOrigen} />
                <DetalleFila etiqueta="Reg. Sanitario" valor={modalDetalleProducto.registroSanitario} />
                <DetalleFila etiqueta="Stock Mínimo" valor={modalDetalleProducto.stockMinimo} />
                <DetalleFila etiqueta="Nombre Genérico" valor={modalDetalleProducto.nombreGenerico} />
                <DetalleFila etiqueta="Composición" valor={modalDetalleProducto.composicion} expandido />
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROVEEDOR MÉDICO */}
      {modalProveedor.visible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[460px] max-w-[95vw] max-h-[90vh] overflow-y-auto animate-scale-in border border-gray-200/50">
            <h3 className="text-xl font-black text-gray-800 mb-1">{modalProveedor.editando ? "✏️ Editar Proveedor Médico" : "🏢 Nuevo Proveedor Médico"}</h3>
            <p className="text-xs text-gray-500 mb-4">Laboratorios, distribuidores e importadoras que abastecen tu farmacia.</p>
            <form onSubmit={guardarProveedor} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre</label>
                <input type="text" required placeholder="Ej. INTI ETICOS" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProveedor.nombre} onChange={(e) => setFormularioProveedor({ ...formularioProveedor, nombre: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Tipo</label>
                  <select className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700" value={formularioProveedor.tipo} onChange={(e) => setFormularioProveedor({ ...formularioProveedor, tipo: e.target.value })}>
                    <option value="LABORATORIO">🧪 Laboratorio</option>
                    <option value="DISTRIBUIDOR">📦 Distribuidor</option>
                    <option value="IMPORTADORA">🌎 Importadora</option>
                    <option value="OTRO">📄 Otro</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Contacto Principal</label>
                  <input type="text" placeholder="Ej. Lic. Ana Rojas" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProveedor.contactoPrincipal} onChange={(e) => setFormularioProveedor({ ...formularioProveedor, contactoPrincipal: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Teléfono</label>
                  <input type="text" placeholder="Ej. 777-12345" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProveedor.telefono} onChange={(e) => setFormularioProveedor({ ...formularioProveedor, telefono: e.target.value })} />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Email</label>
                  <input type="email" placeholder="ventas@proveedor.com" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProveedor.email} onChange={(e) => setFormularioProveedor({ ...formularioProveedor, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Dirección</label>
                <input type="text" placeholder="Ej. Av. Mcal. Santa Cruz #123" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProveedor.direccion} onChange={(e) => setFormularioProveedor({ ...formularioProveedor, direccion: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                <input type="checkbox" className="rounded border-gray-300 text-[#2596be] focus:ring-[#2596be] w-4 h-4" checked={formularioProveedor.activo} onChange={(e) => setFormularioProveedor({ ...formularioProveedor, activo: e.target.checked })} />
                Activo (mantiene relación comercial)
              </label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setModalProveedor({ visible: false, editando: null })} className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-lg text-xs transition-colors">Cancelar</button>
                <button type="submit" disabled={cargandoGuardarCRM} className="w-2/3 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-lg text-xs shadow-md transition-colors">
                  {cargandoGuardarCRM ? 'Guardando...' : modalProveedor.editando ? '💾 Guardar Cambios' : '💾 Registrar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VISITADOR / PROMOTOR */}
      {modalVisitador.visible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[460px] max-w-[95vw] max-h-[90vh] overflow-y-auto animate-scale-in border border-gray-200/50">
            <h3 className="text-xl font-black text-gray-800 mb-1">{modalVisitador.editando ? "✏️ Editar Visitador/Promotor" : "👤 Nuevo Visitador/Promotor"}</h3>
            <p className="text-xs text-gray-500 mb-4">Representantes de laboratorios que visitan tu farmacia.</p>
            <form onSubmit={guardarVisitador} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre Completo</label>
                <input type="text" required placeholder="Ej. Lic. Carlos Mendoza" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioVisitador.nombre} onChange={(e) => setFormularioVisitador({ ...formularioVisitador, nombre: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Empresa / Laboratorio</label>
                  <input type="text" placeholder="Ej. AMINO HEPAT" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioVisitador.empresa} onChange={(e) => setFormularioVisitador({ ...formularioVisitador, empresa: e.target.value })} />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Zona</label>
                  <input type="text" placeholder="Ej. Zona Sur" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioVisitador.zona} onChange={(e) => setFormularioVisitador({ ...formularioVisitador, zona: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Teléfono</label>
                  <input type="text" placeholder="Ej. 777-12345" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioVisitador.telefono} onChange={(e) => setFormularioVisitador({ ...formularioVisitador, telefono: e.target.value })} />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Email</label>
                  <input type="email" placeholder="carlos@lab.com" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioVisitador.email} onChange={(e) => setFormularioVisitador({ ...formularioVisitador, email: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                <input type="checkbox" className="rounded border-gray-300 text-[#2596be] focus:ring-[#2596be] w-4 h-4" checked={formularioVisitador.activo} onChange={(e) => setFormularioVisitador({ ...formularioVisitador, activo: e.target.checked })} />
                Activo (visita regularmente)
              </label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setModalVisitador({ visible: false, editando: null })} className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-lg text-xs transition-colors">Cancelar</button>
                <button type="submit" disabled={cargandoGuardarCRM} className="w-2/3 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-lg text-xs shadow-md transition-colors">
                  {cargandoGuardarCRM ? 'Guardando...' : modalVisitador.editando ? '💾 Guardar Cambios' : '💾 Registrar Visitador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SEGUIMIENTO */}
      {modalSeguimiento.visible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[480px] max-w-[95vw] max-h-[90vh] overflow-y-auto animate-scale-in border border-gray-200/50">
            <h3 className="text-xl font-black text-gray-800 mb-1">{modalSeguimiento.editando ? "✏️ Editar Seguimiento" : "📋 Nuevo Seguimiento"}</h3>
            <p className="text-xs text-gray-500 mb-4">Registra la interacción con <strong>{modalSeguimiento.entidadNombre}</strong></p>
            <form onSubmit={guardarSeguimiento} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Fecha</label>
                  <input type="date" required className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioSeguimiento.fecha} onChange={(e) => setFormularioSeguimiento({ ...formularioSeguimiento, fecha: e.target.value })} />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Tipo de Contacto</label>
                  <select className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700" value={formularioSeguimiento.tipo} onChange={(e) => setFormularioSeguimiento({ ...formularioSeguimiento, tipo: e.target.value })}>
                    <option value="VISITA">🏃 Visita presencial</option>
                    <option value="LLAMADA">📞 Llamada</option>
                    <option value="REUNION">🤝 Reunión</option>
                    <option value="EMAIL">✉️ Email</option>
                    <option value="PEDIDO">📦 Pedido</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Asunto</label>
                <input type="text" placeholder="Ej. Presentación de nueva línea" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioSeguimiento.asunto} onChange={(e) => setFormularioSeguimiento({ ...formularioSeguimiento, asunto: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Notas / Detalle</label>
                <textarea rows="3" placeholder="Detalla lo conversado, muestras entregadas, muestras, pendientes..." className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioSeguimiento.notas} onChange={(e) => setFormularioSeguimiento({ ...formularioSeguimiento, notas: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Resultado</label>
                  <input type="text" placeholder="Ej. Interesado, cotizar" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioSeguimiento.resultado} onChange={(e) => setFormularioSeguimiento({ ...formularioSeguimiento, resultado: e.target.value })} />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Próximo Seguimiento</label>
                  <input type="date" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioSeguimiento.proximoSeguimiento} onChange={(e) => setFormularioSeguimiento({ ...formularioSeguimiento, proximoSeguimiento: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setModalSeguimiento({ visible: false, editando: null })} className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-lg text-xs transition-colors">Cancelar</button>
                <button type="submit" disabled={cargandoGuardarCRM} className="w-2/3 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-lg text-xs shadow-md transition-colors">
                  {cargandoGuardarCRM ? 'Guardando...' : modalSeguimiento.editando ? '💾 Guardar Cambios' : '💾 Registrar Seguimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE SEGUIMIENTOS */}
      {modalHistorial.visible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[560px] max-w-[95vw] max-h-[85vh] flex flex-col animate-scale-in border border-gray-200/50">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-black text-gray-800">📋 Seguimientos de {modalHistorial.entidadNombre}</h3>
                <p className="text-xs text-gray-500 mt-1">{modalHistorial.entidadTipo === 'PROVEEDOR' ? '🏢 Proveedor médico' : '👤 Visitador/Promotor'}</p>
              </div>
              <button type="button" onClick={() => setModalHistorial({ visible: false, entidadTipo: null, entidadId: null, entidadNombre: '' })} className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2">✕</button>
            </div>

            <button onClick={() => abrirNuevoSeguimiento(modalHistorial.entidadTipo, modalHistorial.entidadId, modalHistorial.entidadNombre)} className="mb-4 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-md w-fit">➕ Registrar seguimiento</button>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              {historialSeguimientos.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10 italic">Aún no hay seguimientos registrados para este contacto.</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100">
                  {historialSeguimientos.map((seg) => (
                    <div key={seg.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black text-[#1b6f8f] uppercase">📅 {seg.fecha}</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{seg.tipo}</span>
                          {seg.proximoSeguimiento && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">⏰ {seg.proximoSeguimiento}</span>}
                        </div>
                        {seg.asunto && <p className="text-sm font-bold text-gray-800 mt-1">{seg.asunto}</p>}
                        {seg.notas && <p className="text-xs text-gray-600 mt-0.5">{seg.notas}</p>}
                        {seg.resultado && <p className="text-xs mt-1"><span className="font-bold text-gray-500 uppercase">Resultado: </span><span className="text-gray-700">{seg.resultado}</span></p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => abrirNuevoSeguimiento(modalHistorial.entidadTipo, modalHistorial.entidadId, modalHistorial.entidadNombre, seg)} title="Editar" className="bg-gray-100 hover:bg-gray-200 py-1 px-2 rounded text-xs font-bold transition-colors">✏️</button>
                        <button onClick={() => manejarEliminarSeguimiento(seg.id)} title="Eliminar" className="bg-red-50 hover:bg-red-100 text-red-600 py-1 px-2 rounded text-xs font-bold transition-colors">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CABECERA DINÁMICA CON SEGURIDAD POR ROLES */}
      <header className="bg-brand-gradient text-white p-4 shadow-lg flex justify-between items-center print:hidden sticky top-0 z-40 animate-fade-in-down">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm py-1.5 pl-1.5 pr-4 rounded-2xl border border-white/20 shadow-inner">
            <img src="/logofarma.png" alt="Logo" className="h-9 w-auto object-contain p-1 rounded-xl bg-white/20 border border-white/20" />
            <h1 className="text-xl font-black tracking-wider drop-shadow-sm">FarmaGO</h1>
          </div>

          <nav className="flex bg-black/15 backdrop-blur-sm p-1 rounded-xl border border-white/20 ml-2 shadow-inner">
            <button onClick={() => setPestañaActiva('pos')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 ${pestañaActiva === 'pos' ? 'bg-white text-brand-700 shadow-lg' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>🛒 Punto de Venta</button>

            {/* 🔒 FILTRO DE ROLES: Las pestañas desaparecen si el usuario no es un ADMIN homologado */}
            {rolUsuario === 'ADMIN' && (
              <>
                <button onClick={() => setPestañaActiva('inventario')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 ${pestañaActiva === 'inventario' ? 'bg-white text-brand-700 shadow-lg' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>📅 Inventario</button>
                <button onClick={() => setPestañaActiva('ventas')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 ${pestañaActiva === 'ventas' ? 'bg-white text-brand-700 shadow-lg' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>🧾 Ventas</button>
                <button onClick={() => setPestañaActiva('dashboard')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 ${pestañaActiva === 'dashboard' ? 'bg-white text-brand-700 shadow-lg' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>📊 Reportes</button>
                <button onClick={() => setPestañaActiva('crm')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 ${pestañaActiva === 'crm' ? 'bg-white text-brand-700 shadow-lg' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>🩺 CRM Médico</button>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/20">
            <span className="text-[9px] text-blue-100 font-bold uppercase tracking-widest mb-0.5">Control Físico de Gaveta</span>
            <div className="flex gap-3 text-[11px] font-mono items-center">
              <span title="Fondo Inicial" className="text-gray-200">Fondo: <span className="font-bold text-white">Bs. {fondoInicial.toFixed(2)}</span></span>
              <span className="text-white/40">|</span>
              <span title="Ventas en Efectivo del turno" className="text-green-200">Efvo: <span className="font-bold">+{ventasEfectivoTurno.toFixed(2)}</span></span>
              <span className="text-white/40">|</span>
              <span title="Saldo Actual Esperado en Caja" className="font-black text-white bg-black/25 px-2 py-0.5 rounded-lg shadow-inner">Total: Bs. {(fondoInicial + ventasEfectivoTurno).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end border-l border-white/20 pl-4 ml-1">
            <span className="font-bold text-sm leading-tight text-yellow-300 drop-shadow">{cajeroNombre}</span>
            <span className="text-[10px] text-green-200 font-bold flex items-center gap-1 uppercase">
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span> {rolUsuario}
            </span>
          </div>
          <button onClick={() => setMostrarModalCierre(true)} className="ml-2 bg-red-500 hover:bg-red-600 active:scale-95 px-4 py-2 text-sm rounded-xl font-black shadow-md transition-all duration-200 flex items-center gap-2 hover:shadow-lg">🔒 Cerrar</button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-hidden h-[calc(100vh-72px)] print:hidden animate-fade-in">

        {pestañaActiva === 'pos' ? (
          <div className="flex h-full gap-4 max-h-[calc(100vh-100px)] overflow-hidden">
            {/* LADO IZQUIERDO: CATÁLOGO DE PRODUCTOS */}
            <section className="w-2/3 bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden border border-gray-200/70 animate-fade-in">
              <div className="p-4 border-b border-gray-200 bg-brand-gradient-soft flex flex-col gap-3">
                <input type="text" placeholder="🔍 Buscar medicamento por nombre, genérico, SKU o código..." className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(37,150,190,0.12)] text-md shadow-sm transition-all bg-white" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); if (e.target.value.trim() !== '') setVistaPOS('productos'); }} />
                <div className="flex gap-2 justify-between items-center">
                  
                  {/* [NEW] Selector premium de categorías rápidas (Slider de Categoría) */}
                  <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                    <button 
                      type="button"
                      onClick={() => { setFiltroRecetaPOS('TODOS'); setVistaPOS('productos'); }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${filtroRecetaPOS === 'TODOS' ? 'bg-brand-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      💊 Todos
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setFiltroRecetaPOS('LIBRE'); setVistaPOS('productos'); }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${filtroRecetaPOS === 'LIBRE' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      🟢 Venta Libre
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setFiltroRecetaPOS('CONTROLADO'); setVistaPOS('productos'); }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${filtroRecetaPOS === 'CONTROLADO' ? 'bg-red-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      🚨 Controlados
                    </button>
                  </div>

                  {/* Ordenación Precio POS */}
                  <select className="p-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700 shadow-sm" value={ordenPrecioPOS} onChange={(e) => { setOrdenPrecioPOS(e.target.value); setVistaPOS('productos'); }}>
                    <option value="NINGUNO">Precio: Sin Orden</option>
                    <option value="ASC">Precio: Menor a Mayor</option>
                    <option value="DESC">Precio: Mayor a Menor</option>
                  </select>
                </div>
              </div>
              
              {/* Contenedor del catálogo con scroll y altura máxima fija */}
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 h-[calc(100vh-270px)] max-h-[calc(100vh-270px)]">
                {cargando ? (
                  <div className="flex justify-center items-center h-full text-gray-500"><span className="spinner spinner-lg"></span></div>
                ) : enVistaCategorias ? (
                  /* ── GRID DE CATEGORÍAS (estilo tarjetas como los productos) ── */
                  <div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <button
                        type="button"
                        onClick={() => abrirCategoriaPOS('TODOS')}
                        className="stagger-in p-4 bg-brand-gradient text-white rounded-2xl hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center group border border-white/10"
                      >
                        <span className="text-4xl drop-shadow">💊</span>
                        <span className="text-sm font-black leading-tight">Todos</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">{contarDisponiblesPOS('TODOS')} disponibles</span>
                      </button>
                      {categorias.map((cat, idx) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => abrirCategoriaPOS(cat.id)}
                          style={{ '--stagger': idx + 1 }}
                          className="stagger-in p-4 bg-white border border-gray-200/80 rounded-2xl hover:border-brand-400 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center group card-elevated"
                        >
                          <span className="text-4xl transition-transform duration-200 group-hover:scale-110">{cat.icono}</span>
                          <span className="text-sm font-bold text-gray-800 leading-tight">{cat.nombre}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 group-hover:bg-brand-100 group-hover:text-brand-700">{contarDisponiblesPOS(cat.id)} disponibles</span>
                        </button>
                      ))}
                    </div>
                    {categorias.length === 0 && (
                      <p className="text-center text-gray-400 text-sm italic py-10 mt-4 bg-white rounded-xl border border-gray-200">Aún no hay categorías. Administra las categorías desde el módulo de Inventario.</p>
                    )}
                  </div>
                ) : (
                  /* ── PRODUCTOS DE LA CATEGORÍA SELECCIONADA (drill-down) ── */
                  <div>
                    <div className="flex items-center gap-2 mb-3 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm animate-fade-in-down">
                      <button
                        type="button"
                        onClick={volverACategoriasPOS}
                        className="flex items-center gap-1 bg-gray-100 hover:bg-brand-500 hover:text-white text-gray-600 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors"
                      >
                        ← Categorías
                      </button>
                      {categoriaActivaPOS !== 'TODOS' && (
                        <span className="text-sm font-black text-gray-700 truncate">
                          {categorias.find(c => c.id === categoriaActivaPOS)?.icono || '💊'} {categorias.find(c => c.id === categoriaActivaPOS)?.nombre || 'Productos'}
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                        {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {productosFiltrados.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm italic py-10">Sin productos: prueba con otra búsqueda o categoría.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-4">
                        {productosFiltrados.map((producto, idx) => {
                          const esAgotado = producto.stock <= 0;
                          const esStockBajo = !esAgotado && producto.stockMinimo > 0 && producto.stock <= producto.stockMinimo;
                          return (
                            <div key={producto.loteId} style={{ '--stagger': idx + 1 }} onClick={() => agregarAlCarrito(producto)} className={`stagger-in relative bg-white border border-gray-200/80 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 group ${esAgotado ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl hover:-translate-y-0.5 hover:border-brand-400'}`}>
                              <div className="relative h-28 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden">
                                {producto.fotoUrl ? (
                                  <img src={producto.fotoUrl} alt={producto.nombre} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                ) : (
                                  <span className="text-4xl transition-transform duration-200 group-hover:scale-110">{producto.categoriaIcono || '💊'}</span>
                                )}
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/90 backdrop-blur-sm shadow-sm text-gray-600">Stock: {producto.stock}</span>
                                {producto.controlado && (
                                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-600 text-white shadow-sm">🚨 Rx</span>
                                )}
                                {esAgotado && (
                                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow-sm">🚫 Agotado</span>
                                )}
                                {esStockBajo && (
                                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white shadow-sm">⚠️ Stock bajo</span>
                                )}
                                <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setModalDetalleProducto(producto); }}
                                    title="Ver información completa del producto"
                                    className="w-7 h-7 rounded-full bg-white/90 text-brand-600 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow border border-gray-200 hover:bg-brand-500 hover:text-white active:scale-90"
                                  >
                                    ℹ️
                                  </button>
                                  {rolUsuario === 'ADMIN' && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); abrirEdicionRapida(producto); }}
                                      title="Cambiar foto y categoría"
                                      className="w-7 h-7 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow hover:bg-brand-600 active:scale-90"
                                    >
                                      ⚙️
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="p-3 flex flex-col flex-1">
                                <span className="font-bold text-gray-800 leading-tight text-sm">{producto.nombre}</span>
                                <div className="flex justify-between items-end mt-auto pt-2">
                                  <span className="text-xs text-gray-400 truncate pr-1">{producto.categoriaNombre || ''}</span>
                                  <span className="text-lg font-black text-brand-gradient">Bs. {producto.precio.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* LADO DERECHO: CARRITO, CLIENTE Y COBRO */}
            <section className="w-1/3 bg-white rounded-2xl shadow-lg flex flex-col border border-gray-200/70 overflow-hidden h-full max-h-[calc(100vh-100px)] animate-fade-in" style={{ animationDelay: '0.15s' }}>
              {/* Contenedor del carrito con altura fija y scroll interno */}
              <div className="p-4 border-b border-gray-100 h-44 max-h-44 overflow-y-auto bg-brand-gradient-soft">
                {carrito.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400"><p className="text-sm">El carrito está vacío</p></div>
                ) : (
                  <ul className="space-y-2">
                    {carrito.map((item) => (
                      <li key={item.loteId} className="flex justify-between items-center bg-white p-2 rounded-xl text-xs border border-gray-200 shadow-sm animate-fade-in-up">
                        <div className="flex flex-col w-1/2">
                          <span className="font-semibold text-gray-700 truncate" title={item.nombre}>{item.nombre}</span>
                          <span className="text-gray-500">Bs. {item.precio.toFixed(2)} c/u</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1">
                          <button onClick={() => actualizarCantidad(item.loteId, -1)} className="text-red-500 hover:bg-red-50 active:scale-90 font-bold px-1.5 py-1 rounded transition-all text-xs">-</button>
                          <input 
                            type="number" 
                            min="1" 
                            value={item.cantidad} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 1) {
                                setCarrito(carritoActual => 
                                  carritoActual.map(it => it.loteId === item.loteId ? { ...it, cantidad: val } : it)
                                );
                              }
                            }} 
                            className="font-bold text-gray-800 w-8 text-center bg-transparent focus:ring-1 focus:ring-[#2596be] outline-none rounded text-xs p-0 border-0"
                          />
                          <button onClick={() => actualizarCantidad(item.loteId, 1)} className="text-green-600 hover:bg-green-50 active:scale-90 font-bold px-1.5 py-1 rounded transition-all text-xs">+</button>
                        </div>
                        <span className="font-bold text-gray-800 w-1/4 text-right">Bs. {(item.cantidad * item.precio).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Registro de clientes de tamaño fijo, siempre visible y no afectado por el catálogo */}
              <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Datos del Cliente</h3>
                <input type="text" placeholder="NIT / CI" className="w-full p-2 border border-gray-300 rounded-xl mb-2 text-xs outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)] transition-all bg-white font-medium" value={clienteNitCi} onChange={(e) => setClienteNitCi(e.target.value)} />
                <input type="text" placeholder="Razón Social" className="w-full p-2 border border-gray-300 rounded-xl text-xs outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)] transition-all bg-white font-medium" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
              </div>

              {/* Últimas compras con scroll interno y altura fija */}
              <div className="p-4 bg-white border-b border-gray-200 h-32 max-h-32 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Últimas Compras</h3>
                  {estadoCliente && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estadoCliente.includes('Frecuente') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{estadoCliente}</span>
                  )}
                </div>
                {!clienteId ? (
                  <p className="text-xs text-gray-400 italic text-center mt-2">Ingresa un CI/NIT para buscar paciente.</p>
                ) : cargandoHistorial ? (
                  <p className="text-xs text-[#2596be] animate-pulse-soft text-center mt-2">Consultando historial...</p>
                ) : historialCompras.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center mt-2">Paciente sin compras previas.</p>
                ) : (
                  <div className="space-y-2">
                    {historialCompras.map((compra) => (
                      <div key={compra.id} className="p-2 bg-brand-100/70 border border-brand-200/60 rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-700">Monto: <span className="font-bold text-brand-600">Bs. {compra.total.toFixed(2)}</span></p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-tight">{compra.tipoPago}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">{new Date(compra.fecha).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Métodos de Pago */}
              <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="flex gap-2">
                  <button onClick={() => setMetodoPago('EFECTIVO')} className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all duration-200 active:scale-95 ${metodoPago === 'EFECTIVO' ? 'bg-[#2596be]/20 border-[#2596be] text-[#1b6f8f] shadow-sm' : 'bg-white hover:bg-gray-50'}`}>💵 Efectivo</button>
                  <button onClick={() => setMetodoPago('QR')} className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all duration-200 active:scale-95 ${metodoPago === 'QR' ? 'bg-[#2596be]/20 border-[#2596be] text-[#1b6f8f] shadow-sm' : 'bg-white hover:bg-gray-50'}`}>📱 QR</button>
                  <button onClick={() => setMetodoPago('TARJETA')} className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all duration-200 active:scale-95 ${metodoPago === 'TARJETA' ? 'bg-[#2596be]/20 border-[#2596be] text-[#1b6f8f] shadow-sm' : 'bg-white hover:bg-gray-50'}`}>💳 Tarjeta</button>
                </div>
              </div>

              {/* Botón Cobrar */}
              <div className="p-4 bg-gray-50 flex-shrink-0 mt-auto">
                <div className="flex justify-between items-center mb-4 text-xl font-black text-gray-800">
                  <span>Total:</span>
                  <span className="text-brand-gradient">Bs. {calcularTotal()}</span>
                </div>
                <button onClick={iniciarCobro} className="w-full btn-primary py-3.5 px-4 rounded-2xl text-lg">
                  <span>{metodoPago === 'QR' ? '📱' : '💸'}</span> Cobrar y Facturar
                </button>
              </div>
            </section>
          </div>

        ) : pestañaActiva === 'inventario' && rolUsuario === 'ADMIN' ? (

          <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200/70 h-full flex flex-col overflow-hidden animate-fade-in">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-gray-800">
                  {subTabInventario === 'lotes' ? "Control de Lotes y Vencimientos" : "Catálogo Base de Medicamentos"}
                </h2>
                <p className="text-xs text-gray-500">
                  {subTabInventario === 'lotes' 
                    ? "Supervisa las caducidades o registra variaciones/mermas del stock físico." 
                    : "Gestiona el listado maestro de productos de la farmacia."}
                </p>
              </div>
                <div className="flex gap-2">
                <button onClick={exportarInventarioCSV} className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all duration-200 shadow-md flex items-center gap-2"><span>📊</span> Exportar CSV</button>
                <button onClick={abrirModalCategorias} className="bg-gray-700 hover:bg-gray-800 active:scale-95 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all duration-200 shadow-md flex items-center gap-2"><span>🗂️</span> Categorías</button>
                <button onClick={() => { setProductoEditandoId(null); setFormularioProducto({ sku: '', codigoBarras: '', nombreComercial: '', nombreGenerico: '', concentracion: '', presentacion: '', precioVenta: '', precioCompra: '', fechaActualizacionPrecio: new Date().toISOString().substring(0, 10), stockMinimo: '5', controlado: false, categoriaId: '', fotoUrl: '', marca: '', distribuidor: '', paisOrigen: '', registroSanitario: '', composicion: '' }); setFotoPendiente(null); setMostrarModalProducto(true); }} className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all duration-200 shadow-md flex items-center gap-2"><span>✨</span> Crear Producto Maestro</button>
                <button onClick={abrirModalIngresoMercaderia} className="btn-primary py-2 px-4 rounded-xl text-sm flex items-center gap-2"><span>📦</span> Ingresar Mercadería</button>
              </div>
            </div>

            {/* PESTAÑAS DE NAVEGACIÓN SECUNDARIA */}
            <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl mb-4 w-fit">
              <button 
                onClick={() => setSubTabInventario('lotes')}
                className={`py-1.5 px-4 text-sm font-bold rounded-lg transition-all duration-200 ${subTabInventario === 'lotes' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📦 Lotes Físicos y Alertas
              </button>
              <button 
                onClick={() => setSubTabInventario('productos')}
                className={`py-1.5 px-4 text-sm font-bold rounded-lg transition-all duration-200 ${subTabInventario === 'productos' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                💊 Medicamentos Base (Catálogo)
              </button>
            </div>

            {/* [NEW] Filtros Dinámicos de Inventario según la subpestaña */}
            <div className="mb-4 flex gap-2 justify-end bg-gradient-to-r from-gray-50 to-brand-50/40 p-2 rounded-xl border border-gray-200/70">
              {subTabInventario === 'lotes' ? (
                <>
                  <input 
                    type="text" 
                    placeholder="🔍 Buscar lote por medicamento..." 
                    className="p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)] transition-all w-64 bg-white" 
                    value={busquedaLotes} 
                    onChange={(e) => setBusquedaLotes(e.target.value)} 
                  />
                  <select 
                    className="p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)] transition-all bg-white text-gray-700" 
                    value={filtroEstadoLote} 
                    onChange={(e) => setFiltroEstadoLote(e.target.value)}
                  >
                    <option value="TODOS">Estado: Todos</option>
                    <option value="BUENO">Bueno</option>
                    <option value="ADVERTENCIA">Advertencia</option>
                    <option value="CRÍTICO">Crítico</option>
                    <option value="VENCIDO">Vencido</option>
                  </select>
                </>
              ) : (
                <>
                  <input 
                    type="text" 
                    placeholder="🔍 Buscar por nombre/SKU/genérico..." 
                    className="p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)] transition-all w-72 bg-white" 
                    value={busquedaProductosBase} 
                    onChange={(e) => setBusquedaProductosBase(e.target.value)} 
                  />
                  <select 
                    className="p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)] transition-all bg-white text-gray-700" 
                    value={filtroRecetaBase} 
                    onChange={(e) => setFiltroRecetaBase(e.target.value)}
                  >
                    <option value="TODOS">Receta: Todos</option>
                    <option value="LIBRE">Receta: Venta Libre</option>
                    <option value="CONTROLADO">Receta: Controlados 🚨</option>
                  </select>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200/70 rounded-xl">
              {subTabInventario === 'lotes' ? (
                cargandoLotes ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500"><span className="spinner spinner-lg mb-3"></span><p className="font-medium">Analizando inventario...</p></div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="th-sort !bg-none">
                        <th className="p-4">Producto</th>
                        <th className="p-4 text-center">Stock</th>
                        <th className="p-4 text-center">Caducidad</th>
                        <th className="p-4 text-center">Ventas</th>
                        <th className="p-4 text-center">Devueltos</th>
                        <th className="p-4 text-center">Mermas</th>
                        <th className="p-4 text-center">Estado</th>
                        <th className="p-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotesFiltrados.map(a => (
                        <tr key={a.loteId} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-bold text-sm text-gray-800">{a.producto}</td>
                          <td className="p-4 text-center font-mono font-bold text-gray-600">{a.stock}</td>
                          <td className="p-4 text-center font-mono text-sm text-gray-600">{a.fechaVencimiento}</td>
                          <td className="p-4 text-center font-mono font-bold text-[#1b6f8f]">{a.ventas || 0} u.</td>
                          <td className="p-4 text-center font-mono font-bold text-green-600">+{a.devueltos || 0}</td>
                          <td className="p-4 text-center font-mono font-bold text-red-500">-{a.mermas || 0}</td>
                          <td className="p-4 flex justify-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold block w-24 text-center ${obtenerEstiloEstado(a.estado)}`}>{a.estado}</span></td>
                          <td className="p-4 text-center"><button onClick={() => setModalAjuste({ visible: true, lote: a, variacion: '', motivo: 'MERMA_CADUCIDAD' })} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">⚙️ Ajustar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                cargandoProductos ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500"><span className="spinner spinner-lg mb-3"></span><p className="font-medium">Cargando catálogo maestro...</p></div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold border-b">
                        <th className="p-4 text-center">Foto</th>
                        <th className="p-4">SKU</th>
                        <th className="p-4">Nombre Comercial</th>
                        <th className="p-4">Nombre Genérico</th>
                        <th className="p-4 text-center">Concentración</th>
                        <th className="p-4 text-center">Presentación</th>
                        <th className="p-4 text-right">Precio Venta</th>
                        <th className="p-4 text-center">Receta</th>
                        <th className="p-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosBaseFiltrados.map(p => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="w-12 h-12 bg-gray-100 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center mx-auto">
                              {p.fotoUrl ? (
                                <img src={p.fotoUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg">{p.categoriaIcono || '💊'}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs text-gray-600 font-bold">{p.sku}</td>
                          <td className="p-4">
                            <span className="font-bold text-sm text-gray-800">{p.nombreComercial}</span>
                            {p.categoriaNombre && (
                              <span className="block mt-0.5 text-[10px] text-[#1b6f8f] font-semibold">{p.categoriaIcono} {p.categoriaNombre}</span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-gray-500">{p.nombreGenerico || 'N/A'}</td>
                          <td className="p-4 text-center text-xs text-gray-600">{p.concentracion || 'N/A'}</td>
                          <td className="p-4 text-center text-xs text-gray-600">{p.presentacion || 'N/A'}</td>
                          <td className="p-4 text-right font-bold text-[#1b6f8f]">Bs. {p.precioVenta.toFixed(2)}</td>
                          <td className="p-4 text-center">
                            {p.controlado ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700 border border-red-200">🚨 CONTROLADO</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 border border-green-200">LIBRE</span>
                            )}
                          </td>
                          <td className="p-4 text-center flex justify-center gap-2">
                            <button 
                              onClick={() => iniciarEdicionProducto(p)}
                              className="bg-[#2596be] hover:bg-[#1b6f8f] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                            >
                              ✏️ Editar
                            </button>
                            <button 
                              onClick={() => manejarEliminarProducto(p.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                            >
                              🗑️ Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {productosBaseFiltrados.length === 0 && (
                        <tr>
                          <td colSpan="9" className="p-8 text-center text-gray-400 italic">No hay productos registrados que coincidan con la búsqueda o filtros.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </section>

        ) : pestañaActiva === 'ventas' && rolUsuario === 'ADMIN' ? (

          <section className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 h-full flex flex-col overflow-hidden">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-800">Registro General de Ventas</h2>
                <p className="text-sm text-gray-500">Historial histórico detallado para auditoría contable.</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                <input 
                  type="text" 
                  placeholder="🔍 Buscar por cliente o NIT..." 
                  className="p-2 border border-gray-300 rounded-xl text-sm w-48 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)] transition-all" 
                  value={busquedaVentas} 
                  onChange={(e) => { setBusquedaVentas(e.target.value); setPaginaVentas(1); }} 
                />
                
                {/* [NEW] Filtro por Método de Pago */}
                <select 
                  className="p-2 border border-gray-300 rounded-xl text-xs outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)] transition-all bg-white text-gray-700 font-bold" 
                  value={filtroMetodoVenta} 
                  onChange={(e) => { setFiltroMetodoVenta(e.target.value); setPaginaVentas(1); }}
                >
                  <option value="TODOS">Método: Todos</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="QR">QR</option>
                  <option value="TARJETA">Tarjeta</option>
                </select>

                {/* [NEW] Filtro por Estado Factura */}
                <select 
                  className="p-2 border border-gray-300 rounded-xl text-xs outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(37,150,190,0.12)] transition-all bg-white text-gray-700 font-bold" 
                  value={filtroEstadoVenta} 
                  onChange={(e) => { setFiltroEstadoVenta(e.target.value); setPaginaVentas(1); }}
                >
                  <option value="TODOS">Estado: Todos</option>
                  <option value="EMITIDA">Emitidas</option>
                  <option value="ANULADA">Anuladas</option>
                </select>

                <button 
                  onClick={exportarExcel} 
                  disabled={ventasFiltradas.length === 0} 
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all duration-200 disabled:opacity-50"
                >
                  <span>📊</span> Descargar CSV
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto border border-gray-200/70 rounded-xl">
              {cargandoListaVentas ? (<div className="flex flex-col items-center justify-center h-full text-gray-500"><span className="spinner spinner-lg mb-3"></span><p className="font-medium">Recopilando registros...</p></div>) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="th-sort sticky top-0">
                      <th className="p-4">Cliente / Razón Social</th>
                      <th className="p-4">NIT / CI</th>
                      <th className="p-4 text-right">Monto Total</th>
                      <th className="p-4 text-center">Método</th>
                      <th className="p-4 text-right">Fecha de Transacción</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasPaginadas.length === 0 ? (
                      <tr><td colSpan="6" className="p-8 text-center text-gray-400">No se encontraron ventas.</td></tr>
                    ) : (
                      ventasPaginadas.map(v => (
                        <tr 
                          key={v.id} 
                          className={`border-b transition-colors ${
                            v.estadoSiat === 'ANULADA' 
                              ? 'bg-red-50/50 hover:bg-red-50 text-gray-400 line-through opacity-70' 
                              : 'hover:bg-brand-50'
                          }`}
                        >
                          <td className="p-4 font-bold text-sm text-gray-800">{v.cliente}</td>
                          <td className="p-4 font-mono text-sm text-gray-600">{v.nit}</td>
                          <td className="p-4 text-right font-black text-brand-gradient">Bs. {v.total.toFixed(2)}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                              v.estadoSiat === 'ANULADA'
                                ? 'bg-red-100 text-red-700'
                                : v.metodo === 'EFECTIVO' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-brand-100 text-brand-700'
                            }`}>
                              {v.estadoSiat === 'ANULADA' ? 'ANULADA' : v.metodo}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-xs text-gray-500">{v.fecha}</td>
                          <td className="p-4 text-center">
                            {v.estadoSiat === 'ANULADA' ? (
                              <span className="text-[10px] font-bold text-red-500 uppercase">ANULADA</span>
                            ) : (
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => iniciarEdicionVenta(v)} 
                                  className="bg-brand-100 hover:bg-brand-500 hover:text-white text-brand-700 px-2 py-1 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95"
                                >
                                  ✏️ Editar
                                </button>
                                <button 
                                  onClick={() => iniciarAnulacionVenta(v)} 
                                  className="bg-red-50 hover:bg-red-500 hover:text-white text-red-600 px-2 py-1 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95"
                                >
                                  🗑️ Anular
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {totalPaginasVentas > 1 && (
              <div className="mt-4 flex justify-between items-center border-t border-gray-100 pt-4"><span className="text-sm text-gray-500">Mostrando {indicePrimerItem + 1} - {Math.min(indiceUltimoItem, ventasFiltradas.length)} de {ventasFiltradas.length} registros</span><div className="flex gap-2"><button disabled={paginaVentas === 1} onClick={() => setPaginaVentas(paginaVentas - 1)} className="px-3 py-1 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-600 disabled:opacity-30 hover:bg-gray-50 active:scale-95 transition-all">Anterior</button><div className="px-3 py-1 bg-brand-100 text-brand-700 font-bold rounded-xl border border-brand-200/60 shadow-sm">Página {paginaVentas} de {totalPaginasVentas}</div><button disabled={paginaVentas === totalPaginasVentas} onClick={() => setPaginaVentas(paginaVentas + 1)} className="px-3 py-1 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-600 disabled:opacity-30 hover:bg-gray-50 active:scale-95 transition-all">Siguiente</button></div></div>
            )}
          </section>

        ) : pestañaActiva === 'dashboard' && rolUsuario === 'ADMIN' ? (

          <section className="h-full flex flex-col gap-4 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-2"><div><h2 className="text-2xl font-black text-gray-800">Panel de Control Gerencial</h2><p className="text-sm text-gray-500">Métricas operativas y de ingresos en tiempo real.</p></div><button onClick={exportarDashboardCSV} className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 transition-all duration-200 shadow-md"><span>📊</span> Exportar CSV</button></div>
            {errorDashboard ? (
              <div className="flex flex-col items-center justify-center h-64 text-red-500 bg-white rounded-2xl shadow-lg border border-gray-200/70 p-6 animate-scale-in">
                <span className="text-5xl mb-2">⚠️</span>
                <p className="font-bold text-lg text-gray-800">Error al calcular la inteligencia de negocios</p>
                <p className="text-xs text-gray-500 mt-1 mb-4 text-center max-w-md">{errorDashboard}</p>
                <button onClick={cargarDashboard} className="btn-primary px-4 py-2 rounded-lg font-bold text-sm">🔄 Reintentar Carga</button>
              </div>
            ) : cargandoDashboard || !datosDashboard ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-white rounded-2xl shadow-lg border border-gray-200/70"><span className="spinner spinner-lg mb-3"></span><p className="font-medium">Calculando inteligencia de negocios...</p></div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="stagger-in bg-gradient-to-br from-brand-600 to-brand-400 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden"><div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl"></div><span className="text-xs font-bold text-brand-100 uppercase tracking-wider">Ingresos Brutos</span><span className="text-2xl font-black text-white mt-2 drop-shadow">Bs. {Number(datosDashboard?.kpis?.totalIngresos || 0).toFixed(2)}</span></div>
                  <div className="stagger-in bg-gradient-to-br from-blue-600 to-blue-400 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden" style={{ '--stagger': 1 }}><div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl"></div><span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Ventas Exitosas</span><span className="text-2xl font-black text-white mt-2 drop-shadow">{datosDashboard?.kpis?.totalTransacciones || 0}</span></div>
                  <div className="stagger-in bg-gradient-to-br from-red-500 to-rose-400 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden" style={{ '--stagger': 2 }}><div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl"></div><span className="text-xs font-bold text-red-100 uppercase tracking-wider">Mermas / Bajas</span><span className="text-2xl font-black text-white mt-2 drop-shadow">{datosDashboard?.kpis?.totalMermas || 0} u.</span></div>
                  <div className="stagger-in bg-gradient-to-br from-emerald-500 to-green-400 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden" style={{ '--stagger': 3 }}><div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl"></div><span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Devoluciones</span><span className="text-2xl font-black text-white mt-2 drop-shadow">{datosDashboard?.kpis?.totalDevoluciones || 0} u.</span></div>
                </div>

                {datosDashboard?.finanzasInventario && (
                  <div className="bg-brand-gradient text-white p-5 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in-up">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-100">📊 Valorización Financiera y Rentabilidad de Inventario</h3>
                      <p className="text-xs text-blue-100/80 mt-0.5">Control de costos de proveedor vs. valor comercial de venta</p>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                        <span className="block text-[10px] text-blue-100 uppercase font-bold">Costo Proveedor</span>
                        <span className="text-sm font-black text-white">Bs. {Number(datosDashboard.finanzasInventario.costoTotalInventario || 0).toFixed(2)}</span>
                      </div>
                      <div className="bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                        <span className="block text-[10px] text-blue-100 uppercase font-bold">Valor Venta</span>
                        <span className="text-sm font-black text-white">Bs. {Number(datosDashboard.finanzasInventario.valorVentaTotalInventario || 0).toFixed(2)}</span>
                      </div>
                      <div className="bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                        <span className="block text-[10px] text-green-200 uppercase font-bold">Utilidad Potencial</span>
                        <span className="text-sm font-black text-green-200">Bs. {Number(datosDashboard.finanzasInventario.utilidadPotencial || 0).toFixed(2)}</span>
                      </div>
                      <div className="bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                        <span className="block text-[10px] text-yellow-200 uppercase font-bold">Margen Promedio</span>
                        <span className="text-sm font-black text-yellow-200">{Number(datosDashboard.finanzasInventario.margenPromedioInventario || 0).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-4 min-h-[300px]">
                  <div className="w-1/3 bg-white rounded-2xl shadow-lg border border-gray-200/70 p-6 flex flex-col card-elevated"><h3 className="text-sm font-bold text-gray-800 uppercase mb-4">Ingresos por Método</h3><div className="flex-1 flex flex-col gap-4">{datosDashboard.metodosPago.map((metodo, idx) => (<div key={idx} className="flex flex-col gap-1"><div className="flex justify-between text-xs font-bold text-gray-700"><span>{metodo.metodo || metodo.Metodo}</span><span>Bs. {Number(metodo.monto || metodo.Monto || 0).toFixed(2)}</span></div><div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden"><div className={`h-3 rounded-full progress-shimmer ${(metodo.metodo || metodo.Metodo) === 'EFECTIVO' ? '!bg-green-500' : (metodo.metodo || metodo.Metodo) === 'QR' ? '!bg-brand-500' : '!bg-purple-500'} !animate-none`} style={{ width: `${metodo.porcentaje || metodo.Porcentaje}%` }}></div></div></div>))}</div></div>
                  <div className="w-1/3 bg-white rounded-2xl shadow-lg border border-gray-200/70 p-6 flex flex-col card-elevated"><h3 className="text-sm font-bold text-gray-800 uppercase mb-4">Últimas Ventas</h3><div className="flex-1 flex flex-col gap-2">{datosDashboard.ventasRecientes.map((venta, idx) => (<div key={idx} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-brand-50 transition-colors"><div className="flex flex-col"><span className="text-xs font-bold text-gray-800 truncate w-32">{venta.cliente || venta.Cliente}</span><span className="text-[10px] text-gray-500">{venta.fecha || venta.Fecha}</span></div><div className="flex flex-col items-end"><span className="text-sm font-black text-brand-600">Bs. {Number(venta.monto || venta.Monto || 0).toFixed(2)}</span><span className="text-[9px] font-bold text-gray-400">{venta.metodo || venta.Metodo}</span></div></div>))}</div></div>
                  <div className="w-1/3 bg-white rounded-2xl shadow-lg border border-gray-200/70 p-6 flex flex-col card-elevated"><h3 className="text-sm font-bold text-gray-800 uppercase mb-4">Ajustes Recientes</h3><div className="flex-1 flex flex-col gap-2">{datosDashboard.ajustesRecientes?.length === 0 ? (<p className="text-xs text-gray-400 text-center mt-10">No hay ajustes registrados.</p>) : (datosDashboard.ajustesRecientes?.map((ajuste, idx) => (<div key={idx} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-brand-50 transition-colors"><div className="flex flex-col"><span className="text-[10px] font-bold text-gray-800">{ajuste.motivo || ajuste.Motivo}</span><span className="text-[9px] text-gray-500">{ajuste.fecha || ajuste.Fecha}</span></div><span className={`text-sm font-black ${(ajuste.cantidad || ajuste.Cantidad) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{(ajuste.cantidad || ajuste.Cantidad) > 0 ? '+' : ''}{ajuste.cantidad || ajuste.Cantidad}</span></div>)))}</div></div>
                </div>

                <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-200/70 p-6 flex flex-col mt-4 card-elevated">
                  <h3 className="text-sm font-bold text-gray-800 uppercase mb-4">Auditoría de Turnos y Arqueos de Caja</h3>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="th-sort">
                          <th className="p-3">Cajero Operativo</th>
                          <th className="p-3 text-center">Apertura</th>
                          <th className="p-3 text-center">Cierre</th>
                          <th className="p-3 text-right">Fondo + Ventas (Teórico)</th>
                          <th className="p-3 text-right">Dinero Entregado (Físico)</th>
                          <th className="p-3 text-right">Desfase</th>
                          <th className="p-3 text-center">Estado Auditoría</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialCajas.length === 0 ? (
                          <tr><td colSpan="7" className="p-4 text-center text-gray-400 text-xs">No hay registros de caja cerrada.</td></tr>
                        ) : (
                          historialCajas.map((caja, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="p-3 font-bold text-xs text-gray-800">{caja.cajero || caja.Cajero}</td>
                              <td className="p-3 text-center text-[10px] text-gray-500">{caja.fechaApertura || caja.FechaApertura}</td>
                              <td className="p-3 text-center text-[10px] text-gray-500">{caja.fechaCierre || caja.FechaCierre}</td>
                              <td className="p-3 text-right font-mono text-xs text-gray-600">Bs. {(Number(caja.fondoInicial || caja.FondoInicial) + Number(caja.ventas || caja.Ventas)).toFixed(2)}</td>
                              <td className="p-3 text-right font-mono text-xs font-bold text-brand-600">Bs. {Number(caja.montoEntregado || caja.MontoEntregado).toFixed(2)}</td>
                              <td className={`p-3 text-right font-mono text-xs font-bold ${Number(caja.desfase || caja.Desfase) === 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {Number(caja.desfase || caja.Desfase) > 0 ? '+' : ''}{Number(caja.desfase || caja.Desfase).toFixed(2)}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-[9px] font-bold ${(caja.estadoFinal || caja.EstadoFinal) === 'CUADRADO' ? 'bg-green-100 text-green-700' : (caja.estadoFinal || caja.EstadoFinal) === 'SOBRANTE' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                  {caja.estadoFinal || caja.EstadoFinal}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>

        ) : pestañaActiva === 'crm' && rolUsuario === 'ADMIN' ? (

          <section className="h-full flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div><h2 className="text-2xl font-black text-gray-800">🩺 CRM Médico</h2><p className="text-sm text-gray-500">Proveedores, visitadores/promotores y seguimientos a contactos.</p></div>
              <div className="flex gap-2">
                <button onClick={abrirNuevoProveedor} className="btn-primary py-2 px-4 rounded-xl text-sm flex items-center gap-2"><span>🏢</span> Nuevo Proveedor</button>
                <button onClick={abrirNuevoVisitador} className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all duration-200 shadow-md"><span>👤</span> Nuevo Visitador</button>
              </div>
            </div>

            <div className="flex gap-1 bg-white border border-gray-200/70 p-1 rounded-xl shadow-sm w-fit">
              <button onClick={() => setSubTabCRM('proveedores')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${subTabCRM === 'proveedores' ? 'bg-brand-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>🏢 Proveedores ({proveedores.length})</button>
              <button onClick={() => setSubTabCRM('visitadores')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${subTabCRM === 'visitadores' ? 'bg-brand-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>👤 Visitadores ({visitadores.length})</button>
              <button onClick={() => setSubTabCRM('seguimientos')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${subTabCRM === 'seguimientos' ? 'bg-brand-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>📋 Seguimientos ({seguimientos.length})</button>
            </div>

            {subTabCRM === 'proveedores' && (
              proveedores.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm animate-fade-in"><span className="text-5xl mb-3">🏢</span><p className="font-bold">Aún no hay proveedores médicos registrados.</p><p className="text-xs mt-1">Agrega laboratorios, distribuidores e importadoras.</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {proveedores.map((p, idx) => (
                    <div key={p.id} style={{ '--stagger': idx + 1 }} className={`stagger-in bg-white rounded-2xl shadow-sm border p-4 flex flex-col ${p.activo === false ? 'opacity-60' : 'border-gray-200/70 card-elevated'}`}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-2xl">🏢</span>
                            <h3 className="font-bold text-gray-800 truncate">{p.nombre}</h3>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{p.tipo}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.activo === false ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>{p.activo === false ? 'Inactivo' : 'Activo'}</span>
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-gray-600">
                            <p>👤 Contacto: <span className="font-semibold text-gray-700">{p.contactoPrincipal || '—'}</span></p>
                            <p>📞 {p.telefono || '—'} {p.email && <span className="text-gray-400">• ✉️ {p.email}</span>}</p>
                            <p>📍 {p.direccion || 'Sin dirección'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={() => abrirHistorial('PROVEEDOR', p, p.nombre)} className="bg-brand-100 text-brand-700 font-bold py-1.5 px-3 rounded-lg text-xs hover:bg-brand-500 hover:text-white transition-all duration-200 active:scale-95">📋 Seguimientos</button>
                          <div className="flex gap-1.5">
                            <button onClick={() => abrirEdicionProveedor(p)} title="Editar" className="flex-1 bg-gray-100 hover:bg-gray-200 active:scale-95 py-1.5 px-2 rounded-lg text-xs font-bold transition-all">✏️</button>
                            <button onClick={() => manejarEliminarProveedor(p.id)} title="Eliminar" className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 active:scale-95 py-1.5 px-2 rounded-lg text-xs font-bold transition-all">🗑️</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {subTabCRM === 'visitadores' && (
              visitadores.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm animate-fade-in"><span className="text-5xl mb-3">👤</span><p className="font-bold">Aún no hay visitadores/promotores registrados.</p><p className="text-xs mt-1">Agrega a los representantes que visitan tu farmacia.</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visitadores.map((v, idx) => (
                    <div key={v.id} style={{ '--stagger': idx + 1 }} className={`stagger-in bg-white rounded-2xl shadow-sm border p-4 flex flex-col ${v.activo === false ? 'opacity-60' : 'border-gray-200/70 card-elevated'}`}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-2xl">👤</span>
                            <h3 className="font-bold text-gray-800 truncate">{v.nombre}</h3>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${v.activo === false ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>{v.activo === false ? 'Inactivo' : 'Activo'}</span>
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-gray-600">
                            <p>🏢 Empresa: <span className="font-semibold text-gray-700">{v.empresa || '—'}</span></p>
                            <p>📞 {v.telefono || '—'} {v.email && <span className="text-gray-400">• ✉️ {v.email}</span>}</p>
                            <p>📍 Zona: {v.zona || 'Sin zona'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={() => abrirHistorial('VISITADOR', v, v.nombre)} className="bg-brand-100 text-brand-700 font-bold py-1.5 px-3 rounded-lg text-xs hover:bg-brand-500 hover:text-white transition-all duration-200 active:scale-95">📋 Seguimientos</button>
                          <div className="flex gap-1.5">
                            <button onClick={() => abrirEdicionVisitador(v)} title="Editar" className="flex-1 bg-gray-100 hover:bg-gray-200 active:scale-95 py-1.5 px-2 rounded-lg text-xs font-bold transition-all">✏️</button>
                            <button onClick={() => manejarEliminarVisitador(v.id)} title="Eliminar" className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 active:scale-95 py-1.5 px-2 rounded-lg text-xs font-bold transition-all">🗑️</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {subTabCRM === 'seguimientos' && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 p-4 card-elevated animate-fade-in">
                  <h3 className="text-sm font-bold text-gray-800 uppercase mb-3 flex items-center gap-2">⏰ Próximos Seguimientos</h3>
                  {proximosSeguimientos.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No hay seguimientos con fecha próxima pendiente.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {proximosSeguimientos.map((seg, idx) => (
                        <div key={seg.id} style={{ '--stagger': idx + 1 }} className="stagger-in bg-gradient-to-br from-brand-50 to-blue-50 border border-brand-100 rounded-xl p-3 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-brand-600 uppercase">📅 {seg.proximoSeguimiento}</span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white text-gray-600 shadow-sm">{seg.tipo}</span>
                          </div>
                          <p className="text-sm font-bold text-gray-800 truncate">{nombreEntidadSeguimiento(seg)}</p>
                          {seg.asunto && <p className="text-xs text-gray-600 truncate mt-0.5">{seg.asunto}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 p-4 card-elevated animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <h3 className="text-sm font-bold text-gray-800 uppercase mb-3 flex items-center gap-2">📋 Historial de Seguimientos</h3>
                  {seguimientos.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Aún no hay seguimientos registrados.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {seguimientos.map((seg) => (
                        <div key={seg.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-brand-50 transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-800 text-sm">{nombreEntidadSeguimiento(seg)}</span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{seg.entidadTipo}</span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{seg.tipo}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">📅 {seg.fecha} {seg.asunto && <span className="text-gray-700 font-semibold">• {seg.asunto}</span>}</p>
                            {seg.notas && <p className="text-xs text-gray-600 mt-1">{seg.notas}</p>}
                            {seg.resultado && <p className="text-xs mt-1"><span className="font-bold text-gray-500 uppercase">Resultado: </span><span className="text-gray-700">{seg.resultado}</span></p>}
                            {seg.proximoSeguimiento && <p className="text-[11px] mt-1 font-bold text-brand-600">⏰ Próximo: {seg.proximoSeguimiento}</p>}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => abrirNuevoSeguimiento(seg.entidadTipo, seg.entidadId, nombreEntidadSeguimiento(seg), seg)} title="Editar" className="bg-gray-100 hover:bg-gray-200 active:scale-95 py-1 px-2 rounded text-xs font-bold transition-all">✏️</button>
                            <button onClick={() => manejarEliminarSeguimiento(seg.id)} title="Eliminar" className="bg-red-50 hover:bg-red-100 text-red-600 active:scale-95 py-1 px-2 rounded text-xs font-bold transition-all">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center animate-fade-in-up">
              <span className="text-6xl mb-4 block">🚫</span>
              <h2 className="text-2xl font-black text-gray-800">Acceso Restringido</h2>
              <p className="text-gray-500 mt-2">Tu perfil actual no tiene privilegios para ver esta sección.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;