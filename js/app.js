/**
 * OjoVial — Main Application
 * Orchestrates model loading, camera/upload input, detection loop, TTS, and UI.
 */

const I18N = {
    'en-US': {
        subtitle: 'Traffic Sign Recognition',
        title_model: 'Model',
        load_model: 'Load ONNX Model',
        no_model: 'No model loaded',
        conf_threshold: 'Confidence Threshold:',
        iou_threshold: 'IoU Threshold:',
        title_input: 'Input Source',
        tab_camera: 'Camera',
        tab_upload: 'Upload Image',
        detecting_cameras: 'Detecting cameras...',
        start_camera: 'Start Camera',
        starting: 'Starting...',
        no_cameras: 'No cameras found',
        loading_model: 'Loading model...',
        load_error: 'Error:',
        load_model_first: 'Please load a model first.',
        camera_error: 'Could not start camera:',
        stop: 'Stop',
        drop_zone_text: 'Drag image here or click to browse',
        placeholder: 'Load a model and start camera or upload an image',
        title_detections: 'Detections',
        no_detections: 'No detections yet',
        title_legend: 'Class Legend',
        title_audio: 'Audio Announcements',
        tts_enabled: 'Audio enabled — 3s cooldown',
        tts_muted: 'Audio muted',
        tts_unlocked: 'Click to enable audio',
        tts_log_empty: 'Audio announcements will appear here',
        footer: 'OjoVial TSR v1.0 — Scale-Model Traffic Sign Recognition',
        speaking: 'Speaking...',
        legend_pare: 'Pare (Stop)',
        legend_ceda: 'Ceda el Paso',
        legend_derecha: 'No Right Turn',
        legend_izquierda: 'No Left Turn',
        legend_frente: 'Go Straight',
        legend_40: 'Speed Limit 40',
        legend_60: 'Speed Limit 60',
        legend_estacionar: 'No Parking',
    },
    'es-ES': {
        subtitle: 'Reconocimiento de Se\u00f1ales',
        title_model: 'Modelo',
        load_model: 'Cargar modelo ONNX',
        no_model: 'Sin modelo cargado',
        conf_threshold: 'Umbral de confianza:',
        iou_threshold: 'Umbral de IoU:',
        title_input: 'Fuente de entrada',
        tab_camera: 'C\u00e1mara',
        tab_upload: 'Subir imagen',
        detecting_cameras: 'Detectando c\u00e1maras...',
        start_camera: 'Iniciar c\u00e1mara',
        starting: 'Iniciando...',
        no_cameras: 'No se encontraron c\u00e1maras',
        loading_model: 'Cargando modelo...',
        load_error: 'Error:',
        load_model_first: 'Por favor, carga un modelo primero.',
        camera_error: 'No se pudo iniciar la c\u00e1mara:',
        stop: 'Detener',
        drop_zone_text: 'Arrastra una imagen aqu\u00ed o haz clic para buscar',
        placeholder: 'Carga un modelo e inicia la c\u00e1mara o sube una imagen',
        title_detections: 'Detecciones',
        no_detections: 'Sin detecciones a\u00fan',
        title_legend: 'Leyenda de clases',
        title_audio: 'Anuncios de audio',
        tts_enabled: 'Audio habilitado — 3s de enfriamiento',
        tts_muted: 'Audio silenciado',
        tts_unlocked: 'Haz clic para habilitar audio',
        tts_log_empty: 'Los anuncios de audio aparecer\u00e1n aqu\u00ed',
        footer: 'OjoVial TSR v1.0 — Reconocimiento de Se\u00f1ales de Tr\u00e1nsito a Escala',
        speaking: 'Hablando...',
        legend_pare: 'Pare (Stop)',
        legend_ceda: 'Ceda el Paso',
        legend_derecha: 'No girar a la derecha',
        legend_izquierda: 'No girar a la izquierda',
        legend_frente: 'Siga de frente',
        legend_40: 'Velocidad max. 40',
        legend_60: 'Velocidad max. 60',
        legend_estacionar: 'Prohibido estacionar',
    },
};

(function () {
    'use strict';

    const detector = new TrafficSignDetector();
    const tts = new TrafficSignTTS();
    let camera = null;
    let currentSource = 'camera';
    let isDetecting = false;
    let animFrameId = null;
    let fpsCounter = { frames: 0, lastTime: performance.now(), fps: 0 };
    let lastDetectionListUpdate = 0;

    function showToast(message, type) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type || 'info'}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    const els = {};

    function $(id) { return document.getElementById(id); }
    function qs(sel) { return document.querySelector(sel); }

    let currentLang = 'es-ES';

    function translatePage(lang) {
        currentLang = lang;
        SignClasses.setLanguage(lang);
        const dict = I18N[lang] || I18N['en-US'];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key] !== undefined) {
                el.textContent = dict[key];
            }
        });
        document.documentElement.lang = lang.split('-')[0];
    }

    async function init() {
        els.fileModel = $('file-model');
        els.modelStatus = $('model-status');
        els.sliderConf = $('slider-conf');
        els.sliderIou = $('slider-iou');
        els.valConf = $('val-conf');
        els.valIou = $('val-iou');
        els.tabCamera = $('tab-camera');
        els.tabUpload = $('tab-upload');
        els.cameraControls = $('camera-controls');
        els.uploadControls = $('upload-controls');
        els.selCamera = $('sel-camera');
        els.btnCamStart = $('btn-camera-start');
        els.btnCamStop = $('btn-camera-stop');
        els.fpsCounter = $('fps-counter');
        els.dropZone = $('drop-zone');
        els.fileImage = $('file-image');
        els.video = $('video');
        els.canvasSource = $('canvas-source');
        els.canvasDetect = $('canvas-detect');
        els.viewportPlaceholder = $('viewport-placeholder');
        els.viewportSpinner = $('viewport-spinner');
        els.detectionList = $('detection-list');
        els.ttsLog = $('tts-log');
        els.ttsStatusIcon = $('tts-status-icon');
        els.ttsStatusText = $('tts-status-text');
        els.btnTTSToggle = $('btn-tts-toggle');
        els.iconTTSSOn = $('icon-tts-on');
        els.iconTTSOff = $('icon-tts-off');
        els.selLanguage = $('sel-language');
        els.selVoice = $('sel-voice');
        els.sliderRate = $('slider-rate');
        els.sliderPitch = $('slider-pitch');
        els.sliderVolume = $('slider-volume');
        els.valRate = $('val-rate');
        els.valPitch = $('val-pitch');
        els.valVolume = $('val-volume');

        camera = new CameraManager(els.video);

        bindEvents();
        initTTS();
        autoLoadModel();
    }

    function bindEvents() {
        els.fileModel.addEventListener('change', handleModelLoad);

        els.sliderConf.addEventListener('input', () => {
            const val = parseFloat(els.sliderConf.value);
            els.valConf.textContent = val.toFixed(2);
            detector.setConfidenceThreshold(val);
        });

        els.sliderIou.addEventListener('input', () => {
            const val = parseFloat(els.sliderIou.value);
            els.valIou.textContent = val.toFixed(2);
            detector.setIoUThreshold(val);
        });

        els.tabCamera.addEventListener('click', () => switchSource('camera'));
        els.tabUpload.addEventListener('click', () => switchSource('upload'));

        els.btnCamStart.addEventListener('click', toggleCamera);
        els.btnCamStop.addEventListener('click', stopCamera);

        els.dropZone.addEventListener('click', () => {
            tts.unlock();
            els.fileImage.click();
        });
        els.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            els.dropZone.classList.add('drop-zone--active');
        });
        els.dropZone.addEventListener('dragleave', () => {
            els.dropZone.classList.remove('drop-zone--active');
        });
        els.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            els.dropZone.classList.remove('drop-zone--active');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleImageUpload(file);
            } else if (file) {
                showToast('Please drop an image file (JPG, PNG, etc.)', 'error');
            }
        });
        els.fileImage.addEventListener('change', (e) => {
            if (e.target.files[0]) handleImageUpload(e.target.files[0]);
        });

        els.btnTTSToggle.addEventListener('click', () => {
            tts.unlock();
            toggleTTS();
        });
        els.selLanguage.addEventListener('change', (e) => {
            tts.setLanguage(e.target.value);
            translatePage(e.target.value);
            updateTTSStatus();
            populateVoices();
        });
        els.selVoice.addEventListener('change', (e) => {
            tts.setVoice(e.target.value);
        });
        els.sliderRate.addEventListener('input', () => {
            const v = parseFloat(els.sliderRate.value);
            els.valRate.textContent = v.toFixed(1);
            tts.setRate(v);
        });
        els.sliderPitch.addEventListener('input', () => {
            const v = parseFloat(els.sliderPitch.value);
            els.valPitch.textContent = v.toFixed(1);
            tts.setPitch(v);
        });
        els.sliderVolume.addEventListener('input', () => {
            const v = parseFloat(els.sliderVolume.value);
            els.valVolume.textContent = v.toFixed(1);
            tts.setVolume(v);
        });
    }

    async function handleModelLoad() {
        const file = els.fileModel.files[0];
        if (!file) return;

        tts.unlock();
        const dict = I18N[currentLang] || I18N['en-US'];
        setModelStatus('loading', dict.loading_model || 'Loading model...');
        stopDetection();

        try {
            const buffer = await file.arrayBuffer();
            await detector.loadModel(buffer);
            setModelStatus('ready', `Loaded: ${file.name}`);
            showToast('Model loaded successfully', 'success');
        } catch (err) {
            const dict = I18N[currentLang] || I18N['en-US'];
            setModelStatus('error', `${dict.load_error} ${err.message}`);
            showToast(`${dict.load_error} ${err.message}`, 'error');
        }
    }

    function setModelStatus(state, text) {
        els.modelStatus.className = `status status--${state}`;
        els.modelStatus.querySelector('.status__text').textContent = text;
    }

    async function autoLoadModel() {
        const dict = I18N[currentLang] || I18N['en-US'];
        setModelStatus('loading', dict.loading_model || 'Loading model...');

        try {
            const response = await fetch('models/traffic_sign.onnx');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = await response.arrayBuffer();
            await detector.loadModel(buffer);
            setModelStatus('ready', 'traffic_sign.onnx');
            showToast('Model loaded successfully', 'success');
        } catch (err) {
            const dict = I18N[currentLang] || I18N['en-US'];
            setModelStatus('error', `${dict.load_error} ${err.message}`);
        }
    }

    let cameraEnumerated = false;

    function switchSource(source) {
        currentSource = source;

        els.tabCamera.classList.toggle('input-tab--active', source === 'camera');
        els.tabUpload.classList.toggle('input-tab--active', source === 'upload');
        els.cameraControls.classList.toggle('hidden', source !== 'camera');
        els.uploadControls.classList.toggle('hidden', source !== 'upload');

        if (source === 'camera') {
            stopCamera();
            if (!cameraEnumerated) {
                cameraEnumerated = true;
                enumerateCameras();
            }
        }
    }

    async function enumerateCameras() {
        const dict = I18N[currentLang] || I18N['en-US'];
        els.selCamera.innerHTML = `<option value="">${dict.detecting_cameras || 'Detecting cameras...'}</option>`;
        els.btnCamStart.disabled = true;

        try {
            const devices = await camera.enumerateDevices();
            els.selCamera.innerHTML = '';

            if (devices.length === 0) {
                els.selCamera.innerHTML = `<option value="">${dict.no_cameras || 'No cameras found'}</option>`;
                els.btnCamStart.disabled = false;
                return;
            }

            devices.forEach((d, i) => {
                const opt = document.createElement('option');
                opt.value = d.deviceId;
                opt.textContent = d.label || `Camera ${i + 1}`;
                els.selCamera.appendChild(opt);
            });

            els.btnCamStart.disabled = false;
        } catch (err) {
            els.selCamera.innerHTML = `<option value="">${dict.no_cameras || 'No cameras found'}</option>`;
            els.btnCamStart.disabled = false;
        }
    }

    function toggleCamera() {
        if (camera.isActive) {
            stopCamera();
        } else {
            startCamera();
        }
    }

    async function startCamera() {
        try {
            tts.unlock();
            const dict = I18N[currentLang] || I18N['en-US'];
            els.btnCamStart.disabled = true;
            els.btnCamStart.textContent = dict.starting || 'Starting...';
            els.viewportSpinner.classList.remove('hidden');

            const selectedId = els.selCamera.value;
            await camera.start(selectedId || undefined);

            els.btnCamStop.disabled = false;
            els.btnCamStart.disabled = false;
            els.btnCamStart.textContent = dict.stop || 'Stop';
            els.viewportPlaceholder.classList.add('hidden');
            els.viewportSpinner.classList.add('hidden');

            startDetectionLoop();
        } catch (err) {
            console.error('Camera start error:', err);
            const dict = I18N[currentLang] || I18N['en-US'];
            els.btnCamStart.disabled = false;
            els.btnCamStart.textContent = dict.start_camera || 'Start Camera';
            els.viewportSpinner.classList.add('hidden');
            showToast((dict.camera_error || 'Could not start camera:') + ' ' + err.message, 'error');
        }
    }

    function stopCamera() {
        camera.stop();
        stopDetection();
        els.btnCamStop.disabled = true;
        els.btnCamStart.disabled = false;
        const dict = I18N[currentLang] || I18N['en-US'];
        els.btnCamStart.textContent = dict.start_camera;
        els.viewportPlaceholder.classList.remove('hidden');
        els.canvasSource.classList.add('hidden');
        els.fpsCounter.textContent = 'FPS: --';
    }

    function handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                stopDetection();

                els.canvasSource.width = img.naturalWidth;
                els.canvasSource.height = img.naturalHeight;
                const ctx = els.canvasSource.getContext('2d');
                ctx.drawImage(img, 0, 0);
                els.canvasSource.classList.remove('hidden');
                els.video.classList.add('hidden');
                els.viewportPlaceholder.classList.add('hidden');

                els.canvasDetect.width = img.naturalWidth;
                els.canvasDetect.height = img.naturalHeight;

                if (!detector.modelLoaded) {
                    const dict = I18N[currentLang] || I18N['en-US'];
                    alert(dict.load_model_first || 'Please load a model first.');
                    return;
                }

                runSingleDetection(img, img.naturalWidth, img.naturalHeight);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async function runSingleDetection(source, width, height) {
        try {
            const detections = await detector.detect(source, width, height);
            drawDetections(els.canvasDetect, detections);
            updateDetectionList(detections);
            tts.processDetections(detections.map(d => ({
                className: SignClasses.byId(d.classId).name,
                confidence: d.confidence,
            })));
        } catch (err) {
            console.error('Detection error:', err);
        }
    }

    function startDetectionLoop() {
        if (isDetecting) return;
        isDetecting = true;
        fpsCounter = { frames: 0, lastTime: performance.now(), fps: 0 };
        els.viewportPlaceholder.classList.add('hidden');
        els.canvasDetect.classList.remove('hidden');
        detectFrame();
    }

    function stopDetection() {
        isDetecting = false;
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        els.canvasDetect.getContext('2d').clearRect(0, 0, els.canvasDetect.width, els.canvasDetect.height);
    }

    function detectFrame() {
        if (!isDetecting || !detector.modelLoaded) return;

        animFrameId = requestAnimationFrame(async () => {
            if (!camera.isActive || !isDetecting) return;

            const dims = camera.getVideoDimensions();

            els.canvasDetect.width = dims.width;
            els.canvasDetect.height = dims.height;

            try {
                const detections = await detector.detect(els.video, dims.width, dims.height);
                drawDetections(els.canvasDetect, detections);
                const now2 = performance.now();
                if (now2 - lastDetectionListUpdate > 300) {
                    updateDetectionList(detections);
                    lastDetectionListUpdate = now2;
                }
                tts.processDetections(detections.map(d => ({
                    className: SignClasses.byId(d.classId).name,
                    confidence: d.confidence,
                })));
            } catch (err) {
                console.error('Frame detection error:', err);
            }

            fpsCounter.frames++;
            const now = performance.now();
            if (now - fpsCounter.lastTime >= 1000) {
                fpsCounter.fps = fpsCounter.frames;
                fpsCounter.frames = 0;
                fpsCounter.lastTime = now;
                els.fpsCounter.textContent = `FPS: ${fpsCounter.fps}`;
            }

            if (isDetecting) detectFrame();
        });
    }

    function updateDetectionList(detections) {
        if (detections.length === 0) {
            const dict = I18N[currentLang] || I18N['en-US'];
            els.detectionList.innerHTML = `<p class="detection-list__empty" data-i18n="no_detections">${dict.no_detections}</p>`;
            return;
        }

        const sorted = detections.sort((a, b) => b.confidence - a.confidence);
        els.detectionList.innerHTML = sorted.map(det => {
            const cls = SignClasses.byId(det.classId);
            const conf = (det.confidence * 100).toFixed(1);
            return `
                <div class="detection-item">
                    <span class="detection-item__color" style="background:${cls.color}"></span>
                    <span class="detection-item__name">${cls.displayName}</span>
                    <span class="detection-item__conf">${conf}%</span>
                </div>
            `;
        }).join('');
    }

    function initTTS() {
        tts.setLanguage(SignClasses.ttsLanguage);
        translatePage(SignClasses.ttsLanguage);
        updateTTSStatus();

        els.sliderRate.value = tts.rate;
        els.valRate.textContent = tts.rate.toFixed(1);
        els.sliderPitch.value = tts.pitch;
        els.valPitch.textContent = tts.pitch.toFixed(1);
        els.sliderVolume.value = tts.volume;
        els.valVolume.textContent = tts.volume.toFixed(1);

        els.selLanguage.value = tts.lang;
        currentLang = tts.lang;
        translatePage(tts.lang);

        tts.onAnnounce = (className, confidence, msg) => {
            addTTSLogEntry(className, confidence, msg);
        };

        setTimeout(() => populateVoices(), 100);
    }

    function populateVoices() {
        const voices = tts.getVoices();
        els.selVoice.innerHTML = '';
        voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.name;
            opt.textContent = `${v.name} (${v.lang})`;
            if (v.name === tts.voiceName) opt.selected = true;
            els.selVoice.appendChild(opt);
        });
    }

    function toggleTTS() {
        const enabled = tts.toggle();
        updateTTSStatus();
    }

    function updateTTSStatus() {
        const supported = tts.isSupported();
        const enabled = tts.enabled;
        const unlocked = tts.isUnlocked();
        const dict = I18N[currentLang] || I18N['en-US'];

        if (!supported) {
            els.ttsStatusText.textContent = 'TTS not supported';
        } else if (!enabled) {
            els.ttsStatusText.textContent = dict.tts_muted;
        } else if (!unlocked) {
            els.ttsStatusText.textContent = dict.tts_unlocked;
        } else {
            els.ttsStatusText.textContent = dict.tts_enabled;
        }

        if (!supported) {
            els.ttsStatusIcon.textContent = '\u274C';
        } else if (!enabled) {
            els.ttsStatusIcon.textContent = '\uD83D\uDD07';
        } else if (!unlocked) {
            els.ttsStatusIcon.textContent = '\uD83D\uDD13';
        } else {
            els.ttsStatusIcon.textContent = '\uD83D\uDD0A';
        }

        els.iconTTSSOn.classList.toggle('hidden', !enabled);
        els.iconTTSOff.classList.toggle('hidden', enabled);
    }

    function addTTSLogEntry(className, confidence, msg) {
        const empty = els.ttsLog.querySelector('.tts-log__empty');
        if (empty) empty.remove();

        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const displayName = detector.getDisplayName(className);
        const conf = (confidence * 100).toFixed(1);
        const dict = I18N[currentLang] || I18N['en-US'];

        const entry = document.createElement('div');
        entry.className = 'tts-log-entry';
        entry.innerHTML = `
            <span class="tts-log-entry__time">[${timeStr}]</span>
            <span class="tts-log-entry__msg">${displayName}</span> ${conf}% — ${dict.speaking}
        `;
        els.ttsLog.prepend(entry);

        while (els.ttsLog.children.length > 20) {
            els.ttsLog.lastChild.remove();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
