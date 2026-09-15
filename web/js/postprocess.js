/**
 * OjoVial — YOLOv8 Post-Processing
 * Decodes raw YOLOv8 ONNX output tensor and applies Non-Maximum Suppression.
 *
 * YOLOv8 ONNX output shape: [1, 4+nc, 8400]
 *   - 4 box coords (cx, cy, w, h) + nc class scores (logits)
 *   - 8400 = number of anchor proposals
 *   Our model: [1, 12, 8400] (4 box + 8 classes)
 */

function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

function iou(boxA, boxB) {
    const x1 = Math.max(boxA[0], boxB[0]);
    const y1 = Math.max(boxA[1], boxB[1]);
    const x2 = Math.min(boxA[2], boxB[2]);
    const y2 = Math.min(boxA[3], boxB[3]);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const areaA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
    const areaB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);
    const union = areaA + areaB - inter;
    return union > 0 ? inter / union : 0;
}

function nms(boxes, scores, iouThreshold) {
    const sorted = scores
        .map((s, i) => ({ score: s, index: i }))
        .sort((a, b) => b.score - a.score);

    const keep = [];
    const suppressed = new Set();

    for (const { score, index } of sorted) {
        if (suppressed.has(index)) continue;
        keep.push(index);

        for (let j = 0; j < sorted.length; j++) {
            const otherIdx = sorted[j].index;
            if (otherIdx === index || suppressed.has(otherIdx)) continue;
            if (iou(boxes[index], boxes[otherIdx]) > iouThreshold) {
                suppressed.add(otherIdx);
            }
        }
    }
    return keep;
}

/**
 * Process raw YOLOv8 ONNX output into detections.
 *
 * @param {Float32Array} outputData - Raw output tensor data
 * @param {Array} outputDims - Output tensor dimensions (e.g. [1, 12, 8400])
 * @param {number} numClasses - Number of classes in model (8)
 * @param {number} confThreshold - Minimum confidence threshold
 * @param {number} iouThreshold - NMS IoU threshold
 * @param {number} inputWidth - Model input width (640)
 * @param {number} inputHeight - Model input height (640)
 * @param {number} origWidth - Original image width
 * @param {number} origHeight - Original image height
 * @returns {Array} Array of detection objects
 */
function processYOLOOutput(
    outputData,
    outputDims,
    numClasses,
    confThreshold,
    iouThreshold,
    inputWidth,
    inputHeight,
    origWidth,
    origHeight,
    ratio,
    padX,
    padY
) {
    const numFeatures = outputDims[1];
    const numAnchors = outputDims[2];

    const boxes = [];
    const scores = [];
    const classIds = [];

    for (let i = 0; i < numAnchors; i++) {
        const cx = outputData[i];
        const cy = outputData[numAnchors + i];
        const w = outputData[2 * numAnchors + i];
        const h = outputData[3 * numAnchors + i];

        let maxScore = -1;
        let maxClassId = 0;

        for (let c = 0; c < numClasses; c++) {
            const rawScore = outputData[(4 + c) * numAnchors + i];
            const score = sigmoid(rawScore);
            if (score > maxScore) {
                maxScore = score;
                maxClassId = c;
            }
        }

        if (maxScore < confThreshold) continue;

        const x1 = (cx - w / 2 - padX) / ratio;
        const y1 = (cy - h / 2 - padY) / ratio;
        const x2 = (cx + w / 2 - padX) / ratio;
        const y2 = (cy + h / 2 - padY) / ratio;

        boxes.push([x1, y1, x2, y2]);
        scores.push(maxScore);
        classIds.push(maxClassId);
    }

    const keepIndices = nms(boxes, scores, iouThreshold);

    return keepIndices.slice(0, 50).map(idx => {
        const cls = SignClasses.byId(classIds[idx]);
        return {
            classId: classIds[idx],
            confidence: scores[idx],
            bbox: {
                x1: boxes[idx][0],
                y1: boxes[idx][1],
                x2: boxes[idx][2],
                y2: boxes[idx][3],
            },
            color: cls.color,
        };
    });
}

/**
 * Draw detections on a canvas.
 */
function drawDetections(canvas, detections) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const det of detections) {
        const { classId, confidence, bbox, color } = det;
        const { x1, y1, x2, y2 } = bbox;

        const cls = SignClasses.byId(classId);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        const text = `${cls.displayName} ${(confidence * 100).toFixed(1)}%`;

        ctx.font = '600 13px Inter, sans-serif';
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = 18;

        ctx.fillStyle = color;
        ctx.fillRect(x1, y1 - textHeight - 4, textWidth + 8, textHeight + 4);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, x1 + 4, y1 - 6);
    }
}
