/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service to enhance audio quality for better transcription accuracy.
 * Uses Web Audio API to apply normalization, compression, and filtering.
 */
export const enhanceAudio = async (audioBlob: Blob): Promise<Blob> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    // 1. Convert Blob to AudioBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // 2. Setup OfflineAudioContext for rendering the enhanced audio
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    // 3. Create nodes
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // High-pass filter to remove low-end rumble (below 80Hz)
    const highPass = offlineContext.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 80;
    
    // Low-pass filter to remove high-frequency noise (above 8000Hz)
    const lowPass = offlineContext.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 8000;
    
    // Peaking filter to boost speech clarity (around 3000Hz)
    const clarityBoost = offlineContext.createBiquadFilter();
    clarityBoost.type = 'peaking';
    clarityBoost.frequency.value = 3000;
    clarityBoost.Q.value = 1;
    clarityBoost.gain.value = 3; // 3dB boost
    
    // Dynamics Compressor to balance volume
    const compressor = offlineContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, offlineContext.currentTime);
    compressor.knee.setValueAtTime(30, offlineContext.currentTime);
    compressor.ratio.setValueAtTime(12, offlineContext.currentTime);
    compressor.attack.setValueAtTime(0.003, offlineContext.currentTime);
    compressor.release.setValueAtTime(0.25, offlineContext.currentTime);
    
    // Gain node for normalization
    const gainNode = offlineContext.createGain();
    
    // Calculate peak for normalization
    let maxVal = 0;
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        const absVal = Math.abs(data[i]);
        if (absVal > maxVal) maxVal = absVal;
      }
    }
    
    // Target normalization to -1dB (approx 0.89)
    const targetPeak = 0.89;
    const normalizationGain = maxVal > 0 ? targetPeak / maxVal : 1;
    gainNode.gain.value = normalizationGain;
    
    // 4. Connect nodes
    source.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(clarityBoost);
    clarityBoost.connect(compressor);
    compressor.connect(gainNode);
    gainNode.connect(offlineContext.destination);
    
    // 5. Start and render
    source.start(0);
    const renderedBuffer = await offlineContext.startRendering();
    
    // 6. Convert AudioBuffer back to Blob (WAV format)
    return audioBufferToWav(renderedBuffer);
    
  } catch (error) {
    console.error("Audio enhancement failed:", error);
    return audioBlob; // Fallback to original
  } finally {
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }
  }
};

/**
 * Helper to convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit (hardcoded)

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {             // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true);          // write 16-bit sample
      pos += 2;
    }
    offset++;                                     // next source sample
  }

  return new Blob([bufferArray], { type: "audio/wav" });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}
