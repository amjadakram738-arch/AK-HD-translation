/**
 * AudioWorklet Processor للتدفق المستمر للصوت
 * هذا الملف يتم تحميله بواسطة AudioContext في background.js
 */

class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || input.length === 0) return true;
        
        const inputChannel = input[0];
        
        // جمع العينات في المخزن المؤقت
        for (let i = 0; i < inputChannel.length; i++) {
            this.buffer[this.bufferIndex++] = inputChannel[i];
            
            // عندما يمتلئ المخزن المؤقت، إرسال البيانات
            if (this.bufferIndex >= this.bufferSize) {
                this.sendAudioChunk();
                this.bufferIndex = 0;
            }
        }
        
        return true; // استمر في المعالجة
    }

    sendAudioChunk() {
        // تحويل Float32 إلى Int16
        const int16Buffer = new Int16Array(this.buffer.length);
        for (let i = 0; i < this.buffer.length; i++) {
            const s = Math.max(-1, Math.min(1, this.buffer[i]));
            int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // إرسال البيانات عبر المنفذ
        this.port.postMessage({
            type: 'audioChunk',
            chunk: int16Buffer.buffer
        });
    }
}

registerProcessor('audio-processor', AudioProcessor);