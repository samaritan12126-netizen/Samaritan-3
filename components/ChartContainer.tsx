
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
    createChart, 
    ColorType, 
    IChartApi, 
    ISeriesApi, 
    MouseEventParams, 
    SeriesMarker, 
    Time, 
    IPriceLine
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

            if (line.label && x1 !== null) {
                ctx.fillStyle = color;
                ctx.font = '9px JetBrains Mono';
                ctx.fillText(line.label, x1 + 4, y1 - 4);
            }
        });
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current || !shouldRender) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2b2b2b' },
        horzLines: { color: '#2b2b2b' },
      },
      crosshair: {
        mode: 1,
        vertLine: { width: 1, color: '#758696', style: 2 },
        horzLine: { width: 1, color: '#758696', style: 2 },
      },
      rightPriceScale: {
        borderColor: '#2b2b2b',
        scaleMargins: { top: 0.3, bottom: 0.25 },
        minBarSpacing: minMove,
      },
      timeScale: {
        borderColor: '#2b2b2b',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 10,
      },
    });

    chartRef.current = chart;

    const series = type === 'CANDLE' ? chart.addCandlestickSeries({
      upColor: 'rgba(0, 255, 157, 1)',
      downColor: 'rgba(255, 30, 86, 1)',
      borderUpColor: 'rgba(0, 255, 157, 1)',
      borderDownColor: 'rgba(255, 30, 86, 1)',
      wickUpColor: 'rgba(0, 255, 157, 1)',
      wickDownColor: 'rgba(255, 30, 86, 1)',
      priceFormat: { type: 'price', precision: precision, minMove: minMove },
    }) : chart.addAreaSeries({
      topColor: 'rgba(0, 255, 157, 0.5)',
      bottomColor: 'rgba(0, 255, 157, 0.1)',
      lineColor: 'rgba(0, 255, 157, 1)',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: precision, minMove: minMove },
    });

    seriesRef.current = series;

    const killzoneSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: { top: 0.9, bottom: 0 },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    killzoneSeriesRef.current = killzoneSeries;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '1';
    chartContainerRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        const width = chartContainerRef.current.clientWidth;
        const height = chartContainerRef.current.clientHeight;
        chart.applyOptions({ width, height });
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        drawOverlays();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const crosshairMoveHandler = (param: MouseEventParams) => {
      if (!param.time || !param.point || !seriesRef.current) return;
      lastHoverTimeRef.current = param.time as number;

      const data = param.seriesData.get(seriesRef.current);
      if (data) {
        const candle = data as CandleData;
        setOhlc(candle);
      }

      if (onMarkerClick) {
        const marker = markers.find(m => m.time === param.time);
        if (marker) {
          setTooltip({
            x: param.point.x,
            y: param.point.y,
            text: marker.text,
            subtext: marker.title || ''
          });
        } else {
          setTooltip(null);
        }
      } else {
        setTooltip(null);
      }
    };

    chart.subscribeCrosshairMove(crosshairMoveHandler);
    chart.subscribeClick(crosshairMoveHandler);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      comparisonSeriesRef.current = null;
      killzoneSeriesRef.current = null;
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvasRef.current = null;
    };
  }, [shouldRender, type, precision, minMove, markers, onMarkerClick]);

  // --- DATA UPDATE EFFECT ---
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || data.length === 0) return;

    if (prevPairRef.current !== pair) {
      seriesRef.current.setData(data as CandleData[]);
      chartRef.current.timeScale().fitContent();
      prevPairRef.current = pair;
      prevDataCountRef.current = data.length;
      prevFirstCandleTimeRef.current = data[0].time as number;
      prevLastCandleTimeRef.current = data[data.length - 1].time as number;
      return;
    }

    const lastCandleTime = data[data.length - 1].time as number;
    if (lastCandleTime > prevLastCandleTimeRef.current) {
      seriesRef.current.update(data[data.length - 1] as CandleData);
      prevLastCandleTimeRef.current = lastCandleTime;
    }

    if (data.length > prevDataCountRef.current) {
      seriesRef.current.setData(data as CandleData[]);
      prevDataCountRef.current = data.length;
    }

    const firstCandleTime = data[0].time as number;
    if (firstCandleTime < prevFirstCandleTimeRef.current) {
      const newData = data.slice(0, data.length - prevDataCountRef.current);
      newData.forEach(d => seriesRef.current.update(d as CandleData));
      prevFirstCandleTimeRef.current = firstCandleTime;
      prevDataCountRef.current = data.length;
    }

    drawOverlays();
  }, [data, pair]);

  // --- COMPARISON DATA EFFECT ---
  useEffect(() => {
    if (!chartRef.current || !comparisonData) return;

    if (!comparisonSeriesRef.current) {
      const areaSeries = chartRef.current.addAreaSeries({
        topColor: 'rgba(255, 99, 71, 0.5)',
        bottomColor: 'rgba(255, 99, 71, 0.1)',
        lineColor: 'rgba(255, 99, 71, 1)',
        lineWidth: 2,
      });
      comparisonSeriesRef.current = areaSeries;
    }

    if (comparisonSeriesRef.current) {
      comparisonSeriesRef.current.setData(comparisonData);
    }
  }, [comparisonData]);

  // --- KILLZONES EFFECT ---
  useEffect(() => {
    if (!killzoneSeriesRef.current || !data.length) return;

    const histogramData = data.map((candle) => {
      const date = new Date(candle.time * 1000);
      const hour = date.getUTCHours(); // Using UTC for consistency

      let color = 'transparent';
      KILLZONES.forEach(zone => {
        if (hour >= zone.start && hour < zone.end) {
          color = zone.color;
        }
      });

      return {
        time: candle.time,
        value: 1, // Dummy value
        color
      };
    });

    killzoneSeriesRef.current.setData(histogramData);
  }, [data]);

  // --- ACTIVE TRADES EFFECT ---
  useEffect(() => {
    if (!seriesRef.current) return;

    tradeLinesRef.current.forEach((lines, id) => {
      seriesRef.current.removePriceLine(lines.entry);
      seriesRef.current.removePriceLine(lines.sl);
      seriesRef.current.removePriceLine(lines.tp);
    });
    tradeLinesRef.current.clear();

    activeTrades.forEach(trade => {
      const entryColor = trade.direction === 'buy' ? 'rgba(0, 255, 157, 0.8)' : 'rgba(255, 30, 86, 0.8)';
      const slColor = 'rgba(255, 255, 255, 0.6)';
      const tpColor = 'rgba(250, 204, 21, 0.6)';

      const entry = seriesRef.current.createPriceLine({
        price: trade.entry,
        color: entryColor,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'ENTRY',
      });

      const sl = seriesRef.current.createPriceLine({
        price: trade.sl,
        color: slColor,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SL',
      });

      const tp = seriesRef.current.createPriceLine({
        price: trade.tp,
        color: tpColor,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'TP',
      });

      tradeLinesRef.current.set(trade.id, { entry, sl, tp });
    });
  }, [activeTrades]);

  // --- FORCE SCROLL EFFECT ---
  useEffect(() => {
    if (forceScrollTrigger > 0 && chartRef.current) {
      chartRef.current.timeScale().scrollToRealTime();
    }
  }, [forceScrollTrigger]);

  // --- LOAD MORE HANDLER ---
  const handleLoadMore = async () => {
    if (!onLoadMore || isFetchingRef.current || data.length === 0) return;
    isFetchingRef.current = true;
    try {
      await onLoadMore(data[0].time as number);
    } finally {
      isFetchingRef.current = false;
    }
  };

  // --- SCROLL HANDLER FOR LOAD MORE ---
  useEffect(() => {
    if (!chartRef.current || !onLoadMore) return;

    const timeScale = chartRef.current.timeScale();
    const handler = () => {
      const range = timeScale.getVisibleLogicalRange();
      if (range && range.from < 10) {
        handleLoadMore();
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(handler);
    return () => timeScale.unsubscribeVisibleLogicalRangeChange(handler);
  }, [data, onLoadMore]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <div 
        ref={chartContainerRef} 
        className={`w-full h-full ${isFlashing ? 'animate-flash' : ''}`} 
      />

      {isSimulation && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-zinc-500/50 text-4xl font-bold select-none pointer-events-none rotate-[-30deg]">
          {watermarkText}
        </div>
      )}

      {showDateModal && onDateJump && (
        <DateTimePickerModal
          isOpen={showDateModal}
          onClose={() => setShowDateModal(false)}
          onSelect={handleDateConfirm}
          initialTime={data.length > 0 ? data[data.length - 1].time : Date.now() / 1000}
        />
      )}

      {type === 'CANDLE' && (
        <>
          {/* OHL C PANEL */}
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1 text-xs text-white border border-white/10">
            <div>{pair} {timeframe}</div>
            {ohlc && (
              <>
                <div>O: {ohlc.open.toFixed(precision)}</div>
                <div>H: {ohlc.high.toFixed(precision)}</div>
                <div>L: {ohlc.low.toFixed(precision)}</div>
                <div>C: {ohlc.close.toFixed(precision)}</div>
              </>
            )}
          </div>

          {/* DATE PICKER BUTTON */}
          {onDateJump && datePickerPosition === 'bottom-left' && (
            <button
              onClick={() => setShowDateModal(true)}
              className="absolute bottom-2 left-2 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm hover:bg-white/10 text-zinc-400 hover:text-white rounded-sm border border-white/5 shadow-lg transition-all text-[9px] font-bold uppercase tracking-wider"
              title="Temporal Jump"
            >
              <Calendar size={12} />
              Jump to Date
            </button>
          )}

          {/* LOADING INDICATOR */}
          {isLoadingHistory && (
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1 text-xs text-white border border-white/10 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              FETCHING HISTORY
            </div>
          )}

          {/* HUD CONTROLS */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {onDateJump && datePickerPosition === 'top-right' && (
              <button
                onClick={() => setShowDateModal(true)}
                className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white rounded-sm transition-all"
                title="Temporal Jump"
              >
                <Calendar size={14} />
              </button>
            )}

            <button
              onClick={() => handleTakeSnapshot()}
              className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white rounded-sm transition-all"
              title="Vision Snapshot"
            >
              <Camera size={14} />
            </button>

            <button
              onClick={() => chartRef.current?.timeScale().fitContent()}
              className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white rounded-sm transition-all"
              title="Fit Content"
            >
              <Maximize size={14} />
            </button>

            {onLiveReset && (
              <button
                onClick={onLiveReset}
                className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white rounded-sm transition-all"
                title="Back to Live"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          {/* KILLZONE LEGEND */}
          <div className="absolute bottom-2 right-2 flex gap-2">
            {KILLZONES.map(zone => (
              <div key={zone.name} className="flex items-center gap-1 text-xs text-zinc-400">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.legendColor }} />
                {zone.label}
              </div>
            ))}
          </div>

          {/* TOOLTIP */}
          {tooltip && (
            <div 
              className="absolute bg-black/80 text-white text-xs rounded px-2 py-1 pointer-events-none z-50"
              style={{ left: tooltip.x + 10, top: tooltip.y - 20 }}
            >
              {tooltip.text}
              <div className="text-zinc-400">{tooltip.subtext}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
