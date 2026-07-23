/**
 * Visor DICOM Profesional Completo para Blogger
 * Versión Dinámica Optimizada
 */

// === 1. CAPTURA DE VARIABLES INTERNAS DEL ÁRBOL DOM ===
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

// === LECTOR DE PARÁMETROS DINÁMICOS DESDE LA URL ===
const urlParams = new URLSearchParams(window.location.search);

let folderParam = urlParams.get('album') || 'img';
if (!folderParam.endsWith('/')) {
    folderParam += '/';
}
const totalFrames = parseInt(urlParams.get('cortes')) || 60; 
const prefixParam = urlParams.get('prefix') || 'corte_';
const startParam = urlParams.get('start') !== null ? parseInt(urlParams.get('start')) : 1;
const extParam = urlParams.get('ext') || 'jpg';

// === VARIABLES DE ADQUISICIÓN Y CONTROL DEL ESTUDIO ===
const imagesCache = []; 
let loadedCount = 0;   
let currentIdx = 0;     

// === VARIABLES DE ESTADO DE FILTROS APLICADOS ===
let filterInvert = false;
let isZoomed = false;

// === VARIABLES DE CALIBRACIÓN DE ILUMINACIÓN ===
let isContrasteToolEnabled = false; 
let isPressedToAdjust = false;      
let brightnessLevel = 100;        
let contrastLevel = 100;          
let baseBrightness = 100;         
let baseContrast = 100;           

// === VARIABLES DE LA FUNCIÓN AUTOMÁTICA (CINE LOOP) ===
let isPlaying = false;
let playInterval = null;
const playSpeed = 60; 

// === VARIABLES DEL MOTOR DE ARRASTRE DE ZOOM (PANEO) ===
let isDragging = false;
let startX = 0, startY = 0;
let translateX = 0, translateY = 0;
let lastTranslateX = 0, lastTranslateY = 0; 

// === CONSTRUCTOR DINÁMICO DE RUTAS DE ARCHIVOS ===
function getImagePath(index) {
    return `${folderParam}${prefixParam}${index}.${extParam}`.replace(/\/+/g, "/"); 
}

// === ALGORITMO DE DESCARGA PREVENTIVA / PRECARGA ===
function initPrecargar() {
    loadedCount = 0; 
    slider.max = totalFrames - 1;
    imagesCache.length = 0; 

    for (let i = 0; i < totalFrames; i++) {
        const imageNumber = startParam + i; 
        const img = new Image();
        img.src = getImagePath(imageNumber);
        imagesCache.push(img);
        
        img.onload = () => {
            loadedCount++;
            statusText.textContent = `Descargando: ${Math.floor((loadedCount / totalFrames) * 100)}%`;
            if (loadedCount === totalFrames) finalizarPrecarga("Estudio Médico Listo");
        };

        img.onerror = () => {
            console.warn(`No se pudo localizar la imagen en: ${img.src}`);
            loadedCount++;
            if (loadedCount === totalFrames) finalizarPrecarga("Estudio Médico Listo (con omisiones)");
        };
    }
}

function finalizarPrecarga(mensaje) {
    statusText.textContent = mensaje;
    slider.disabled = false;
    updateFrame(0); 
    bindEvents(); 
}

document.addEventListener('DOMContentLoaded', initPrecargar);

// === MOTOR DE ACTUALIZACIÓN DE IMÁGENES ===
function updateFrame(index) {
    if (index < 0 || index >= totalFrames) return;
    currentIdx = index;
    
    if (imagesCache[index] && imagesCache[index].complete) {
        imgElement.src = imagesCache[index].src;
    } else {
        imgElement.src = getImagePath(startParam + index);
    }
    
    slider.value = index;
    counter.textContent = `${index + 1} / ${totalFrames}`;
    aplicarEstilosVisuales();
}

// === MOTOR DE PROCESAMIENTO VISUAL ===
function aplicarEstilosVisuales() {
    let invertValue = filterInvert ? 'invert(100%)' : 'invert(0%)';
    imgElement.style.filter = `${invertValue} contrast(${contrastLevel}%) brightness(${brightnessLevel}%)`;

    if (isZoomed) {
        imgElement.style.transform = `scale(2.2) translate(${translateX / 2.2}px, ${translateY / 2.2}px)`;
        imgElement.style.cursor = isDragging ? 'grabbing' : 'grab';
    } else {
        imgElement.style.transform = 'scale(1) translate(0px, 0px)';
        imgElement.style.cursor = isContrasteToolEnabled ? 'move' : 'default'; 
    }
}

function toggleZoom() {
    if (isContrasteToolEnabled) toggleContrasteTool(); 
    isZoomed = !isZoomed;
    btnZoom.classList.toggle('active', isZoomed);
    
    if (!isZoomed) {
        translateX = 0; translateY = 0;
        lastTranslateX = 0; lastTranslateY = 0;
    }
    aplicarEstilosVisuales();
}

function toggleContrasteTool() {
    if (isZoomed) toggleZoom(); 
    isContrasteToolEnabled = !isContrasteToolEnabled;
    btnContraste.classList.toggle('active', isContrasteToolEnabled);
    aplicarEstilosVisuales();
}

// === ESCUCHADOR DE EVENTOS DE INTERFAZ Y HARDWARE ===
function bindEvents() {
    slider.oninput = (e) => {
        if (isPlaying) btnPlay.click();
        updateFrame(parseInt(e.target.value));
    };

    btnPlay.onclick = () => {
        if (isPlaying) {
            clearInterval(playInterval);
            btnPlay.classList.remove('active');
            isPlaying = false;
        } else {
            btnPlay.classList.add('active');
            isPlaying = true;
            playInterval = setInterval(() => {
                let nextIdx = currentIdx + 1;
                if (nextIdx >= totalFrames) nextIdx = 0; 
                updateFrame(nextIdx);
            }, playSpeed);
        }
    };

    btnInvert.onclick = () => {
        filterInvert = !filterInvert;
        btnInvert.classList.toggle('active', filterInvert);
        aplicarEstilosVisuales();
    };

    btnContraste.onclick = toggleContrasteTool;
    btnZoom.onclick = toggleZoom;

    btnReset.onclick = () => {
        if (isPlaying) clearInterval(playInterval);
        isPlaying = false;
        filterInvert = false;
        brightnessLevel = 100; contrastLevel = 100;
        baseBrightness = 100; baseContrast = 100;
        isContrasteToolEnabled = false; isPressedToAdjust = false; isZoomed = false;
        translateX = 0; translateY = 0; lastTranslateX = 0; lastTranslateY = 0;
        
        btnPlay.classList.remove('active');
        btnInvert.classList.remove('active');
        btnContraste.classList.remove('active');
        btnZoom.classList.remove('active');
        statusText.textContent = "Estudio Médico Listo";
        updateFrame(0);
    };

    wrapper.onwheel = (e) => {
        e.preventDefault(); 
        if (isPlaying) btnPlay.click();
        let targetIdx = currentIdx + (e.deltaY > 0 ? 1 : -1);
        if (targetIdx >= 0 && targetIdx < totalFrames) {
            updateFrame(targetIdx);
        }
    };

    let startFrameY = 0, startFrameIdx = 0;

    const startDrag = (clientX, clientY) => {
        if (isPlaying) btnPlay.click();
        isDragging = true;
        startX = clientX; startY = clientY;

        if (isContrasteToolEnabled) {
            isPressedToAdjust = true;
        } else if (!isZoomed) {
            startFrameY = clientY;
            startFrameIdx = currentIdx;
        }
    };

    const moveDrag = (clientX, clientY) => {
        if (!isDragging) return;
        let deltaX = clientX - startX;
        let deltaY = clientY - startY;

        if (isZoomed) {
            translateX = lastTranslateX + deltaX;
            translateY = lastTranslateY + deltaY;
            aplicarEstilosVisuales();
        } else if (isContrasteToolEnabled && isPressedToAdjust) {
            brightnessLevel = Math.max(20, Math.min(250, baseBrightness - (deltaY * 0.5)));
            contrastLevel = Math.max(30, Math.min(300, baseContrast - (deltaX * 0.5)));
            statusText.textContent = `Brillo: ${Math.round(brightnessLevel)}% | Contraste: ${Math.round(contrastLevel)}%`;
            aplicarEstilosVisuales();
        } else {
            let frameOffset = Math.floor((clientY - startFrameY) / 8); 
            let targetIdx = startFrameIdx + frameOffset;
            if (targetIdx >= 0 && targetIdx < totalFrames && targetIdx !== currentIdx) {
                updateFrame(targetIdx);
            }
        }
    };

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
            aplicarEstilosVisuales();
        }
    };

    wrapper.oncontextmenu = (e) => e.preventDefault();

    imgElement.onmousedown = (e) => {
        e.preventDefault(); 
        if (e.button === 0) startDrag(e.clientX, e.clientY);
    };
    window.onmousemove = (e) => moveDrag(e.clientX, e.clientY);
    window.onmouseup = endDrag;

    imgElement.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
            startDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches && e.touches.length === 1) {
            e.preventDefault(); 
            moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });

    window.addEventListener('touchend', endDrag);
}
