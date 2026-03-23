// ============================================
// CONFIGURACIÓN DE SUPABASE
// Reemplaza estos valores con tus credenciales
// ============================================
const SUPABASE_URL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiaG1jZm1ic3FwcW9kYmVkc3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTA3MTMsImV4cCI6MjA4OTg2NjcxM30.KIqfK4_NhBMj3cwhHCwhFbDRTxwS5NAYi_QOyvcA210';
const SUPABASE_ANON_KEY = 'https://abhmcfmbsqpqodbedsum.supabase.co';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos del DOM
const form = document.getElementById('alumnoForm');
const nombreInput = document.getElementById('nombre');
const apellidoInput = document.getElementById('apellido');
const dniInput = document.getElementById('dni');
const radioButtons = document.querySelectorAll('input[name="comision"]');

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

function showError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const errorDiv = document.getElementById(errorId);
    if (input) input.classList.add('error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
    }
}

function hideError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const errorDiv = document.getElementById(errorId);
    if (input) input.classList.remove('error');
    if (errorDiv) errorDiv.classList.remove('show');
}

function validateNombre() {
    const value = nombreInput.value.trim();
    if (!value) {
        showError('nombre', 'error-nombre', 'El nombre es obligatorio');
        return false;
    }
    if (value.length < 2) {
        showError('nombre', 'error-nombre', 'El nombre debe tener al menos 2 caracteres');
        return false;
    }
    hideError('nombre', 'error-nombre');
    return true;
}

function validateApellido() {
    const value = apellidoInput.value.trim();
    if (!value) {
        showError('apellido', 'error-apellido', 'El apellido es obligatorio');
        return false;
    }
    if (value.length < 2) {
        showError('apellido', 'error-apellido', 'El apellido debe tener al menos 2 caracteres');
        return false;
    }
    hideError('apellido', 'error-apellido');
    return true;
}

function validateDNI() {
    const value = dniInput.value.trim();
    if (!value) {
        showError('dni', 'error-dni', 'El DNI es obligatorio');
        return false;
    }
    if (!/^\d{7,8}$/.test(value)) {
        showError('dni', 'error-dni', 'El DNI debe tener 7 u 8 dígitos');
        return false;
    }
    hideError('dni', 'error-dni');
    return true;
}

function validateComision() {
    let selected = false;
    radioButtons.forEach(radio => {
        if (radio.checked) selected = true;
    });
    
    const errorDiv = document.getElementById('error-comision');
    if (!selected) {
        errorDiv.classList.add('show');
        return false;
    }
    errorDiv.classList.remove('show');
    return true;
}

// ============================================
// FUNCIONES UTILITARIAS
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

function resetForm() {
    nombreInput.value = '';
    apellidoInput.value = '';
    dniInput.value = '';
    radioButtons.forEach(radio => radio.checked = false);
    
    // Limpiar errores
    hideError('nombre', 'error-nombre');
    hideError('apellido', 'error-apellido');
    hideError('dni', 'error-dni');
    document.getElementById('error-comision').classList.remove('show');
}

function getSelectedComision() {
    let selected = '';
    radioButtons.forEach(radio => {
        if (radio.checked) selected = radio.value;
    });
    return selected;
}

// ============================================
// FUNCIÓN PRINCIPAL PARA GUARDAR EN SUPABASE
// ============================================

async function saveAlumno(alumnoData) {
    try {
        const { data, error } = await supabase
            .from('alumnos')
            .insert([alumnoData])
            .select();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error al guardar:', error);
        return { success: false, error };
    }
}

// ============================================
// EVENTO SUBMIT DEL FORMULARIO
// ============================================

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validar todos los campos
    const isNombreValid = validateNombre();
    const isApellidoValid = validateApellido();
    const isDNIValid = validateDNI();
    const isComisionValid = validateComision();
    
    if (!isNombreValid || !isApellidoValid || !isDNIValid || !isComisionValid) {
        showToast('Por favor, complete todos los campos requeridos', 'warning');
        return;
    }
    
    // Preparar datos
    const alumnoData = {
        nombre: nombreInput.value.trim(),
        apellido: apellidoInput.value.trim(),
        dni: dniInput.value.trim(),
        comision: getSelectedComision()
    };
    
    // Deshabilitar botón para evitar múltiples envíos
    const submitBtn = document.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Guardando...';
    submitBtn.disabled = true;
    
    // Guardar en Supabase
    const result = await saveAlumno(alumnoData);
    
    // Rehabilitar botón
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    if (result.success) {
        showToast(`¡Alumno ${alumnoData.nombre} ${alumnoData.apellido} registrado correctamente!`);
        resetForm();
    } else {
        if (result.error.code === '23505') {
            showError('dni', 'error-dni', 'Este DNI ya está registrado');
            showToast('El DNI ingresado ya existe en el sistema', 'error');
        } else {
            showToast('Error al guardar los datos. Por favor, intente nuevamente.', 'error');
        }
    }
});

// ============================================
// VALIDACIONES EN TIEMPO REAL
// ============================================

nombreInput.addEventListener('input', validateNombre);
apellidoInput.addEventListener('input', validateApellido);
dniInput.addEventListener('input', validateDNI);
radioButtons.forEach(radio => {
    radio.addEventListener('change', validateComision);
});

// Validación inicial para remover estilos de error al cargar
console.log('Formulario listo. Configurar SUPABASE_URL y SUPABASE_ANON_KEY antes de usar.');
