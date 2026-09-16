/**
 * OjoVial — Camera Manager
 * Handles webcam enumeration, streaming, and frame capture.
 */

class CameraManager {
    constructor(videoElement) {
        this.video = videoElement;
        this.stream = null;
        this.isActive = false;
        this.devices = [];
        this.currentDeviceId = null;
        this._enumerated = false;
    }

    async enumerateDevices(forceRefresh = false) {
        if (this._enumerated && !forceRefresh && this.devices.length > 0) {
            return this.devices;
        }

        try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            tempStream.getTracks().forEach(t => t.stop());

            this.devices = allDevices.filter(d => d.kind === 'videoinput');
            this._enumerated = true;
            return this.devices;
        } catch (err) {
            console.warn('Could not enumerate cameras:', err.message);
            this.devices = [];
            return [];
        }
    }

    getDeviceList() {
        return this.devices.map((d, i) => ({
            id: d.deviceId,
            label: d.label || `Camera ${i + 1}`,
            index: i,
        }));
    }

    async start(deviceId) {
        if (this.isActive) {
            this.stop();
        }

        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'environment',
            },
            audio: false,
        };

        if (deviceId) {
            constraints.video = {
                width: { ideal: 640 },
                height: { ideal: 480 },
                deviceId: { exact: deviceId },
            };
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            this.video.classList.remove('hidden');

            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });

            this.isActive = true;
            this.currentDeviceId = this.stream.getVideoTracks()[0]?.getSettings()?.deviceId || deviceId;
            return true;
        } catch (err) {
            console.error('Failed to start camera:', err);
            this.isActive = false;
            throw err;
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.video.srcObject = null;
        this.video.classList.add('hidden');
        this.isActive = false;
    }

    captureFrame(targetCanvas) {
        if (!this.isActive) return false;

        const vw = this.video.videoWidth;
        const vh = this.video.videoHeight;

        if (vw === 0 || vh === 0) return false;

        targetCanvas.width = vw;
        targetCanvas.height = vh;

        const ctx = targetCanvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0, vw, vh);
        return true;
    }

    getVideoDimensions() {
        return {
            width: this.video.videoWidth || 640,
            height: this.video.videoHeight || 480,
        };
    }
}
