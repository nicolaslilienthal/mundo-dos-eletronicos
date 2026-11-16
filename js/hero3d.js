/* ==========================================================================
   Hero 3D · "do quebrado pro novo de novo"
   Celular feito com geometria (sem modelo pesado) com a tela trincada que
   se conserta no primeiro scroll, na frente de um globo de partículas.
   Three.js entra por import() dinâmico, depois do carregamento da página.
   ========================================================================== */
(function () {
  'use strict';

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  var doc = document.documentElement;
  var canvas = document.getElementById('hero-canvas');
  var hero = document.querySelector('.hero');
  if (!canvas || !hero) return;

  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.matchMedia('(max-width: 1023px)').matches || window.matchMedia('(pointer: coarse)').matches;
  // Só memória muito baixa (Chrome/Android informa) já vai direto pro estático.
  // Não usamos hardwareConcurrency: o Safari do iPhone informa um número baixo de
  // propósito, e iPhones bons caíam no estático. Em vez disso medimos o FPS real (abaixo).
  var fraco = !!(navigator.deviceMemory && navigator.deviceMemory <= 2);

  function usarEstatico() { doc.classList.add('sem-3d'); }

  // Movimento reduzido, aparelho fraco ou sem WebGL: versão em SVG (que também "conserta" com o scroll)
  if (reduz || fraco || !temWebGL()) { usarEstatico(); return; }

  function temWebGL() {
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (e) { return false; }
  }

  // Trilhas do globo do logo (mesmas do SVG), pra desenhar na tela do celular
  var TRILHAS = ['M38.2 17.7C43.6 22.1 50.2 16.0 57.0 16', 'M27.4 23.4C38.5 27.0 51.9 22.0 69.0 22', 'M21.5 29.1C32.6 32.0 46.0 28.0 63.0 28', 'M17.8 34.8C34.3 36.9 54.2 34.0 81.0 34', 'M15.4 40.5C30.1 41.8 47.6 40.0 71.0 40', 'M14.2 46.2C33.2 46.7 55.9 46.0 87.0 46', 'M14.1 51.9C30.5 51.6 50.3 52.0 77.0 52', 'M14.9 57.6C28.7 56.6 45.2 58.0 67.0 58', 'M16.8 63.3C33.6 61.5 53.8 64.0 81.0 64', 'M20.1 69.0C33.1 66.4 48.6 70.0 69.0 70', 'M25.1 74.7C35.3 71.3 47.6 76.0 63.0 76', 'M33.5 80.4C39.6 76.2 47.0 82.0 55.0 82'];
  var NOS = [[60, 16, 1], [70.5, 22, 0], [66, 28, 1], [84, 34, 1], [72.5, 40, 0], [90, 46, 1], [80, 52, 1], [68.5, 58, 0], [84, 64, 1], [70.5, 70, 0], [66, 76, 1], [58, 82, 1], [40, 25, 0], [34, 43, 0], [44, 55, 0], [38, 67, 0], [52, 37, 0], [56, 61, 0]];

  function depoisDoLoad(fn) {
    var go = function () { (window.requestIdleCallback || setTimeout)(fn, { timeout: 1200 }); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }

  depoisDoLoad(function () {
    import(THREE_URL).then(iniciar).catch(function () { usarEstatico(); });
  });

  function iniciar(THREE) {
    /* ---------- Renderer, cena, câmera ---------- */
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { usarEstatico(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    renderer.setClearColor(0x000000, 0);

    var cena = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 11);

    cena.add(new THREE.AmbientLight(0x8a96d0, 0.9));
    var luzChave = new THREE.DirectionalLight(0xffffff, 2.2);
    luzChave.position.set(3, 5, 6);
    cena.add(luzChave);
    var luzCiano = new THREE.PointLight(0x3fa9e0, 60, 30, 2); luzCiano.position.set(-4, 2, 3); cena.add(luzCiano);
    var luzViol = new THREE.PointLight(0xa966b9, 60, 30, 2); luzViol.position.set(4, -2.5, 2.5); cena.add(luzViol);
    var luzTras = new THREE.PointLight(0x6374ce, 40, 30, 2); luzTras.position.set(0, 1, -4); cena.add(luzTras);

    /* ---------- Celular ---------- */
    var celular = new THREE.Group();
    cena.add(celular);

    function retArredondado(w, h, r) {
      var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }

    var W = 2, H = 4.1, PROF = 0.18, BEV = 0.06;
    var corpoGeo = new THREE.ExtrudeGeometry(retArredondado(W, H, 0.34), {
      depth: PROF, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: mobile ? 3 : 6, curveSegments: mobile ? 10 : 18
    });
    corpoGeo.center();
    var corpoMat = new THREE.MeshStandardMaterial({ color: 0x1b1f36, metalness: 0.6, roughness: 0.32 });
    celular.add(new THREE.Mesh(corpoGeo, corpoMat));
    var frente = PROF / 2 + BEV;

    // Tela (textura gerada em canvas)
    var TW = 512, TH = 1096;
    var telaCanvas = document.createElement('canvas'); telaCanvas.width = TW; telaCanvas.height = TH;
    var tctx = telaCanvas.getContext('2d');
    var textura = new THREE.CanvasTexture(telaCanvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = 4;

    var SW = W - 0.12, SH = H - 0.12;
    var telaGeo = new THREE.ShapeGeometry(retArredondado(SW, SH, 0.26), 20);
    var pos = telaGeo.attributes.position, uv = telaGeo.attributes.uv;
    for (var i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + SW / 2) / SW, (pos.getY(i) + SH / 2) / SH);
    var tela = new THREE.Mesh(telaGeo, new THREE.MeshBasicMaterial({ map: textura, toneMapped: false }));
    tela.position.z = frente + 0.002;
    celular.add(tela);

    // Reflexo do vidro
    var vidro = new THREE.Mesh(telaGeo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, clearcoat: 1 }));
    vidro.position.z = frente + 0.006;
    celular.add(vidro);

    // Traseira: módulo de câmera
    var escuro = new THREE.MeshStandardMaterial({ color: 0x0b0d18, metalness: 0.4, roughness: 0.25 });
    var lenteMat = new THREE.MeshStandardMaterial({ color: 0x050608, metalness: 0.9, roughness: 0.1 });
    var anelMat = new THREE.MeshStandardMaterial({ color: 0x6374ce, metalness: 0.9, roughness: 0.3 });
    var modulo = new THREE.Mesh(new THREE.ExtrudeGeometry(retArredondado(0.86, 0.86, 0.22), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), escuro);
    modulo.geometry.center();
    modulo.position.set(-0.42, 1.4, -frente - 0.04);
    celular.add(modulo);
    [[-0.6, 1.58], [-0.6, 1.22], [-0.24, 1.4]].forEach(function (p) {
      var anel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 24), anelMat);
      anel.rotation.x = Math.PI / 2; anel.position.set(p[0], p[1], -frente - 0.09); celular.add(anel);
      var lente = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 24), lenteMat);
      lente.rotation.x = Math.PI / 2; lente.position.set(p[0], p[1], -frente - 0.1); celular.add(lente);
    });
    // Botões laterais
    [[0.9, 0.32], [0.3, 0.26], [-0.1, 0.26]].forEach(function (b, k) {
      var bt = new THREE.Mesh(new THREE.BoxGeometry(0.05, b[1], 0.1), corpoMat);
      bt.position.set(k === 0 ? W / 2 + BEV + 0.01 : -W / 2 - BEV - 0.01, b[0], 0);
      celular.add(bt);
    });

    /* ---------- Desenho da tela: quebrada e consertada ---------- */
    function camada() { var c = document.createElement('canvas'); c.width = TW; c.height = TH; return c; }
    var acesa = camada(), quebrada = camada();

    function desenharAcesa() {
      var c = acesa.getContext('2d');
      var g = c.createRadialGradient(TW * 0.5, TH * 0.36, 20, TW * 0.5, TH * 0.45, TH * 0.75);
      g.addColorStop(0, '#1f2766'); g.addColorStop(0.45, '#0c1030'); g.addColorStop(1, '#05060b');
      c.fillStyle = g; c.fillRect(0, 0, TW, TH);
      // barra de status
      c.fillStyle = '#F2F4FA'; c.font = '600 26px Manrope, sans-serif'; c.textBaseline = 'middle';
      c.fillText('08:30', 40, 52);
      c.strokeStyle = '#F2F4FA'; c.lineWidth = 2.5; c.strokeRect(TW - 92, 40, 46, 24);
      c.fillStyle = '#FFC83D'; c.fillRect(TW - 88, 44, 38, 16); c.fillStyle = '#F2F4FA'; c.fillRect(TW - 44, 47, 4, 10);
      // globo do logo
      var grad = c.createLinearGradient(140, 520, 380, 220);
      grad.addColorStop(0, '#3FA9E0'); grad.addColorStop(0.5, '#6374CE'); grad.addColorStop(1, '#A966B9');
      c.save(); c.translate(TW / 2 - 150, 210); c.scale(3, 3);
      c.strokeStyle = grad; c.fillStyle = grad; c.lineCap = 'round'; c.lineWidth = 2.3;
      c.shadowColor = 'rgba(99,116,206,.9)'; c.shadowBlur = 8;
      TRILHAS.forEach(function (d) { c.stroke(new Path2D(d)); });
      NOS.forEach(function (n) {
        c.beginPath(); c.arc(n[0], n[1], n[2] ? 2.3 : 1.6, 0, Math.PI * 2);
        if (n[2]) { c.lineWidth = 1.7; c.stroke(); } else c.fill();
      });
      c.restore();
      // "Mundo" em gradiente
      var gt = c.createLinearGradient(80, 0, 430, 0);
      gt.addColorStop(0, '#3FA9E0'); gt.addColorStop(0.5, '#6374CE'); gt.addColorStop(1, '#A966B9');
      c.textAlign = 'center'; c.fillStyle = gt; c.font = '800 104px Unbounded, sans-serif';
      c.shadowColor = 'rgba(99,116,206,.8)'; c.shadowBlur = 24;
      c.fillText('Mundo', TW / 2, 600);
      c.shadowBlur = 0;
      c.fillStyle = '#F2F4FA'; c.font = '700 36px Manrope, sans-serif';
      c.fillText('Dos Eletrônicos', TW / 2, 670);
      // etiqueta de status
      c.strokeStyle = 'rgba(255,200,61,.6)'; c.lineWidth = 2;
      redondo(c, TW / 2 - 190, 800, 380, 64, 32); c.stroke();
      c.fillStyle = '#FFC83D'; c.font = '500 25px "JetBrains Mono", monospace';
      c.fillText('STATUS: CONSERTADO ✓', TW / 2, 833);
      c.fillStyle = 'rgba(242,244,250,.5)'; c.font = '500 20px "JetBrains Mono", monospace';
      c.fillText('OS #001 · TROCA DE TELA', TW / 2, 920);
      // brilho diagonal do vidro
      var b = c.createLinearGradient(0, 0, TW, TH);
      b.addColorStop(0.3, 'rgba(255,255,255,0)'); b.addColorStop(0.42, 'rgba(255,255,255,.06)'); b.addColorStop(0.5, 'rgba(255,255,255,0)');
      c.fillStyle = b; c.fillRect(0, 0, TW, TH);
      // câmera frontal
      c.fillStyle = '#000'; c.beginPath(); c.arc(TW / 2, 46, 14, 0, Math.PI * 2); c.fill();
    }

    function redondo(c, x, y, w, h, r) {
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }

    // Rachaduras procedurais (raios irregulares + anéis a partir do ponto de impacto)
    function desenharQuebrada() {
      var c = quebrada.getContext('2d');
      c.fillStyle = '#030306'; c.fillRect(0, 0, TW, TH);
      // pixels mortos / listras de tela danificada
      var listras = [[118, '#ff2d9a', 3], [124, '#2dffb0', 2], [366, '#6c7bff', 4], [372, '#ffffff', 1]];
      listras.forEach(function (l) { c.globalAlpha = 0.35; c.fillStyle = l[1]; c.fillRect(l[0], 0, l[2], TH); });
      c.globalAlpha = 0.18; c.fillStyle = '#6374CE'; c.fillRect(0, 700, TW, 180);
      c.globalAlpha = 1;
      var rnd = semente(7);
      impacto(c, TW * 0.64, TH * 0.3, 16, 1, rnd);
      impacto(c, TW * 0.22, TH * 0.78, 9, 0.6, rnd);
      c.fillStyle = '#000'; c.beginPath(); c.arc(TW / 2, 46, 14, 0, Math.PI * 2); c.fill();
    }
    function semente(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
    function impacto(c, cx, cy, raios, escala, rnd) {
      var pontas = [];
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (var r = 0; r < raios; r++) {
        var ang = (r / raios) * Math.PI * 2 + rnd() * 0.4;
        var x = cx, y = cy, pts = [[x, y]];
        var comp = (380 + rnd() * 520) * escala;
        var passo = 26 + rnd() * 20;
        for (var d = 0; d < comp; d += passo) {
          ang += (rnd() - 0.5) * 0.35;
          x += Math.cos(ang) * passo; y += Math.sin(ang) * passo;
          pts.push([x, y]);
          if (rnd() < 0.12) galho(c, x, y, ang + (rnd() > 0.5 ? 0.9 : -0.9), 60 + rnd() * 120, rnd);
        }
        pontas.push(pts);
        c.strokeStyle = 'rgba(225,232,255,' + (0.55 + rnd() * 0.4) + ')';
        c.lineWidth = (1.2 + rnd() * 1.6) * (escala < 1 ? 0.8 : 1);
        c.beginPath(); pts.forEach(function (p, k) { k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke();
      }
      // anéis ligando os raios
      [2, 4, 7].forEach(function (idx) {
        c.strokeStyle = 'rgba(225,232,255,.45)'; c.lineWidth = 1;
        c.beginPath();
        pontas.forEach(function (pts, k) { var p = pts[Math.min(idx, pts.length - 1)]; k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
        c.closePath(); c.stroke();
      });
      // estilhaço no centro do impacto
      var g = c.createRadialGradient(cx, cy, 0, cx, cy, 90 * escala);
      g.addColorStop(0, 'rgba(240,244,255,.55)'); g.addColorStop(1, 'rgba(240,244,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 90 * escala, 0, Math.PI * 2); c.fill();
    }
    function galho(c, x, y, ang, comp, rnd) {
      c.strokeStyle = 'rgba(225,232,255,.4)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(x, y);
      for (var d = 0; d < comp; d += 18) { ang += (rnd() - 0.5) * 0.5; x += Math.cos(ang) * 18; y += Math.sin(ang) * 18; c.lineTo(x, y); }
      c.stroke();
    }

    var ultimoFix = -1;
    function compor(fix) {
      if (Math.abs(fix - ultimoFix) < 0.004) return;
      ultimoFix = fix;
      tctx.globalAlpha = 1; tctx.fillStyle = '#030306'; tctx.fillRect(0, 0, TW, TH);
      // a tela acende conforme conserta; as rachaduras se apagam
      var luz = Math.max(0, (fix - 0.25) / 0.75);
      tctx.globalAlpha = luz; tctx.drawImage(acesa, 0, 0);
      tctx.globalAlpha = 1 - Math.min(1, fix * 1.15); tctx.drawImage(quebrada, 0, 0);
      tctx.globalAlpha = 1;
      textura.needsUpdate = true;
    }

    /* ---------- Globo de partículas (pontos ligados por linhas finas) ---------- */
    var N = mobile ? 360 : 1100, R = 3.3;
    var posicoes = new Float32Array(N * 3), cores = new Float32Array(N * 3);
    var cA = new THREE.Color(0x3fa9e0), cB = new THREE.Color(0x6374ce), cC = new THREE.Color(0xa966b9), tmp = new THREE.Color();
    var ouro = Math.PI * (3 - Math.sqrt(5));
    for (var k = 0; k < N; k++) {
      var yy = 1 - (k / (N - 1)) * 2, rr = Math.sqrt(1 - yy * yy), th = ouro * k;
      posicoes[k * 3] = Math.cos(th) * rr * R; posicoes[k * 3 + 1] = yy * R; posicoes[k * 3 + 2] = Math.sin(th) * rr * R;
      var t = (yy + 1) / 2;
      if (t < 0.5) tmp.copy(cA).lerp(cB, t * 2); else tmp.copy(cB).lerp(cC, (t - 0.5) * 2);
      cores[k * 3] = tmp.r; cores[k * 3 + 1] = tmp.g; cores[k * 3 + 2] = tmp.b;
    }
    var pontosGeo = new THREE.BufferGeometry();
    pontosGeo.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
    pontosGeo.setAttribute('color', new THREE.BufferAttribute(cores, 3));

    var sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    var sc = sprite.getContext('2d'), sg = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(0.35, 'rgba(255,255,255,.6)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    sc.fillStyle = sg; sc.fillRect(0, 0, 64, 64);
    var pontos = new THREE.Points(pontosGeo, new THREE.PointsMaterial({
      size: mobile ? 0.11 : 0.085, map: new THREE.CanvasTexture(sprite), vertexColors: true,
      transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending
    }));

    // liga cada ponto aos vizinhos próximos (como as trilhas do logo)
    var lim = (R * 2.15 / Math.sqrt(N)) * 1.35, lim2 = lim * lim, segs = [], segCores = [];
    for (var a = 0; a < N; a++) {
      var liga = 0;
      for (var b = a + 1; b < N && liga < 2; b++) {
        var dx = posicoes[a * 3] - posicoes[b * 3], dy = posicoes[a * 3 + 1] - posicoes[b * 3 + 1], dz = posicoes[a * 3 + 2] - posicoes[b * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < lim2) {
          segs.push(posicoes[a * 3], posicoes[a * 3 + 1], posicoes[a * 3 + 2], posicoes[b * 3], posicoes[b * 3 + 1], posicoes[b * 3 + 2]);
          segCores.push(cores[a * 3], cores[a * 3 + 1], cores[a * 3 + 2], cores[b * 3], cores[b * 3 + 1], cores[b * 3 + 2]);
          liga++;
        }
      }
    }
    var linhasGeo = new THREE.BufferGeometry();
    linhasGeo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    linhasGeo.setAttribute('color', new THREE.Float32BufferAttribute(segCores, 3));
    var linhas = new THREE.LineSegments(linhasGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));

    var globo = new THREE.Group();
    globo.add(pontos, linhas);
    globo.position.z = -3;
    globo.rotation.z = 0.3;
    cena.add(globo);

    /* ---------- Tamanho / layout ---------- */
    function redimensionar() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // afasta a câmera em telas estreitas pro celular caber inteiro
      camera.position.z = camera.aspect < 0.8 ? 13 : camera.aspect < 1 ? 12 : 11;
      camera.updateProjectionMatrix();
      celular.position.x = mobile ? 0 : 0.35;
      globo.position.x = mobile ? 0 : 0.35;
    }
    new ResizeObserver(redimensionar).observe(canvas);
    redimensionar();

    /* ---------- Mouse ---------- */
    var mx = 0, my = 0, smx = 0, smy = 0;
    if (!mobile) {
      window.addEventListener('pointermove', function (e) {
        mx = (e.clientX / window.innerWidth) * 2 - 1;
        my = (e.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
    }

    /* ---------- Laço (pausa fora da tela e com a aba oculta) ---------- */
    var visivel = true, abaAtiva = !document.hidden, rodando = false;
    var relogio = new THREE.Clock();
    var fixSuave = 0;

    function progressoFix() { return Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.55))); }

    // Teste de fluidez real: se o aparelho não aguentar (~24 fps), troca pro SVG estático
    var amostras = 0, somaDt = 0, testado = false;
    function testarFluidez(dtReal) {
      if (testado) return;
      amostras++;
      if (amostras <= 15) return;              // ignora os primeiros quadros (compilação/aquecimento)
      somaDt += dtReal;
      if (amostras < 75) return;
      testado = true;
      if (somaDt / (amostras - 15) > 1 / 24) {
        renderer.setAnimationLoop(null); rodando = false; desistiu = true;
        canvas.classList.remove('pronto');
        usarEstatico();
        renderer.dispose();
      }
    }
    var desistiu = false;

    function quadro() {
      var bruto = relogio.getDelta();
      testarFluidez(bruto);
      var dt = Math.min(bruto, 0.05), t = relogio.elapsedTime;
      fixSuave += (progressoFix() - fixSuave) * 0.12;
      compor(fixSuave);
      smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;
      // uma volta completa enquanto conserta: termina de frente, com a tela nova
      celular.rotation.y = Math.sin(t * 0.45) * 0.28 * (1 - fixSuave * 0.5) + smx * 0.45 + fixSuave * Math.PI * 2 - 0.25 * (1 - fixSuave);
      celular.rotation.x = -0.06 + smy * 0.22 + Math.sin(t * 0.6) * 0.04;
      celular.rotation.z = 0.08 * (1 - fixSuave);
      celular.position.y = Math.sin(t * 0.9) * 0.1;
      globo.rotation.y += dt * 0.08;
      globo.rotation.x = smy * 0.15;
      globo.position.y = -smy * 0.15;
      renderer.render(cena, camera);
    }
    function atualizarLaco() {
      var deve = visivel && abaAtiva && !desistiu;
      if (deve && !rodando) { relogio.getDelta(); renderer.setAnimationLoop(quadro); rodando = true; }
      else if (!deve && rodando) { renderer.setAnimationLoop(null); rodando = false; }
    }
    new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; atualizarLaco(); }).observe(hero);
    document.addEventListener('visibilitychange', function () { abaAtiva = !document.hidden; atualizarLaco(); });

    /* ---------- Começa depois das fontes (o canvas usa Unbounded/Manrope/Mono) ---------- */
    var fontes = document.fonts ? Promise.race([
      Promise.all([
        document.fonts.load('800 104px Unbounded'), document.fonts.load('700 36px Manrope'), document.fonts.load('500 25px "JetBrains Mono"')
      ]),
      new Promise(function (r) { setTimeout(r, 2500); })
    ]) : Promise.resolve();
    fontes.then(function () {
      desenharAcesa(); desenharQuebrada();
      compor(progressoFix());
      renderer.compile(cena, camera);
      renderer.render(cena, camera);
      canvas.classList.add('pronto');
      atualizarLaco();
    }).catch(function () { usarEstatico(); });
  }
})();
