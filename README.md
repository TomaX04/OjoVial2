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

## Acceder al Sitio Web

Ingrese a los Release y Busque el "Ojo Vial v1" y Ingrese al link del Sitio Web (Descargar .ONNX)
   
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

## Tecnologías

| Componente | Tecnología |
|------------|------------|
| Modelo | YOLOv8s (Ultralytics) |
| Web | onnxruntime-web (WASM) + Web Speech API |
| Android | ONNX Runtime 1.16 + CameraX 1.3 |
| Entrenamiento | PyTorch + CUDA (RTX 4060) |
