
import React, { useRef, useEffect, useState } from 'react';
import { NeuralDB } from '../types';

interface NeuralGraphProps {
  db: NeuralDB;
  onNodeClick: (id: string, type: 'CONCEPT' | 'NUGGET' | 'STRATEGY') => void;
}

interface GraphNode {
  id: string;
  type: 'CONCEPT' | 'NUGGET' | 'STRATEGY';
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string;
  radius: number;
  color: string;
}

interface Link {
  source: string;
  target: string;
}

export const NeuralGraph: React.FC<NeuralGraphProps> = ({ db, onNodeClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animationRef = useRef<number>(0);

  // Safe Wrappers
  const safeConcepts = db?.concepts || [];
  const safeNuggets = db?.nuggets || [];
  const safeStrategies = db?.strategies || [];

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!containerRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const newNodes: GraphNode[] = [];
    const newLinks: Link[] = [];

    // 1. Create Nodes for Concepts (Centers)
    safeConcepts.forEach(c => {
      newNodes.push({
        id: c.id,
        type: 'CONCEPT',
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        label: c.name,
        radius: 8 + (Math.random() * 4), // Larger
        color: '#8b5cf6' // Violet
      });
    });

    // 2. Create Nodes for Nuggets (Satellites)
    safeNuggets.forEach(n => {
      const nodeId = n.id;
      newNodes.push({
        id: nodeId,
        type: 'NUGGET',
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        label: n.title,
        radius: 4, // Smaller
        color: '#06b6d4' // Cyan
      });

      // Link to Concepts
      n.conceptIds?.forEach(cId => {
        newLinks.push({ source: nodeId, target: cId });
      });
    });

    // 3. Create Nodes for Strategies (Heavy)
    safeStrategies.forEach(s => {
       newNodes.push({
         id: s.id,
         type: 'STRATEGY',
         x: Math.random() * width,
         y: Math.random() * height,
         vx: (Math.random() - 0.5) * 0.2,
         vy: (Math.random() - 0.5) * 0.2,
         label: s.name,
         radius: 12,
         color: '#10b981' // Emerald
       });
       
       // Heuristic link: Strategies loosely connect to concepts if text matches
       // This is a "fuzzy" link for visualization
       safeConcepts.forEach(c => {
           if (s.content.includes(c.name)) {
               newLinks.push({ source: s.id, target: c.id });
           }
       });
    });

    setNodes(newNodes);
    setLinks(newLinks);

  }, [db]);

  // --- SIMULATION LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handling
    const resize = () => {
        if(containerRef.current) {
            canvas.width = containerRef.current.clientWidth;
            canvas.height = containerRef.current.clientHeight;
        }
    };
    window.addEventListener('resize', resize);
    resize();

    const animate = () => {
        if (!ctx || !containerRef.current) return;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        
        // Physics update
        nodes.forEach(node => {
            // Apply Velocity
            node.x += node.vx;
            node.y += node.vy;

            // Boundary Bounce
            if (node.x <= node.radius || node.x >= width - node.radius) node.vx *= -1;
            if (node.y <= node.radius || node.y >= height - node.radius) node.vy *= -1;

            // Simple attraction to linked nodes (Force Directed Lite)
            // (Skipped for performance in this simple version, using random drift)
        });

        // Draw Links
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        links.forEach(link => {
            const source = nodes.find(n => n.id === link.source);
            const target = nodes.find(n => n.id === link.target);
            if (source && target) {
                ctx.beginPath();
                ctx.moveTo(source.x, source.y);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();
            }
        });

        // Draw Nodes
        nodes.forEach(node => {
            const isHovered = hoveredNode === node.id;
            
            ctx.beginPath();
            ctx.arc(node.x, node.y, isHovered ? node.radius * 1.5 : node.radius, 0, Math.PI * 2);
            ctx.fillStyle = node.color;
            ctx.fill();
            
            // Glow
            if (isHovered || node.type === 'CONCEPT') {
                ctx.shadowBlur = 15;
                ctx.shadowColor = node.color;
            } else {
                ctx.shadowBlur = 0;
            }

            // Label
            if (isHovered || node.type === 'STRATEGY' || node.type === 'CONCEPT') {
                ctx.fillStyle = '#fff';
                ctx.font = '10px JetBrains Mono';
                ctx.fillText(node.label, node.x + 12, node.y + 3);
            }
        });

        animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        window.removeEventListener('resize', resize);
    };
  }, [nodes, links, hoveredNode]);

  // --- INTERACTION ---
  const handleMouseMove = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const found = nodes.find(n => {
          const dx = n.x - x;
          const dy = n.y - y;
          return Math.sqrt(dx*dx + dy*dy) < n.radius + 5;
      });

      setHoveredNode(found ? found.id : null);
      if (canvasRef.current) canvasRef.current.style.cursor = found ? 'pointer' : 'default';
  };

  const handleClick = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const found = nodes.find(n => {
          const dx = n.x - x;
          const dy = n.y - y;
          return Math.sqrt(dx*dx + dy*dy) < n.radius + 5;
      });

      if (found) {
          onNodeClick(found.id, found.type);
      }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-[#020202] relative overflow-hidden">
        <canvas 
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            className="absolute inset-0 z-10"
        />
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]"></div>
                <span className="text-[10px] text-zinc-400 font-mono uppercase">Concepts (Hubs)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                <span className="text-[10px] text-zinc-400 font-mono uppercase">Nuggets (Data)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                <span className="text-[10px] text-zinc-400 font-mono uppercase">Strategies (Logic)</span>
            </div>
        </div>
    </div>
  );
};
