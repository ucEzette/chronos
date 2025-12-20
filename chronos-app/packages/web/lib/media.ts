/**
 * MEDIA PROCESSING UTILITIES
 * Handles client-side generation of previews (Cropping, Blurring, Audio Trimming, Video Frames).
 * Includes safe fallbacks for large files to prevent browser crashes.
 */

// ==========================================
// 1. IMAGE: CROP & BLUR
// ==========================================
export const getCroppedImg = (imageFile: File, pixelCrop: any, blurAmount: number): Promise<Blob | null> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = URL.createObjectURL(imageFile);
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
  
      if (!ctx) return reject(null);
  
      // Set canvas size to the cropped area size
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
  
      // Apply Blur if requested
      if (blurAmount > 0) {
        ctx.filter = `blur(${blurAmount}px)`;
      }
      
      // Draw the cropped image onto the canvas
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
  
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.85); // 85% Quality JPEG
    };
    image.onerror = reject;
  });
};


// ==========================================
// 2. VIDEO: FRAME CAPTURE (SNAPSHOT)
// ==========================================
export const getVideoCover = (videoFile: File): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.currentTime = 1; // Capture frame at 1 second mark

    // Critical: Wait for the seek to finish before drawing
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.75);
      } else {
        resolve(null);
      }
    };

    // Fail gracefully if video is corrupt or format unsupported
    video.onerror = () => {
      console.warn("Could not generate video preview.");
      resolve(null);
    };
  });
};


// ==========================================
// 3. AUDIO: TRIM (FIRST 10 SECONDS)
// ==========================================
export const getAudioSnippet = async (audioFile: File): Promise<Blob | null> => {
  try {
    // SAFETY CHECK: If file is too large (>20MB), skip processing to prevent browser crash.
    // The UI will handle this by showing a generic icon or asking for a cover.
    if (audioFile.size > 20 * 1024 * 1024) {
      console.warn("Audio file too large for client-side preview generation. Skipping.");
      return null;
    }

    // Check for browser support
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return null;

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioContext = new AudioContext();
    
    // Decode Audio Data (This is the heavy operation)
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Calculate duration (Max 10s)
    const duration = Math.min(10, audioBuffer.duration);
    
    // Create Offline Context to render the snippet
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      duration * audioBuffer.sampleRate,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    // Render the new audio buffer
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert Buffer -> WAV Blob
    return bufferToWave(renderedBuffer, duration * audioBuffer.sampleRate);

  } catch (e) {
    console.error("Audio preview generation failed (Safe Fallback triggered):", e);
    return null; // Return null so the UI just shows a generic icon instead of crashing
  }
};


// ==========================================
// HELPER: CONVERT AUDIO BUFFER TO WAV
// ==========================================
function bufferToWave(abuffer: AudioBuffer, len: number) {
  const numOfChan = abuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // Helper functions to write data
  function setUint16(data: any) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: any) { view.setUint32(pos, data, true); pos += 4; }

  // RIFF Chunk
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // FMT Chunk
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded)

  // Data Chunk
  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // Write Interleaved Data
  for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      // Clamp the sample value
      sample = Math.max(-1, Math.min(1, channels[i][offset])); 
      // Scale to 16-bit integer
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; 
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([buffer], { type: "audio/wav" });
}