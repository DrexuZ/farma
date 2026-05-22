import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ModalCerrarCliente({ isOpen, onClose, cliente, onCerrado }) {
    const [motivo, setMotivo] = useState('Venta concretada');
    const [guardando, setGuardando] = useState(false);

    if (!isOpen || !cliente) return null;

    const handleCerrarCliente = async (e) => {
        e.preventDefault();
        setGuardando(true);

        // Actualizamos el cliente cambiándolo a cerrado y guardando el motivo
        const { error } = await supabase
            .from('clientes')
            .update({ cerrado: true, motivo_cierre: motivo, estado: 'Cerrado' })
            .eq('id', cliente.id);

        setGuardando(false);

        if (error) {
            alert('Error al cerrar el cliente.');
            console.error(error);
        } else {
            onCerrado();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-100 bg-amber-50">
                    <h2 className="text-xl font-bold text-amber-800">Cerrar / Archivar Cliente</h2>
                </div>

                <form onSubmit={handleCerrarCliente} className="p-6 flex flex-col gap-4">
                    <p className="text-sm text-slate-600">
                        Estás a punto de cerrar el expediente de <strong>{cliente.nombres} {cliente.apellido_paterno}</strong>. Este cliente se moverá al módulo de "Clientes Cerrados".
                    </p>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Motivo de Cierre *</label>
                        <select
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                            <option value="Venta concretada">✅ Venta concretada (Trabajo realizado)</option>
                            <option value="En gestión">⏳ En gestión (A largo plazo)</option>
                            <option value="Pendiente de pago">💳 Pendiente de pago</option>
                            <option value="Postergado">📅 Postergado (Lo hará después)</option>
                            <option value="Rechazado">❌ Rechazado / Sin acuerdo de precio</option>
                            <option value="No responde">🔇 Dejó de responder</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                        <button type="submit" disabled={guardando} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 shadow-md">
                            {guardando ? 'Cerrando...' : 'Confirmar Cierre'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}