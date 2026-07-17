// --- CAPTURA DE VARIABLES INTERNAS DEL ÁRBOL DOM ---
const imgElement = document.getElementById('dicomFrame');
const wrapper = document.getElementById('wrapper');
const slider = document.getElementById('frameSlider');
const counter = document.getElementById('frameCounter');
const statusText = document.getElementById('loaderStatus');

const btnPlay = document.getElementById('btnPlay');
const btnInvert = document.getElementById('btnInvert');
const btnContraste = document.getElementById('btnContraste'); 
const btnZoom = document.getElementById('btnZoom');
const btnReset = document.getElementById('btnReset');

// === NUEVO LECTOR DE PARÁMETROS DINÁMICOS DESDE LA URL ===
const urlParams = new URLSearchParams(window.location.search);
// Si no pones el parámetro ?album= en la URL, buscará por defecto en la carpeta 'img/'
const folderParam = urlParams.get('album') ? urlParams.get('album') + '/' : 'img/';
// Si no pones el parámetro ?cortes= en la URL, asumirá 50 por defecto
const totalFrames = parseInt(urlParams.get('cortes')) || 50;


// --- VARIABLES DE ADQUISICIÓN Y CONTROL DEL ESTUDIO ---
const imagesCache = []; 
let loadedCount = 0;   
let currentIdx = 0;   

// --- VARIABLES DE ESTADO DE FILTROS APLICADOS ---
let filterInvert = false;
let isZoomed = false;

// --- VARIABLES DE CALIBRACIÓN DE ILUMINACIÓN (VENTANA/NIVEL) ---
let isContrasteToolEnabled = false; 
let isPressedToAdjust = false;      
let brightnessLevel = 100;        
let contrastLevel = 100;          
let baseBrightness = 100;         
let baseContrast = 100;            

// --- VARIABLES DE LA FUNCIÓN AUTOMÁTICA (CINE LOOP) ---
let isPlaying = false;
let playInterval = null;
const playSpeed = 60; 

// --- VARIABLES DEL MOTOR DE ARRASTRE DE ZOOM (PANEO) ---
let isDragging = false;
let startX = 0, startY = 0;
let translateX = 0, translateY = 0;
let lastTranslateX = 0, lastTranslateY = 0; 

// --- CONSTRUCTOR DINÁMICO DE RUTAS DE ARCHIVOS MODIFICADO ---
function getImagePath(index) {
    return `${folderParam}corte_${index}.jpg`; 
}

// --- ALGORITMO DE DESCARGA PREVENTIVA (PRECARGA EN CACHÉ RAM) ---
function initPrecargar() {
    slider.max = totalFrames - 1;
    for (let i = 1; i <= totalFrames; i++) {
        const img = new Image();
        img.src = getImagePath(i);
        img.onload = () => {
            loadedCount++;
            statusText.textContent = `Descargando: ${Math.floor((loadedCount/totalFrames)*100)}%`;
            if (loadedCount === totalFrames) {
                statusText.textContent = "Estudio Médico Listo";
                slider.disabled = false;
                updateFrame(0); 
                bindEvents();   
            }
        };
        imagesCache.push(img);
    }
}

// --- PROCESADOR DE REEMPLAZO DE CAPAS RADIOLÓGICAS ---
function updateFrame(index) {
    if (index < 0 || index >= totalFrames) return;
    currentIdx = index;
    imgElement.src = imagesCache[index].src;
    slider.value = index;
    counter.textContent = `Corte: ${index + 1} / ${totalFrames}`;
    aplicarEstilosVisuales();
}

// --- COMPILADOR DE FILTROS INTEGRADOS (MOTOR DE PROCESAMIENTO VISUAL) ---
function aplicarEstilosVisuales() {
    let invertValue = filterInvert ? 'invert(100%)' : 'invert(0%)';
    imgElement.style.filter = `${invertValue} contrast(${contrastLevel}%) brightness(${brightnessLevel}%)`;

    if (isZoomed) {
        imgElement.style.transform = `scale(2.2) translate(${translateX / 2.2}px, ${translateY / 2.2}px)`;
        imgElement.style.cursor = isDragging ? 'grabbing' : 'grab';
    } else if (isContrasteToolEnabled) {
        imgElement.style.transform = 'scale(1) translate(0px, 0px)';
        imgElement.style.cursor = 'move'; 
    } else {
        imgElement.style.transform = 'scale(1) translate(0px, 0px)';
        imgElement.style.cursor = 'default'; 
    }
}

// --- INTERRUPTOR DE APAGADO / ENCENDIDO DE MODO ZOOM ---
function toggleZoom() {
    if (isContrasteToolEnabled) toggleContrasteTool(); 
    isZoomed = !isZoomed;
    btnZoom.classList.toggle('active', isZoomed);
    btnZoom.textContent = isZoomed ? "🔍 Normal" : "🔍 Zoom";
    if (!isZoomed) {
        translateX = 0; translateY = 0;
        lastTranslateX = 0; lastTranslateY = 0;
    }
    aplicarEstilosVisuales();
}

// --- INTERRUPTOR DE PRESELECCIÓN DE HERRAMIENTA CONTRASTE ---
function toggleContrasteTool() {
    if (isZoomed) toggleZoom(); 
    isContrasteToolEnabled = !isContrasteToolEnabled;
    btnContraste.classList.toggle('active', isContrasteToolEnabled);
    aplicarEstilosVisuales();
}

// --- SISTEMA DE REPRODUCCIÓN AUTOMÁTICA CONTINUA (CINE LOOP) ---
function togglePlay() {
    isPlaying = !isPlaying;
    btnPlay.classList.toggle('active', isPlaying);
    if (isPlaying) {
        btnPlay.textContent = "⏸ Pausa";
        playInterval = setInterval(() => {
            let siguienteFrame = (currentIdx + 1) % totalFrames;
            updateFrame(siguienteFrame);
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo(0, (siguienteFrame / (totalFrames - 1)) * maxScroll);
        }, playSpeed);
    } else {
        btnPlay.textContent = "▶ Autoplay";
        clearInterval(playInterval); 
    }
}

// --- LIMPIEZA CLÍNICA COMPLETA DEL SISTEMA (HARD RESET VISOR) ---
function resetearVisor() {
    if (isPlaying) togglePlay();
    filterInvert = false;
    brightnessLevel = 100;
    contrastLevel = 100;
    baseBrightness = 100;
    baseContrast = 100;
    isContrasteToolEnabled = false;
    isPressedToAdjust = false;
    isZoomed = false;
    translateX = 0; translateY = 0;
    lastTranslateX = 0; lastTranslateY = 0;
    btnInvert.classList.remove('active');
    btnContraste.classList.remove('active');
    btnZoom.classList.remove('active');
    btnZoom.textContent = "🔍 Zoom";
    statusText.textContent = "Estudio Médico Listo";
    aplicarEstilosVisuales();
}

// --- MANEJADOR CENTRAL DE ESCUCHADORES DE HARDWARE ---
function bindEvents() {
    slider.addEventListener('input', (e) => {
        if (isPlaying) togglePlay(); 
        updateFrame(parseInt(e.target.value));
    });

    window.addEventListener('scroll', () => {
        if (isPlaying) return; 
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll <= 0) return;
        const percent = window.scrollY / maxScroll;
        let targetIdx = Math.floor(percent * totalFrames);
        if (targetIdx >= totalFrames) targetIdx = totalFrames - 1;
        if (targetIdx !== currentIdx) updateFrame(targetIdx);
    });

    wrapper.addEventListener('wheel', (e) => {
        e.preventDefault(); 
        if (isPlaying) togglePlay();
        let targetIdx = currentIdx + (e.deltaY > 0 ? 1 : -1);
        if (targetIdx >= 0 && targetIdx < totalFrames) {
            updateFrame(targetIdx);
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo(0, (targetIdx / (totalFrames - 1)) * maxScroll);
        }
    }, { passive: false });

    btnPlay.addEventListener('click', togglePlay);
    btnInvert.addEventListener('click', () => {
        filterInvert = !filterInvert;
        btnInvert.classList.toggle('active', filterInvert);
        aplicarEstilosVisuales();
    });
    btnContraste.addEventListener('click', toggleContrasteTool);
    btnZoom.addEventListener('click', toggleZoom);
    btnReset.addEventListener('click', resetearVisor);

    // --- ALGORITMO GESTUAL MULTIFUNCIÓN (INICIO DE ARRASTRE) ---
    const startDrag = (clientX, clientY) => {
        if (!isZoomed && !isContrasteToolEnabled) return;
        
        isDragging = true;
        startX = clientX;
        startY = clientY;

        if (isContrasteToolEnabled) {
            isPressedToAdjust = true;
        }
    };

    // --- ALGORITMO GESTUAL MULTIFUNCIÓN (MOVIMIENTO CONTINUO) ---
    const moveDrag = (clientX, clientY) => {
        if (!isDragging) return;
        let deltaX = clientX - startX;
        let deltaY = clientY - startY;

        if (isZoomed) {
            translateX = lastTranslateX + deltaX;
            translateY = lastTranslateY + deltaY;
        } else if (isContrasteToolEnabled && isPressedToAdjust) {
            brightnessLevel = Math.max(20, Math.min(250, baseBrightness - (deltaY * 0.5)));
            contrastLevel = Math.max(30, Math.min(300, baseContrast - (deltaX * 0.5)));
            statusText.textContent = `Brillo: ${Math.round(brightnessLevel)}% | Contraste: ${Math.round(contrastLevel)}%`;
        }
        aplicarEstilosVisuales();
    };

    // --- ALGORITMO GESTUAL MULTIFUNCIÓN (DESACTIVACIÓN AUTOMÁTICA) ---
    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        
        if (isZoomed) {
            lastTranslateX = translateX;
            lastTranslateY = translateY;
        } else if (isContrasteToolEnabled) {
            baseBrightness = brightnessLevel;
            baseContrast = contrastLevel;
            isPressedToAdjust = false;
            isContrasteToolEnabled = false; 
            btnContraste.classList.remove('active'); 
            statusText.textContent = "Estudio Médico Listo";
        }
        aplicarEstilosVisuales();
    };

    // === BLOQUEO DE CLIC DERECHO E IZQUIERDO NATIVOS DEL NAVEGADOR ===
    wrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    imgElement.addEventListener('mousedown', (e) => {
        e.preventDefault(); 
        if (e.button === 0) { 
            startDrag(e.clientX, e.clientY);
        }
    });

    window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);

    // --- CONTROL DE GESTOS TÁCTILES EN DISPOSITIVOS MÓVILES ---
    imgElement.addEventListener('touchstart', (e) => {
        if (isPlaying) togglePlay(); 
        if (e.touches.length === 1) startDrag(e.touches.clientX, e.touches.clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) moveDrag(e.touches.clientX, e.touches.clientY);
    }, { passive: true });

    window.addEventListener('touchend', endDrag);
}

initPrecargar();