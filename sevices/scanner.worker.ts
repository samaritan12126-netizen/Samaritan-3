
/* 
 * SENTINEL WORKER
 * Offloads heavy image processing and string manipulation for the scanner.
 * Note: Actual network calls to Gemini stay on the main thread for simpler Auth/Client management,
 * but this worker prepares payloads and handles data crunching.
 */

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'PREPARE_IMAGE') {
        // Example: If we were doing heavy image compression here
        // For now, it's a pass-through placeholder for future OpenCV logic
        self.postMessage({ type: 'IMAGE_READY', payload: payload });
    }
    
    if (type === 'PARSE_SCAN_RESULT') {
        const { text } = payload;
        try {
            let jsonText = text || "{}";
            if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7).replace(/```$/, '');
            else if (jsonText.startsWith('```')) jsonText = jsonText.slice(3).replace(/```$/, '');
            
            const result = JSON.parse(jsonText);
            
            // Post-processing logic (e.g., calculating extra confidence metrics locally)
            const enhancedResult = {
                ...result,
                processedTimestamp: Date.now()
            };
            
            self.postMessage({ type: 'SCAN_COMPLETE', payload: enhancedResult });
        } catch (err: any) {
            self.postMessage({ type: 'ERROR', payload: err.message });
        }
    }
};
