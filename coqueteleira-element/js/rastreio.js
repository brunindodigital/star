// ===== RASTREIO (Meta + UTMify) — incluir no <head> de TODAS as páginas =====
// Papéis: Meta (pixel + CAPI própria em /api/evento) otimiza · UTMify só atribui a venda ao anúncio.
// Todo evento sai pelo navegador e pelo servidor com o MESMO event_id (a Meta deduplica).
(function () {
  var META_PIXEL = '1796468168324547';
  var UTMIFY_PIXEL = '6acd8722d3cd012d6461a9e2';

  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function cookie(n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  function setCookie(n, v) { document.cookie = n + '=' + encodeURIComponent(v) + '; path=/; max-age=31536000; SameSite=Lax'; }
  function uid() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/-/g, ''); }

  // ID estável da pessoa (external_id), igual no navegador e no servidor
  var xid = cookie('zg_xid') || ls('zg_xid') || uid();
  setCookie('zg_xid', xid); ls('zg_xid', xid);

  // Guarda fbclid (vira _fbc) e as UTMs da primeira página: valem até o pedido
  var q = new URLSearchParams(location.search);
  if (q.get('fbclid') && !cookie('_fbc')) setCookie('_fbc', 'fb.1.' + Date.now() + '.' + q.get('fbclid'));
  var CH = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck', 'fbclid'];
  var utm = ls('zg_utm') || {};
  if (CH.some(function (k) { return q.get(k); })) { utm = {}; CH.forEach(function (k) { if (q.get(k)) utm[k] = q.get(k); }); ls('zg_utm', utm); }

  // Dados do cliente já informados (Advanced Matching). O pixel faz o hash sozinho.
  function matching() {
    var c = ls('cliente'); if (!c) return { external_id: xid };
    var tel = String(c.telefone || '').replace(/\D/g, ''); if (tel && tel.indexOf('55') !== 0) tel = '55' + tel;
    var nome = String(c.nome || '').trim().toLowerCase().split(/\s+/), e = c.endereco || {};
    return { em: String(c.email || '').trim().toLowerCase(), ph: tel, fn: nome[0], ln: nome.length > 1 ? nome[nome.length - 1] : undefined,
      ct: String(e.cidade || '').toLowerCase().replace(/[^\p{L}]/gu, ''), st: String(e.uf || '').toLowerCase(), zp: String(e.cep || '').replace(/\D/g, ''), country: 'br', external_id: xid };
  }

  // Pixel da Meta
  !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', META_PIXEL, matching());

  // UTMify: script de UTM + pixel (só atribuição)
  var su = document.createElement('script'); su.src = 'https://cdn.utmify.com.br/scripts/utms/latest.js'; su.async = true; su.defer = true;
  su.setAttribute('data-utmify-prevent-xcod-sck', ''); su.setAttribute('data-utmify-prevent-subids', ''); document.head.appendChild(su);
  window.pixelId = UTMIFY_PIXEL;
  var sp = document.createElement('script'); sp.src = 'https://cdn.utmify.com.br/scripts/pixel/pixel.js'; sp.async = true; sp.defer = true; document.head.appendChild(sp);

  // rastrear('Evento', { value, content_ids, contents, num_items }, idOpcional)
  window.rastrear = function (nome, dados, idFixo) {
    var id = idFixo || (nome.toLowerCase() + '_' + uid());
    var cd = dados || {};
    var px = { currency: 'BRL', content_type: 'product' };
    ['value', 'content_ids', 'contents', 'num_items'].forEach(function (k) { if (cd[k] !== undefined) px[k] = cd[k]; });
    fbq('trackSingle', META_PIXEL, nome, px, { eventID: id });
    if (nome !== 'Purchase') {   // a Purchase do servidor sai de /api/pix-status, só com o Pix pago
      try {
        fetch('/api/evento', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_name: nome, event_id: id, url: location.href, custom_data: cd, cliente: ls('cliente') || {}, xid: xid, fbp: cookie('_fbp'), fbc: cookie('_fbc') }) });
      } catch (e) {}
    }
    return id;
  };
  // quando o cliente salva os dados (endereço/conta), atualiza o Advanced Matching
  window.rastreioAtualizaCliente = function () { fbq('init', META_PIXEL, matching()); };
  // dados que o pedido leva para a UTMify e para a CAPI
  window.rastreioDoPedido = function () { return { utm: ls('zg_utm') || {}, xid: xid, fbp: cookie('_fbp'), fbc: cookie('_fbc'), url: location.href }; };

  rastrear('PageView');
})();
