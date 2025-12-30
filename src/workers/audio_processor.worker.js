/**
 * Audio Processor Web Worker
 * Handles audio processing in a separate thread for better performance
 */

class AudioProcessorWorker {
  constructor() {
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.sampleRate = 16000;
    this.isProcessing = false;
    
    // Set up message handling
    self.onmessage = this.handleMessage.bind(this);
  }
  
  handleMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'init':
        this.init(data);
        break;
      case 'audio':
        this.processAudio(data);
        break;
      case 'stop':
        this.stop();
        break;
    }
  }
  
  init(config) {
    this.sampleRate = config.sampleRate || 16000;
    this.bufferSize = config.bufferSize || 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.isProcessing = true;
    
    self.postMessage({ type: 'ready' });
  }
  
  processAudio(audioData) {
    if (!this.isProcessing) return;
    
    // Add audio data to buffer
    for (let i = 0; i < audioData.length; i++) {
      this.buffer[this.bufferIndex++] = audioData[i];
      
      // When buffer is full, send it for processing
      if (this.bufferIndex >= this.bufferSize) {
        this.sendAudioChunk();
        this.bufferIndex = 0;
      }
    }
  }
  
  sendAudioChunk() {
    // Convert Float32 to Int16 for smaller payload
    const int16Buffer = new Int16Array(this.buffer.length);
    for (let i = 0; i < this.buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, this.buffer[i]));
      int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Send the processed chunk back to main thread
    self.postMessage({
      type: 'audioChunk',
      chunk: int16Buffer.buffer,
      sampleRate: this.sampleRate,
      timestamp: Date.now()
    }, [int16Buffer.buffer]); // Transfer ownership for better performance
  }
  
  stop() {
    // Send any remaining audio in buffer
    if (this.bufferIndex > 0) {
      const remainingBuffer = this.buffer.slice(0, this.bufferIndex);
      const int16Buffer = new Int16Array(remainingBuffer.length);
      for (let i = 0; i < remainingBuffer.length; i++) {
        const s = Math.max(-1, Math.min(1, remainingBuffer[i]));
        int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      self.postMessage({
        type: 'audioChunk',
        chunk: int16Buffer.buffer,
        sampleRate: this.sampleRate,
        timestamp: Date.now(),
        isFinal: true
      }, [int16Buffer.buffer]);
    }
    
    this.isProcessing = false;
    self.postMessage({ type: 'stopped' });
  }
}

// Create and start the worker
const processor = new AudioProcessorWorker();