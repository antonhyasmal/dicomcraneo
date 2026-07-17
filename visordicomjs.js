/**
 * Visor DICOM Profesional Completo para Blogger
 * Versión Dinámica con Parámetros de URL
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

// 1. Nombre de la carpeta/álbum (por defecto 'img')
let folderParam = urlParams.get('album') ? urlParams.get('album') : 'img';
// Nos aseguramos de que termine con una barra /
if (!folderParam.endsWith('/')) {
    folderParam += '/';
}
// 2. Cantidad de cortes (por defecto 60)
const totalFrames = parseInt(urlParams.get('cortes')) || 60; 

// 3. Prefijo del nombre de la imagen (por defecto usa 'corte_')
const prefixParam = urlParams.get('prefix') ? urlParams.get('prefix') : 'corte_';

// 4. NUEVO Y CLAVE: Número de inicio del conteo (por defecto toma 1, si no se especifica)
const startParam = urlParams.get('start') !== null ? parseInt(urlParams.get('start')) : 1;

// 4. NUEVO Y DINÁMICO: Extensión del archivo (por defecto 'jpg')
// Te permite alternar entre jpg, png, JPG, PNG, etc., según lo que subas a GitHub
const extParam = urlParams.get('ext') ? urlParams.get('ext') : 'jpg';

// === 3. VARIABLES DE ADQUISICIÓN Y CONTROL DEL ESTUDIO ===
const imagesCache = []; 
let loadedCount = 0;   
let currentIdx = 0;     

// === 4. VARIABLES DE ESTADO DE FILTROS APLICADOS ===
let filterInvert = false;
let isZoomed = false;

// === 5. VARIABLES DE CALIBRACIÓN DE ILUMINACIÓN (VENTANA/NIVEL) ===
let isContrasteToolEnabled = false; 
let isPressedToAdjust = false;      
let brightnessLevel = 100;        
let contrastLevel = 100;          
let baseBrightness = 100;         
let baseContrast = 100;           

// === 6. VARIABLES DE LA FUNCIÓN AUTOMÁTICA (CINE LOOP) ===
let isPlaying = false;
let playInterval = null;
const playSpeed = 60; 

// === 7. VARIABLES DEL MOTOR DE ARRASTRE DE ZOOM (PANEO) ===
let isDragging = false;
let startX = 0, startY = 0;
let translateX = 0, translateY = 0;
let lastTranslateX = 0, lastTranslateY = 0; 

// === CONSTRUCTOR DINÁMICO DE RUTAS DE ARCHIVOS ===
function getImagePath(index) {
    // Eliminamos el "." inicial para usar rutas relativas puras al dominio
    let path = `${folderParam}${prefixParam}${index}.${extParam}`;
    // Limpia cualquier doble barra accidental (ej: carpeta//archivo)
    return path.replace(/\/+/g, "/"); 
}

// === 9. ALGORITMO DE DESCARGA PREVENTIVA / PRECARGA (UNIVERSAL) ===
function initPrecargar() {
    loadedCount = 0; 
    slider.max = totalFrames - 1;
    imagesCache.length = 0; // Limpia la caché

    // El ciclo calcula dinámicamente los nombres basándose en el parámetro 'startParam'
    for (let i = 0; i < totalFrames; i++) {
        const imageNumber = startParam + i; // Si start es 1, procesará: 1, 2, 3...
        
        const img = new Image();
        img.src = getImagePath(imageNumber);
        imagesCache.push(img);
        
        img.onload = () => {
            loadedCount++;
            statusText.textContent = `Descargando: ${Math.floor((loadedCount / totalFrames) * 100)}%`;
            
            if (loadedCount === totalFrames) {
                statusText.textContent = "Estudio Médico Listo";
                slider.disabled = false;
                updateFrame(0); // Muestra el primer elemento guardado en la caché
                if (typeof bindEvents === 'function') {
                    bindEvents(); 
                }
            }
        };

        img.onerror = () => {
            console.warn(`No se pudo localizar la imagen en: ${img.src}`);
            loadedCount++;
            if (loadedCount === totalFrames) {
                statusText.textContent = "Estudio Médico Listo (con omisiones)";
                slider.disabled = false;
                updateFrame(0);
                if (typeof bindEvents === 'function') {
                    bindEvents();
                }
            }
        };
    }
}
function finalizarPrecarga() {
    document.getElementById('loading-element').style.display = 'none'; // Oculta tu cargador si tienes uno
    updateFrame(0); // Muestra la primera imagen
    bindEvents();   // <--- ¡ESTA LÍNEA ES CRÍTICA! Activa los clics de todos los botones
}

// === 10. INICIALIZADOR AUTOMÁTICO AL CARGAR EL SCRIPT ===
// Ejecuta automáticamente la precarga dinámica una vez que el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    initPrecargar();
});
// === NUEVO: MOTOR DE ACTUALIZACIÓN DE IMÁGENES ===
function updateFrame(index) {
    if (index < 0 || index >= totalFrames) return;
    currentIdx = index;
    
    // Cambia la imagen visible usando la caché precargada
    if (imagesCache[index] && imagesCache[index].complete) {
        imgElement.src = imagesCache[index].src;
    } else {
        // Alternativa si no ha cargado del todo
        imgElement.src = getImagePath(startParam + index);
    }
    
    // Actualiza los componentes visuales del visor
    slider.value = index;
    counter.textContent = `${index + 1} / ${totalFrames}`;
}

// === NUEVO: ESCUCHADOR DE EVENTOS DE INTERFAZ ===
function bindEvents() {
    // 1. Control deslizante (Slider inferior)
    if (slider) {
        slider.oninput = (e) => {
            updateFrame(parseInt(e.target.value, 10));
        };
    }

    // 2. Botón Reproducir / Cine Loop (Play)
    if (btnPlay) {
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
                    if (nextIdx >= totalFrames) nextIdx = 0; // Bucle infinito
                    updateFrame(nextIdx);
                }, playSpeed);
            }
        };
    }

    // 3. Botón Restablecer (Reset)
    if (btnReset) {
        btnReset.onclick = () => {
            if (isPlaying) btnPlay.click();
            updateFrame(0);
        };
    }

    // === NUEVO: SOLUCIÓN AL SCROLL DENTRO DEL IFRAME ===
    // Escucha el scroll de la rueda del ratón directamente sobre el contenedor del visor
    const visorContainer = document.querySelector('.visor-container');
    if (visorContainer) {
        visorContainer.addEventListener('wheel', (e) => {
            e.preventDefault(); // Evita que la página completa de Blogger se mueva
            
            let nextIdx = currentIdx;
            if (e.deltaY > 0) {
                // Scroll hacia abajo -> Siguiente imagen
                nextIdx = currentIdx + 1;
            } else if (e.deltaY < 0) {
                // Scroll hacia arriba -> Imagen anterior
                nextIdx = currentIdx - 1;
            }
            
            // Validar límites antes de actualizar
            if (nextIdx >= 0 && nextIdx < totalFrames) {
                updateFrame(nextIdx);
            }
        }, { passive: false });
    }
}

    // Restablecer valores de fábrica (Reset)
    btnReset.onclick = () => {
        if (isPlaying) btnPlay.click();
        updateFrame(0);
        // Aquí puedes reiniciar tus variables de zoom y contraste si añades sus lógicas
    };
}
