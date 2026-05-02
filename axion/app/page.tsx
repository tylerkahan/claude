'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Intersection Observer for fade-in
  useEffect(() => {
    const els = document.querySelectorAll('.fade-in')
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.4 + 0.05
      })
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,150,255,${p.opacity})`
        ctx.fill()
      })
      // connect nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(0,100,255,${0.06 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #03040d; --bg-2: #060818;
          --bg-card: rgba(8,14,40,0.65);
          --blue: #0055ff; --blue-mid: #0066ff; --blue-light: #0088ff;
          --cyan: #00aaff; --cyan-light: #00d4ff;
          --purple: #6644ff; --purple-light: #8866ff;
          --border: rgba(0,100,255,0.15); --border-2: rgba(0,170,255,0.10);
          --text: #e8eaf6; --text-muted: #6b7ab8; --text-dim: #3d4a7a;
          --radius: 14px; --radius-lg: 20px; --radius-xl: 28px;
        }
        html { scroll-behavior: smooth; }
        body { background: var(--bg); color: var(--text); font-family: 'Inter',sans-serif; font-size: 16px; line-height: 1.6; overflow-x: hidden; }
        h1,h2,h3,h4,h5 { font-family: 'Space Grotesk',sans-serif; line-height: 1.12; }
        .gradient-text {
          background: linear-gradient(130deg,var(--cyan-light) 0%,var(--blue-light) 50%,var(--purple-light) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .section-eyebrow { font-size:11px; font-weight:700; letter-spacing:.2em; color:var(--cyan); text-transform:uppercase; margin-bottom:14px; display:block; }
        .section-title { font-size:clamp(28px,4vw,50px); font-weight:800; color:#fff; margin-bottom:16px; }
        .section-sub { font-size:17px; color:var(--text-muted); max-width:580px; line-height:1.7; margin:0 auto 56px; text-align:center; }
        .container { max-width:1200px; margin:0 auto; padding:0 28px; }
        .glass { background:var(--bg-card); border:1px solid var(--border); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); }
        .btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; font-family:'Inter',sans-serif; font-weight:600; font-size:14px; border-radius:10px; border:none; cursor:pointer; text-decoration:none; transition:all .22s ease; white-space:nowrap; position:relative; z-index:1; }
        .btn-primary { background:linear-gradient(135deg,var(--blue) 0%,var(--cyan) 100%); color:#fff; padding:11px 24px; }
        .btn-primary:hover { transform:translateY(-2px); filter:brightness(1.1); }
        .glow-btn { box-shadow:0 0 24px rgba(0,120,255,.4),0 4px 16px rgba(0,0,0,.3); }
        .glow-btn:hover { box-shadow:0 0 40px rgba(0,180,255,.55),0 8px 24px rgba(0,0,0,.4); }
        .btn-ghost { background:transparent; color:var(--text); border:1px solid var(--border); padding:11px 24px; }
        .btn-ghost:hover { border-color:var(--cyan); color:var(--cyan); background:rgba(0,170,255,.06); }
        .btn-lg { padding:15px 32px; font-size:15px; border-radius:12px; }
        .btn-full { width:100%; margin-top:8px; }
        .fade-in { opacity:0; transform:translateY(28px); transition:opacity .65s ease,transform .65s ease; }
        .fade-in.visible { opacity:1; transform:translateY(0); }

        /* NAV */
        .nav { position:fixed; top:0; left:0; right:0; z-index:200; transition:background .3s,border-color .3s,box-shadow .3s; }
        .nav.scrolled { background:rgba(3,4,13,.92); border-bottom:1px solid var(--border); backdrop-filter:blur(20px); box-shadow:0 4px 32px rgba(0,0,0,.4); }
        .nav-inner { max-width:1200px; margin:0 auto; padding:20px 28px; display:flex; align-items:center; gap:40px; }
        .logo { display:flex; align-items:center; gap:10px; text-decoration:none; font-family:'Space Grotesk',sans-serif; font-weight:800; font-size:20px; color:#fff; letter-spacing:.07em; }
        .logo-mark { filter:drop-shadow(0 0 6px rgba(0,170,255,.5)); flex-shrink:0; }
        .nav-links { list-style:none; display:flex; gap:32px; margin-left:auto; }
        .nav-links a { text-decoration:none; color:var(--text-muted); font-size:14px; font-weight:500; transition:color .2s; }
        .nav-links a:hover { color:var(--text); }
        .nav-login { margin-left:auto; }
        .nav-cta { margin-left:8px; }

        /* HERO */
        .hero-section { position:relative; width:100%; min-height:100vh; display:flex; flex-direction:column; justify-content:center; overflow:hidden; }
        .hero-bg { position:absolute; inset:0; z-index:0; overflow:hidden; }
        .grid-overlay { position:absolute; inset:0; background-image:linear-gradient(rgba(0,85,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,85,255,.06) 1px,transparent 1px); background-size:56px 56px; }
        .orb { position:absolute; border-radius:50%; filter:blur(80px); animation:orbFloat linear infinite; }
        .orb-1 { width:700px; height:700px; background:radial-gradient(circle,rgba(0,60,220,.22) 0%,transparent 70%); top:-200px; left:-200px; animation-duration:18s; }
        .orb-2 { width:500px; height:500px; background:radial-gradient(circle,rgba(0,140,255,.14) 0%,transparent 70%); bottom:-100px; right:-100px; animation-duration:22s; animation-direction:reverse; }
        .orb-3 { width:350px; height:350px; background:radial-gradient(circle,rgba(80,40,255,.12) 0%,transparent 70%); top:40%; left:50%; animation-duration:26s; animation-delay:-8s; }
        @keyframes orbFloat { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.05)} 66%{transform:translate(-20px,40px) scale(.95)} 100%{transform:translate(0,0) scale(1)} }
        .hero-inner { position:relative; z-index:2; display:flex; align-items:center; gap:64px; padding-top:96px; padding-bottom:80px; width:100%; }
        .hero-content { flex:1; max-width:580px; }
        .hero-badge { display:inline-flex; align-items:center; gap:9px; background:rgba(0,85,255,.1); border:1px solid rgba(0,170,255,.22); border-radius:100px; padding:7px 18px; font-size:13px; font-weight:500; color:var(--cyan); margin-bottom:30px; }
        .badge-dot { width:7px; height:7px; background:var(--cyan); border-radius:50%; box-shadow:0 0 10px var(--cyan); animation:pulse 2s infinite; }
        .hero-title { font-size:clamp(44px,6vw,76px); font-weight:800; line-height:1.04; margin-bottom:26px; color:#fff; }
        .hero-subtitle { font-size:17px; color:var(--text-muted); line-height:1.75; margin-bottom:38px; max-width:500px; }
        .hero-actions { display:flex; gap:14px; flex-wrap:wrap; margin-bottom:40px; }
        .hero-trust { display:flex; flex-direction:column; gap:8px; }
        .trust-label { font-size:12px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.1em; }
        .trust-logos { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .trust-logo { font-size:13px; font-weight:600; color:var(--text-muted); }
        .trust-sep { color:var(--text-dim); font-size:10px; }

        /* DASHBOARD PREVIEW */
        .hero-dashboard { flex:0 0 auto; width:360px; display:flex; flex-direction:column; gap:14px; animation:slideUp .9s cubic-bezier(.22,1,.36,1) both .2s; }
        @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        .dash-card { border-radius:var(--radius-lg); padding:20px 22px; position:relative; overflow:hidden; }
        .dash-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(0,80,255,.04) 0%,transparent 60%); pointer-events:none; }
        .dash-card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .dash-label { font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.1em; }
        .live-badge { display:inline-flex; align-items:center; gap:5px; background:rgba(0,200,80,.1); border:1px solid rgba(0,200,80,.22); border-radius:100px; padding:3px 10px; font-size:11px; font-weight:600; color:#00cc66; }
        .live-dot { width:5px; height:5px; background:#00cc66; border-radius:50%; box-shadow:0 0 6px #00cc66; animation:pulse 1.5s infinite; }
        .net-worth-num { font-size:36px; font-weight:800; font-family:'Space Grotesk',sans-serif; color:#fff; line-height:1; margin-bottom:4px; }
        .nw-change { font-size:13px; color:#00cc66; margin-bottom:14px; }
        .nw-change span { color:var(--text-dim); }
        .sparkline { height:44px; margin-bottom:14px; }
        .sparkline svg { width:100%; height:100%; }
        .asset-allocation { display:flex; flex-direction:column; gap:8px; }
        .alloc-item { display:flex; flex-direction:column; gap:4px; }
        .alloc-bar-track { height:4px; background:rgba(255,255,255,.06); border-radius:2px; overflow:hidden; }
        .alloc-bar { height:100%; border-radius:2px; background:linear-gradient(90deg,var(--blue),var(--cyan)); transition:width 1.4s cubic-bezier(.22,1,.36,1); }
        .alloc-meta { display:flex; justify-content:space-between; font-size:12px; }
        .alloc-meta span:first-child { color:var(--text-muted); }
        .alloc-meta span:last-child { color:var(--text); font-weight:600; }
        .doc-all-count { font-size:12px; color:var(--text-muted); }
        .doc-list { display:flex; flex-direction:column; gap:8px; }
        .doc-row { display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:10px; }
        .doc-row.signed { background:rgba(0,85,255,.07); border:1px solid rgba(0,100,255,.14); }
        .doc-row.pending { background:rgba(255,160,0,.06); border:1px solid rgba(255,160,0,.14); }
        .doc-icon-wrap { font-size:15px; }
        .doc-meta { flex:1; display:flex; flex-direction:column; }
        .doc-title { font-size:13px; font-weight:500; color:var(--text); }
        .doc-sub { font-size:11px; }
        .signed-text { color:#00aaff; }
        .pending-text { color:#ffaa00; }
        .doc-badge { font-size:13px; font-weight:700; }
        .signed-badge { color:#00cc66; }
        .ai-header { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
        .ai-avatar-wrap { width:36px; height:36px; display:flex; align-items:center; justify-content:center; }
        .ai-hex { font-size:26px; color:var(--cyan); filter:drop-shadow(0 0 10px var(--cyan)); animation:hexPulse 3s infinite; }
        @keyframes hexPulse { 0%,100%{filter:drop-shadow(0 0 10px var(--cyan))} 50%{filter:drop-shadow(0 0 20px var(--cyan-light))} }
        .ai-name-text { font-size:14px; font-weight:700; color:#fff; }
        .ai-online { font-size:11px; color:#00cc66; }
        .ai-model-tag { margin-left:auto; font-size:10px; font-weight:600; background:rgba(0,85,255,.15); border:1px solid rgba(0,100,255,.25); border-radius:6px; padding:3px 7px; color:var(--cyan); }
        .chat-messages { display:flex; flex-direction:column; gap:8px; }
        .chat-msg { padding:9px 13px; border-radius:12px; font-size:13px; line-height:1.5; }
        .user-msg { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07); color:var(--text-muted); border-radius:12px 12px 12px 4px; }
        .ai-msg { background:rgba(0,85,255,.1); border:1px solid rgba(0,120,255,.18); color:var(--text); border-radius:12px 12px 4px 12px; }
        .ai-action-link { color:var(--cyan); cursor:pointer; font-weight:600; }
        .scroll-indicator { position:absolute; bottom:32px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:8px; z-index:2; opacity:.5; }
        .scroll-indicator span { font-size:11px; letter-spacing:.12em; color:var(--text-muted); }
        .scroll-line { width:1px; height:48px; background:linear-gradient(to bottom,var(--cyan),transparent); animation:scrollPulse 2s infinite; }
        @keyframes scrollPulse { 0%{transform:scaleY(0);transform-origin:top} 50%{transform:scaleY(1);transform-origin:top} 51%{transform:scaleY(1);transform-origin:bottom} 100%{transform:scaleY(0);transform-origin:bottom} }

        /* TICKER */
        .ticker-wrap { width:100%; background:rgba(4,8,28,.9); border-top:1px solid var(--border); border-bottom:1px solid var(--border); display:flex; align-items:center; height:44px; position:relative; z-index:2; overflow:hidden; }
        .ticker-live-tag { flex-shrink:0; padding:0 18px; font-size:10px; font-weight:700; letter-spacing:.18em; color:var(--cyan); border-right:1px solid var(--border); height:100%; display:flex; align-items:center; background:rgba(0,60,180,.15); }
        .ticker-scroll { flex:1; overflow:hidden; height:100%; display:flex; align-items:center; }
        .ticker-track { display:flex; align-items:center; gap:0; white-space:nowrap; animation:ticker 48s linear infinite; }
        .ticker-item { font-size:12px; font-weight:500; color:var(--text-muted); letter-spacing:.03em; padding:0 28px; }
        .ticker-sep { width:4px; height:4px; background:var(--border); border-radius:50%; flex-shrink:0; }
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }

        /* STAT BAND */
        .stat-band { padding:72px 0; position:relative; z-index:2; }
        .stat-band-inner { display:grid; grid-template-columns:1fr auto 1fr auto 1fr auto 1fr; align-items:center; text-align:center; }
        .stat-block { display:flex; flex-direction:column; align-items:center; gap:8px; padding:0 20px; }
        .stat-num-row { display:flex; align-items:baseline; gap:2px; }
        .stat-big { font-size:clamp(40px,4.5vw,60px); font-weight:800; font-family:'Space Grotesk',sans-serif; background:linear-gradient(135deg,#fff 0%,var(--cyan) 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; line-height:1; }
        .stat-big-suffix { font-size:clamp(22px,2.5vw,32px); font-weight:700; font-family:'Space Grotesk',sans-serif; background:linear-gradient(135deg,#fff 0%,var(--cyan) 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; line-height:1; }
        .stat-desc { font-size:13px; color:var(--text-muted); text-align:center; max-width:140px; line-height:1.4; }
        .stat-divider { width:1px; background:var(--border); align-self:stretch; margin:4px 0; }

        /* PRESS */
        .press-strip { padding:32px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); position:relative; z-index:2; }
        .press-strip .container { display:flex; align-items:center; gap:32px; justify-content:center; }
        .press-label { font-size:10px; font-weight:700; letter-spacing:.18em; color:var(--text-dim); text-transform:uppercase; white-space:nowrap; }
        .press-logos { display:flex; align-items:center; gap:16px; flex-wrap:wrap; justify-content:center; }
        .press-logo { font-size:15px; font-weight:700; color:var(--text-dim); font-family:'Space Grotesk',sans-serif; }
        .press-sep { color:var(--text-dim); font-size:10px; }

        /* FEATURES */
        .features-section { padding:120px 0; position:relative; z-index:2; }
        .features-section .container { text-align:center; }
        .features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; text-align:left; }
        .feat-card { border-radius:var(--radius-lg); padding:28px; position:relative; transition:transform .22s,box-shadow .22s,border-color .22s; overflow:hidden; }
        .feat-card::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(0,80,255,.04) 0%,transparent 50%); pointer-events:none; opacity:0; transition:opacity .3s; }
        .feat-card:hover { transform:translateY(-5px); border-color:rgba(0,170,255,.28); box-shadow:0 20px 60px rgba(0,50,200,.18); }
        .feat-card:hover::after { opacity:1; }
        .feat-icon { width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-bottom:18px; }
        .feat-icon svg { width:22px; height:22px; }
        .feat-icon.blue { background:rgba(0,85,255,.14); border:1px solid rgba(0,85,255,.28); color:var(--blue-light); }
        .feat-icon.cyan { background:rgba(0,170,255,.10); border:1px solid rgba(0,170,255,.22); color:var(--cyan); }
        .feat-icon.purple { background:rgba(100,60,255,.12); border:1px solid rgba(100,60,255,.25); color:var(--purple-light); }
        .feat-card h3 { font-size:17px; font-weight:700; color:#fff; margin-bottom:10px; }
        .feat-card p { font-size:14px; color:var(--text-muted); line-height:1.65; }
        .feat-tag { display:inline-block; margin-top:14px; font-size:11px; font-weight:700; letter-spacing:.05em; background:rgba(0,85,255,.15); border:1px solid rgba(0,120,255,.25); border-radius:6px; padding:3px 9px; color:var(--cyan); }
        .new-tag { background:rgba(80,40,255,.15); border-color:rgba(100,60,255,.3); color:var(--purple-light); }

        /* AI SHOWCASE */
        .ai-showcase-section { padding:120px 0; background:linear-gradient(180deg,transparent 0%,rgba(0,20,80,.18) 50%,transparent 100%); position:relative; z-index:2; }
        .ai-showcase-inner { display:grid; grid-template-columns:1fr 1.1fr; gap:72px; align-items:center; }
        .ai-showcase-text p { font-size:15px; color:var(--text-muted); line-height:1.75; margin-bottom:28px; }
        .ai-capabilities { display:flex; flex-direction:column; gap:10px; margin-bottom:32px; }
        .ai-cap { font-size:14px; color:var(--text-muted); display:flex; align-items:center; gap:10px; }
        .cap-check { width:20px; height:20px; background:rgba(0,85,255,.15); border:1px solid rgba(0,120,255,.3); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; color:var(--cyan); flex-shrink:0; }
        .ai-chat-demo { border-radius:var(--radius-xl); overflow:hidden; }
        .chat-demo-header { display:flex; align-items:center; gap:10px; padding:14px 20px; border-radius:var(--radius-xl) var(--radius-xl) 0 0; border-bottom:1px solid var(--border); }
        .ai-hex-sm { font-size:20px; color:var(--cyan); filter:drop-shadow(0 0 8px var(--cyan)); }
        .chat-demo-name { font-size:14px; font-weight:700; color:#fff; }
        .chat-demo-status { font-size:12px; color:#00cc66; margin-left:4px; }
        .chat-demo-body { padding:20px; display:flex; flex-direction:column; gap:14px; border-radius:0 0 var(--radius-xl) var(--radius-xl); }
        .demo-msg { padding:13px 16px; border-radius:14px; font-size:14px; line-height:1.6; }
        .demo-user { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); color:var(--text-muted); }
        .demo-ai { background:rgba(0,70,200,.12); border:1px solid rgba(0,100,255,.18); color:var(--text); }
        .demo-ai-inner { line-height:1.65; }
        .demo-action-row { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
        .demo-action-btn { display:inline-block; padding:6px 14px; border-radius:8px; background:rgba(0,85,255,.15); border:1px solid rgba(0,120,255,.28); font-size:12px; font-weight:600; color:var(--cyan); cursor:pointer; transition:background .2s; }
        .demo-action-btn:hover { background:rgba(0,85,255,.25); }
        .typing-indicator { display:inline-flex; gap:4px; align-items:center; margin-right:8px; }
        .typing-indicator span { width:5px; height:5px; background:var(--cyan); border-radius:50%; animation:typing 1.2s infinite; }
        .typing-indicator span:nth-child(2) { animation-delay:.2s; }
        .typing-indicator span:nth-child(3) { animation-delay:.4s; }
        .demo-typing-text { font-size:13px; color:var(--text-muted); }
        @keyframes typing { 0%,60%,100%{opacity:.3;transform:scale(.8)} 30%{opacity:1;transform:scale(1)} }

        /* HOW IT WORKS */
        .how-section { padding:120px 0; position:relative; z-index:2; text-align:center; }
        .how-steps { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; margin-top:20px; text-align:left; }
        .how-step { position:relative; }
        .how-step-num { font-size:12px; font-weight:800; color:var(--cyan); font-family:'Space Grotesk',sans-serif; letter-spacing:.1em; margin-bottom:12px; display:flex; align-items:center; gap:10px; }
        .how-step-num::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,rgba(0,170,255,.4),transparent); }
        .how-step:last-child .how-step-num::after { display:none; }
        .how-step-body { border-radius:var(--radius-lg); padding:24px; }
        .how-icon { font-size:28px; margin-bottom:12px; }
        .how-step-body h3 { font-size:16px; font-weight:700; color:#fff; margin-bottom:8px; }
        .how-step-body p { font-size:14px; color:var(--text-muted); line-height:1.65; }

        /* INTEGRATIONS */
        .integrations-section { padding:120px 0; position:relative; z-index:2; text-align:center; }
        .integrations-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:14px; }
        .int-card { border-radius:var(--radius); padding:16px 18px; display:flex; align-items:center; justify-content:center; height:64px; transition:border-color .2s,transform .2s,background .2s; cursor:default; }
        .int-card:hover { border-color:rgba(0,170,255,.3); transform:translateY(-3px); background:rgba(10,20,60,.6); }
        .brand-svg { width:100%; max-width:120px; height:36px; opacity:.55; transition:opacity .2s; }
        .int-card:hover .brand-svg { opacity:.85; }

        /* SERVICES */
        .services-section { padding:120px 0; position:relative; z-index:2; }
        .services-grid { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid var(--border); border-radius:var(--radius-xl); overflow:hidden; gap:1px; background:var(--border); }
        .svc-item { background:var(--bg-2); padding:36px 30px; transition:background .2s; }
        .svc-item:hover { background:rgba(0,25,80,.5); }
        .svc-num { display:block; font-size:11px; font-weight:700; color:var(--cyan); letter-spacing:.1em; margin-bottom:12px; }
        .svc-item h4 { font-size:16px; font-weight:700; color:#fff; margin-bottom:8px; }
        .svc-item p { font-size:14px; color:var(--text-muted); line-height:1.6; }

        /* TESTIMONIALS */
        .testimonials-section { padding:120px 0; position:relative; z-index:2; text-align:center; }
        .testimonials-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; text-align:left; }
        .testi-card { border-radius:var(--radius-lg); padding:28px; transition:transform .22s,border-color .22s; }
        .testi-card:hover { transform:translateY(-4px); border-color:rgba(0,170,255,.25); }
        .testi-stars { color:#ffaa00; font-size:14px; margin-bottom:14px; }
        .testi-quote { font-size:14px; color:var(--text-muted); line-height:1.75; margin-bottom:20px; font-style:italic; }
        .testi-author { display:flex; align-items:center; gap:12px; }
        .testi-avatar { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,var(--blue),var(--cyan)); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; }
        .testi-name { font-size:14px; font-weight:600; color:#fff; }
        .testi-role { font-size:12px; color:var(--text-dim); margin-top:2px; }

        /* ABOUT */
        .about-section { padding:120px 0; position:relative; z-index:2; }
        .about-inner { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
        .about-text p { font-size:15px; color:var(--text-muted); line-height:1.75; margin-bottom:18px; }
        .about-metrics { display:flex; gap:40px; margin:32px 0; }
        .am-item { display:flex; flex-direction:column; gap:4px; }
        .am-val { font-size:32px; font-weight:800; font-family:'Space Grotesk',sans-serif; background:linear-gradient(135deg,#fff,var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .am-label { font-size:13px; color:var(--text-muted); }
        .about-cards { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .about-stat-card { border-radius:var(--radius-lg); padding:24px; display:flex; align-items:flex-start; gap:14px; transition:border-color .2s,transform .2s; }
        .about-stat-card:hover { border-color:rgba(0,170,255,.28); transform:translateY(-3px); }
        .highlight-card { border-color:rgba(0,150,255,.3); background:rgba(0,30,90,.55); }
        .asc-icon { font-size:24px; }
        .asc-num { font-size:28px; font-weight:800; font-family:'Space Grotesk',sans-serif; color:#fff; line-height:1.1; }
        .asc-text { font-size:13px; color:var(--text-muted); line-height:1.5; margin-top:3px; }
        .team-section { padding:0 28px; }
        .team-grid { max-width:1200px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .team-card { border-radius:var(--radius-lg); padding:28px; text-align:center; }
        .team-avatar { width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#fff; margin:0 auto 14px; }
        .team-name { font-size:16px; font-weight:700; color:#fff; margin-bottom:4px; }
        .team-role { font-size:12px; color:var(--cyan); margin-bottom:10px; font-weight:600; }
        .team-bio { font-size:13px; color:var(--text-muted); line-height:1.65; }

        /* FAQ */
        .faq-section { padding:120px 0; position:relative; z-index:2; }
        .faq-section .container { text-align:center; }
        .faq-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; text-align:left; max-width:1000px; margin:0 auto; }
        .faq-item { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; }
        .faq-q { width:100%; background:none; border:none; color:var(--text); font-size:15px; font-weight:600; padding:20px 22px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:14px; font-family:'Space Grotesk',sans-serif; text-align:left; }
        .faq-q:hover { color:var(--cyan); }
        .faq-arrow { width:18px; height:18px; flex-shrink:0; color:var(--text-muted); transition:transform .25s; }
        .faq-arrow.open { transform:rotate(180deg); }
        .faq-a { padding:0 22px 20px; font-size:14px; color:var(--text-muted); line-height:1.75; }

        /* SAVINGS */
        .savings-section { padding:120px 0; position:relative; z-index:2; }
        .savings-inner { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl); padding:60px; text-align:center; max-width:900px; margin:0 auto; }
        .savings-label { font-size:10px; font-weight:700; letter-spacing:.2em; color:var(--cyan); text-transform:uppercase; margin-bottom:40px; }
        .savings-grid { display:grid; grid-template-columns:1fr auto 1fr; gap:40px; align-items:start; margin-bottom:48px; }
        .savings-col-label { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--text-muted); margin-bottom:12px; }
        .savings-big-num { font-size:52px; font-weight:800; font-family:'Space Grotesk',sans-serif; color:#fff; line-height:1; margin-bottom:6px; }
        .savings-col-sub { font-size:13px; color:var(--text-dim); margin-bottom:20px; }
        .savings-list { list-style:none; display:flex; flex-direction:column; gap:8px; text-align:left; }
        .savings-list li { font-size:14px; color:var(--text-muted); }
        .savings-vs { font-size:22px; font-weight:800; color:var(--text-dim); font-family:'Space Grotesk',sans-serif; padding-top:60px; }
        .savings-col.axion .savings-big-num { background:linear-gradient(135deg,var(--blue),var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .savings-result-label { font-size:11px; font-weight:700; letter-spacing:.15em; color:var(--cyan); text-transform:uppercase; margin-bottom:8px; }
        .savings-result-num { font-size:64px; font-weight:800; font-family:'Space Grotesk',sans-serif; background:linear-gradient(135deg,#fff,var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; line-height:1; margin-bottom:8px; }
        .savings-result-sub { font-size:15px; color:var(--text-muted); }

        /* PRICING */
        .pricing-section { padding:120px 0; position:relative; z-index:2; text-align:center; }
        .pricing-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; text-align:left; align-items:stretch; }
        .pricing-card { border-radius:var(--radius-xl); padding:36px 32px; position:relative; transition:transform .22s; display:flex; flex-direction:column; }
        .pricing-card:hover { transform:translateY(-4px); }
        .plan-badge-spacer { height:30px; }
        .featured-plan { border-color:rgba(0,150,255,.35); background:rgba(0,30,90,.6); box-shadow:0 0 60px rgba(0,80,255,.12),inset 0 1px 0 rgba(0,200,255,.1); }
        .featured-badge { display:inline-block; font-size:11px; font-weight:700; background:linear-gradient(135deg,var(--blue),var(--cyan)); color:#fff; border-radius:6px; padding:4px 10px; margin-bottom:18px; letter-spacing:.05em; }
        .plan-name { font-size:13px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.1em; margin-bottom:10px; }
        .plan-price { font-size:48px; font-weight:800; font-family:'Space Grotesk',sans-serif; color:#fff; line-height:1; margin-bottom:10px; }
        .plan-price span { font-size:18px; color:var(--text-muted); font-weight:400; }
        .plan-desc { font-size:14px; color:var(--text-muted); margin-bottom:24px; line-height:1.5; }
        .plan-features { list-style:none; display:flex; flex-direction:column; gap:10px; margin-bottom:24px; flex:1; }
        .plan-features li { font-size:14px; color:var(--text-muted); display:flex; align-items:flex-start; gap:8px; }
        .pricing-footnote { font-size:13px; color:var(--text-dim); margin-top:32px; }

        /* CTA */
        .cta-section { padding:140px 0; position:relative; z-index:2; overflow:hidden; text-align:center; }
        .cta-glow { position:absolute; width:900px; height:500px; background:radial-gradient(ellipse,rgba(0,70,255,.18) 0%,transparent 70%); top:50%; left:50%; transform:translate(-50%,-50%); pointer-events:none; }
        .cta-inner { position:relative; z-index:1; }
        .cta-title { font-size:clamp(32px,5vw,60px); font-weight:800; color:#fff; margin-bottom:16px; }
        .cta-sub { font-size:17px; color:var(--text-muted); margin-bottom:40px; max-width:480px; margin-left:auto; margin-right:auto; }
        .cta-form { display:flex; gap:12px; max-width:580px; margin:0 auto 14px; flex-wrap:wrap; justify-content:center; }
        .cta-input { flex:1; min-width:180px; padding:15px 20px; background:rgba(255,255,255,.04); border:1px solid var(--border); border-radius:12px; color:var(--text); font-size:14px; font-family:'Inter',sans-serif; outline:none; transition:border-color .2s; }
        .cta-input::placeholder { color:var(--text-dim); }
        .cta-input:focus { border-color:var(--cyan); }
        .cta-fine { font-size:13px; color:var(--text-dim); }

        /* FOOTER */
        .footer { border-top:1px solid var(--border); padding:64px 0 0; position:relative; z-index:2; }
        .footer-inner { display:grid; grid-template-columns:1.4fr 1fr; gap:64px; padding-bottom:48px; }
        .footer-brand p { font-size:14px; color:var(--text-muted); margin-top:14px; max-width:280px; line-height:1.65; }
        .footer-social { display:flex; gap:16px; margin-top:18px; }
        .social-link { font-size:13px; color:var(--text-dim); text-decoration:none; transition:color .2s; }
        .social-link:hover { color:var(--cyan); }
        .footer-links { display:flex; gap:48px; }
        .footer-col { display:flex; flex-direction:column; gap:12px; }
        .footer-col h5 { font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:.1em; }
        .footer-col a { font-size:14px; color:var(--text-muted); text-decoration:none; transition:color .2s; }
        .footer-col a:hover { color:var(--cyan); }
        .footer-trust-bar { padding:20px 0; border-top:1px solid var(--border); }
        .footer-trust-badges { display:flex; align-items:center; gap:18px; flex-wrap:wrap; justify-content:center; }
        .ftb { font-size:12px; color:var(--text-dim); }
        .ftb-sep { color:var(--text-dim); font-size:10px; }
        .footer-bottom { border-top:1px solid var(--border); padding:20px 0; }
        .footer-bottom p { font-size:12px; color:var(--text-dim); }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }

        @media (max-width:1100px) {
          .hero-inner { flex-direction:column; text-align:center; padding-top:110px; }
          .hero-content { max-width:100%; }
          .hero-actions { justify-content:center; }
          .hero-dashboard { width:100%; max-width:520px; flex-direction:row; flex-wrap:wrap; align-self:center; }
          .dash-card { flex:1; min-width:220px; }
          .features-grid { grid-template-columns:repeat(2,1fr); }
          .ai-showcase-inner { grid-template-columns:1fr; gap:48px; }
          .how-steps { grid-template-columns:repeat(2,1fr); gap:28px; }
          .integrations-grid { grid-template-columns:repeat(4,1fr); }
          .pricing-grid { grid-template-columns:1fr; max-width:500px; margin:0 auto; }
          .about-inner { grid-template-columns:1fr; gap:48px; }
          .testimonials-grid { grid-template-columns:1fr; max-width:560px; margin:0 auto; }
          .team-grid { grid-template-columns:repeat(2,1fr); }
          .faq-grid { grid-template-columns:1fr; }
          .stat-band-inner { grid-template-columns:1fr 1fr; }
          .stat-divider { display:none; }
        }
        @media (max-width:680px) {
          .features-grid { grid-template-columns:1fr; }
          .integrations-grid { grid-template-columns:repeat(3,1fr); }
          .services-grid { grid-template-columns:1fr; }
          .team-grid { grid-template-columns:1fr; max-width:340px; margin:0 auto; }
          .savings-grid { grid-template-columns:1fr; }
          .savings-vs { padding-top:0; }
          .footer-inner { grid-template-columns:1fr; }
          .footer-links { flex-direction:column; gap:28px; }
        }
      `}</style>

      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* NAV */}
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <Link href="/" className="logo">
            <svg className="logo-mark" width="34" height="34" viewBox="0 0 34 34" fill="none">
              <path d="M17 2L30 9.5V24.5L17 32L4 24.5V9.5L17 2Z" fill="url(#hexFillN)" stroke="url(#hexStrokeN)" strokeWidth="1"/>
              <path d="M17 9L23.5 24H20L18.2 19.5H15.8L14 24H10.5L17 9Z" fill="url(#aFillN)"/>
              <path d="M16 17.5H18L17 14.5L16 17.5Z" fill="rgba(255,255,255,0.3)"/>
              <defs>
                <linearGradient id="hexFillN" x1="4" y1="2" x2="30" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0044cc" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#0099ff" stopOpacity="0.1"/>
                </linearGradient>
                <linearGradient id="hexStrokeN" x1="4" y1="2" x2="30" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00ccff"/>
                  <stop offset="100%" stopColor="#0055ff"/>
                </linearGradient>
                <linearGradient id="aFillN" x1="10.5" y1="9" x2="23.5" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00d4ff"/>
                  <stop offset="100%" stopColor="#0066ff"/>
                </linearGradient>
              </defs>
            </svg>
            <span>AXION</span>
          </Link>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#integrations">Integrations</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#about">About</a></li>
          </ul>
          <Link href="/login" className="btn btn-ghost nav-login">Log In</Link>
          <Link href="/login" className="btn btn-primary nav-cta">Get Early Access</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section">
        <div className="hero-bg">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
          <div className="grid-overlay"></div>
        </div>

        <div className="hero-inner container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              Now in Beta — Join 4,200+ families
            </div>
            <h1 className="hero-title">
              Your Legacy,<br />
              <span className="gradient-text">Secured by AI.</span>
            </h1>
            <p className="hero-subtitle">
              Draft your will, build a trust, and sign with a licensed attorney — all in one afternoon. Axion keeps your estate automatically updated as your life changes, for a fraction of the cost of traditional planning.
            </p>
            <div className="hero-actions">
              <Link href="/login" className="btn btn-primary btn-lg glow-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Start 14-Day Free Trial
              </Link>
              <a href="#features" className="btn btn-ghost btn-lg">Watch Demo →</a>
            </div>
            <div className="hero-trust">
              <span className="trust-label">Used by employees at</span>
              <div className="trust-logos">
                <span className="trust-logo">Goldman Sachs</span>
                <span className="trust-sep">·</span>
                <span className="trust-logo">Morgan Stanley</span>
                <span className="trust-sep">·</span>
                <span className="trust-logo">Fidelity</span>
                <span className="trust-sep">·</span>
                <span className="trust-logo">Schwab</span>
              </div>
            </div>
          </div>

          {/* DASHBOARD PREVIEW */}
          <div className="hero-dashboard">
            <div className="dash-card glass primary-card">
              <div className="dash-card-header">
                <span className="dash-label">Total Estate Value</span>
                <span className="live-badge"><span className="live-dot"></span>Live</span>
              </div>
              <div className="net-worth-num">$4,287,500</div>
              <div className="nw-change">↑ +$14,320 <span>today</span></div>
              <div className="sparkline">
                <svg viewBox="0 0 200 50" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0077ff" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#0077ff" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,45 L20,38 L40,40 L60,32 L80,28 L100,30 L120,22 L140,18 L160,14 L180,10 L200,5 L200,50 L0,50 Z" fill="url(#sparkGrad)"/>
                  <path d="M0,45 L20,38 L40,40 L60,32 L80,28 L100,30 L120,22 L140,18 L160,14 L180,10 L200,5" fill="none" stroke="#0099ff" strokeWidth="2"/>
                </svg>
              </div>
              <div className="asset-allocation">
                <div className="alloc-item">
                  <div className="alloc-bar-track"><div className="alloc-bar" style={{width:'62%'}}></div></div>
                  <div className="alloc-meta"><span>🏠 Real Estate</span><span>$2.65M</span></div>
                </div>
                <div className="alloc-item">
                  <div className="alloc-bar-track"><div className="alloc-bar" style={{width:'28%'}}></div></div>
                  <div className="alloc-meta"><span>📈 Portfolio</span><span>$1.20M</span></div>
                </div>
                <div className="alloc-item">
                  <div className="alloc-bar-track"><div className="alloc-bar" style={{width:'10%'}}></div></div>
                  <div className="alloc-meta"><span>🏦 Private Equity</span><span>$437K</span></div>
                </div>
              </div>
            </div>

            <div className="dash-card glass">
              <div className="dash-card-header">
                <span className="dash-label">Estate Documents</span>
                <span className="doc-all-count">6 of 6</span>
              </div>
              <div className="doc-list">
                <div className="doc-row signed">
                  <span className="doc-icon-wrap">📄</span>
                  <div className="doc-meta">
                    <span className="doc-title">Last Will &amp; Testament</span>
                    <span className="doc-sub signed-text">Signed · DocuSign · Apr 12</span>
                  </div>
                  <span className="doc-badge signed-badge">✓</span>
                </div>
                <div className="doc-row signed">
                  <span className="doc-icon-wrap">📄</span>
                  <div className="doc-meta">
                    <span className="doc-title">Revocable Living Trust</span>
                    <span className="doc-sub signed-text">Signed · DocuSign · Apr 12</span>
                  </div>
                  <span className="doc-badge signed-badge">✓</span>
                </div>
                <div className="doc-row pending">
                  <span className="doc-icon-wrap">📄</span>
                  <div className="doc-meta">
                    <span className="doc-title">Power of Attorney</span>
                    <span className="doc-sub pending-text">Sent to lawyer · Awaiting</span>
                  </div>
                  <span className="doc-badge">⏳</span>
                </div>
              </div>
            </div>

            <div className="dash-card glass">
              <div className="ai-header">
                <div className="ai-avatar-wrap"><span className="ai-hex">⬡</span></div>
                <div>
                  <div className="ai-name-text">Axion AI</div>
                  <div className="ai-online">● Online · Estate Advisor</div>
                </div>
                <div className="ai-model-tag">Claude</div>
              </div>
              <div className="chat-messages">
                <div className="chat-msg user-msg">If I die, how does my daughter get the house?</div>
                <div className="chat-msg ai-msg">Your revocable trust already names her as primary beneficiary for the property at 142 Oak Drive — it bypasses probate entirely. She&apos;ll receive title within 2–3 weeks of death certification. <span className="ai-action-link">Update trust →</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="scroll-indicator">
          <div className="scroll-line"></div>
          <span>Scroll</span>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-live-tag">PLATFORM</div>
        <div className="ticker-scroll">
          <div className="ticker-track">
            {['AI-Drafted Wills & Trusts','Live Net Worth Tracking','DocuSign Attorney Signing','256-bit AES Encryption','Digital Asset Inventory','Real Estate Valuation Sync','Probate Avoidance Analysis','Life Event Triggers','AI Tax Optimization','Business Succession Planning','Emergency Vault Access',
              'AI-Drafted Wills & Trusts','Live Net Worth Tracking','DocuSign Attorney Signing','256-bit AES Encryption','Digital Asset Inventory','Real Estate Valuation Sync','Probate Avoidance Analysis','Life Event Triggers','AI Tax Optimization','Business Succession Planning','Emergency Vault Access'].map((item, i) => (
              <span key={i}><span className="ticker-item">{item}</span><span className="ticker-sep"></span></span>
            ))}
          </div>
        </div>
      </div>

      {/* STAT BAND */}
      <section className="stat-band">
        <div className="container stat-band-inner">
          <div className="stat-block fade-in">
            <div className="stat-num-row"><span className="stat-big">4,200</span><span className="stat-big-suffix">+</span></div>
            <span className="stat-desc">Families protected</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-block fade-in" style={{transitionDelay:'.1s'}}>
            <div className="stat-num-row"><span className="stat-big">$2.1</span><span className="stat-big-suffix">B</span></div>
            <span className="stat-desc">Assets under management</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-block fade-in" style={{transitionDelay:'.2s'}}>
            <div className="stat-num-row"><span className="stat-big">94</span><span className="stat-big-suffix">%</span></div>
            <span className="stat-desc">Cheaper than a traditional attorney</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-block fade-in" style={{transitionDelay:'.3s'}}>
            <div className="stat-num-row"><span className="stat-big">12</span><span className="stat-big-suffix"> min</span></div>
            <span className="stat-desc">Average time to first draft</span>
          </div>
        </div>
      </section>

      {/* PRESS */}
      <section className="press-strip">
        <div className="container">
          <span className="press-label">AS FEATURED IN</span>
          <div className="press-logos">
            <span className="press-logo">Forbes</span><span className="press-sep">·</span>
            <span className="press-logo">TechCrunch</span><span className="press-sep">·</span>
            <span className="press-logo">WSJ</span><span className="press-sep">·</span>
            <span className="press-logo">Business Insider</span><span className="press-sep">·</span>
            <span className="press-logo">Bloomberg</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-eyebrow">PLATFORM FEATURES</div>
          <h2 className="section-title">Everything your estate needs.<br /><span className="gradient-text">Nothing left to chance.</span></h2>
          <p className="section-sub">What used to take an attorney, a financial advisor, and a CPA — Axion does in minutes. AI-drafted, legally reviewed, always current.</p>
          <div className="features-grid">
            <div className="feat-card glass fade-in">
              <div className="feat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
              <h3>AI Will &amp; Trust Builder</h3>
              <p>Answer 12 questions. Axion generates a legally sound will, revocable trust, or irrevocable trust — personalized and ready for attorney review in minutes.</p>
              <div className="feat-tag">Most popular</div>
            </div>
            <div className="feat-card glass fade-in" style={{transitionDelay:'.07s'}}>
              <div className="feat-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg></div>
              <h3>Live Net Worth Tracker</h3>
              <p>Connect Fidelity, Schwab, Coinbase, and Zillow. Your total estate value updates in real time — stocks, real estate, private equity, crypto, and cash.</p>
            </div>
            <div className="feat-card glass fade-in" style={{transitionDelay:'.14s'}}>
              <div className="feat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></div>
              <h3>DocuSign Attorney Signing</h3>
              <p>Send documents directly to your attorney via DocuSign. Track signing status, get reminders, and receive completed documents back — all in-app.</p>
            </div>
            <div className="feat-card glass fade-in" style={{transitionDelay:'.21s'}}>
              <div className="feat-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg></div>
              <h3>AI Tax Optimization Engine</h3>
              <p>Axion&apos;s AI scans your estate for tax exposure and recommends strategies — GRAT structures, charitable trusts, and gifting strategies to legally minimize estate taxes.</p>
              <div className="feat-tag new-tag">New</div>
            </div>
            <div className="feat-card glass fade-in" style={{transitionDelay:'.28s'}}>
              <div className="feat-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg></div>
              <h3>Encrypted Document Vault</h3>
              <p>Upload deeds, insurance policies, financial statements, and personal letters. Everything is 256-bit AES encrypted, versioned, and accessible to your executor on death.</p>
            </div>
            <div className="feat-card glass fade-in" style={{transitionDelay:'.35s'}}>
              <div className="feat-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2M9 14l2 2 4-4"/></svg></div>
              <h3>Digital Asset Inventory</h3>
              <p>Crypto wallets, NFTs, online accounts, subscriptions, and digital businesses. Axion catalogs your entire digital estate and gives heirs secure, timed access.</p>
              <div className="feat-tag new-tag">New</div>
            </div>
            <div className="feat-card glass fade-in" style={{transitionDelay:'.42s'}}>
              <div className="feat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
              <h3>Next of Kin &amp; Beneficiary Hub</h3>
              <p>Add family members, assign roles — executor, trustee, guardian, healthcare proxy — and manage beneficiary designations across all accounts with one click.</p>
            </div>
            <div className="feat-card glass fade-in" style={{transitionDelay:'.49s'}}>
              <div className="feat-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
              <h3>Life Event Triggers</h3>
              <p>Got married? Had a child? Axion detects life changes and automatically recommends updates to your estate plan — so it&apos;s never outdated when it matters most.</p>
              <div className="feat-tag new-tag">New</div>
            </div>
            <div className="feat-card glass fade-in" style={{transitionDelay:'.56s'}}>
              <div className="feat-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg></div>
              <h3>AI Estate Advisor (24/7)</h3>
              <p>Ask anything — &quot;What happens to my business if I die?&quot; — and get instant, personalized answers backed by legal knowledge.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI SHOWCASE */}
      <section className="ai-showcase-section">
        <div className="container ai-showcase-inner">
          <div className="ai-showcase-text fade-in">
            <div className="section-eyebrow">AI ADVISOR</div>
            <h2 className="section-title">Your personal estate advisor.<br /><span className="gradient-text">Available 24/7.</span></h2>
            <p>Ask Axion anything about your estate plan. Get instant, legally-informed answers. Request amendments. Simulate scenarios. Our AI understands your entire financial picture — because it built it.</p>
            <div className="ai-capabilities">
              <div className="ai-cap"><span className="cap-check">✓</span> Draft will amendments on demand</div>
              <div className="ai-cap"><span className="cap-check">✓</span> Simulate inheritance scenarios</div>
              <div className="ai-cap"><span className="cap-check">✓</span> Calculate estate tax exposure</div>
              <div className="ai-cap"><span className="cap-check">✓</span> Explain legal concepts in plain English</div>
              <div className="ai-cap"><span className="cap-check">✓</span> Flag outdated beneficiary designations</div>
              <div className="ai-cap"><span className="cap-check">✓</span> Recommend trust structures for your situation</div>
            </div>
          </div>
          <div className="ai-chat-demo fade-in" style={{transitionDelay:'.15s'}}>
            <div className="chat-demo-header glass">
              <span className="ai-hex-sm">⬡</span>
              <span className="chat-demo-name">Axion AI</span>
              <span className="chat-demo-status">● Online</span>
            </div>
            <div className="chat-demo-body glass">
              <div className="demo-msg demo-user">What happens to my $2M brokerage account when I die?</div>
              <div className="demo-msg demo-ai">
                <div className="demo-ai-inner">
                  Your Fidelity account ending in 4821 currently has <strong>no TOD (Transfer on Death) beneficiary</strong> — this means it would go through probate, which can take 6–18 months and cost 3–5% of the account value.
                  <br /><br />
                  I recommend one of two approaches:<br /><br />
                  <strong>Option 1:</strong> Add your daughter Sarah as TOD beneficiary directly on the account (takes 5 min, bypasses probate entirely).<br />
                  <strong>Option 2:</strong> Transfer ownership to your existing revocable trust — gives you more control over distribution timing.
                  <br /><br />
                  <span className="demo-action-row">
                    <span className="demo-action-btn">Add TOD Beneficiary →</span>
                    <span className="demo-action-btn">Transfer to Trust →</span>
                  </span>
                </div>
              </div>
              <div className="demo-msg demo-user">Let&apos;s go with option 2. Update the trust.</div>
              <div className="demo-msg demo-ai">
                <div className="demo-ai-inner">
                  <span className="typing-indicator"><span></span><span></span><span></span></span>
                  <span className="demo-typing-text">Drafting trust amendment to add Fidelity account #4821...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section" id="how-it-works">
        <div className="container">
          <div className="section-eyebrow">PROCESS</div>
          <h2 className="section-title">From zero to a signed estate plan<br /><span className="gradient-text">in under 30 minutes.</span></h2>
          <div className="how-steps">
            {[
              { num:'01', icon:'🧠', title:'Tell Axion about yourself', desc:'12 guided questions about your family, assets, and wishes. Our AI builds your complete estate profile and identifies every document you need.' },
              { num:'02', icon:'⚡', title:'AI drafts your documents', desc:'In minutes, Axion generates your will, trust documents, power of attorney, and healthcare directive — fully personalized and legally formatted.' },
              { num:'03', icon:'✍️', title:'Attorney reviews & signs', desc:'We connect you with a vetted estate attorney from our network. They review your documents and execute them via DocuSign — no office visit required.' },
              { num:'04', icon:'🛡️', title:'Your estate, always current', desc:'Connect your accounts for live tracking. Axion monitors life events and alerts you when your plan needs an update. Your estate evolves as your life does.' },
            ].map((step, i) => (
              <div className="how-step fade-in" key={step.num} style={{transitionDelay:`${i*0.1}s`}}>
                <div className="how-step-num">{step.num}</div>
                <div className="how-step-body glass">
                  <div className="how-icon">{step.icon}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="integrations-section" id="integrations">
        <div className="container">
          <div className="section-eyebrow">INTEGRATIONS</div>
          <h2 className="section-title">Connects to your entire <span className="gradient-text">financial world.</span></h2>
          <p className="section-sub">Axion pulls live data from every account that matters — so your estate value is always accurate, and nothing slips through the cracks.</p>
          <div className="integrations-grid">
            {[
              { delay:0, svg: <svg viewBox="0 0 120 40" className="brand-svg"><text x="6" y="28" fontFamily="Georgia,serif" fontSize="22" fontWeight="700" fill="#538f33">fidelity</text></svg> },
              { delay:.05, svg: <svg viewBox="0 0 120 40" className="brand-svg"><text x="4" y="27" fontFamily="Arial,sans-serif" fontSize="19" fontWeight="700" fill="#0078b3">schwab</text><rect x="4" y="30" width="76" height="2.5" rx="1.25" fill="#0078b3" opacity="0.5"/></svg> },
              { delay:.1, svg: <svg viewBox="0 0 120 40" className="brand-svg"><circle cx="18" cy="20" r="15" fill="#0052ff"/><circle cx="18" cy="20" r="9" fill="#fff"/><circle cx="18" cy="20" r="5" fill="#0052ff"/><text x="38" y="26" fontFamily="Arial,sans-serif" fontSize="16" fontWeight="600" fill="#0052ff">Coinbase</text></svg> },
              { delay:.15, svg: <svg viewBox="0 0 130 40" className="brand-svg"><polygon points="14,32 20,10 26,32 22,28 20,22 18,28" fill="#bb0000"/><text x="33" y="27" fontFamily="Arial,sans-serif" fontSize="16" fontWeight="700" fill="#bb0000">VANGUARD</text></svg> },
              { delay:.2, svg: <svg viewBox="0 0 130 40" className="brand-svg"><path d="M16 8 C16 8 22 10 22 16 C22 20 19 23 16 24 L16 32 L12 32 L12 8 Z" fill="#00c805"/><path d="M16 16 C16 16 24 18 26 24 L22 26 C20 22 16 20 16 20 Z" fill="#00c805"/><text x="32" y="27" fontFamily="Arial,sans-serif" fontSize="16" fontWeight="700" fill="#00c805">Robinhood</text></svg> },
              { delay:.25, svg: <svg viewBox="0 0 110 40" className="brand-svg"><path d="M8 28 L8 18 L16 12 L24 18 L24 28 Z" fill="none" stroke="#006aff" strokeWidth="2.5"/><path d="M13 28 L13 22 L19 22 L19 28 Z" fill="#006aff"/><text x="30" y="27" fontFamily="Arial,sans-serif" fontSize="18" fontWeight="700" fill="#006aff">zillow</text></svg> },
              { delay:.3, svg: <svg viewBox="0 0 130 40" className="brand-svg"><rect x="6" y="8" width="22" height="26" rx="3" fill="none" stroke="#ffb600" strokeWidth="2"/><path d="M10 18 L18 26 L24 14" stroke="#ffb600" strokeWidth="2.5" fill="none" strokeLinecap="round"/><text x="34" y="27" fontFamily="Arial,sans-serif" fontSize="15" fontWeight="700" fill="#ffb600">DocuSign</text></svg> },
              { delay:.35, svg: <svg viewBox="0 0 110 40" className="brand-svg"><path d="M20 6 L6 20 L20 34 L34 20 Z" fill="none" stroke="#117aca" strokeWidth="2.5"/><path d="M20 6 L20 34 M6 20 L34 20" stroke="#117aca" strokeWidth="2.5"/><text x="42" y="27" fontFamily="Arial,sans-serif" fontSize="18" fontWeight="700" fill="#117aca">Chase</text></svg> },
              { delay:.4, svg: <svg viewBox="0 0 130 40" className="brand-svg"><rect x="6" y="10" width="14" height="20" rx="1" fill="#e31837"/><rect x="22" y="10" width="6" height="20" rx="1" fill="#012169"/><rect x="30" y="10" width="14" height="20" rx="1" fill="#e31837"/><text x="50" y="27" fontFamily="Arial,sans-serif" fontSize="11" fontWeight="700" fill="#012169">Bank of America</text></svg> },
              { delay:.45, svg: <svg viewBox="0 0 100 40" className="brand-svg"><rect x="6" y="10" width="8" height="8" rx="1" fill="#111"/><rect x="16" y="10" width="8" height="8" rx="1" fill="#111" opacity="0.5"/><rect x="6" y="20" width="8" height="8" rx="1" fill="#111" opacity="0.5"/><rect x="16" y="20" width="8" height="8" rx="1" fill="#111"/><text x="32" y="27" fontFamily="Arial,sans-serif" fontSize="18" fontWeight="700" fill="#111">plaid</text></svg> },
              { delay:.5, svg: <svg viewBox="0 0 120 40" className="brand-svg"><text x="6" y="28" fontFamily="Arial,sans-serif" fontSize="20" fontWeight="800" fill="#6633cc">E</text><text x="22" y="28" fontFamily="Arial,sans-serif" fontSize="14" fontWeight="800" fill="#ff6600">*</text><text x="30" y="28" fontFamily="Arial,sans-serif" fontSize="20" fontWeight="800" fill="#6633cc">TRADE</text></svg> },
              { delay:.55, svg: <svg viewBox="0 0 130 40" className="brand-svg"><circle cx="20" cy="20" r="14" fill="#2ca01c"/><circle cx="20" cy="20" r="8" fill="#fff"/><circle cx="20" cy="20" r="4" fill="#2ca01c"/><rect x="27" y="11" width="5" height="18" rx="2.5" fill="#2ca01c"/><text x="38" y="27" fontFamily="Arial,sans-serif" fontSize="14" fontWeight="700" fill="#2ca01c">QuickBooks</text></svg> },
            ].map((card, i) => (
              <div key={i} className="int-card glass fade-in" style={{transitionDelay:`${card.delay}s`}}>{card.svg}</div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="services-section" id="services">
        <div className="container">
          <div className="section-eyebrow">SERVICES</div>
          <h2 className="section-title">Every document you need.</h2>
          <div className="services-grid">
            {[
              { num:'01', title:'Last Will & Testament', desc:'AI-drafted, attorney-reviewed wills that distribute your assets exactly as you intend.' },
              { num:'02', title:'Revocable Living Trust', desc:'Avoid probate, maintain privacy, and protect assets with a properly structured trust.' },
              { num:'03', title:'Power of Attorney', desc:'Designate trusted individuals to manage financial and legal affairs if incapacitated.' },
              { num:'04', title:'Healthcare Directive', desc:'Document medical wishes and appoint a healthcare proxy with legal enforceability.' },
              { num:'05', title:'Business Succession Plan', desc:"For business owners — transfer ownership, resolve key-person issues, protect your company's future." },
              { num:'06', title:'Charitable Giving Strategy', desc:'Set up donor-advised funds, charitable remainder trusts, and foundation vehicles — with tax modeling.' },
              { num:'07', title:'Minor & Special Needs Trusts', desc:'Protect children and dependents with trusts that govern distributions until they reach adulthood.' },
              { num:'08', title:'Emergency Access Protocol', desc:'Secure, time-locked vault access for your executor — automatically triggered upon verified death.' },
              { num:'09', title:'Probate Avoidance Analysis', desc:'AI scans your accounts and flags every asset that would be stuck in probate — and fixes it.' },
            ].map((svc, i) => (
              <div key={svc.num} className="svc-item fade-in" style={{transitionDelay:`${i*0.05}s`}}>
                <span className="svc-num">{svc.num}</span>
                <h4>{svc.title}</h4>
                <p>{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section">
        <div className="container">
          <div className="section-eyebrow">CUSTOMER STORIES</div>
          <h2 className="section-title">Trusted by thousands of<br /><span className="gradient-text">families just like yours.</span></h2>
          <div className="testimonials-grid">
            {[
              { initials:'RC', quote:'Axion saved me $9,200 in attorney fees and had my entire estate plan completed in a single afternoon. My trust was signed and executed the same week. I couldn\'t believe how easy it was.', name:'Robert Chen', role:'Business Owner · Austin, TX · $4.2M estate' },
              { initials:'SW', quote:"I'd been putting off estate planning for years. Axion walked me through everything in 20 minutes. My attorney said the AI-drafted documents were the most thorough she'd seen in 15 years of practice.", name:'Dr. Sarah Whitfield', role:'Physician · Denver, CO · Mother of 3' },
              { initials:'MD', quote:"After my father passed with no will, our family spent two years in probate court. I vowed never to leave my kids in that situation. Axion made the whole process approachable and actually affordable.", name:'Maria Delgado', role:'CFO · Miami, FL · Estate plan complete in 1 day' },
            ].map((t, i) => (
              <div key={t.initials} className="testi-card glass fade-in" style={{transitionDelay:`${i*0.1}s`}}>
                <div className="testi-stars">★★★★★</div>
                <p className="testi-quote">&quot;{t.quote}&quot;</p>
                <div className="testi-author">
                  <div className="testi-avatar">{t.initials}</div>
                  <div>
                    <div className="testi-name">{t.name}</div>
                    <div className="testi-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about-section" id="about">
        <div className="container about-inner">
          <div className="about-text fade-in">
            <div className="section-eyebrow">ABOUT AXION</div>
            <h2 className="section-title">Estate planning was broken.<br /><span className="gradient-text">We fixed it.</span></h2>
            <p>Traditional estate planning is expensive, slow, and almost immediately out of date. Most Americans die with an outdated will — or no will at all. Axion exists to change that.</p>
            <p>We built the platform we wished existed: AI that drafts, attorneys who review, and technology that keeps your estate current as your life evolves. Your legacy shouldn&apos;t require a law degree to manage.</p>
            <div className="about-metrics">
              <div className="am-item"><span className="am-val">10x</span><span className="am-label">Faster setup</span></div>
              <div className="am-item"><span className="am-val">95%</span><span className="am-label">Cost reduction</span></div>
              <div className="am-item"><span className="am-val">Always</span><span className="am-label">Up to date</span></div>
            </div>
            <Link href="/login" className="btn btn-primary">Join the Waitlist</Link>
          </div>
          <div className="about-cards fade-in" style={{transitionDelay:'.15s'}}>
            <div className="about-stat-card glass">
              <div className="asc-icon">⚠️</div>
              <div className="asc-content"><div className="asc-num">68%</div><div className="asc-text">of Americans have no will or estate plan</div></div>
            </div>
            <div className="about-stat-card glass">
              <div className="asc-icon">💸</div>
              <div className="asc-content"><div className="asc-num">$7,500</div><div className="asc-text">avg. attorney fees for a basic estate plan</div></div>
            </div>
            <div className="about-stat-card glass">
              <div className="asc-icon">⏱️</div>
              <div className="asc-content"><div className="asc-num">4–6 mo.</div><div className="asc-text">avg. time for traditional estate planning</div></div>
            </div>
            <div className="about-stat-card glass highlight-card">
              <div className="asc-icon">🚀</div>
              <div className="asc-content"><div className="asc-num">12 min</div><div className="asc-text">average Axion setup time</div></div>
            </div>
          </div>
        </div>

        {/* TEAM */}
        <div className="team-section fade-in" style={{marginTop:'80px',transitionDelay:'.1s'}}>
          <div className="section-eyebrow" style={{textAlign:'center',marginBottom:'16px'}}>THE TEAM</div>
          <h2 className="section-title" style={{textAlign:'center',marginBottom:'48px'}}>Built by experts who&apos;ve<br /><span className="gradient-text">lived the problem.</span></h2>
          <div className="team-grid">
            {[
              { initials:'TK', name:'Tyler Kahan', role:'CEO & Co-Founder', bio:'Former Goldman Sachs Wealth Management. Led estate strategy for $2B+ in client assets. Harvard Law, JD.', grad:'linear-gradient(135deg,#0044cc,#0099ff)' },
              { initials:'AW', name:'Alicia Wren', role:'CTO & Co-Founder', bio:'Former Google DeepMind researcher. Built AI document systems processing 10M+ legal texts. MIT Computer Science.', grad:'linear-gradient(135deg,#330088,#7700cc)' },
              { initials:'DM', name:'David Marcus', role:'Chief Legal Officer', bio:'30 years estate law. Former ABA Estate Planning Committee Chair. Author of "The Modern Estate" (Wiley, 2022).', grad:'linear-gradient(135deg,#006633,#00aa55)' },
              { initials:'JL', name:'Jennifer Liu', role:'VP of Growth', bio:'Former Head of Growth at LegalZoom. Scaled to 500K users in 18 months. Wharton MBA.', grad:'linear-gradient(135deg,#993300,#cc6600)' },
            ].map(member => (
              <div key={member.initials} className="team-card glass">
                <div className="team-avatar" style={{background:member.grad}}>{member.initials}</div>
                <div className="team-name">{member.name}</div>
                <div className="team-role">{member.role}</div>
                <div className="team-bio">{member.bio}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="container">
          <div className="section-eyebrow">FREQUENTLY ASKED QUESTIONS</div>
          <h2 className="section-title">Everything you need<br /><span className="gradient-text">to know before you start.</span></h2>
          <div className="faq-grid">
            {[
              { q:'Is Axion a replacement for a real attorney?', a:'No — and that\'s a feature, not a limitation. Axion AI drafts your documents, then a licensed estate attorney in your state reviews every document before signing. You get attorney-quality work at a fraction of the cost. Axion is software that makes attorneys more efficient, not a substitute for legal counsel.' },
              { q:'Can I update my estate plan after I sign?', a:'Yes — unlimited updates are included in all plans. Got married? Had a child? Bought a house? Axion detects major life events and prompts you to update your plan. You can also manually update any document at any time. Re-signing a revised document costs nothing extra.' },
              { q:'How does Axion handle state-specific estate laws?', a:"Axion's AI is trained on estate law for all 50 states and is continuously updated as laws change. When you provide your state of residence, every document is generated with jurisdiction-specific language. All documents are then reviewed by a licensed attorney in your state before execution." },
              { q:'What happens to my documents if I cancel?', a:'Your signed, executed documents are legally yours forever — regardless of your Axion subscription status. You can download a complete PDF export of your entire estate plan at any time. Canceling only stops new AI updates and monitoring; your documents remain valid and accessible for 12 months post-cancellation.' },
              { q:'How secure is my data?', a:'Axion uses 256-bit AES encryption (same as the US military and major banks), is SOC 2 Type II certified, and operates on a zero-knowledge architecture for document storage — meaning even Axion employees cannot read your documents. All data is stored on AWS infrastructure with multi-region redundancy.' },
              { q:'What if my estate is complicated — multiple businesses, trusts, international assets?', a:'Axion Wealth ($199/mo) is built for complex estates. It handles entity structures (LLCs, LPs, S-Corps), irrevocable trusts (ILITs, GRATs, CRTs), international asset coordination, and business succession planning. Our dedicated attorney network includes specialists in business, cross-border, and ultra-high-net-worth estates.' },
            ].map((faq, i) => (
              <div key={i} className="faq-item">
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <svg className={`faq-arrow${openFaq === i ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {openFaq === i && <div className="faq-a">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SAVINGS */}
      <section className="savings-section">
        <div className="container">
          <div className="savings-inner fade-in">
            <div className="savings-label">THE MATH IS SIMPLE</div>
            <div className="savings-grid">
              <div className="savings-col trad">
                <div className="savings-col-label">Traditional Attorney</div>
                <div className="savings-big-num">$7,500</div>
                <div className="savings-col-sub">average one-time fee</div>
                <ul className="savings-list">
                  <li>⏱ 4–6 months to complete</li>
                  <li>📞 Multiple in-person meetings</li>
                  <li>📄 Static documents, never updates</li>
                  <li>💸 $2,000–$5,000 to revise</li>
                </ul>
              </div>
              <div className="savings-vs">VS</div>
              <div className="savings-col axion">
                <div className="savings-col-label">Axion</div>
                <div className="savings-big-num">$948<span style={{fontSize:'22px',fontWeight:500}}>/yr</span></div>
                <div className="savings-col-sub">Family plan · billed annually</div>
                <ul className="savings-list">
                  <li>⚡ 12 minutes to first draft</li>
                  <li>🤖 AI-drafted, attorney-reviewed</li>
                  <li>🔄 Auto-updates as life changes</li>
                  <li>♾ Unlimited revisions included</li>
                </ul>
              </div>
            </div>
            <div>
              <div className="savings-result-label">Year-One Savings</div>
              <div className="savings-result-num">$6,552</div>
              <div className="savings-result-sub">Average Axion customer saves $6,552 in year one alone</div>
              <Link href="/login" className="btn btn-primary btn-lg glow-btn" style={{marginTop:'28px',display:'inline-flex'}}>Start Saving Today →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="pricing">
        <div className="container">
          <div className="section-eyebrow">PRICING</div>
          <h2 className="section-title">Replace $10,000 in attorney fees<br /><span className="gradient-text">starting at just $79/month.</span></h2>
          <p className="section-sub">One afternoon replaces a 6-month attorney engagement. Unlimited updates included. Cancel anytime.</p>
          <div className="pricing-grid">
            <div className="pricing-card glass fade-in">
              <div className="plan-badge-spacer"></div>
              <div className="plan-name">Essential</div>
              <div className="plan-price">$29<span>/mo</span></div>
              <div className="plan-desc">For individuals who need the basics covered.</div>
              <ul className="plan-features">
                <li>✓ AI Will Builder</li>
                <li>✓ 1 Trust document</li>
                <li>✓ Document Vault (5GB)</li>
                <li>✓ 1 DocuSign attorney review</li>
                <li>✓ Basic AI chat</li>
                <li>✓ Net worth snapshot</li>
              </ul>
              <Link href="/login" className="btn btn-ghost btn-full">Get Started</Link>
            </div>
            <div className="pricing-card glass featured-plan fade-in" style={{transitionDelay:'.1s'}}>
              <div className="featured-badge">Most Popular</div>
              <div className="plan-name">Family</div>
              <div className="plan-price">$79<span>/mo</span></div>
              <div className="plan-desc">For families who want complete, living coverage.</div>
              <ul className="plan-features">
                <li>✓ Everything in Essential</li>
                <li>✓ Unlimited trust documents</li>
                <li>✓ Live net worth tracking</li>
                <li>✓ All integrations (Fidelity, Schwab, etc.)</li>
                <li>✓ Unlimited AI advisor chat</li>
                <li>✓ Life event triggers &amp; alerts</li>
                <li>✓ Digital asset inventory</li>
                <li>✓ Up to 4 family members</li>
              </ul>
              <Link href="/login" className="btn btn-primary btn-full glow-btn">Start Free Trial</Link>
            </div>
            <div className="pricing-card glass fade-in" style={{transitionDelay:'.2s'}}>
              <div className="plan-badge-spacer"></div>
              <div className="plan-name">Wealth</div>
              <div className="plan-price">$199<span>/mo</span></div>
              <div className="plan-desc">For high-net-worth individuals and business owners.</div>
              <ul className="plan-features">
                <li>✓ Everything in Family</li>
                <li>✓ AI tax optimization engine</li>
                <li>✓ Business succession planning</li>
                <li>✓ Charitable giving strategy</li>
                <li>✓ Dedicated attorney on call</li>
                <li>✓ Multi-entity &amp; trust structures</li>
                <li>✓ White-glove onboarding</li>
              </ul>
              <Link href="/login" className="btn btn-ghost btn-full">Talk to Sales</Link>
            </div>
          </div>
          <div className="pricing-footnote">All plans include a 14-day free trial. No credit card required to start.</div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="cta">
        <div className="cta-glow"></div>
        <div className="container cta-inner">
          <div className="section-eyebrow">GET STARTED</div>
          <h2 className="cta-title">Your family deserves a plan.<br />Build one today.</h2>
          <p className="cta-sub">Join 4,200+ families who&apos;ve already secured their legacy with Axion. Free to start — no credit card required.</p>
          <form className="cta-form" onSubmit={(e) => { e.preventDefault(); window.location.href = '/login' }}>
            <input type="text" placeholder="Full Name" className="cta-input" required />
            <input type="email" placeholder="Email Address" className="cta-input" required />
            <button type="submit" className="btn btn-primary btn-lg glow-btn">Get Early Access →</button>
          </form>
          <p className="cta-fine">Free 14-day trial. No credit card required. Cancel anytime.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Link href="/" className="logo">
              <svg className="logo-mark" width="28" height="28" viewBox="0 0 34 34" fill="none">
                <path d="M17 2L30 9.5V24.5L17 32L4 24.5V9.5L17 2Z" fill="url(#hexFillF)" stroke="url(#hexStrokeF)" strokeWidth="1"/>
                <path d="M17 9L23.5 24H20L18.2 19.5H15.8L14 24H10.5L17 9Z" fill="url(#aFillF)"/>
                <defs>
                  <linearGradient id="hexFillF" x1="4" y1="2" x2="30" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0044cc" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#0099ff" stopOpacity="0.1"/>
                  </linearGradient>
                  <linearGradient id="hexStrokeF" x1="4" y1="2" x2="30" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00ccff"/>
                    <stop offset="100%" stopColor="#0055ff"/>
                  </linearGradient>
                  <linearGradient id="aFillF" x1="10.5" y1="9" x2="23.5" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00d4ff"/>
                    <stop offset="100%" stopColor="#0066ff"/>
                  </linearGradient>
                </defs>
              </svg>
              <span>AXION</span>
            </Link>
            <p>AI-powered estate planning for the modern world. Secure your legacy in minutes.</p>
            <div className="footer-social">
              <a href="#" className="social-link">Twitter</a>
              <a href="#" className="social-link">LinkedIn</a>
              <a href="#" className="social-link">Instagram</a>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#integrations">Integrations</a>
              <a href="#pricing">Pricing</a>
              <a href="#how-it-works">How It Works</a>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <a href="#about">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
              <a href="#">Press</a>
            </div>
            <div className="footer-col">
              <h5>Legal</h5>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Security</a>
              <a href="#">Attorney Disclaimer</a>
            </div>
          </div>
        </div>
        <div className="footer-trust-bar container">
          <div className="footer-trust-badges">
            <span className="ftb">🔒 256-bit Encrypted</span><span className="ftb-sep">·</span>
            <span className="ftb">✅ SOC 2 Type II</span><span className="ftb-sep">·</span>
            <span className="ftb">⚖️ Attorney-Supervised</span><span className="ftb-sep">·</span>
            <span className="ftb">🏥 HIPAA Compliant</span><span className="ftb-sep">·</span>
            <span className="ftb">📋 Legally Binding in All 50 States</span>
          </div>
        </div>
        <div className="footer-bottom container">
          <p>© 2026 Axion Estate Planning, Inc. All rights reserved. &nbsp;·&nbsp; Axion AI drafts documents; all documents are reviewed by a licensed estate attorney in your state prior to execution. Axion is not a law firm.</p>
        </div>
      </footer>
    </>
  )
}
