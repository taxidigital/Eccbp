(function () {
  'use strict';

  function walkTextNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  function replaceExactText(oldText, newText) {
    if (!newText || newText === oldText) return false;
    var nodes = walkTextNodes(document.body);
    var replaced = false;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeValue.trim() === oldText) {
        nodes[i].nodeValue = newText;
        replaced = true;
      }
    }
    return replaced;
  }

  function updateInscricaoLinks(url) {
    if (!url) return;
    document.querySelectorAll('a[href*="forms.gle"]').forEach(function (a) {
      a.href = url;
    });
  }

  function applyEncontroOnce(data) {
    var any = false;
    if (data.data_texto) any = replaceExactText('Próximo encontro · 2026', data.data_texto) || any;
    if (data.local_texto) any = replaceExactText('Grande São Paulo', data.local_texto) || any;
    if (data.preco_texto) any = replaceExactText('R$ 800,00 por casal', data.preco_texto) || any;
    if (data.parcelamento_texto) any = replaceExactText('Consulte opções de parcelamento', data.parcelamento_texto) || any;
    updateInscricaoLinks(data.link_inscricao);
    return any;
  }

  async function applyEncontro() {
    try {
      var res = await fetch('/api/public/encontro');
      if (!res.ok) return;
      var data = await res.json();
      var tentativas = 0;
      var tentar = function () {
        var ok = applyEncontroOnce(data);
        tentativas++;
        if (!ok && tentativas < 6) setTimeout(tentar, 350);
      };
      tentar();
    } catch (e) {
      // Falha de rede: mantém o texto estático atual do site.
    }
  }

  function applyContatoToast(contato) {
    if (!contato || (!contato.whatsapp && !contato.email)) return;
    var partes = [];
    if (contato.whatsapp) partes.push('WhatsApp: ' + contato.whatsapp);
    if (contato.email) partes.push('E-mail: ' + contato.email);
    var textoContato = partes.join(' · ');

    var observer = new MutationObserver(function () {
      var nodes = walkTextNodes(document.body);
      for (var i = 0; i < nodes.length; i++) {
        var v = nodes[i].nodeValue.trim();
        if (v === 'Canal de contato em atualização') {
          nodes[i].nodeValue = 'Fale com a gente';
        } else if (v === 'Em breve, a equipe local informará WhatsApp, e-mail e local.') {
          nodes[i].nodeValue = textoContato;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function applyContato() {
    try {
      var res = await fetch('/api/public/contato');
      if (!res.ok) return;
      var contato = await res.json();
      applyContatoToast(contato);
    } catch (e) {
      // Falha de rede: toast continua com o texto padrão "em atualização".
    }
  }

  function extractYouTubeId(url) {
    if (!url) return null;
    var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function renderVideoEmbed(videoId, titulo) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:100%;padding-bottom:56.25%;height:0;margin:.9rem 0;border-radius:10px;overflow:hidden;';

    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId;
    iframe.title = 'Depoimento em vídeo — ' + titulo;
    iframe.loading = 'lazy';
    iframe.setAttribute('frameborder', '0');
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;';

    wrap.appendChild(iframe);
    return wrap;
  }

  function renderDepoimentoCard(dep) {
    var card = document.createElement('div');
    card.className = 'testimony-card reveal-up';
    var mark = document.createElement('span');
    mark.className = 'testimony-mark';
    mark.textContent = '“';
    var p = document.createElement('p');
    p.textContent = dep.texto;
    var footer = document.createElement('p');
    footer.style.marginTop = '.75rem';
    footer.style.fontWeight = '600';
    footer.textContent = '— ' + dep.nome_casal;

    card.appendChild(mark);
    card.appendChild(p);

    var videoId = extractYouTubeId(dep.video_url);
    if (videoId) {
      card.appendChild(renderVideoEmbed(videoId, dep.nome_casal));
    }

    card.appendChild(footer);
    return card;
  }

  async function applyDepoimentos() {
    try {
      var res = await fetch('/api/public/depoimentos');
      if (!res.ok) return;
      var data = await res.json();
      var lista = data.depoimentos || [];
      if (!lista.length) return; // nada publicado/autorizado ainda: mantém o placeholder atual

      var layout = document.querySelector('.testimony-layout');
      if (!layout) return;
      layout.querySelectorAll('.testimony-card').forEach(function (el) { el.remove(); });
      lista.forEach(function (dep) { layout.appendChild(renderDepoimentoCard(dep)); });
    } catch (e) {
      // Falha de rede: mantém o placeholder "em construção".
    }
  }

  function rafThrottle(fn) {
    var ticking = false;
    return function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        fn();
        ticking = false;
      });
    };
  }

  function enhanceNavigation() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    // Garante que a seção de depoimentos tenha um id e um item no menu
    // (hoje "Histórias" não existe na navegação original do site).
    var testimonySection = document.querySelector('.testimony-section');
    if (testimonySection && !testimonySection.id) {
      testimonySection.id = 'historias';
    }

    var desktopNav = document.querySelector('.desktop-nav');
    if (testimonySection && desktopNav && !desktopNav.querySelector('a[href="#historias"]')) {
      var link = document.createElement('a');
      link.href = '#historias';
      link.className = 'nav-link';
      link.textContent = 'Histórias';
      desktopNav.appendChild(link);
    }

    function ensureMobileLink() {
      var mobileNav = document.querySelector('.mobile-nav');
      if (mobileNav && testimonySection && !mobileNav.querySelector('a[href="#historias"]')) {
        var a = document.createElement('a');
        a.href = '#historias';
        a.textContent = 'Histórias';
        mobileNav.insertBefore(a, mobileNav.lastElementChild);
      }
    }
    // .mobile-nav só existe no DOM quando o usuário abre o menu hambúrguer
    // (montagem condicional do React), então observamos o cabeçalho pra reagir a isso.
    new MutationObserver(ensureMobileLink).observe(header, { childList: true, subtree: true });

    // Cabeçalho ganha fundo sólido depois que a página rola além do início
    var onHeaderScroll = rafThrottle(function () {
      if (window.scrollY > 24) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    });
    onHeaderScroll();
    window.addEventListener('scroll', onHeaderScroll, { passive: true });

    // Scroll-spy: destaca no menu a seção que está sendo vista no momento
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.desktop-nav .nav-link'));
    var targets = navLinks.map(function (a) {
      var id = a.getAttribute('href').replace('#', '');
      var el = document.getElementById(id);
      return el ? { link: a, el: el } : null;
    }).filter(Boolean);

    if (targets.length && 'IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var match = targets.filter(function (t) { return t.el === entry.target; })[0];
          if (!match) return;
          navLinks.forEach(function (l) { l.classList.remove('is-active'); });
          match.link.classList.add('is-active');
        });
      }, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });
      targets.forEach(function (t) { spy.observe(t.el); });
    }

    // Botão flutuante "voltar ao topo"
    var backToTop = document.createElement('button');
    backToTop.type = 'button';
    backToTop.className = 'ecc-back-to-top';
    backToTop.setAttribute('aria-label', 'Voltar ao topo');
    backToTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(backToTop);

    var onBackToTopScroll = rafThrottle(function () {
      if (window.scrollY > 480) backToTop.classList.add('is-visible');
      else backToTop.classList.remove('is-visible');
    });
    onBackToTopScroll();
    window.addEventListener('scroll', onBackToTopScroll, { passive: true });
  }

  function run() {
    applyEncontro();
    applyContato();
    applyDepoimentos();
    enhanceNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
