(function () {
  'use strict';

  function setText(ids, value) {
    if (!value) return;
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }

  async function applyEncontro() {
    try {
      var res = await fetch('/api/public/encontro');
      if (!res.ok) return;
      var data = await res.json();
      setText(['encontro-data', 'encontro-data-2'], data.data_texto);
      setText(['encontro-local', 'encontro-local-2'], data.local_texto);
      setText(['encontro-preco', 'encontro-preco-2'], data.preco_texto);
      setText(['encontro-parcelamento'], data.parcelamento_texto);
      if (data.link_inscricao) {
        document.querySelectorAll('.js-link-inscricao').forEach(function (a) {
          a.href = data.link_inscricao;
        });
      }
    } catch (e) {
      // falha de rede: mantém o texto estático do HTML
    }
  }

  async function applyContato() {
    try {
      var res = await fetch('/api/public/contato');
      if (!res.ok) return;
      var contato = await res.json();
      if (!contato.whatsapp && !contato.email) return;

      var status = document.getElementById('contato-status');
      if (status) status.textContent = 'Fale com a gente';

      var partes = [];
      if (contato.whatsapp) partes.push('WhatsApp: ' + contato.whatsapp);
      if (contato.email) partes.push('E-mail: ' + contato.email);
      var detalhe = document.getElementById('contato-detalhe');
      if (detalhe && partes.length) {
        detalhe.textContent = partes.join(' · ');
        detalhe.style.display = '';
      }

      if (contato.whatsapp) {
        var wa = document.getElementById('contato-whatsapp-link');
        if (wa) {
          var digits = contato.whatsapp.replace(/\D/g, '');
          wa.href = 'https://wa.me/' + digits;
          wa.style.display = '';
        }
      }
    } catch (e) {
      // falha de rede: mantém o placeholder "em atualização"
    }
  }

  function extractYouTubeId(url) {
    if (!url) return null;
    var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function renderVideoEmbed(videoId, titulo) {
    var wrap = document.createElement('div');
    wrap.className = 't-video';
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId;
    iframe.title = 'Depoimento em vídeo — ' + titulo;
    iframe.loading = 'lazy';
    iframe.setAttribute('frameborder', '0');
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    wrap.appendChild(iframe);
    return wrap;
  }

  function initials(nomeCasal) {
    return String(nomeCasal || '')
      .split(/\s+(?:e|&)\s+/i)
      .map(function (n) { return n.trim().charAt(0); })
      .filter(Boolean)
      .join('&')
      .toUpperCase();
  }

  function renderDepoimentoCard(dep) {
    var card = document.createElement('div');
    card.className = 't-card reveal in';

    var p = document.createElement('p');
    p.textContent = '“' + dep.texto + '”';
    card.appendChild(p);

    var videoId = extractYouTubeId(dep.video_url);
    if (videoId) card.appendChild(renderVideoEmbed(videoId, dep.nome_casal));

    var who = document.createElement('div');
    who.className = 't-who';
    var avatar = document.createElement('div');
    avatar.className = 't-avatar';
    avatar.textContent = initials(dep.nome_casal);
    var meta = document.createElement('div');
    var name = document.createElement('div');
    name.className = 'name';
    name.textContent = dep.nome_casal;
    meta.appendChild(name);
    who.appendChild(avatar);
    who.appendChild(meta);
    card.appendChild(who);

    return card;
  }

  async function applyDepoimentos() {
    try {
      var res = await fetch('/api/public/depoimentos');
      if (!res.ok) return;
      var data = await res.json();
      var lista = data.depoimentos || [];
      if (!lista.length) return; // nada publicado/autorizado ainda: mantém o placeholder

      var container = document.getElementById('depoimentos-lista');
      if (!container) return;
      var placeholder = document.getElementById('depoimentos-placeholder');
      if (placeholder) placeholder.remove();
      lista.forEach(function (dep) { container.appendChild(renderDepoimentoCard(dep)); });
    } catch (e) {
      // falha de rede: mantém o placeholder "em construção"
    }
  }

  function renderAconselhamentoCard(acon) {
    var card = document.createElement('div');
    card.className = 't-card ac-card reveal in';

    var videoId = extractYouTubeId(acon.video_url);
    if (videoId) card.appendChild(renderVideoEmbed(videoId, acon.titulo));

    var title = document.createElement('div');
    title.className = 'ac-title';
    title.textContent = acon.titulo;
    card.appendChild(title);

    if (acon.descricao) {
      var desc = document.createElement('p');
      desc.className = 'ac-desc';
      desc.textContent = acon.descricao;
      card.appendChild(desc);
    }

    return card;
  }

  function renderPainItem(topico) {
    var item = document.createElement('div');
    item.className = 'pain-item reveal in';

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pain-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    var span = document.createElement('span');
    span.className = 'pain-title';
    span.textContent = topico.titulo;
    var more = document.createElement('span');
    more.className = 'pain-more';
    more.textContent = 'Saiba mais';
    toggle.appendChild(span);
    toggle.appendChild(more);

    var body = document.createElement('div');
    body.className = 'pain-body';
    var inner = document.createElement('div');
    inner.className = 'pain-body-inner';
    var p = document.createElement('p');
    p.textContent = topico.texto;
    inner.appendChild(p);
    body.appendChild(inner);

    item.appendChild(toggle);
    item.appendChild(body);
    return item;
  }

  async function applyReconhecimento() {
    try {
      var res = await fetch('/api/public/topicos-reconhecimento');
      if (!res.ok) return;
      var data = await res.json();
      var lista = data.topicos || [];
      if (!lista.length) return; // nada ativo: mantém os tópicos padrão já no HTML

      var container = document.getElementById('pain-list');
      if (!container) return;
      container.innerHTML = '';
      lista.forEach(function (t) { container.appendChild(renderPainItem(t)); });
    } catch (e) {
      // falha de rede: mantém os tópicos padrão do HTML
    }
  }

  function setupPainToggle() {
    var list = document.getElementById('pain-list');
    if (!list) return;
    list.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.pain-toggle');
      if (!btn) return;
      var item = btn.closest('.pain-item');
      var isOpen = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      var more = btn.querySelector('.pain-more');
      if (more) more.textContent = isOpen ? 'Saiba menos' : 'Saiba mais';
    });
  }

  async function applyAconselhamento() {
    try {
      var res = await fetch('/api/public/aconselhamento');
      if (!res.ok) return;
      var data = await res.json();
      var lista = data.aconselhamentos || [];
      if (!lista.length) return; // nada publicado ainda: mantém o placeholder

      var container = document.getElementById('aconselhamento-lista');
      if (!container) return;
      var placeholder = document.getElementById('aconselhamento-placeholder');
      if (placeholder) placeholder.remove();
      lista.forEach(function (acon) { container.appendChild(renderAconselhamentoCard(acon)); });
    } catch (e) {
      // falha de rede: mantém o placeholder "em construção"
    }
  }

  function setupPrayForm() {
    var form = document.getElementById('pray-form');
    if (!form) return;

    var deseja = document.getElementById('pray-deseja-contato');
    var contatoFields = document.getElementById('pray-contato-fields');
    deseja.addEventListener('change', function () {
      contatoFields.style.display = deseja.checked ? 'grid' : 'none';
    });

    var msg = document.getElementById('pray-msg');
    var submitBtn = document.getElementById('pray-submit-btn');

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      msg.textContent = '';

      var nome = document.getElementById('pray-nome').value.trim();
      if (!nome) {
        msg.textContent = 'Informe o nome do casal.';
        return;
      }
      var querContato = deseja.checked;
      var telefone = document.getElementById('pray-telefone').value.trim();
      var whatsapp = document.getElementById('pray-whatsapp').value.trim();
      if (querContato && !telefone && !whatsapp) {
        msg.textContent = 'Informe ao menos um telefone ou WhatsApp para contato.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
      try {
        var res = await fetch('/api/public/pedidos-oracao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome_casal: nome,
            motivo: document.getElementById('pray-motivo').value.trim(),
            deseja_contato: querContato,
            telefone: telefone,
            whatsapp: whatsapp,
          }),
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) {
          msg.textContent = data.error || 'Não foi possível enviar o pedido. Tente novamente.';
          return;
        }
        form.style.display = 'none';
        document.getElementById('pray-success').style.display = 'block';
      } catch (e) {
        msg.textContent = 'Não foi possível enviar o pedido agora. Tente novamente em instantes.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar pedido';
      }
    });
  }

  function setupReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    els.forEach(function (el) { io.observe(el); });
  }

  function rafThrottle(fn) {
    var ticking = false;
    return function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { fn(); ticking = false; });
    };
  }

  function setupHeaderScroll() {
    var header = document.querySelector('header');
    if (!header) return;
    var onScroll = rafThrottle(function () {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    });
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function setupMobileNav() {
    var toggle = document.querySelector('.navtoggle');
    var links = document.querySelector('.navlinks');
    if (!toggle || !links) return;
    toggle.addEventListener('click', function () {
      links.classList.toggle('is-open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('is-open'); });
    });
  }

  function setupBackToTop() {
    var btn = document.querySelector('.back-to-top');
    if (!btn) return;
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    var onScroll = rafThrottle(function () {
      btn.classList.toggle('is-visible', window.scrollY > 480);
    });
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function run() {
    setupReveal();
    setupHeaderScroll();
    setupMobileNav();
    setupBackToTop();
    setupPrayForm();
    setupPainToggle();
    applyEncontro();
    applyContato();
    applyDepoimentos();
    applyAconselhamento();
    applyReconhecimento();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
