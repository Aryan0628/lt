import { pipeline, env } from '@xenova/transformers';

// Skip local model checks (we load from CDN initially, then cache)
env.allowLocalModels = false;
env.useBrowserCache = true;

class AutomaticSpeechRecognitionPipeline {
  static task = 'automatic-speech-recognition';
  // "distil-whisper/distil-small.en" is FAST and accurate for English
  // "xenova/whisper-tiny.en" is even smaller if you need extreme speed
  static model = 'Xenova/whisper-tiny.en'; 
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (self.instance === null) {
      self.instance = await pipeline(self.task, self.model, {
        quantized: true, // drastically reduces size (makes it fast)
        progress_callback
      });
    }
    return self.instance;
  }
}

self.addEventListener('message', async (event) => {
  const { type, audio } = event.data;

  if (type === 'load') {
    await AutomaticSpeechRecognitionPipeline.getInstance((data) => {
      self.postMessage({ type: 'download', data });
    });
    self.postMessage({ type: 'ready' });
    return;
  }

  if (type === 'run') {
    let transcriber = await AutomaticSpeechRecognitionPipeline.getInstance();
    
    try {
      // Run the model on the audio chunk
      let output = await transcriber(audio, {
        language: 'english',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      self.postMessage({ type: 'result', text: output.text });
    } catch (e) {
      console.error("Worker Error:", e);
    }
  }
});