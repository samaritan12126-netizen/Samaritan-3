import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Audio Helpers
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
}

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function createBlob(data: Float32Array): any {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
}

export const useLiveSession = (apiKey: string, onTranscript?: (text: string, role: 'user' | 'model') => void) => {
    const [isActive, setIsActive] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionRef = useRef<Promise<any> | null>(null); 
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    // Transcription Buffers
    const currentInputRef = useRef('');
    const currentOutputRef = useRef('');

    useEffect(() => {
        if (apiKey) {
            aiRef.current = new GoogleGenAI({ apiKey });
        }
    }, [apiKey]);

    const disconnect = useCallback(async () => {
        if (sessionRef.current) {
            try {
                const session = await sessionRef.current;
                await session.close();
            } catch (e) {
                console.warn("Error closing session:", e);
            }
            sessionRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }

        if (inputAudioContextRef.current) {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }

        sourcesRef.current.forEach(s => s.stop());
        sourcesRef.current.clear();
        
        setIsActive(false);
        setIsSpeaking(false);
    }, []);

    const connect = useCallback(async () => {
        if (!aiRef.current) {
            alert("Voice Protocol Failed: Neural Link (API Key) Missing.");
            return;
        }
        
        try {
            if (isActive) await disconnect();

            // Resume Audio Context (Browser Policy Requirement)
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            inputAudioContextRef.current = inputCtx;
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            const sessionPromise = aiRef.current.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                    systemInstruction: "You are The Samaritan, an elite algorithmic trading intelligence. Keep responses short, professional, and dense with financial insight. OPERATIONAL TIMEZONE: New York (America/New_York).",
                    inputAudioTranscription: {}, 
                    outputAudioTranscription: {} 
                },
                callbacks: {
                    onopen: () => {
                        console.log("Samaritan Voice: Connected");
                        setIsActive(true); 
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            setIsSpeaking(true);
                            const binaryString = atob(base64Audio);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
                            const audioBuffer = await decodeAudioData(bytes, audioContext, 24000, 1);
                            const source = audioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(audioContext.destination);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                                if (sourcesRef.current.size === 0) setIsSpeaking(false);
                            });
                            const now = audioContext.currentTime;
                            const startTime = Math.max(nextStartTimeRef.current, now);
                            source.start(startTime);
                            nextStartTimeRef.current = startTime + audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        if (message.serverContent?.inputTranscription) {
                            currentInputRef.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputRef.current += message.serverContent.outputTranscription.text;
                        }

                        if (message.serverContent?.turnComplete) {
                            if (currentInputRef.current.trim() && onTranscript) {
                                onTranscript(currentInputRef.current, 'user');
                                currentInputRef.current = '';
                            }
                            if (currentOutputRef.current.trim() && onTranscript) {
                                onTranscript(currentOutputRef.current, 'model');
                                currentOutputRef.current = '';
                            }
                        }

                        if (message.serverContent?.interrupted) {
                            sourcesRef.current.forEach(s => s.stop());
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                            setIsSpeaking(false);
                            currentInputRef.current = '';
                            currentOutputRef.current = '';
                        }
                    },
                    onclose: () => {
                        console.log("Samaritan Voice: Closed");
                        setIsActive(false); 
                    },
                    onerror: (e) => {
                        console.error("Samaritan Voice Error", e);
                        disconnect();
                        // Only alert if it's a real error, not a normal close
                        if (!(e instanceof CloseEvent)) {
                             alert(`Voice Protocol Severed: Connection Lost or API Error.`);
                        }
                    }
                }
            });
            
            sessionRef.current = sessionPromise;

            scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            nextStartTimeRef.current = 0;

        } catch (err: any) {
            console.error("Voice Connection Failed:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert("Microphone Permission Denied. Check system settings.");
            } else {
                alert(`Voice Init Failed: ${err.message}`);
            }
            disconnect();
        }

    }, [apiKey, disconnect, onTranscript, isActive]);

    return { isActive, isSpeaking, connect, disconnect };
};