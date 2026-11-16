/* ==========================================================================
   Mundo dos Eletrônicos · interações e animações
   Script clássico (defer) de propósito: assim o site funciona até abrindo
   o index.html direto do computador (file://), sem servidor.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Configuração ---------- */
  var NUMERO = '5553991459101';

  /* CONFIRMAR COM O CLIENTE: horário completo de seg a sáb.
     0 = domingo … 6 = sábado. Cada dia aceita vários intervalos,
     ex.: [['08:30','12:00'], ['13:30','18:00']] se fechar pro almoço
     (a placa na vitrine parece indicar pausa ao meio-dia). */
  var HORARIOS = {
    0: [],
    1: [['08:30', '18:00']],
    2: [['08:30', '18:00']],
    3: [['08:30', '18:00']],
    4: [['08:30', '18:00']],
    5: [['08:30', '18:00']],
    6: [['08:30', '18:00']]
  };

  var doc = document.documentElement;
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ponteiroFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var temGSAP = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  if (!temGSAP) doc.classList.add('sem-gsap');
  if (reduz) doc.classList.add('rm');

  /* ---------- 0. Intro (o CSS faz a animação; aqui só marcamos a visita) ---------- */
  var comIntro = doc.classList.contains('intro-on');
  if (comIntro) {
    try { sessionStorage.setItem('mundo-intro', '1'); } catch (e) {}
    setTimeout(function () { doc.classList.remove('intro-on'); }, 1350);
  }

  /* ---------- 1. Scroll suave (Lenis) integrado ao ScrollTrigger ---------- */
  var lenis = null;
  if (!reduz && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    window.mundoLenis = lenis; // acesso pra depuração/testes
    if (temGSAP) {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var rafLenis = function (t) { lenis.raf(t); requestAnimationFrame(rafLenis); };
      requestAnimationFrame(rafLenis);
    }
  } else if (temGSAP) {
    gsap.registerPlugin(ScrollTrigger);
  }

  function irPara(alvo) {
    if (!alvo) return;
    if (lenis) lenis.scrollTo(alvo, { offset: -64, duration: 1.3 });
    else alvo.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
    // foco acessível no destino, sem pular a rolagem
    if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
    setTimeout(function () { alvo.focus({ preventScroll: true }); }, reduz ? 0 : 900);
  }

  /* ---------- 2. Links internos + botões "Orçar" que já marcam o serviço ---------- */
  var form = $('#form-orc');

  function marcar(nome, valor) {
    if (!form || !valor) return;
    var r = $$('input[name="' + nome + '"]', form).filter(function (i) { return i.value === valor; })[0];
    // checkbox (serviço): só adiciona, sem desmarcar o que a pessoa já escolheu
    if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var alvo = document.getElementById(id.slice(1));
    if (!alvo) return;
    e.preventDefault();
    if (a.dataset.servico) marcar('servico', a.dataset.servico);
    if (a.dataset.preferencia) marcar('preferencia', a.dataset.preferencia);
    fecharMenu();
    irPara(alvo);
  });

  /* ---------- 3. Header, barra de progresso e estado do hero (num único laço de scroll) ---------- */
  var topo = $('[data-topo]');
  var barra = $('.progresso span');
  var hero = $('.hero');
  var statusTxt = $('[data-status]');
  var ultimoY = window.scrollY;
  var menuAberto = false;
  var circuitoLinha = null;
  var velocidade = 0;
  var agendado = false;
  var alturaRolavel = 0;
  var alturaVisivel = window.innerHeight;
  // mede a altura da página só quando ela muda (evita forçar layout a cada quadro de scroll)
  function medirPagina() {
    alturaVisivel = window.innerHeight;
    alturaRolavel = document.documentElement.scrollHeight - alturaVisivel;
  }
  medirPagina();
  window.addEventListener('resize', medirPagina);
  if ('ResizeObserver' in window) new ResizeObserver(medirPagina).observe(document.body);

  function aoRolar() {
    agendado = false;
    var y = window.scrollY;
    var total = alturaRolavel;
    var p = total > 0 ? clamp(y / total, 0, 1) : 0;
    var delta = y - ultimoY;
    velocidade = delta;

    // barra de progresso
    if (barra) barra.style.setProperty('--p', p.toFixed(4));
    // linha de circuito global acompanha a página inteira
    if (circuitoLinha) circuitoLinha.style.strokeDashoffset = (1 - p).toFixed(4);

    // header: fundo sólido depois do topo; some descendo, volta subindo
    if (topo) {
      topo.classList.toggle('is-solido', y > 40);
      if (!menuAberto) {
        if (delta > 4 && y > 240) topo.classList.add('is-escondido');
        else if (delta < -4 || y < 240) topo.classList.remove('is-escondido');
      }
      doc.classList.toggle('topo-oculto', topo.classList.contains('is-escondido'));
    }

    // hero: do quebrado pro novo (0 → 1 no primeiro scroll)
    if (hero) {
      var fix = clamp(y / (alturaVisivel * 0.55), 0, 1);
      hero.style.setProperty('--fix', fix.toFixed(3));
      var ok = fix > 0.85;
      if (ok !== hero.classList.contains('consertado')) {
        hero.classList.toggle('consertado', ok);
        if (statusTxt) statusTxt.textContent = ok ? 'CONSERTADO ✓' : 'TELA QUEBRADA';
      }
    }
    ultimoY = y;
  }
  window.addEventListener('scroll', function () {
    if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); }
  }, { passive: true });
  aoRolar();

  // link ativo no menu conforme a seção
  var navLinks = $$('.topo-nav a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var ioNav = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (l) { l.classList.toggle('ativo', l.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    navLinks.forEach(function (l) { var s = $(l.getAttribute('href')); if (s) ioNav.observe(s); });
  }

  /* ---------- 4. Menu mobile ---------- */
  var menuBtn = $('.menu-btn');
  var menu = $('#menu-mobile');
  function abrirMenu() {
    menuAberto = true;
    menu.classList.add('aberto'); menu.removeAttribute('inert');
    menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Fechar menu');
    topo.classList.remove('is-escondido');
    if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
  }
  function fecharMenu() {
    if (!menuAberto) return;
    menuAberto = false;
    menu.classList.remove('aberto'); menu.setAttribute('inert', '');
    menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Abrir menu');
    if (lenis) lenis.start(); else document.body.style.overflow = '';
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { menuAberto ? fecharMenu() : abrirMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuAberto) { fecharMenu(); menuBtn.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024) fecharMenu(); });
  }

  /* ---------- 5. Split de títulos em palavras (sem plugin pago) ---------- */
  $$('[data-split]').forEach(function (el) {
    var palavras = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = palavras.map(function (p) {
      return '<span class="w" aria-hidden="true"><span class="wi">' + p + '</span></span>';
    }).join(' ');
  });

  /* ---------- 6. Faixas infinitas com velocidade ligada ao scroll ---------- */
  var trilhos = $$('.faixa-trilho');
  if (trilhos.length && !reduz) {
    var estado = trilhos.map(function (t) { return { el: t, x: 0, dir: Number(t.dataset.dir) || -1, metade: t.scrollWidth / 2 }; });
    // mede a largura só no resize/fontes (ler scrollWidth a cada quadro força layout)
    var medirFaixas = function () { estado.forEach(function (s) { s.metade = s.el.scrollWidth / 2; }); };
    window.addEventListener('resize', medirFaixas);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirFaixas);
    var faixasVisiveis = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { faixasVisiveis = e[0].isIntersecting; }).observe($('.faixas'));
    }
    var antes = performance.now();
    var impulso = 0;
    (function laco(agora) {
      var dt = Math.min(64, agora - antes) / 16.67; antes = agora;
      impulso += (Math.min(40, Math.abs(velocidade)) - impulso) * 0.1;
      velocidade *= 0.9;
      if (faixasVisiveis) {
        estado.forEach(function (s) {
          var metade = s.metade || 1;
          s.x += s.dir * (0.6 + impulso * 0.35) * dt;
          if (s.x <= -metade) s.x += metade;
          if (s.x > 0) s.x -= metade;
          s.el.style.transform = 'translate3d(' + s.x.toFixed(2) + 'px,0,0)';
        });
      }
      requestAnimationFrame(laco);
    })(antes);
  }

  /* ---------- 7. Serviços: a peça do celular acende ---------- */
  var pecas = $$('.explodido [data-peca]');
  var servicos = $$('.servico');
  var osNum = $('[data-os-num]');
  var osNome = $('[data-os-nome]');
  function ativarServico(li) {
    if (!li) return;
    servicos.forEach(function (s) { s.classList.toggle('ativo', s === li); });
    var lista = (li.dataset.pecas || '').split(' ');
    pecas.forEach(function (p) { p.classList.toggle('on', lista.indexOf(p.dataset.peca) > -1); });
    var i = servicos.indexOf(li) + 1;
    if (osNum) osNum.textContent = String(i).padStart(2, '0');
    if (osNome) osNome.textContent = $('h3', li).textContent.toUpperCase();
  }
  if (servicos.length) {
    ativarServico(servicos[0]);
    if ('IntersectionObserver' in window) {
      var ioServ = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { if (en.isIntersecting) ativarServico(en.target); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      servicos.forEach(function (s) { ioServ.observe(s); });
    }
    servicos.forEach(function (s) {
      s.addEventListener('mouseenter', function () { ativarServico(s); });
      s.addEventListener('focusin', function () { ativarServico(s); });
    });
  }

  /* ---------- 8. Antes e depois (arrastar com mouse/dedo + teclado) ---------- */
  var slider = $('.ad-slider');
  if (slider) {
    var range = $('.ad-range', slider);
    var arrastando = false;
    var definir = function (v) { v = clamp(v, 0, 100); slider.style.setProperty('--pos', v + '%'); range.value = Math.round(v); };
    var pelaPosicao = function (e) { var r = slider.getBoundingClientRect(); definir(((e.clientX - r.left) / r.width) * 100); };
    slider.addEventListener('pointerdown', function (e) { arrastando = true; slider.setPointerCapture(e.pointerId); pelaPosicao(e); });
    slider.addEventListener('pointermove', function (e) { if (arrastando) pelaPosicao(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { slider.addEventListener(ev, function () { arrastando = false; }); });
    range.addEventListener('input', function () { definir(Number(range.value)); });
    slider.addEventListener('click', function () { range.focus({ preventScroll: true }); });
    // dica de movimento na primeira vez que aparece
    if (temGSAP && !reduz) {
      var o = { v: 35 };
      gsap.timeline({ scrollTrigger: { trigger: slider, start: 'top 70%', once: true } })
        .to(o, { v: 78, duration: .7, ease: 'power2.inOut', onUpdate: function () { if (!arrastando) definir(o.v); } })
        .to(o, { v: 28, duration: .8, ease: 'power2.inOut', onUpdate: function () { if (!arrastando) definir(o.v); } })
        .to(o, { v: 35, duration: .6, ease: 'power2.out', onUpdate: function () { if (!arrastando) definir(o.v); } });
    }
  }

  /* ---------- 9. Contadores e estrelas ---------- */
  function contar(el) {
    var fim = Number(el.dataset.contar), ini = Number(el.dataset.de || 0), casas = Number(el.dataset.casas || 0);
    var dur = reduz ? 0 : 1400, t0 = performance.now();
    (function passo(t) {
      var k = dur ? clamp((t - t0) / dur, 0, 1) : 1;
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = (ini + (fim - ini) * e).toFixed(casas).replace('.', ',');
      if (k < 1) requestAnimationFrame(passo);
    })(t0);
  }
  var estrelas = $('.estrelas');
  if ('IntersectionObserver' in window) {
    var ioNum = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        ioNum.unobserve(en.target);
        if (en.target === estrelas) {
          $$('svg', estrelas).forEach(function (s, i) {
            setTimeout(function () { s.classList.add('on'); setTimeout(function () { s.classList.add('fim'); }, 380); }, reduz ? 0 : 250 + i * 230);
          });
        } else contar(en.target);
      });
    }, { threshold: 0.6 });
    $$('[data-contar]').forEach(function (el) { ioNum.observe(el); });
    if (estrelas) ioNum.observe(estrelas);
  } else if (estrelas) {
    $$('svg', estrelas).forEach(function (s) { s.classList.add('on', 'fim'); });
  }

  /* ---------- 10. FAQ (acordeão animado) ---------- */
  $$('.faq-item button').forEach(function (b) {
    b.addEventListener('click', function () {
      var item = b.closest('.faq-item');
      var abrir = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(abrir));
      item.classList.toggle('aberto', abrir);
      if (temGSAP) setTimeout(function () { ScrollTrigger.refresh(); }, 480);
    });
  });

  /* ---------- 11. Formulário de orçamento → WhatsApp ---------- */
  if (form) {
    var corpo = $('.form-corpo', form);
    var sucesso = $('.form-sucesso', form);
    var detalhes = form.elements.detalhes;
    var contador = $('[data-contador]', form);

    detalhes.addEventListener('input', function () { contador.textContent = detalhes.value.length; });

    var mostrarErro = function (nome, msg) {
      var campo = $('[data-campo="' + nome + '"]', form);
      var p = $('#erro-' + nome, form);
      campo.classList.add('com-erro');
      campo.classList.remove('treme'); void campo.offsetWidth; campo.classList.add('treme');
      p.textContent = msg;
    };
    var limparErro = function (nome) {
      var campo = $('[data-campo="' + nome + '"]', form);
      if (!campo) return;
      campo.classList.remove('com-erro', 'treme');
      $('#erro-' + nome, form).textContent = '';
    };
    form.elements.nome.addEventListener('input', function () { limparErro('nome'); });
    form.addEventListener('change', function (e) { if (e.target.name === 'servico') limparErro('servico'); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = form.elements.nome.value.trim();
      // vários serviços podem ser marcados: "Troca de tela, Bateria e Conector de carga"
      var marcados = $$('[name="servico"]:checked', form).map(function (i) { return i.value; });
      var servico = marcados.length > 1
        ? marcados.slice(0, -1).join(', ') + ' e ' + marcados[marcados.length - 1]
        : marcados[0];
      var modelo = form.elements.modelo.value.trim();
      var det = detalhes.value.trim();
      var prefEl = $('[name="preferencia"]:checked', form);
      var preferencia = prefEl && prefEl.value;

      var primeiroErro = null;
      if (!nome) { mostrarErro('nome', 'Como a gente te chama? Escreve teu nome aqui.'); primeiroErro = form.elements.nome; }
      if (!servico) { mostrarErro('servico', 'Escolhe pelo menos um serviço (se não souber, marca “Outro”).');primeiroErro = primeiroErro || $('[name="servico"]', form); }
      if (primeiroErro) { primeiroErro.focus(); return; }

      var linhas = [
        'Olá, Mundo dos Eletrônicos! 👋',
        'Meu nome é *' + nome + '*.',
        'Preciso de: *' + servico + '*',
        modelo && 'Aparelho: ' + modelo,
        det && 'Detalhes: ' + det,
        preferencia && 'Prefiro: ' + preferencia,
        '(Mensagem enviada pelo site)'
      ].filter(Boolean);

      var url = 'https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(linhas.join('\n'));
      // sem 'noopener' no 3º parâmetro: com ele o navegador sempre devolve null
      // e não dá pra saber se o pop-up foi bloqueado. Cortamos o opener na mão.
      var janela = window.open(url, '_blank');
      if (janela) { try { janela.opener = null; } catch (err) {} }
      $('[data-link-zap]', form).href = url;
      corpo.hidden = true;
      sucesso.hidden = false;
      sucesso.setAttribute('tabindex', '-1');
      sucesso.focus({ preventScroll: true });
      if (temGSAP) ScrollTrigger.refresh();
      // se o navegador bloqueou a nova aba, abre na mesma
      if (!janela) setTimeout(function () { window.location.href = url; }, 600);
    });

    $('[data-novo-orc]', form).addEventListener('click', function () {
      form.reset(); contador.textContent = '0';
      sucesso.hidden = true; corpo.hidden = false;
      form.elements.nome.focus();
      if (temGSAP) ScrollTrigger.refresh();
    });
  }

  /* ---------- 12. Aberto agora / Fechado (fuso de Brasília) ---------- */
  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  function agoraSP() {
    var partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var get = function (t) { return partes.filter(function (p) { return p.type === t; })[0].value; };
    var dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { dia: dia, min: Number(get('hour')) * 60 + Number(get('minute')) };
  }
  var emMin = function (h) { var p = h.split(':'); return Number(p[0]) * 60 + Number(p[1]); };
  function statusLoja() {
    var a = agoraSP();
    var hoje = HORARIOS[a.dia] || [];
    for (var i = 0; i < hoje.length; i++) {
      if (a.min >= emMin(hoje[i][0]) && a.min < emMin(hoje[i][1])) return { aberto: true, texto: 'Aberto agora · fecha às ' + hoje[i][1] };
    }
    // próximo horário de abertura
    for (var d = 0; d < 8; d++) {
      var dia = (a.dia + d) % 7;
      var ints = HORARIOS[dia] || [];
      for (var j = 0; j < ints.length; j++) {
        if (d === 0 && emMin(ints[j][0]) <= a.min) continue;
        var quando = d === 0 ? 'hoje' : d === 1 ? 'amanhã' : DIAS[dia];
        return { aberto: false, texto: 'Fechado agora · abre ' + quando + ' às ' + ints[j][0] };
      }
    }
    return { aberto: false, texto: 'Fechado agora' };
  }
  var elStatus = $('[data-status-loja]');
  var elRodape = $('[data-status-rodape]');
  function atualizarStatus() {
    try {
      var s = statusLoja();
      if (elStatus) {
        elStatus.classList.toggle('aberto', s.aberto);
        elStatus.classList.toggle('fechado', !s.aberto);
        $('[data-status-texto]', elStatus).textContent = s.texto;
      }
      if (elRodape) elRodape.textContent = s.texto;
    } catch (e) { /* sem Intl: fica o texto padrão "Abre às 08:30" */ }
  }
  atualizarStatus();
  setInterval(atualizarStatus, 60000);

  /* ---------- 13. WhatsApp flutuante: balão uma vez + some no formulário ---------- */
  var flutua = $('.zap-flutua');
  var balao = $('.zap-balao');
  if (balao) {
    var jaViu = false;
    try { jaViu = !!sessionStorage.getItem('mundo-balao'); } catch (e) {}
    if (!jaViu) {
      setTimeout(function () {
        balao.classList.add('mostrar');
        try { sessionStorage.setItem('mundo-balao', '1'); } catch (e) {}
        setTimeout(function () { balao.classList.remove('mostrar'); }, 5000);
      }, 8000);
    }
  }
  if (flutua && form && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { flutua.classList.toggle('some', e[0].isIntersecting); }, { threshold: 0.25 }).observe(form);
  }

  /* ---------- 14. Tema de fundo por seção + fade simples no modo reduzido ---------- */
  if ('IntersectionObserver' in window) {
    var ioTema = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) {
          document.body.style.backgroundColor = en.target.dataset.tema;
          en.target.classList.add('visto');
        }
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    $$('[data-tema]').forEach(function (s) { ioTema.observe(s); });
    if (reduz) {
      var ioFade = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { if (en.isIntersecting) en.target.classList.add('visto'); });
      }, { threshold: 0.08 });
      $$('main > section').forEach(function (s) { ioFade.observe(s); });
    }
  } else {
    $$('main > section').forEach(function (s) { s.classList.add('visto'); });
  }

  /* ---------- 15. Micro-interações de desktop: magnético e tilt ---------- */
  if (ponteiroFino && !reduz) {
    // Botões magnéticos (usa a propriedade "translate" pra não brigar com o GSAP)
    $$('.magnetico').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.25;
        var y = (e.clientY - r.top - r.height / 2) * 0.35;
        b.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });

    // Tilt 3D com reflexo de luz
    $$('.tilt').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * 9).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 11).toFixed(2) + 'deg)';
        c.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        c.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    });
  }

  /* ---------- 15b. "MUNDO" do rodapé: luz que segue o mouse/dedo ---------- */
  var mundoGrande = $('.rodape-mundo');
  if (mundoGrande && !reduz) {
    var luzPendente = false, lx = 50, ly = 50;
    var moverLuz = function (e) {
      var r = mundoGrande.getBoundingClientRect();
      lx = ((e.clientX - r.left) / r.width) * 100;
      ly = ((e.clientY - r.top) / r.height) * 100;
      if (luzPendente) return;
      luzPendente = true;
      requestAnimationFrame(function () { // no máximo 1 atualização por quadro
        luzPendente = false;
        mundoGrande.style.setProperty('--mx', lx.toFixed(1) + '%');
        mundoGrande.style.setProperty('--my', ly.toFixed(1) + '%');
      });
    };
    mundoGrande.addEventListener('pointerenter', function (e) { moverLuz(e); mundoGrande.classList.add('aceso'); });
    mundoGrande.addEventListener('pointermove', moverLuz, { passive: true });
    mundoGrande.addEventListener('pointerleave', function () { mundoGrande.classList.remove('aceso'); });
  }

  /* ---------- 16. Linha de circuito global (desenhada a partir das seções) ---------- */
  var cg = $('.circuito-global');
  var ioCircuito = null;
  function construirCircuito() {
    if (!cg) return;
    var main = $('main');
    if (window.innerWidth < 1180) { doc.classList.remove('circuito-pronto'); circuitoLinha = null; return; }
    var W = main.offsetWidth, H = main.offsetHeight;
    var gut = Math.max(0, (W - 1280) / 2);
    var xa = Math.max(18, gut * 0.45), xb = xa + 22;
    var secoes = $$('main > section');
    var d = '', nos = '', x = xa;
    secoes.forEach(function (s, i) {
      var y = s.offsetTop + (s.parentElement.classList.contains('pin-spacer') ? s.parentElement.offsetTop : 0);
      if (i === 0) { y = Math.min(H, s.offsetHeight * 0.55); d = 'M' + x + ' ' + y; }
      else {
        var nx = x === xa ? xb : xa;
        d += 'V' + (y - 36) + 'L' + nx + ' ' + (y - 14) + 'V' + y;
        x = nx;
      }
      nos += '<circle cx="' + x + '" cy="' + y + '" r="5"/>';
    });
    d += 'V' + (H - 4);
    cg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    $('.cg-base', cg).setAttribute('d', d);
    circuitoLinha = $('.cg-linha', cg);
    circuitoLinha.setAttribute('d', d);
    circuitoLinha.setAttribute('pathLength', '1');
    $('.cg-nos', cg).innerHTML = nos;
    doc.classList.add('circuito-pronto');
    aoRolar();
    // nós acendem quando a linha passa por eles
    var circulos = $$('.cg-nos circle', cg);
    if (ioCircuito) ioCircuito.disconnect();
    if (!('IntersectionObserver' in window)) return;
    ioCircuito = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { var c = circulos[secoes.indexOf(en.target)]; if (c && en.isIntersecting) c.classList.add('on'); });
    }, { rootMargin: '0px 0px -40% 0px' });
    secoes.forEach(function (s) { ioCircuito.observe(s); });
  }

  /* ---------- 17. Animações com GSAP + ScrollTrigger ---------- */
  if (temGSAP && !reduz) {
    var atraso = comIntro ? 1.05 : 0.15;

    // Hero: cada palavra entra separada, com rotação e blur saindo
    doc.classList.add('gsap-hero'); // desliga a rede de segurança do CSS
    gsap.set('.hero-anim', { opacity: 0 });
    var tl = gsap.timeline({ delay: atraso, defaults: { ease: 'power3.out' } });
    tl.fromTo('.hero-etiqueta', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .6 })
      .fromTo('.hp', { opacity: 0, yPercent: 60, rotate: 8, filter: 'blur(14px)' },
        { opacity: 1, yPercent: 0, rotate: 0, filter: 'blur(0px)', duration: .9, stagger: .16 }, '-=.35')
      .fromTo('.hero-linha2', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .8 }, '-=.45')
      .fromTo(['.hero-sub', '.hero-botoes', '.hero-confianca'], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .7, stagger: .1 }, '-=.5');

    // Fundo do hero com parallax
    gsap.to('.hero-fundo', { yPercent: 16, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Títulos: palavras sobem de baixo com leve rotação
    $$('[data-split]').forEach(function (el) {
      gsap.from($$('.wi', el), {
        yPercent: 115, rotate: 5, opacity: 0, duration: .9, ease: 'power3.out', stagger: .055,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });

    // Imagens com revelação por máscara
    $$('.mascara').forEach(function (fig) {
      var img = $('img', fig);
      gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 82%', once: true } })
        .fromTo(fig, { clipPath: 'inset(100% 0% 0% 0% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.2, ease: 'expo.out' })
        .from(img, { scale: 1.25, duration: 1.6, ease: 'expo.out' }, 0);
    });

    // Parallax leve
    $$('.parallax').forEach(function (p) {
      gsap.fromTo(p, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: p.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Foto da equipe entra de lado
    gsap.from('.quem-foto-equipe', { xPercent: 40, opacity: 0, rotate: 10, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.quem-fotos', start: 'top 70%', once: true } });
    gsap.from('.cuias img', { y: 30, opacity: 0, rotate: -16, duration: 1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.cuias', start: 'top 90%', once: true } });

    // Como funciona: trilha vertical se desenha + nós acendem
    gsap.fromTo('.pt-linha', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.passos-wrap', start: 'top 70%', end: 'bottom 55%', scrub: true } });
    $$('.passo').forEach(function (p) {
      ScrollTrigger.create({ trigger: p, start: 'top 62%', onEnter: function () { p.classList.add('ativo'); }, onLeaveBack: function () { p.classList.remove('ativo'); } });
    });

    // Moto atravessa a pista conforme o scroll
    var moto = $('.moto'), pista = $('.entrega-pista');
    if (moto && pista) {
      gsap.fromTo(moto, { x: -100 }, {
        x: function () { return pista.offsetWidth + 10; }, ease: 'none',
        scrollTrigger: { trigger: '.entrega', start: 'top 95%', end: 'bottom 25%', scrub: .6, invalidateOnRefresh: true }
      });
    }

    // Avaliações entram com stagger
    gsap.from('.aval-card', { y: 70, opacity: 0, duration: 1, ease: 'power3.out', stagger: .14, scrollTrigger: { trigger: '.aval-cards', start: 'top 80%', once: true } });

    // Trilhas convergindo pro formulário
    gsap.fromTo('.orc-trilhas path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', stagger: .04, scrollTrigger: { trigger: '.orcamento', start: 'top 85%', end: 'top 15%', scrub: true } });

    // "MUNDO" do rodapé se preenche com o gradiente
    var rodMundo = $('.rodape-mundo');
    if (rodMundo) {
      ScrollTrigger.create({
        trigger: rodMundo, start: 'top bottom', end: 'bottom bottom', scrub: true,
        onUpdate: function (s) { rodMundo.style.setProperty('--fill', (s.progress * 100).toFixed(1) + '%'); }
      });
    }

    // Loja: seção fixa com rolagem horizontal (só desktop)
    var mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', function () {
      var trilho = $('.loja-trilho'), cards = $('.loja-cards');
      if (!trilho || !cards) return;
      doc.classList.add('loja-pinada');
      var distancia = function () { return Math.max(0, cards.scrollWidth - trilho.clientWidth); };
      var tw = gsap.to(cards, {
        x: function () { return -distancia(); }, ease: 'none',
        scrollTrigger: { trigger: '.loja-pin', start: 'top top', end: function () { return '+=' + distancia(); }, pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      return function () { doc.classList.remove('loja-pinada'); tw.kill(); gsap.set(cards, { clearProps: 'transform' }); };
    });

    ScrollTrigger.addEventListener('refresh', construirCircuito);
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  } else {
    // sem GSAP ou com movimento reduzido: tudo visível, trilhas desenhadas
    window.addEventListener('load', construirCircuito);
    $$('.pt-linha, .orc-trilhas path').forEach(function (p) { p.style.strokeDashoffset = '0'; });
    $$('.passo').forEach(function (p) { p.classList.add('ativo'); });
    var rm = $('.rodape-mundo'); if (rm) rm.style.setProperty('--fill', '100%');
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(construirCircuito, 200); });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (temGSAP) ScrollTrigger.refresh(); else construirCircuito(); });
})();
