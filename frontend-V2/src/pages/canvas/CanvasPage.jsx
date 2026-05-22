import React, { useState, useRef, useEffect } from 'react';
import { 
  Circle, 
  ArrowUpRight, 
  MousePointer2, 
  Eraser, 
  Save, 
  Trash2,
  Copy,
  PaintBucket,
  Sparkles,
  X,
  Layout
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { toast } from 'react-hot-toast';

export default function CanvasPage() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedTool, setSelectedTool] = useState('node');
  const [selectedColor, setSelectedColor] = useState('hsl(var(--primary))');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState(null);
  const [drawingEdge, setDrawingEdge] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [showGuide, setShowGuide] = useState(true);

  const svgRef = useRef(null);

  // --- GRID & HELPERS ---
  const GRID_SIZE = 16; // Tighter grid
  const snap = (val) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  const getCursorPos = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  // --- ACTIONS ---
  const handleCanvasClick = (e) => {
    if (selectedTool === 'select') {
      setSelectedNodeId(null);
      setEditingNodeId(null);
      return;
    }
    const pos = getCursorPos(e);

    if (selectedTool === 'node') {
      const newNodeId = `node-${Date.now()}`;
      const newNode = {
        id: newNodeId,
        x: snap(pos.x),
        y: snap(pos.y),
        label: '',
        color: selectedColor
      };
      setNodes([...nodes, newNode]);
      setEditingNodeId(newNodeId);
      setSelectedNodeId(newNodeId);
    }
  };

  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    
    if (selectedTool === 'select' || selectedTool === 'clone') {
      setIsDragging(true);
      setDraggedNode(node.id);
    } else if (selectedTool === 'edge') {
      setDrawingEdge({ startNodeId: node.id, startX: node.x, startY: node.y, endX: node.x, endY: node.y });
    } else if (selectedTool === 'eraser') {
      deleteNode(node.id);
    } else if (selectedTool === 'paint') {
      setNodes(nodes.map(n => n.id === node.id ? { ...n, color: selectedColor } : n));
    }
  };

  const deleteNode = (id) => {
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(edge => edge.from !== id && edge.to !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const duplicateNode = () => {
    if (!selectedNodeId) return;
    const target = nodes.find(n => n.id === selectedNodeId);
    if (!target) return;

    const newNodeId = `node-${Date.now()}`;
    const newNode = {
      ...target,
      id: newNodeId,
      x: target.x + 40,
      y: target.y + 40,
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNodeId);
    toast.success('Node duplicated');
  };

  const clearCanvas = () => {
    if (window.confirm('Wipe the entire canvas?')) {
      setNodes([]);
      setEdges([]);
      toast.success('Canvas cleared');
    }
  };

  const handleMouseMove = (e) => {
    const pos = getCursorPos(e);
    if (isDragging && draggedNode) {
      setNodes(nodes.map(n => n.id === draggedNode ? { ...n, x: snap(pos.x), y: snap(pos.y) } : n));
    }
    if (drawingEdge) {
      setDrawingEdge({ ...drawingEdge, endX: pos.x, endY: pos.y });
    }
  };

  const handleNodeMouseUp = (e, node) => {
    if (drawingEdge && drawingEdge.startNodeId !== node.id) {
      const label = window.prompt("Relationship:", "relates to");
      const newEdge = {
        id: `edge-${Date.now()}`,
        from: drawingEdge.startNodeId,
        to: node.id,
        label: label || '',
        color: selectedColor
      };
      setEdges([...edges, newEdge]);
    }
    setDrawingEdge(null);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-background select-none">
      {/* PROFESSIONAL TOOLBAR */}
      <div className="flex w-20 flex-col items-center gap-6 border-r border-border/10 bg-card/20 p-4 pt-12 backdrop-blur-3xl">
        <div className="flex flex-col gap-2 rounded-2xl bg-background/50 p-1.5 border border-white/5 shadow-2xl">
          {[
            { id: 'select', icon: MousePointer2, label: 'Select' },
            { id: 'node', icon: Circle, label: 'Add Node' },
            { id: 'edge', icon: ArrowUpRight, label: 'Connect' },
            { id: 'paint', icon: PaintBucket, label: 'Fill Color' },
            { id: 'eraser', icon: Eraser, label: 'Eraser' },
          ].map(tool => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300",
                selectedTool === tool.id ? "bg-primary text-white shadow-lg" : "text-muted-foreground/40 hover:text-primary hover:bg-primary/5"
              )}
              title={tool.label}
            >
              <tool.icon size={20} />
            </button>
          ))}
        </div>

        {/* CONTEXTUAL ACTIONS */}
        {selectedNodeId && (
          <div className="flex flex-col gap-2 rounded-2xl bg-primary/10 p-1.5 border border-primary/20 animate-in zoom-in-95 duration-300">
            <button
              onClick={duplicateNode}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-primary hover:bg-primary/20 transition-all"
              title="Duplicate Selected"
            >
              <Copy size={20} />
            </button>
            <button
              onClick={() => deleteNode(selectedNodeId)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-red-500 hover:bg-red-500/10 transition-all"
              title="Delete Selected"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-2xl bg-background/50 p-2 border border-white/5">
          {['hsl(var(--primary))', '#ef4444', '#22c55e', '#3b82f6', '#eab308'].map(color => (
            <button
              key={color}
              onClick={() => {
                setSelectedColor(color);
                if (selectedNodeId) setNodes(nodes.map(n => n.id === selectedNodeId ? { ...n, color } : n));
              }}
              className={cn(
                "h-5 w-5 rounded-full transition-all",
                selectedColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "opacity-30 hover:opacity-100"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <button 
          onClick={clearCanvas}
          className="mt-auto h-11 w-11 flex items-center justify-center rounded-xl text-muted-foreground/30 hover:text-red-500 transition-all"
          title="Clear Board"
        >
          <X size={20} />
        </button>
      </div>

      {/* DRAWING AREA */}
      <div className="relative flex-1 overflow-hidden bg-[radial-gradient(hsl(var(--primary)/0.12)_1.5px,transparent_1.5px)] [background-size:16px_16px]">
        {/* HEADER */}
        <div className="absolute left-8 top-8 z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-xl bg-primary/10"><Layout className="text-primary h-5 w-5" /></div>
             <div>
                <h1 className="text-xl font-black tracking-tighter text-foreground leading-none">Neural Canvas</h1>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 mt-1">Professional Blueprint Mode</p>
             </div>
          </div>
        </div>

        <div className="absolute right-8 top-8 z-20">
           <button 
             onClick={() => toast.success('Publishing to Neo4j...')}
             className="flex items-center gap-3 rounded-2xl bg-primary px-6 py-3.5 text-[12px] font-black text-white shadow-[0_20px_40px_-10px_rgba(var(--primary-rgb),0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
           >
             <Save size={18} />
             Publish to Graph
           </button>
        </div>

        <svg
          ref={svgRef}
          className="h-full w-full cursor-crosshair"
          onMouseDown={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={() => { setIsDragging(false); setDraggedNode(null); setDrawingEdge(null); }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
            </marker>
          </defs>

          {/* EDGES */}
          {edges.map((edge) => {
            const from = nodes.find(n => n.id === edge.from);
            const to = nodes.find(n => n.id === edge.to);
            if (!from || !to) return null;
            return (
              <g key={edge.id} className="opacity-40">
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edge.color} strokeWidth="3" markerEnd="url(#arrowhead)" />
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 12} textAnchor="middle" className="fill-foreground text-[8px] font-black uppercase tracking-widest">{edge.label}</text>
              </g>
            );
          })}

          {/* NODES */}
          {nodes.map((node) => (
            <g 
              key={node.id} 
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onDoubleClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id); }}
              className="cursor-move group"
            >
              <circle
                cx={node.x} cy={node.y} r="34"
                className={cn(
                  "fill-card stroke-2 transition-all duration-300 shadow-2xl",
                  selectedNodeId === node.id ? "stroke-primary" : "stroke-border/10"
                )}
                style={{ stroke: selectedNodeId === node.id ? 'hsl(var(--primary))' : node.color }}
              />
              {editingNodeId === node.id ? (
                <foreignObject x={node.x - 30} y={node.y - 12} width="60" height="24">
                  <input
                    autoFocus
                    className="w-full h-full bg-transparent text-center text-[10px] font-black text-foreground outline-none border-none p-0 uppercase"
                    value={node.label}
                    onChange={(e) => setNodes(nodes.map(n => n.id === node.id ? { ...n, label: e.target.value } : n))}
                    onBlur={() => setEditingNodeId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingNodeId(null)}
                  />
                </foreignObject>
              ) : (
                <text x={node.x} y={node.y + 4} textAnchor="middle" className="fill-foreground text-[10px] font-black uppercase tracking-tighter pointer-events-none select-none">
                  {node.label || '...'}
                </text>
              )}
            </g>
          ))}

          {/* ACTIVE EDGE */}
          {drawingEdge && (
            <line x1={drawingEdge.startX} y1={drawingEdge.startY} x2={drawingEdge.endX} y2={drawingEdge.endY} stroke={selectedColor} strokeWidth="2" strokeDasharray="6" className="opacity-50" />
          )}
        </svg>

        {/* PRO GUIDE */}
        {showGuide && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-3xl animate-in slide-in-from-bottom-4 duration-1000 shadow-2xl">
             <div className="flex items-center gap-3 text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                <Sparkles size={14} className="text-primary animate-pulse" />
                Select node to Duplicate
             </div>
             <div className="h-4 w-px bg-white/10" />
             <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                Use Bucket to fill color
             </div>
             <button onClick={() => setShowGuide(false)} className="ml-2 p-1 rounded-lg hover:bg-white/5 transition-colors"><X size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
