import { useEffect, useRef, useState } from 'react';

export const useLocalSentinel = (isEnabled, onKeywordDetected) => {
  const [status, setStatus] = useState('offline'); // offline | loading | active | error
  const [modelProgress, setModelProgress] = useState(0);
  
  const worker = useRef(null);
  const audioContext = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);

  
  const KEYWORDS = ['help', 'save me', 'emergency', 'police', 'stop'];

  useEffect(() => {
    // 1. Initialize Worker immediately
    if (!worker.current) {
      // FIX: Use a cleaner URL constructor that works better with Vite/Webpack
      // Ensure 'whisper.worker.js' is exactly at src/workers/whisper.worker.js
      worker.current = new Worker(new URL('../workers/whisper.worker.js', import.meta.url), {
        type: 'module'
      });

      worker.current.onmessage = (e) => {
        const { type, data, text } = e.data;
        
        if (type === 'download') {
            if (data.status === 'progress') setModelProgress(data.progress);
        }
        if (type === 'ready') {
            setStatus('offline');
            console.log("🧠 Local AI Model Loaded!");
        }
        if (type === 'result') {
            const transcript = text ? text.toLowerCase().trim() : "";
            if (transcript) console.log("👂 Local Heard:", transcript);

            const matched = KEYWORDS.find(k => transcript.includes(k));
            if (matched) {
                console.log("🚨 LOCAL ALERT TRIGGERED:", matched);
                onKeywordDetected(matched);
            }
        }
      };
      
      setStatus('loading');
      worker.current.postMessage({ type: 'load' });
    }

    // Cleanup
    return () => {
        worker.current?.terminate();
        // FIX: The error 'f is not defined' likely came from a typo here in your previous file
        worker.current = null;
    };
  }, []);

  useEffect(() => {
    if (isEnabled && status !== 'loading') {
      startListening();
    } else {
      stopListening();
    }
    // Safety cleanup when unmounting
    return () => stopListening();
  }, [isEnabled, status]); // Added 'status' to dependency to retry if ready

  const startListening = async () => {
    try {
      if (status === 'loading') return; 
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setStatus('active');

      // Resume context if suspended
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      if (audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
      }
      
      processorRef.current = audioContext.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        if (worker.current) {
            worker.current.postMessage({ type: 'run', audio: inputData });
        }
      };

      const source = audioContext.current.createMediaStreamSource(stream);
      source.connect(processorRef.current);
      processorRef.current.connect(audioContext.current.destination);

    } catch (err) {
      console.error("Mic Error:", err);
      setStatus("error");
    }
  };

  const stopListening = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (audioContext.current) {
        audioContext.current.close();
        audioContext.current = null;
    }
    if (status === 'active') setStatus('offline');
  };

  return { status, modelProgress };
};