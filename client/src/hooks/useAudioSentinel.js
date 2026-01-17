import { useEffect, useRef, useState } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
const SOCKET_URL = "wss://audio-safety-service-959468711582.asia-south2.run.app/ws/audio";
export const useAudioSentinel = (userId, isEnabled) => {
    const { getAccessTokenSilently } = useAuth0();
    const [status, setStatus] = useState("disconnected");
    const socketRef = useRef(null);
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const streamRef = useRef(null);
    useEffect(() => {
        if (isEnabled && userId) {
            startStream();
        } else {
            stopStream();
        }
        return () => stopStream();
    }, [isEnabled, userId]);

    const startStream = async () => {
        try {
            if (!userId) return;
            setStatus("connecting");

            const token = await getAccessTokenSilently({
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            });
            socketRef.current = new WebSocket(`${SOCKET_URL}/${userId}?token=${token}`);
            
            socketRef.current.onopen = () => {
                setStatus("connected");
                console.log("🎤 Sentinel Connected");
            };
            
            socketRef.current.onclose = () => setStatus("disconnected");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Create Context (Handle browser ignoring sampleRate)
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioCtx;
            
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            const inputSampleRate = audioCtx.sampleRate;
            const targetSampleRate = 16000;

            console.log(`🎤 Mic Rate: ${inputSampleRate}Hz -> Target: ${targetSampleRate}Hz`);

            processor.onaudioprocess = (e) => {
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    
                    // 3. DOWNSAMPLE LOGIC (The Fix for "Thank you")
                    // If browser sends 48k, we convert to 16k manually
                    const downsampledBuffer = downsampleBuffer(inputData, inputSampleRate, targetSampleRate);
                    
                    socketRef.current.send(downsampledBuffer);
                }
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);

        } catch (error) {
            console.error("Audio Sentinel Error:", error);
            setStatus("error");
        }
    };

    const stopStream = () => {
        if (socketRef.current) {
             socketRef.current.close();
             socketRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setStatus("disconnected");
    };

    // --- HELPER: Downsample any rate to 16000Hz ---
    const downsampleBuffer = (buffer, sampleRate, outSampleRate) => {
        if (outSampleRate === sampleRate) {
            return convertFloat32ToInt16(buffer);
        }
        if (outSampleRate > sampleRate) {
            // Error case, shouldn't happen usually
            return convertFloat32ToInt16(buffer);
        }

        const sampleRateRatio = sampleRate / outSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Int16Array(newLength);
        
        let offsetResult = 0;
        let offsetBuffer = 0;
        
        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
            
            // Simple averaging (linear interpolation)
            let accum = 0;
            let count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }
            
            // Convert to Int16 PCM
            const s = Math.max(-1, Math.min(1, accum / count));
            result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }
        
        return result.buffer;
    };

    const convertFloat32ToInt16 = (buffer) => {
        let l = buffer.length;
        const buf = new Int16Array(l);
        while (l--) {
            buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
        }
        return buf.buffer;
    };

    return { status };
};