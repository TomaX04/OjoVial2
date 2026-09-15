# OjoVial — Reconocimiento de Señales de Tránsito

Sistema de reconocimiento de señales de tránsito a escala para personas con discapacidad visual. Detecta 8 tipos de señales dibujadas a mano en tiempo real usando un modelo YOLOv8s y anuncia cada señal por audio (Text-to-Speech).

## Señales detectadas

| ID | Señal | Descripción |
|----|-------|-------------|
| 0 | Pare | Señal de alto |
| 1 | Ceda el Paso | Señal de ceda |
| 2 | Prohibido Girar Derecha | No gire a la derecha |
| 3 | Prohibido Girar Izquierda | No gire a la izquierda |
| 4 | Siga de Frente | Continúe derecho |
| 5 | Velocidad Máx. 40 | Límite de velocidad 40 km/h |
| 6 | Velocidad Máx. 60 | Límite de velocidad 60 km/h |
| 7 | Prohibido Estacionar | No se permite estacionar |

## Instalar la App (APK)

1. Descarga el archivo `OjoVial-debug.apk` de esta carpeta
2. En tu celular Android, ve a **Ajustes > Seguridad** y activa **Fuentes desconocidas**
3. Abre el archivo APK y presiona **Instalar**
4. Abre la app **OjoVial**
5. Otorga permisos de cámara y audio cuando se soliciten

### Uso de la app
- La cámara se activa automáticamente
- Apunta a una señal de tránsito a escala
- La app detecta la señal y la anuncia por audio
- Puedes ajustar el umbral de confianza con el slider
- Presiona el botón **ES/EN** para cambiar entre español e inglés
- Presiona el ícono de micrófono para activar/desactivar el audio

## Acceder al Sitio Web

El sitio web funciona completamente en el navegador (sin servidor).

### Opción 1: Live Server (VS Code)
1. Abre la carpeta `web/` en VS Code con la extensión Live Server
2. Haz clic en **Go Live** en la barra inferior

### Opción 2: Python
```bash
cd web
python -m http.server 8000
```
3. Abre `http://localhost:8000` en tu navegador
4. Carga el modelo: haz clic en **Cargar modelo ONNX** y selecciona `web/models/traffic_sign.onnx`

### Características del sitio web
- Detección en tiempo real con cámara o imágenes
- Anuncios por audio (Text-to-Speech)
- Selector de voz, velocidad, tono y volumen
- Interfaz bilingüe (español/inglés)
- Umbrales de confianza e IoU ajustables

## Prueba de Cámara en PC

Requisitos: Python 3.10+ y una webcam.

### Instalación
```bash
pip install -r requirements.txt
```

### Ejecución
```bash
jupyter notebook test_camera.ipynb
```
O abre el archivo directamente en Jupyter Lab / VS Code.

1. Ejecuta las celdas en orden
2. Se abrirá una ventana con la cámara en tiempo real
3. Usa los sliders para ajustar confianza y IoU
4. Presiona **q** para salir

## Rendimiento del Modelo (v5)

| Métrica | Valor |
|---------|-------|
| Precisión | 94.1% |
| Recall | 99.9% |
| mAP50 | 95.5% |
| mAP50-95 | 90.0% |
| Entrada | 640x640 |
| Formato | ONNX (42.7 MB) |

## Tecnologías

| Componente | Tecnología |
|------------|------------|
| Modelo | YOLOv8s (Ultralytics) |
| Web | onnxruntime-web (WASM) + Web Speech API |
| Android | ONNX Runtime 1.16 + CameraX 1.3 |
| Entrenamiento | PyTorch + CUDA (RTX 4060) |

## Licencia

MIT License — ver [LICENSE](LICENSE)
