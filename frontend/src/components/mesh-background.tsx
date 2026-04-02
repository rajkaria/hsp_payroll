"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  brightness: number;
}

const NODE_COUNT = 60;
const CONNECTION_DIST = 200;
const MOUSE_RADIUS = 250;
const DRIFT_SPEED = 0.15;
const MOUSE_STRENGTH = 0.03;

export function MeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const nodesRef = useRef<Node[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Initialize nodes
    const nodes: Node[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      nodes.push({
        x, y, baseX: x, baseY: y,
        vx: (Math.random() - 0.5) * DRIFT_SPEED,
        vy: (Math.random() - 0.5) * DRIFT_SPEED,
        radius: Math.random() * 1.5 + 0.8,
        brightness: Math.random() * 0.5 + 0.3,
      });
    }
    nodesRef.current = nodes;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Update nodes
      for (const node of nodes) {
        // Drift
        node.x += node.vx;
        node.y += node.vy;

        // Soft boundary bounce
        if (node.x < -20 || node.x > canvas.width + 20) node.vx *= -1;
        if (node.y < -20 || node.y > canvas.height + 20) node.vy *= -1;

        // Mouse repulsion/attraction
        const dx = node.x - mx;
        const dy = node.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * MOUSE_STRENGTH;
          node.x += dx / dist * force * 2;
          node.y += dy / dist * force * 2;
        }

        // Slow drift direction change
        if (Math.random() < 0.005) {
          node.vx += (Math.random() - 0.5) * 0.05;
          node.vy += (Math.random() - 0.5) * 0.05;
          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          if (speed > DRIFT_SPEED * 2) {
            node.vx *= DRIFT_SPEED / speed;
            node.vy *= DRIFT_SPEED / speed;
          }
        }
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const opacity = (1 - dist / CONNECTION_DIST) * 0.08;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw mouse connections
      for (const node of nodes) {
        const dx = node.x - mx;
        const dy = node.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS) {
          const opacity = (1 - dist / MOUSE_RADIUS) * 0.15;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = `rgba(192, 132, 252, ${opacity})`;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }

      // Draw nodes
      for (const node of nodes) {
        // Glow
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.radius * 8
        );
        gradient.addColorStop(0, `rgba(192, 132, 252, ${node.brightness * 0.2})`);
        gradient.addColorStop(1, "rgba(139, 92, 246, 0)");
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 8, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(192, 132, 252, ${node.brightness * 0.6})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    animate();

    function onMouseMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    }

    function onMouseLeave() {
      mouseRef.current = { x: -1000, y: -1000 };
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: "transparent" }}
      />
      {/* Atmospheric glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-[#8B5CF6]/[0.06] rounded-full blur-[150px]" />
        <div className="absolute top-[40%] right-[10%] w-[600px] h-[600px] bg-[#7C3AED]/[0.04] rounded-full blur-[180px]" />
        <div className="absolute bottom-[15%] left-[30%] w-[700px] h-[700px] bg-[#8B5CF6]/[0.05] rounded-full blur-[160px]" />
      </div>
    </>
  );
}
