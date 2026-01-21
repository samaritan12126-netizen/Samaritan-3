import { haptics } from './haptics';

// Synthetic Audio Engine - No Assets Required
class AudioEngine {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;

    private init() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioCtx();
        }
    }

    private async resume() {
        if (this.ctx?.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    public play(type: 'CLICK' | 'HOVER' | 'SUCCESS' | 'ERROR' | 'SCAN' | 'BOOT' | 'TYPING' | 'ALERT' | 'LOCK') {
        if (this.isMuted) return;
        
        // Trigger Haptics Sync
        this.triggerHaptic(type);

        try {
            this.init();
            if (!this.ctx) return;
            this.resume();

            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            switch (type) {
                case 'CLICK':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, t);
                    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
                    gain.gain.setValueAtTime(0.05, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
                    osc.start(t);
                    osc.stop(t + 0.05);
                    break;
                
                case 'HOVER':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(200, t);
                    gain.gain.setValueAtTime(0.01, t);
                    gain.gain.linearRampToValueAtTime(0, t + 0.02);
                    osc.start(t);
                    osc.stop(t + 0.02);
                    break;

                case 'SUCCESS':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, t);
                    osc.frequency.linearRampToValueAtTime(1200, t + 0.1);
                    gain.gain.setValueAtTime(0.05, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                    
                    // Harmony
                    const osc2 = this.ctx.createOscillator();
                    const gain2 = this.ctx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(this.ctx.destination);
                    osc2.type = 'triangle';
                    osc2.frequency.setValueAtTime(400, t);
                    osc2.frequency.linearRampToValueAtTime(600, t + 0.1);
                    gain2.gain.setValueAtTime(0.05, t);
                    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                    osc2.start(t);
                    osc2.stop(t + 0.3);

                    osc.start(t);
                    osc.stop(t + 0.3);
                    break;

                case 'ERROR':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(150, t);
                    osc.frequency.linearRampToValueAtTime(100, t + 0.2);
                    gain.gain.setValueAtTime(0.1, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                    osc.start(t);
                    osc.stop(t + 0.2);
                    break;

                case 'SCAN':
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(800, t);
                    osc.frequency.exponentialRampToValueAtTime(100, t + 0.5);
                    gain.gain.setValueAtTime(0.02, t);
                    gain.gain.linearRampToValueAtTime(0, t + 0.5);
                    osc.start(t);
                    osc.stop(t + 0.5);
                    break;

                case 'BOOT':
                    // Low Hum
                    const bass = this.ctx.createOscillator();
                    const bassGain = this.ctx.createGain();
                    bass.connect(bassGain);
                    bassGain.connect(this.ctx.destination);
                    bass.type = 'sawtooth';
                    bass.frequency.setValueAtTime(50, t);
                    bass.frequency.linearRampToValueAtTime(100, t + 2);
                    bassGain.gain.setValueAtTime(0, t);
                    bassGain.gain.linearRampToValueAtTime(0.2, t + 0.5);
                    bassGain.gain.linearRampToValueAtTime(0, t + 3);
                    bass.start(t);
                    bass.stop(t + 3);

                    // High Chirp
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(2000, t + 0.5);
                    osc.frequency.exponentialRampToValueAtTime(100, t + 1.5);
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(0.05, t + 0.5);
                    gain.gain.linearRampToValueAtTime(0, t + 1.5);
                    osc.start(t);
                    osc.stop(t + 1.5);
                    break;
                
                case 'TYPING':
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(800 + Math.random() * 200, t);
                    gain.gain.setValueAtTime(0.02, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
                    osc.start(t);
                    osc.stop(t + 0.03);
                    break;

                case 'ALERT':
                    // Siren effect
                    const siren = this.ctx.createOscillator();
                    const sirenGain = this.ctx.createGain();
                    siren.connect(sirenGain);
                    sirenGain.connect(this.ctx.destination);
                    siren.type = 'sawtooth';
                    siren.frequency.setValueAtTime(600, t);
                    siren.frequency.linearRampToValueAtTime(800, t + 0.3);
                    siren.frequency.linearRampToValueAtTime(600, t + 0.6);
                    sirenGain.gain.setValueAtTime(0.1, t);
                    sirenGain.gain.linearRampToValueAtTime(0, t + 0.6);
                    siren.start(t);
                    siren.stop(t + 0.6);
                    break;

                case 'LOCK':
                    // Metallic snap
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(220, t);
                    osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
                    gain.gain.setValueAtTime(0.03, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                    osc.start(t);
                    osc.stop(t + 0.1);
                    break;
            }
        } catch (e) {
            console.warn("Audio Error:", e);
        }
    }

    private triggerHaptic(type: string) {
        switch (type) {
            case 'CLICK': haptics.impactLight(); break;
            case 'SUCCESS': haptics.success(); break;
            case 'ERROR': haptics.error(); break;
            case 'SCAN': haptics.scan(); break;
            case 'BOOT': haptics.impactHeavy(); break;
            case 'ALERT': haptics.error(); break; // Heavy vibration for alerts
            case 'LOCK': haptics.impactMedium(); break;
            default: break;
        }
    }
}

export const audio = new AudioEngine();