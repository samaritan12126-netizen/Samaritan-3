
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
    createChart, 
    ColorType, 
    IChartApi, 
    ISeriesApi, 
    MouseEventParams, 
    SeriesMarker, 
    Time, 
    IPriceLine,
} from 'lightweight-charts';
import { CandleData, Timeframe, CurrencyPair, ScanResult, ChartZone, ChartLine, Trade } from '../types';
import { Calendar, Maximize, Loader2, Camera, RotateCcw } from 'lucide-react';
import { DateTimePickerModal } from './CustomUI'; 

interface ChartContainerProps {
  pair: CurrencyPair | string; 
  timeframe: Timeframe;
  data: CandleData[] | { time: number, value: number }[]; 
  comparisonData?: { time: number, value: number }[]; 
  type?: 'CANDLE' | 'AREA'; 
  scanResult?: ScanResult | null; 
  activeTrades?: Trade[]; 
  onDateJump?: (timestamp: number) => void;
  datePickerPosition?: 'top-right' | 'bottom-left';
  onLiveReset?: () => void;
  onLoadMore?: (oldestTime: number) => Promise<void>; 
  onSnapshot?: (image: string, isAuto: boolean) => void; 
  isLoadingHistory?: boolean; 
  forceScrollTrigger?: number; 
  snapshotTrigger?: number; 
  isSimulation?: boolean; 
  watermarkText?: string; 
  isDormant?: boolean; 
  markers?: SeriesMarker<Time>[]; 
  onMarkerClick?: (marker: SeriesMarker<Time>) => void; 
}

const KILLZONES = [
  { name: 'Asian', start: 18, end: 21, color: 'rgba(59, 130, 246, 0.1)', legendColor: '#3b82f6', label: '18:00 - 21:00' }, 
  { name: 'London', start: 2, end: 5, color: 'rgba(239, 68, 68, 0.1)', legendColor: '#ef4444', label: '02:00 - 05:00' },   
  { name: 'NY AM', start: 7, end: 10, color: 'rgba(16, 185, 129, 0.1)', legendColor: '#10b981', label: '07:00 - 10:00' },   
  { name: 'NY PM', start: 12, end: 16, color: 'rgba(245, 158, 11, 0.1)', legendColor: '#f59e0b', label: '12:00 - 16:00' },  
];

export const ChartContainer: React.FC<ChartContainerProps> = ({ 
  pair, 
  timeframe, 
  data, 
  comparisonData,
  type = 'CANDLE',
  scanResult,
  activeTrades = [],
  onDateJump,
  datePickerPosition = 'top-right',
  onLiveReset,
  onLoadMore,
  onSnapshot,
  isLoadingHistory = false,
  forceScrollTrigger = 0,
  snapshotTrigger = 0,
  isSimulation = false,
  watermarkText = "SIMULATION FEED",
  isDormant = false,
  markers = [],
  onMarkerClick
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); 
  
  const chartRef = useRef<IChartApi | null>(null);
  // Using any to accommodate the generic return types of v5 addSeries
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const comparisonSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const killzoneSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  
  const tradeLinesRef = useRef<Map<string, { entry: IPriceLine, sl: IPriceLine, tp: IPriceLine }>>(new Map());
  const scanResultRef = useRef(scanResult);

  const [ohlc, setOhlc] = useState<any | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number, y: number, text: string, subtext: string } | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false); 
  const [isVisible, setIsVisible] = useState(true); 
  
  const prevPairRef = useRef<string>(pair);
  const lastHoverTimeRef = useRef<number | null>(null);
  const prevDataCountRef = useRef<number>(0);
  const prevFirstCandleTimeRef = useRef<number>(0);
  const prevLastCandleTimeRef = useRef<number>(0); 
  const isFetchingRef = useRef(false);

  // --- DORMANT MODE OBSERVER ---
  useEffect(() => {
      if (!containerRef.current) return;
      
      const observer = new IntersectionObserver(([entry]) => {
          setIsVisible(entry.isIntersecting);
      }, { threshold: 0.1 }); 

      observer.observe(containerRef.current);
      return () => observer.disconnect();
  }, []);

  const shouldRender = isVisible && !isDormant;

  useEffect(() => {
    scanResultRef.current = scanResult;
  }, [scanResult]);

  let precision = 5;
  let minMove = 0.00001;
  if (pair.includes('JPY')) { precision = 2; minMove = 0.01; } 
  else if (['BTCUSD', 'ETHUSD', 'SOLUSD'].includes(pair)) { precision = 2; minMove = 0.01; }

  // --- TIME FORMATTERS (STRICTLY NEW YORK) ---
  const timeOptions: Intl.DateTimeFormatOptions = { timeZone: 'America/New_York', hour12: false };
  const nyTimeFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', { ...timeOptions, hour: '2-digit', minute: '2-digit' }), []);
  const nyDateFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', { ...timeOptions, month: 'short', day: 'numeric' }), []);
  const nyYearFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', { ...timeOptions, year: 'numeric' }), []);
  const fullDateFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', { ...timeOptions, weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), []);
  const nyHourFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', { ...timeOptions, hour: 'numeric' }), []);

  const handleDateConfirm = (timestamp: number) => {
      if (onDateJump) onDateJump(timestamp);
  };

  const handleTakeSnapshot = (isAuto: boolean = false) => {
    if (!chartRef.current || !canvasRef.current || !onSnapshot) return;
    try {
        if (!isAuto) {
            setIsFlashing(true);
            setTimeout(() => setIsFlashing(false), 300);
        }
        
        requestAnimationFrame(() => {
            if(!chartRef.current) return;
            const chartCanvas = chartRef.current.takeScreenshot();
            const overlayCanvas = canvasRef.current;
            
            if (!chartCanvas.width || !chartCanvas.height) return;

            const composite = document.createElement('canvas');
            composite.width = chartCanvas.width;
            composite.height = chartCanvas.height;
            const ctx = composite.getContext('2d');
            if (ctx) {
                ctx.drawImage(chartCanvas, 0, 0);
                if (overlayCanvas) ctx.drawImage(overlayCanvas, 0, 0);
                const dataUrl = composite.toDataURL('image/png');
                onSnapshot(dataUrl, isAuto);
            }
        });
    } catch (e) {
        console.error("Snapshot failed", e);
    }
  };

  useEffect(() => {
    if (snapshotTrigger > 0) {
        const t = setTimeout(() => handleTakeSnapshot(true), 200);
        return () => clearTimeout(t);
    }
  }, [snapshotTrigger]);

  // --- MARKERS UPDATE EFFECT ---
  useEffect(() => {
      // Guard clause: Ensure series and setMarkers method exist before calling
      if (seriesRef.current && typeof seriesRef.current.setMarkers === 'function') {
          try {
              seriesRef.current.setMarkers(markers);
          } catch(e) {
              // Silently catch errors if markers are invalid or chart is in a transition state
              console.warn("Marker update failed", e);
          }
      }
  }, [markers]);

  useEffect(() => {
      if (!chartRef.current || !onMarkerClick) return;
      
      const clickHandler = (param: MouseEventParams) => {
          if (!param.time || !param.seriesData || !seriesRef.current) return;
          const marker = markers.find(m => m.time === param.time);
          if (marker) {
              onMarkerClick(marker);
          }
      };
      
      chartRef.current.subscribeClick(clickHandler);
      return () => {
          if (chartRef.current) {
              try { chartRef.current.unsubscribeClick(clickHandler); } catch(e) {}
          }
      };
  }, [markers, onMarkerClick]);


  const drawOverlays = () => {
    if (type !== 'CANDLE' || !chartRef.current || !seriesRef.current || !canvasRef.current) return;
    if (!shouldRender) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const zones = scanResultRef.current?.zones;
    const lines = scanResultRef.current?.lines;
    
    const timeScale = chartRef.current.timeScale();
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (!visibleRange) return;

    if (zones) {
        zones.forEach((zone: ChartZone) => {
            const timeX1 = timeScale.timeToCoordinate(zone.timeStart as Time);
            let timeX2 = zone.timeEnd ? timeScale.timeToCoordinate(zone.timeEnd as Time) : canvas.width;
            if (timeX2 === null) timeX2 = canvas.width;
            
            const x1 = timeX1 ?? -100; 
            const x2 = timeX2;
            
            const priceY1 = seriesRef.current!.priceToCoordinate(zone.priceStart);
            const priceY2 = seriesRef.current!.priceToCoordinate(zone.priceEnd);
            
            if (priceY1 === null || priceY2 === null) return;

            let fillColor = 'rgba(100, 100, 100, 0.2)';
            let strokeColor = 'rgba(150, 150, 150, 0.5)';
            if (zone.type === 'supply') { fillColor = 'rgba(255, 30, 86, 0.15)'; strokeColor = 'rgba(255, 30, 86, 0.4)'; }
            if (zone.type === 'demand') { fillColor = 'rgba(0, 255, 157, 0.15)'; strokeColor = 'rgba(0, 255, 157, 0.4)'; }
            if (zone.type === 'gap') { fillColor = 'rgba(250, 204, 21, 0.1)'; strokeColor = 'rgba(250, 204, 21, 0.3)'; }

            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(x1, priceY1, x2 - x1, priceY2 - priceY1);
            ctx.fill();
            ctx.stroke();
            
            if (x1 > -50 && x1 < canvas.width) {
                ctx.fillStyle = strokeColor;
                ctx.font = '9px JetBrains Mono';
                ctx.fillText(zone.label, x1 + 4, priceY1 - 4);
            }
        });
    }

    if (lines) {
        lines.forEach((line: ChartLine) => {
            const x1 = timeScale.timeToCoordinate(line.x1 as Time);
            const x2 = timeScale.timeToCoordinate(line.x2 as Time);
            const y1 = seriesRef.current!.priceToCoordinate(line.y1);
            const y2 = seriesRef.current!.priceToCoordinate(line.y2);

            if ((x1 === null && x2 === null) || y1 === null || y2 === null) return;

            const drawX1 = x1 ?? (line.x1 < visibleRange.from ? -1000 : canvas.width + 1000); 
            const drawX2 = x2 ?? (line.x2 < visibleRange.from ? -1000 : canvas.width + 1000);

            ctx.beginPath();
            ctx.moveTo(drawX1, y1);
            ctx.lineTo(drawX2, y2);
            
            let color = 'rgba(6, 182, 212, 0.8)'; 
            if (line.type === 'support') color = 'rgba(0, 255, 157, 0.8)';
            if (line.type === 'resistance') color = 'rgba(255, 30, 86, 0.8)';
            if (line.color) color = line.color;

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash(line.type === 'trend' ? [5, 5] : []); 
            ctx.stroke();
            ctx.setLineDash([]); 

            if (drawX1 > 0 && drawX1 < canvas.width) {
               ctx.fillStyle = color;
               ctx.font = '10px JetBrains Mono';
               ctx.fillText(line.type.toUpperCase(), drawX1, y1 - 5);
            }
        });
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isEquity = type === 'AREA';

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: isEquity ? '#52525b' : '#71717a', fontFamily: "JetBrains Mono, monospace" },
      grid: { 
         vertLines: { color: 'rgba(255, 255, 255, 0.03)', style: 1, visible: !isEquity }, 
         horzLines: { color: 'rgba(255, 255, 255, 0.03)', style: 1, visible: !isEquity } 
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      localization: { 
          timeFormatter: (time: number) => {
              try {
                  return nyTimeFormatter.format(new Date(time * 1000));
              } catch(e) { return ""; }
          },
          priceFormatter: (price: number) => price.toFixed(isEquity ? 2 : precision) 
      },
      timeScale: { 
         timeVisible: true, secondsVisible: false, borderColor: '#27272a', rightOffset: isEquity ? 0 : 12, barSpacing: isEquity ? 2 : 6,
         visible: !isEquity,
         tickMarkFormatter: (time: number | any, tickMarkType: number) => {
             let timestamp: number | undefined;
             
             if (typeof time === 'number') {
                 timestamp = time;
             } else if (time && typeof time === 'object') {
                 const t = time as any;
                 if (t?.year !== undefined && t?.month !== undefined && t?.day !== undefined) {
                     timestamp = new Date(Date.UTC(t.year, t.month - 1, t.day)).getTime() / 1000;
                 }
             }

             if (timestamp === undefined || !Number.isFinite(timestamp)) return "";
             
             const date = new Date(timestamp * 1000);
             if (isNaN(date.getTime())) return "";
             try {
                 switch (tickMarkType) {
                     case 0: return nyYearFormatter.format(date);
                     case 1: return nyDateFormatter.format(date);
                     case 2: return nyDateFormatter.format(date);
                     case 3: return nyTimeFormatter.format(date);
                     default: return nyTimeFormatter.format(date);
                 }
             } catch(e) { return ""; }
         }
      },
      rightPriceScale: { borderColor: '#27272a', visible: true, autoScale: true, scaleMargins: { top: 0.2, bottom: 0.2 } },
      crosshair: { 
         mode: 0, 
         vertLine: { color: '#06b6d4', width: 1, style: 2, labelBackgroundColor: '#06b6d4', visible: !isEquity }, 
         horzLine: { color: '#06b6d4', width: 1, style: 2, labelBackgroundColor: '#06b6d4', visible: !isEquity } 
      },
      handleScroll: !isEquity,
      handleScale: !isEquity,
      watermark: {
          visible: isSimulation,
          fontSize: 64,
          horzAlign: 'center',
          vertAlign: 'center',
          color: 'rgba(255, 255, 255, 0.05)',
          text: watermarkText,
      },
    });

    let series: any;
    
    // v5 COMPATIBILITY: Use addSeries(Type, options) instead of addTypeSeries()
    if (type === 'AREA') {
        const comparisonSeries = chart.addAreaSeries ({ 
            lineColor: '#8b5cf6', 
            topColor: 'rgba(139, 92, 246, 0.2)', 
            bottomColor: 'rgba(139, 92, 246, 0.0)',
            lineWidth: 2,
            crosshairMarkerVisible: true
        });
        comparisonSeriesRef.current = comparisonSeries;

        series = chart.addAreaSeries, ({ 
            lineColor: '#06b6d4', 
            topColor: 'rgba(6, 182, 212, 0.5)', 
            bottomColor: 'rgba(6, 182, 212, 0.0)',
            lineWidth: 2,
            crosshairMarkerVisible: true
        });
    } else {
        const killzoneSeries = chart.addHistogramSeries ({ priceScaleId: 'killzone', priceFormat: { type: 'volume' } });
        chart.priceScale('killzone').applyOptions({ scaleMargins: { top: 0, bottom: 0 }, visible: false });
        killzoneSeriesRef.current = killzoneSeries;
        
        series = chart.addCandlestickSeries ({ upColor: '#00ff9d', downColor: '#ff1e56', borderVisible: false, wickUpColor: '#00ff9d', wickDownColor: '#ff1e56', priceFormat: { type: 'price', precision: precision, minMove: minMove } });
    }

    chartRef.current = chart;
    seriesRef.current = series;

    // Apply markers immediately if they exist to prevent sync issues on initial render
    if (markers.length > 0 && series.setMarkers) {
        try {
            series.setMarkers(markers);
        } catch(e) {
            console.warn("Initial markers set failed", e);
        }
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
       if (!range || !onLoadMore) return;
       if (range.from < 50 && !isFetchingRef.current) {
           isFetchingRef.current = true;
           if (data && data.length > 0) onLoadMore(data[0].time);
       }
    });

    chart.subscribeCrosshairMove((param: MouseEventParams) => {
        if (!shouldRender) return; 
        if (param.time === lastHoverTimeRef.current && param.time !== undefined) return;
        lastHoverTimeRef.current = param.time as number | null;
        if (!param.time || param.point === undefined || !seriesRef.current) {
            setTooltip(null);
            if (data && data.length > 0) setOhlc(data[data.length - 1]);
            return;
        }
        
        const pointData = param.seriesData.get(seriesRef.current) as any;
        if (pointData) setOhlc(pointData);

        let timestamp: number | undefined;
        
        if (typeof param.time === 'number') {
            timestamp = param.time;
        } else if (param.time && typeof param.time === 'object') {
             const t = param.time as any;
             if (t?.year !== undefined && t?.month !== undefined && t?.day !== undefined) {
                 timestamp = new Date(Date.UTC(t.year, t.month - 1, t.day)).getTime() / 1000;
             }
        }

        if (timestamp === undefined) return;

        const date = new Date(timestamp * 1000);
        const dateStr = fullDateFormatter.format(date);
        
        if (type === 'CANDLE') {
            const parts = nyHourFormatter.formatToParts(date);
            const hourPart = parts.find(p => p.type === 'hour');
            const nyHour = hourPart ? parseInt(hourPart.value, 10) : 0;
            let foundZone = null;
            for (const zone of KILLZONES) {
                if (zone.start < zone.end) { if (nyHour >= zone.start && nyHour < zone.end) foundZone = zone; } 
                else { if (nyHour >= zone.start || nyHour < zone.end) foundZone = zone; }
            }
            if (foundZone) setTooltip({ x: param.point.x, y: 60, text: foundZone.name, subtext: dateStr });
            else setTooltip({ x: param.point.x, y: 60, text: "Date/Time", subtext: dateStr });
        }
    });

    const resizeObserver = new ResizeObserver((entries) => {
        if (!shouldRender) return;
        window.requestAnimationFrame(() => {
            if (!entries || entries.length === 0 || !chartContainerRef.current) return;
            const { width, height } = entries[0].contentRect;
            if (width && height) {
                chart.applyOptions({ width, height });
                if (canvasRef.current) {
                   canvasRef.current.width = width;
                   canvasRef.current.height = height;
                }
            }
        });
    });

    if (chartContainerRef.current) resizeObserver.observe(chartContainerRef.current);
    
    // Cleanup function
    return () => { 
        resizeObserver.disconnect(); 
        chart.remove(); 
        // Nullify refs to prevent accessing dead objects
        chartRef.current = null;
        seriesRef.current = null;
        comparisonSeriesRef.current = null;
        killzoneSeriesRef.current = null;
    };
  }, [pair, type, isSimulation, watermarkText]);

  useEffect(() => {
    if (type !== 'CANDLE' || !chartRef.current || !seriesRef.current || !canvasRef.current) return;

    let animationFrameId: number;

    const renderLoop = () => {
      if (shouldRender) {
          drawOverlays();
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [type, shouldRender]);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    if (!shouldRender && type === 'CANDLE') return;

    if (prevPairRef.current !== pair) {
       prevPairRef.current = pair;
       prevDataCountRef.current = 0;
       prevFirstCandleTimeRef.current = 0;
       prevLastCandleTimeRef.current = 0;
       isFetchingRef.current = false;
       if (tradeLinesRef.current.size > 0) {
           tradeLinesRef.current.clear(); 
       }
    }

    if (!Array.isArray(data) || data.length === 0) {
       seriesRef.current.setData([]);
       if (killzoneSeriesRef.current) killzoneSeriesRef.current.setData([]);
       prevDataCountRef.current = 0;
    } else {
        const uniqueData = new Map();
        data.forEach(item => {
            if (item.time !== undefined && item.time !== null) {
                uniqueData.set(item.time, item);
            }
        });
        const sortedData = Array.from(uniqueData.values()).sort((a, b) => a.time - b.time);
        
        const formattedData = (type === 'CANDLE' 
           ? sortedData.map(d => ({ ...d, time: d.time as any }))
           : sortedData.map(d => ({ time: d.time as any, value: (d as any).value })));
        
        const isPrepend = prevDataCountRef.current > 0 && sortedData.length > prevDataCountRef.current && sortedData[0].time < prevFirstCandleTimeRef.current;
        const isFreshLoad = prevDataCountRef.current === 0;
        const newLastTime = sortedData.length > 0 ? sortedData[sortedData.length - 1].time : 0;
        const isTimeJump = prevLastCandleTimeRef.current > 0 && Math.abs(newLastTime - prevLastCandleTimeRef.current) > 3600; 

        let rangeBefore: any = null;
        if (isPrepend) rangeBefore = chartRef.current.timeScale().getVisibleLogicalRange();

        seriesRef.current.setData(formattedData);
        
        if (isPrepend && rangeBefore) {
            const addedCount = sortedData.length - prevDataCountRef.current;
            chartRef.current.timeScale().setVisibleLogicalRange({ from: rangeBefore.from + addedCount, to: rangeBefore.to + addedCount });
            isFetchingRef.current = false;
        }

        prevDataCountRef.current = sortedData.length;
        prevFirstCandleTimeRef.current = sortedData.length > 0 ? sortedData[0].time : 0;
        prevLastCandleTimeRef.current = newLastTime;

        if (!lastHoverTimeRef.current && sortedData.length > 0) setOhlc(type === 'CANDLE' ? sortedData[sortedData.length - 1] : formattedData[formattedData.length - 1]);

        if (!isPrepend && sortedData.length > 0) {
           if (type === 'AREA') {
              chartRef.current.timeScale().fitContent();
           } else {
              chartRef.current.priceScale('right').applyOptions({ autoScale: true });
              if (isFreshLoad || isTimeJump) {
                 chartRef.current.timeScale().scrollToRealTime();
              }
           }
        }

        if (type === 'CANDLE' && killzoneSeriesRef.current) {
            const kzData = [];
            for (let i = 0; i < sortedData.length; i++) {
              const d = sortedData[i] as CandleData;
              if (typeof d.time !== 'number') continue;
              
              const date = new Date(d.time * 1000);
              if (isNaN(date.getTime())) continue;

              const parts = nyHourFormatter.formatToParts(date);
              const hourPart = parts.find(p => p.type === 'hour');
              const nyHour = hourPart ? parseInt(hourPart.value, 10) : 0;
              let color = 'transparent'; let value = 0;
              for (const zone of KILLZONES) {
                 if (zone.start < zone.end) { if (nyHour >= zone.start && nyHour < zone.end) { color = zone.color; value = 1; break; } } 
                 else { if (nyHour >= zone.start || nyHour < zone.end) { color = zone.color; value = 1; break; } }
              }
              kzData.push({ time: d.time as any, value, color });
            }
            killzoneSeriesRef.current.setData(kzData);
        }
    }

    if (type === 'AREA' && comparisonSeriesRef.current) {
        if (Array.isArray(comparisonData) && comparisonData.length > 0) {
             const uniqueComp = new Map();
             comparisonData.forEach(item => {
                 if(item.time !== undefined) uniqueComp.set(item.time, item);
             });
             const sortedComp = Array.from(uniqueComp.values()).sort((a, b) => a.time - b.time);
             const formattedComp = sortedComp.map(d => ({ time: d.time as any, value: d.value }));
             comparisonSeriesRef.current.setData(formattedComp);
        } else {
             comparisonSeriesRef.current.setData([]);
        }
    }

  }, [data, comparisonData, pair, scanResult, type, shouldRender]); 

  useEffect(() => {
     if (isLoadingHistory === false) {
        const timeout = setTimeout(() => { isFetchingRef.current = false; }, 500);
        return () => clearTimeout(timeout);
     }
  }, [isLoadingHistory]);

  return (
    <div ref={containerRef} className={`flex flex-col w-full h-full relative group ${type === 'AREA' ? '' : 'bg-black'}`}>
        
        <div className={`absolute inset-0 z-50 bg-white pointer-events-none transition-opacity duration-300 ${isFlashing ? 'opacity-30' : 'opacity-0'}`}></div>

        {showDateModal && (
            <DateTimePickerModal 
                onClose={() => setShowDateModal(false)}
                onSelect={handleDateConfirm}
                initialTime={data && data.length > 0 ? data[data.length - 1].time : undefined}
            />
        )}

        {type === 'CANDLE' && (
            <>
                {/* INFO PANEL */}
                <div className="absolute top-3 left-4 z-30 pointer-events-none flex flex-col gap-1 items-start">
                    <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-sm border border-white/5 shadow-lg">
                        <span className="text-sm font-bold text-white tracking-widest font-mono">{pair}</span>
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm border border-primary/20">{timeframe}</span>
                    </div>
                    {ohlc && (
                        <div className="flex items-center gap-3 text-[10px] font-mono tracking-tight text-zinc-400 bg-black/50 backdrop-blur-sm p-1.5 rounded-sm border border-white/5 shadow-lg mt-1">
                            <div className="flex gap-1"><span className="text-zinc-600">O</span><span className={ohlc.close >= ohlc.open ? 'text-bullish' : 'text-bearish'}>{ohlc.open.toFixed(precision)}</span></div>
                            <div className="flex gap-1"><span className="text-zinc-600">H</span><span className={ohlc.close >= ohlc.open ? 'text-bullish' : 'text-bearish'}>{ohlc.high.toFixed(precision)}</span></div>
                            <div className="flex gap-1"><span className="text-zinc-600">L</span><span className={ohlc.close >= ohlc.open ? 'text-bullish' : 'text-bearish'}>{ohlc.low.toFixed(precision)}</span></div>
                            <div className="flex gap-1"><span className="text-zinc-600">C</span><span className={ohlc.close >= ohlc.open ? 'text-bullish' : 'text-bearish'}>{ohlc.close.toFixed(precision)}</span></div>
                        </div>
                    )}
                </div>
                
                {/* CUSTOM DATE PICKER POSITION: BOTTOM-LEFT (Below OHLC legend) */}
                {onDateJump && datePickerPosition === 'bottom-left' && (
                    <div className="absolute top-24 left-4 z-40 flex items-center gap-2"> {/* Increased Z-Index */}
                        <button 
                           onClick={() => setShowDateModal(true)}
                           className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm hover:bg-white/10 text-zinc-400 hover:text-white rounded-sm border border-white/5 shadow-lg transition-all text-[9px] font-bold uppercase tracking-wider cursor-pointer pointer-events-auto"
                           title="Temporal Jump"
                        >
                             <Calendar size={12} /> Jump to Date
                        </button>
                    </div>
                )}
                
                {isLoadingHistory && (
                <div className="absolute top-1/2 left-4 z-30 flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-sm border border-primary/20 animate-in fade-in slide-in-from-left-2">
                    <Loader2 size={12} className="text-primary animate-spin" />
                    <span className="text-[9px] font-mono text-primary">FETCHING_HISTORY</span>
                </div>
                )}

                {/* HUD CONTROLS (TOP RIGHT) */}
                <div className="absolute top-3 right-4 flex items-center gap-2 z-30 bg-black/40 backdrop-blur-sm p-1 rounded-sm border border-white/5 shadow-lg">
                    {onDateJump && datePickerPosition === 'top-right' && (
                        <button 
                           onClick={() => setShowDateModal(true)}
                           className="relative w-7 h-7 flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white rounded-sm transition-all"
                           title="Temporal Jump"
                        >
                             <Calendar size={14} />
                        </button>
                    )}
                    
                    {onSnapshot && (
                        <button 
                           onClick={() => handleTakeSnapshot(false)}
                           title="Vision Snapshot"
                           className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white rounded-sm transition-all active:text-primary active:scale-95"
                        >
                           <Camera size={14} />
                        </button>
                    )}

                    <button 
                        onClick={() => { if(chartRef.current) chartRef.current.timeScale().fitContent(); }} 
                        className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white rounded-sm transition-all"
                        title="Fit Content"
                    >
                        <Maximize size={14} />
                    </button>
                    
                    {onLiveReset && (
                        <button 
                            onClick={() => { 
                                if(onLiveReset) onLiveReset(); 
                                if(chartRef.current) chartRef.current.timeScale().scrollToRealTime(); 
                            }} 
                            className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white rounded-sm transition-all"
                            title="Back to Live"
                        >
                            <RotateCcw size={14} />
                        </button>
                    )}
                </div>

                <div className="absolute bottom-4 left-4 z-20 pointer-events-none hidden md:block">
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 py-1 px-3 rounded-sm shadow-glow-sm flex items-center gap-3">
                        {KILLZONES.map((zone) => (
                            <div key={zone.name} className="flex items-center gap-1.5 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: zone.legendColor }}></div>
                                <span className="text-[8px] font-mono text-zinc-300">{zone.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        )}

        {tooltip && type === 'CANDLE' && (
            <div className="absolute z-30 pointer-events-none transform -translate-x-1/2 flex flex-col items-center transition-all duration-75" style={{ left: tooltip.x, top: tooltip.y }}>
                <div className="bg-[#050505]/95 backdrop-blur-xl border border-primary/30 text-zinc-200 px-3 py-1.5 rounded-sm shadow-glow flex flex-col items-center ring-1 ring-black">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-primary mb-0.5">{tooltip.text}</span>
                    <span className="text-[9px] font-mono text-zinc-400 whitespace-nowrap">{tooltip.subtext}</span>
                </div>
                <div className="w-[1px] h-4 bg-gradient-to-b from-primary/50 to-transparent"></div>
            </div>
        )}
        
        <div className="flex-1 w-full relative">
           <div ref={chartContainerRef} className="w-full h-full relative z-10" />
           <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
        </div>
    </div>
  );
};
