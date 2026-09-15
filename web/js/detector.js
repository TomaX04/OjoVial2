/**
 * OjoVial — ONNX.js Detection Engine
 * Handles ONNX model loading and inference using onnxruntime-web.
 *
 * Requires:
 *   - onnxruntime-web (loaded via CDN or local bundle)
 *   - postprocess.js (YOLO output decoding + NMS)
 */

class TrafficSignDetector {
    constructor() {
        this.session = null;
        this.modelLoaded = false;
        this.inputName = null;
        this.outputName = null;
        this.inputShape = null;
        this.inputSize = 640;

        this.confThreshold = 0.55;
        this.iouThreshold = 0.50;
    }

    async loadModel(arrayBuffer) {
        try {
            if (typeof ort === 'undefined') {
                throw new Error('onnxruntime-web not loaded. Include ort.min.js');
            }

            this.session = await ort.InferenceSession.create(arrayBuffer, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all',
            });

            this.inputName = this.session.inputNames[0];
            this.outputName = this.session.outputNames[0];
            this.inputShape = null;

            this.modelLoaded = true;
            return true;
        } catch (err) {
            console.error('Failed to load ONNX model:', err);
            this.modelLoaded = false;
            throw err;
        }
    }

    async detect(imageSource, origWidth, origHeight) {
        if (!this.modelLoaded) {
            throw new Error('Model not loaded');
        }

        const { inputData, ratio, padX, padY } = this._preprocess(imageSource);

        const inputTensor = new ort.Tensor('float32', inputData, [1, 3, this.inputSize, this.inputSize]);

        const feeds = {};
        feeds[this.inputName] = inputTensor;

        const results = await this.session.run(feeds);
        const outputTensor = results[this.outputName];

        if (!outputTensor || !outputTensor.data) {
            throw new Error('No output tensor received from model');
        }

        const outputData = outputTensor.data;
        const outputDims = outputTensor.dims;

        const detections = processYOLOOutput(
            outputData,
            outputDims,
            SignClasses.numClasses,
            this.confThreshold,
            this.iouThreshold,
            this.inputSize,
            this.inputSize,
            origWidth,
            origHeight,
            ratio,
            padX,
            padY
        );

        return detections;
    }

    _preprocess(source) {
        const canvas = document.createElement('canvas');
        canvas.width = this.inputSize;
        canvas.height = this.inputSize;
        const ctx = canvas.getContext('2d');

        const srcW = source.naturalWidth || source.videoWidth || source.width;
        const srcH = source.naturalHeight || source.videoHeight || source.height;

        const ratio = Math.min(this.inputSize / srcW, this.inputSize / srcH);
        const newW = Math.round(srcW * ratio);
        const newH = Math.round(srcH * ratio);
        const padX = (this.inputSize - newW) / 2;
        const padY = (this.inputSize - newH) / 2;

        ctx.fillStyle = 'rgb(114,114,114)';
        ctx.fillRect(0, 0, this.inputSize, this.inputSize);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (source instanceof HTMLImageElement || source instanceof HTMLVideoElement) {
            ctx.drawImage(source, padX, padY, newW, newH);
        } else if (source instanceof HTMLCanvasElement) {
            ctx.drawImage(source, padX, padY, newW, newH);
        } else if (source instanceof ImageData) {
            const tmp = document.createElement('canvas');
            tmp.width = srcW;
            tmp.height = srcH;
            tmp.getContext('2d').putImageData(source, 0, 0);
            ctx.drawImage(tmp, padX, padY, newW, newH);
        }

        const imageData = ctx.getImageData(0, 0, this.inputSize, this.inputSize);
        const data = imageData.data;

        const chw = new Float32Array(3 * this.inputSize * this.inputSize);
        const pixelCount = this.inputSize * this.inputSize;

        for (let i = 0; i < pixelCount; i++) {
            chw[i] = data[i * 4] / 255.0;
            chw[pixelCount + i] = data[i * 4 + 1] / 255.0;
            chw[2 * pixelCount + i] = data[i * 4 + 2] / 255.0;
        }

        return { inputData: chw, ratio, padX, padY };
    }

    setConfidenceThreshold(value) {
        this.confThreshold = Math.max(0.05, Math.min(0.95, value));
    }

    setIoUThreshold(value) {
        this.iouThreshold = Math.max(0.1, Math.min(0.9, value));
    }

    getDisplayName(className) {
        const entry = SignClasses.byName(className);
        return entry ? entry.displayName : className;
    }
}
