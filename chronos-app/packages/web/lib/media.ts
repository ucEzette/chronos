/**
 * MEDIA PROCESSING UTILITIES
 * Handles client-side generation of previews.
 */

// 1. CROP & BLUR IMAGE (Generates final blob)
export const getCroppedImg = (imageFile: File, pixelCrop: any, blurAmount: number): Promise<Blob | null> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = URL.createObjectURL(imageFile);
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
  
      if (!ctx) return reject(null);
  
      // Set canvas size to match the cropped area
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
  
      // Apply Blur
      if (blurAmount > 0) {
        ctx.filter = `blur(${blurAmount}px)`;
      }
      
      // Draw the clipped area
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
  
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    };
    image.onerror = reject;
  });
};

// 2. CAPTURE VIDEO FRAME (Improved reliability)
export const getVideoCover = (videoFile: File): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.currentTime = 1; // Capture at 1s mark

    // Wait for the seek to complete before drawing
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

    video.onerror = () => resolve(null);
  });
};

// 3. TRIM AUDIO (Safe Fallback)
export const getAudioSnippet = async (audioFile: File): Promise<Blob | null> => {
  try {
    // If file is huge, just take the raw file slice (faster/safer)
    if (audioFile.size > 50 * 1024 * 1024) return null; 

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const duration = Math.min(10, audioBuffer.duration);
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      duration * audioBuffer.sampleRate,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    const renderedBuffer = await offlineContext.startRendering();
    return bufferToWave(renderedBuffer, duration * audioBuffer.sampleRate);
  } catch (e) {
    console.error("Audio trim failed", e);
    return null; 
  }
};

// WAV Converter Helper
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

  function setUint16(data: any) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: any) { view.setUint32(pos, data, true); pos += 4; }

  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); 
  setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
  setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);

  for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset])); 
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; 
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }
  return new Blob([buffer], { type: "audio/wav" });
}