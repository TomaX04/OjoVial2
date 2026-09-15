/**
 * OjoVial — Traffic Sign Class Registry
 * Central source of truth for class metadata (names, display names, colors).
 */

const SignClasses = (() => {
    const _data = {
        "classes": [
            {"id": 0, "name": "pare", "displayNameEs": "Pare (Stop)", "displayNameEn": "Stop", "color": "#FF4444"},
            {"id": 1, "name": "ceda_el_paso", "displayNameEs": "Ceda el Paso", "displayNameEn": "Yield", "color": "#FFD700"},
            {"id": 2, "name": "prohibido_girar_derecha", "displayNameEs": "No girar a la derecha", "displayNameEn": "No Right Turn", "color": "#FF8C00"},
            {"id": 3, "name": "prohibido_girar_izquierda", "displayNameEs": "No girar a la izquierda", "displayNameEn": "No Left Turn", "color": "#4488FF"},
            {"id": 4, "name": "siga_de_frente", "displayNameEs": "Siga de frente", "displayNameEn": "Go Straight", "color": "#44FF44"},
            {"id": 5, "name": "velocidad_maxima_40", "displayNameEs": "Velocidad max. 40", "displayNameEn": "Speed Limit 40", "color": "#BBBBBB"},
            {"id": 6, "name": "velocidad_maxima_60", "displayNameEs": "Velocidad max. 60", "displayNameEn": "Speed Limit 60", "color": "#999999"},
            {"id": 7, "name": "prohibido_estacionar", "displayNameEs": "Prohibido estacionar", "displayNameEn": "No Parking", "color": "#9933CC"}
        ],
        "numClasses": 8,
        "modelInputSize": 640,
        "ttsLanguage": "es-ES"
    };

    let _lang = 'es-ES';

    function byId(id) {
        if (id < 0 || id >= _data.classes.length) {
            return { id, name: `class_${id}`, displayName: `Class ${id}`, color: '#FFFFFF' };
        }
        const c = _data.classes[id];
        const displayName = _lang === 'es-ES' ? c.displayNameEs : c.displayNameEn;
        return { ...c, displayName };
    }

    function byName(name) {
        const c = _data.classes.find(c => c.name === name) || null;
        if (!c) return null;
        const displayName = _lang === 'es-ES' ? c.displayNameEs : c.displayNameEn;
        return { ...c, displayName };
    }

    return {
        get names() { return _data.classes.map(c => c.name); },
        get displayNames() { return _data.classes.map(c => _lang === 'es-ES' ? c.displayNameEs : c.displayNameEn); },
        get colors() { return _data.classes.map(c => c.color); },
        get numClasses() { return _data.numClasses; },
        get ttsLanguage() { return _data.ttsLanguage; },
        setLanguage(lang) { _lang = lang; },
        byId, byName
    };
})();
