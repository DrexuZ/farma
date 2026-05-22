import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function FormularioClienteModal({ isOpen, onClose, onClienteGuardado, clienteAEditar }) {
    const valoresPorDefecto = {
        nombres: '', apellido_paterno: '', apellido_materno: '',
        telefono: '', telefono_secundario: '',
        calle_avenida: '', numero_referencia: '',
        trabajo_realizado: '', id_servicio: '',
        origen: 'WhatsApp', estado: 'Nuevo Lead', cotizacion_enviada: false
    };

    const [formData, setFormData] = useState(valoresPorDefecto);
    const [guardando, setGuardando] = useState(false);

    // Si nos pasan un cliente a editar, rellenamos el formulario. Si no, lo limpiamos.
    useEffect(() => {
        if (clienteAEditar) {
            setFormData({
                nombres: clienteAEditar.nombres || '',
                apellido_paterno: clienteAEditar.apellido_paterno || '',
                apellido_materno: clienteAEditar.apellido_materno || '',
                telefono: clienteAEditar.telefono || '',
                telefono_secundario: clienteAEditar.telefono_secundario || '',
                calle_avenida: clienteAEditar.calle_avenida || '',
                numero_referencia: clienteAEditar.numero_referencia || '',
                trabajo_realizado: clienteAEditar.trabajo_realizado || '',
                id_servicio: clienteAEditar.id_servicio || '',
                origen: clienteAEditar.origen || 'WhatsApp',
                estado: clienteAEditar.estado || 'Nuevo Lead',
                cotizacion_enviada: clienteAEditar.cotizacion_enviada || false
            });
        } else {
            setFormData(valoresPorDefecto);
        }
    }, [clienteAEditar, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGuardando(true);

        let errorAlGuardar;

        if (clienteAEditar && clienteAEditar.id) {
            // MODO EDICIÓN: Actualizamos el registro existente
            const { error } = await supabase
                .from('clientes')
                .update(formData)
                .eq('id', clienteAEditar.id);
            errorAlGuardar = error;
        } else {
            // MODO CREACIÓN: Insertamos uno nuevo
            const { error } = await supabase.from('clientes').insert([formData]);
            errorAlGuardar = error;
        }

        setGuardando(false);

        if (errorAlGuardar) {
            alert('Error al guardar el cliente.');
            console.error(errorAlGuardar);
        } else {
            onClienteGuardado();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Cabecera Fija */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {clienteAEditar ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {clienteAEditar ? 'Modifica los datos del contacto.' : 'Ingresa los datos del nuevo lead o cliente para ORE.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all focus:outline-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Cuerpo del Formulario */}
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="cliente-form" onSubmit={handleSubmit} className="flex flex-col gap-8">

                        {/* 1. Datos Personales */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4">1. Datos Personales</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombres *</label><input type="text" name="nombres" value={formData.nombres} required onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Apellido Paterno *</label><input type="text" name="apellido_paterno" value={formData.apellido_paterno} required onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Apellido Materno</label><input type="text" name="apellido_materno" value={formData.apellido_materno} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                            </div>
                        </div>

                        {/* 2. Contacto y Ubicación */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4">2. Contacto y Ubicación</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Celular Principal *</label><input type="text" name="telefono" value={formData.telefono} required onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Celular Secundario</label><input type="text" name="telefono_secundario" value={formData.telefono_secundario} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Calle / Avenida (Santa Cruz)</label><input type="text" name="calle_avenida" value={formData.calle_avenida} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Número de Casa / Ref.</label><input type="text" name="numero_referencia" value={formData.numero_referencia} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                            </div>
                        </div>

                        {/* 3. Detalles del Servicio */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4">3. Detalles del Servicio</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Trabajo</label>
                                    <select name="trabajo_realizado" value={formData.trabajo_realizado} onChange={(e) => {
                                        const val = e.target.value;
                                        let idS = '';
                                        if (val === 'Limpieza de interiores') idS = 'LIM-INT';
                                        if (val === 'Encerado de pisos') idS = 'ENC-PIS';
                                        if (val === 'Limpieza de vidrios') idS = 'LIM-VID';
                                        setFormData({ ...formData, trabajo_realizado: val, id_servicio: idS });
                                    }} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="">Seleccionar trabajo...</option>
                                        <option value="Limpieza de interiores">Limpieza de interiores</option>
                                        <option value="Encerado de pisos">Encerado de pisos</option>
                                        <option value="Limpieza de vidrios">Limpieza de vidrios</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Origen del Lead *</label>
                                    <select name="origen" value={formData.origen} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="WhatsApp">WhatsApp</option>
                                        <option value="Facebook">Facebook / Meta Ads</option>
                                        <option value="Marketplace">Marketplace</option>
                                        <option value="Referido">Referido</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado actual</label>
                                    <select name="estado" value={formData.estado} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="Nuevo Lead">Nuevo Lead</option>
                                        <option value="No responde">No responde</option>
                                        <option value="Cotización enviada">Cotización enviada</option>
                                        <option value="Adquirió el servicio">Adquirió el servicio</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 h-[42px] px-2">
                                    <input type="checkbox" name="cotizacion_enviada" checked={formData.cotizacion_enviada} onChange={(e) => setFormData({ ...formData, cotizacion_enviada: e.target.checked })} className="w-5 h-5 text-blue-600 border-slate-300 rounded" />
                                    <label className="text-sm font-bold text-slate-700">¿Cotización formal enviada?</label>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Pie del Modal */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 font-medium rounded-lg">Cancelar</button>
                    <button type="submit" form="cliente-form" disabled={guardando} className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-50">
                        {guardando ? 'Guardando...' : (clienteAEditar ? 'Guardar Cambios' : 'Guardar Cliente')}
                    </button>
                </div>
            </div>
        </div>
    );
}