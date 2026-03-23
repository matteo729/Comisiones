// ============================================
// CONFIGURACIÓN DE SUPABASE
// Reemplaza estos valores con tus credenciales
// ============================================
const SUPABASE_URL = 'https://abhmcfmbsqpqodbedsum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiaG1jZm1ic3FwcW9kYmVkc3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTA3MTMsImV4cCI6MjA4OTg2NjcxM30.KIqfK4_NhBMj3cwhHCwhFbDRTxwS5NAYi_QOyvcA210';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// VARIABLES GLOBALES
// ============================================
let allAlumnos = [];
let filteredAlumnos = [];
let currentSort = { column: 'fecha_registro', direction: 'desc' };
let alumnoToDelete = null;

// Elementos del DOM
const loadingState = document.getElementById('loadingState');
const tableContent = document.getElementById('tableContent');
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const comisionFilter = document.getElementById('comisionFilter');
const dniFilter = document.getElementById('dniFilter');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const refreshBtn = document.getElementById('refreshBtn');
const exportBtn = document.getElementById('exportBtn');
const nuevoAlumnoBtn = document.getElementById('nuevoAlumnoBtn');
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-success ${type === 'error' ? 'toast-error' : type === 'warning' ? 'toast-warning' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getComisionBadge(comision) {
    let badgeClass = '';
    if (comision === 'Comisión A') badgeClass = 'badge-a';
    else if (comision === 'Comisión B') badgeClass = 'badge-b';
    else badgeClass = 'badge-c';
    
    return `<span class="badge ${badgeClass}">${comision}</span>`;
}

function showLoading(show) {
    if (show) {
        loadingState.style.display = 'block';
        tableContent.style.display = 'none';
    } else {
        loadingState.style.display = 'none';
        tableContent.style.display = 'block';
    }
}

// ============================================
// FUNCIONES DE ESTADÍSTICAS
// ============================================

function updateStats() {
    const total = allAlumnos.length;
    const comisionA = allAlumnos.filter(a => a.comision === 'Comisión A').length;
    const comisionB = allAlumnos.filter(a => a.comision === 'Comisión B').length;
    const comisionC = allAlumnos.filter(a => a.comision === 'Comisión C').length;
    
    document.getElementById('totalAlumnos').textContent = total;
    document.getElementById('totalComisionA').textContent = comisionA;
    document.getElementById('totalComisionB').textContent = comisionB;
    document.getElementById('totalComisionC').textContent = comisionC;
}

// ============================================
// FUNCIONES DE RENDERIZADO
// ============================================

function renderTable() {
    if (filteredAlumnos.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    📭 No hay alumnos registrados
                </td>
            </tr>
        `;
        return;
    }
    
    // Aplicar ordenamiento
    const sorted = [...filteredAlumnos].sort((a, b) => {
        let valA = a[currentSort.column];
        let valB = b[currentSort.column];
        
        if (currentSort.column === 'fecha_registro') {
            valA = new Date(valA);
            valB = new Date(valB);
        } else if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    tableBody.innerHTML = sorted.map(alumno => `
        <tr>
            <td><strong>${escapeHtml(alumno.nombre)}</strong></td>
            <td>${escapeHtml(alumno.apellido)}</td>
            <td>${escapeHtml(alumno.dni)}</td>
            <td>${getComisionBadge(alumno.comision)}</td>
            <td>${formatDate(alumno.fecha_registro)}</td>
            <td>
                <span class="action-icon delete" data-id="${alumno.id}" data-nombre="${escapeHtml(alumno.nombre)} ${escapeHtml(alumno.apellido)}">
                    🗑️ Eliminar
                </span>
            </td>
        </tr>
    `.join(''));
    
    // Agregar event listeners a los botones de eliminar
    document.querySelectorAll('.action-icon.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            const nombre = btn.getAttribute('data-nombre');
            deleteAlumno(id, nombre);
        });
    });
}

// ============================================
// FUNCIONES DE FILTRADO
// ============================================

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const comisionValue = comisionFilter.value;
    const dniValue = dniFilter.value;
    
    filteredAlumnos = allAlumnos.filter(alumno => {
        // Filtro por nombre/apellido
        if (searchTerm) {
            const fullName = `${alumno.nombre} ${alumno.apellido}`.toLowerCase();
            if (!fullName.includes(searchTerm) && !alumno.nombre.toLowerCase().includes(searchTerm)) {
                return false;
            }
        }
        
        // Filtro por comisión
        if (comisionValue && alumno.comision !== comisionValue) {
            return false;
        }
        
        // Filtro por DNI
        if (dniValue && !alumno.dni.includes(dniValue)) {
            return false;
        }
        
        return true;
    });
    
    renderTable();
    showToast(`Mostrando ${filteredAlumnos.length} de ${allAlumnos.length} alumnos`, 'info');
}

function clearFilters() {
    searchInput.value = '';
    comisionFilter.value = '';
    dniFilter.value = '';
    filteredAlumnos = [...allAlumnos];
    renderTable();
    showToast('Filtros limpiados', 'info');
}

// ============================================
// FUNCIONES DE ORDENAMIENTO
// ============================================

function sortBy(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    renderTable();
}

// ============================================
// FUNCIONES CRUD CON SUPABASE
// ============================================

async function loadAlumnos() {
    try {
        showLoading(true);
        
        const { data, error } = await supabase
            .from('alumnos')
            .select('*')
            .order('fecha_registro', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        allAlumnos = data || [];
        filteredAlumnos = [...allAlumnos];
        
        updateStats();
        renderTable();
        showLoading(false);
        
    } catch (error) {
        console.error('Error al cargar alumnos:', error);
        showLoading(false);
        showToast('Error al cargar los datos. Verifique su conexión.', 'error');
    }
}

async function deleteAlumnoFromDB(id) {
    try {
        const { error } = await supabase
            .from('alumnos')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar:', error);
        return { success: false, error };
    }
}

// ============================================
// MANEJO DE MODAL Y ELIMINACIÓN
// ============================================

function deleteAlumno(id, nombre) {
    alumnoToDelete = id;
    const message = document.getElementById('deleteMessage');
    message.textContent = `¿Está seguro que desea eliminar a ${nombre}?`;
    deleteModal.classList.add('show');
}

async function confirmDelete() {
    if (!alumnoToDelete) return;
    
    const result = await deleteAlumnoFromDB(alumnoToDelete);
    
    if (result.success) {
        showToast('Alumno eliminado correctamente', 'success');
        closeModal();
        await loadAlumnos();
    } else {
        showToast('Error al eliminar el alumno', 'error');
    }
}

function closeModal() {
    deleteModal.classList.remove('show');
    alumnoToDelete = null;
}

// ============================================
// FUNCIONES DE EXPORTACIÓN
// ============================================

function exportToExcel() {
    if (filteredAlumnos.length === 0) {
        showToast('No hay datos para exportar', 'warning');
        return;
    }
    
    // Preparar datos para CSV
    const headers = ['Nombre', 'Apellido', 'DNI', 'Comisión', 'Fecha Registro'];
    const rows = filteredAlumnos.map(alumno => [
        alumno.nombre,
        alumno.apellido,
        alumno.dni,
        alumno.comision,
        formatDate(alumno.fecha_registro)
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `alumnos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('Exportación completada', 'success');
}

function refreshData() {
    loadAlumnos();
    showToast('Datos actualizados correctamente', 'success');
}

function goToForm() {
    window.location.href = 'index.html';
}

// ============================================
// EVENT LISTENERS
// ============================================

// Ordenamiento de columnas
document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
        const column = th.getAttribute('data-sort');
        sortBy(column);
    });
});

// Botones de filtros
applyFiltersBtn.addEventListener('click', applyFilters);
clearFiltersBtn.addEventListener('click', clearFilters);

// Filtros en tiempo real (opcional - descomentar si se quiere)
// searchInput.addEventListener('input', applyFilters);
// comisionFilter.addEventListener('change', applyFilters);
// dniFilter.addEventListener('input', applyFilters);

// Botones principales
refreshBtn.addEventListener('click', refreshData);
exportBtn.addEventListener('click', exportToExcel);
nuevoAlumnoBtn.addEventListener('click', goToForm);

// Modal
confirmDeleteBtn.addEventListener('click', confirmDelete);
cancelDeleteBtn.addEventListener('click', closeModal);

// Cerrar modal al hacer click fuera
window.onclick = function(event) {
    if (event.target === deleteModal) {
        closeModal();
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadAlumnos();
    console.log('Panel de administración listo. Configurar SUPABASE_URL y SUPABASE_ANON_KEY antes de usar.');
});
