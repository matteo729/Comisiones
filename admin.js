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
            const nombre = btn.getAttribute('data
