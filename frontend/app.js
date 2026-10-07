/* Aksara AI frontend */
(function () {
  'use strict';

  // ---------- Data aksara ----------
  var AKSARA = [
    { a: 'ꦲ', l: 'ha' }, { a: 'ꦤ', l: 'na' }, { a: 'ꦕ', l: 'ca' }, { a: 'ꦫ', l: 'ra' },
    { a: 'ꦏ', l: 'ka' }, { a: 'ꦢ', l: 'da' }, { a: 'ꦠ', l: 'ta' }, { a: 'ꦱ', l: 'sa' },
    { a: 'ꦮ', l: 'wa' }, { a: 'ꦭ', l: 'la' }, { a: 'ꦥ', l: 'pa' }, { a: 'ꦝ', l: 'dha' },
    { a: 'ꦗ', l: 'ja' }, { a: 'ꦪ', l: 'ya' }, { a: 'ꦚ', l: 'nya' }, { a: 'ꦩ', l: 'ma' },
    { a: 'ꦒ', l: 'ga' }, { a: 'ꦧ', l: 'ba' }, { a: 'ꦛ', l: 'tha' }, { a: 'ꦔ', l: 'nga' },
    { a: 'ꦶ', l: 'wulu (i)' }, { a: 'ꦸ', l: 'suku (u)' }, { a: 'ꦺ', l: 'taling (e)' },
    { a: 'ꦼ', l: 'pepet' }, { a: 'ꦴ', l: 'tarung (o)' }, { a: '꧀', l: 'pangkon' }
  ];

  // ---------- Helpers ----------
  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  function copyText(elId) {
    var el = $(elId);
    var txt = el.textContent || el.innerText || '';
    if (!txt.trim()) { toast('Tidak ada teks untuk disalin'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { toast('Disalin!'); }, function () { toast('Gagal menyalin'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Disalin!'); } catch (e) { toast('Gagal menyalin'); }
      document.body.removeChild(ta);
    }
  }
  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Navigasi tab ----------
  var navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      navBtns.forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
      $(b.getAttribute('data-view')).classList.add('active');
      window.scrollTo(0, 0);
      if (b.getAttribute('data-view') === 'view-history') renderHistory();
    });
  });

  // ---------- Pindai ----------
  var stream = null, currentBlob = null;
  var video = $('cameraVideo'), fileInput = $('fileInput');

  $('btnOpenCamera').addEventListener('click', function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('Kamera tidak didukung, pakai Upload Foto');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(function (s) {
        stream = s;
        video.srcObject = s;
        video.play().catch(function () {});
        hide($('pickActions')); show($('cameraWrap'));
      })
      .catch(function () { toast('Tidak bisa akses kamera. Cek izin browser / pakai Upload.'); });
  });
  function stopCamera() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    video.srcObject = null;
    hide($('cameraWrap')); show($('pickActions'));
  }
  $('btnCameraClose').addEventListener('click', stopCamera);

  $('btnCapture').addEventListener('click', function () {
    try {
      var c = document.createElement('canvas');
      var vw = video.videoWidth, vh = video.videoHeight;
      if (!vw) { toast('Kamera belum siap'); return; }
      var scale = Math.min(1, 1280 / Math.max(vw, vh));
      c.width = Math.round(vw * scale); c.height = Math.round(vh * scale);
      c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
      c.toBlob(function (b) {
        if (!b) { toast('Gagal mengambil foto'); return; }
        stopCamera();
        setPreview(b);
      }, 'image/jpeg', 0.85);
    } catch (e) { toast('Gagal mengambil foto'); }
  });

  $('btnUpload').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { toast('File harus berupa gambar'); return; }
    if (f.size > 8 * 1024 * 1024) { toast('Ukuran maksimal 8MB'); return; }
    resizeImage(f, 1280, function (b) { setPreview(b || f); });
    fileInput.value = '';
  });

  function resizeImage(file, maxDim, cb) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      try {
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        if (scale >= 1) { URL.revokeObjectURL(url); cb(file); return; }
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); cb(b); }, 'image/jpeg', 0.85);
      } catch (e) { URL.revokeObjectURL(url); cb(file); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(file); };
    img.src = url;
  }

  function setPreview(blob) {
    currentBlob = blob;
    var url = URL.createObjectURL(blob);
    $('previewImg').src = url;
    hide($('pickActions')); show($('previewWrap')); show($('btnScan'));
    hide($('resultCard')); hide($('errorCard'));
  }
  $('btnRetake').addEventListener('click', function () {
    currentBlob = null;
    hide($('previewWrap')); hide($('btnScan')); show($('pickActions'));
    hide($('resultCard')); hide($('errorCard'));
  });

  var scanCtrl = null;
  $('btnScan').addEventListener('click', function () {
    if (!currentBlob) { toast('Pilih foto dulu'); return; }
    hide($('resultCard')); hide($('errorCard')); show($('loadingCard'));
    $('btnScan').disabled = true;
    if (scanCtrl) scanCtrl.abort();
    scanCtrl = new AbortController();
    var fd = new FormData();
    fd.append('image', currentBlob, 'aksara.jpg');
    var to = setTimeout(function () { scanCtrl.abort(); }, 90000);
    fetch('/api/transliterate', { method: 'POST', body: fd, signal: scanCtrl.signal })
      .then(function (r) {
        if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.detail || ('Server error ' + r.status));
        });
        return r.json();
      })
      .then(function (d) {
        clearTimeout(to);
        hide($('loadingCard'));
        if (d.error || !d.latin) {
          showError(d.error || 'AI tidak mendeteksi aksara Jawa pada foto ini. Coba foto yang lebih jelas.');
          return;
        }
        applyResult(d);
        show($('resultCard'));
        $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      })
      .catch(function (e) {
        clearTimeout(to);
        hide($('loadingCard'));
        showError(e.name === 'AbortError' ? 'Waktu habis. Cek koneksi lalu coba lagi.' : ('Gagal: ' + e.message));
      })
      .finally(function () { $('btnScan').disabled = false; });
  });

  function applyResult(d) {
    $('resultAksara').textContent = d.aksara || '-';
    $('resultLatin').textContent = d.latin;
    $('resultID').textContent = d.indonesian || '-';
    $('resultModel').textContent = d.model || '';
    var conf = $('confBadge');
    var c = (d.confidence || 'sedang').toLowerCase();
    conf.className = 'conf ' + (c === 'tinggi' ? 'tinggi' : c === 'rendah' ? 'rendah' : 'sedang');
    conf.textContent = 'Keyakinan AI: ' + c.toUpperCase();
    show(conf);
    // alternatif
    var altWrap = $('altWrap'), altChips = $('altChips');
    altChips.innerHTML = '';
    var alts = d.alternatives || [];
    if (alts.length) {
      alts.forEach(function (a) {
        if (!a.latin) return;
        var b = document.createElement('button');
        b.className = 'chip';
        b.textContent = a.latin + (a.indonesian ? ' = ' + a.indonesian : '');
        b.addEventListener('click', function () {
          applyResult({ aksara: d.aksara, latin: a.latin, indonesian: a.indonesian || '-',
            confidence: d.confidence, alternatives: [], suggestions: [], model: d.model });
          toast('Diganti ke: ' + a.latin);
        });
        altChips.appendChild(b);
      });
      show(altWrap);
    } else hide(altWrap);
    // saran kamus
    var sugWrap = $('sugWrap');
    var sugs = d.suggestions || [];
    if (sugs.length) {
      sugWrap.innerHTML = 'Kata <b>' + esc(sugs[0].word) + '</b> tidak ada di kamus. Mungkin maksudnya: ' +
        sugs[0].candidates.map(function (c) { return '<b data-w="' + esc(c) + '">' + esc(c) + '</b>'; }).join(', ') + '?';
      sugWrap.querySelectorAll('b[data-w]').forEach(function (b) {
        b.addEventListener('click', function () {
          var w = b.getAttribute('data-w');
          $('resultLatin').textContent = $('resultLatin').textContent.replace(sugs[0].word, w);
          toast('Diganti ke: ' + w);
        });
      });
      show(sugWrap);
    } else hide(sugWrap);
  }

  function showError(msg) {
    $('errorText').textContent = msg;
    show($('errorCard'));
  }
  $('btnErrorRetry').addEventListener('click', function () { hide($('errorCard')); });

  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () { copyText(b.getAttribute('data-copy')); });
  });

  // ---------- Riwayat ----------
  function getHistory() {
    try { return JSON.parse(localStorage.getItem('aksara_history') || '[]'); } catch (e) { return []; }
  }
  function setHistory(h) {
    try { localStorage.setItem('aksara_history', JSON.stringify(h.slice(0, 30))); } catch (e) {}
  }
  $('btnSaveHistory').addEventListener('click', function () {
    var latin = $('resultLatin').textContent, ind = $('resultID').textContent;
    if (!latin) return;
    var h = getHistory();
    // thumbnail kecil
    var thumb = '';
    try {
      var img = $('previewImg');
      var c = document.createElement('canvas');
      var s = Math.min(1, 160 / Math.max(img.naturalWidth || 160, img.naturalHeight || 160));
      c.width = Math.round((img.naturalWidth || 160) * s); c.height = Math.round((img.naturalHeight || 160) * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      thumb = c.toDataURL('image/jpeg', 0.6);
    } catch (e) {}
    h.unshift({ latin: latin, indonesian: ind, date: new Date().toLocaleString('id-ID'), thumb: thumb });
    setHistory(h);
    toast('Tersimpan di riwayat');
  });
  function renderHistory() {
    var h = getHistory();
    var list = $('historyList');
    $('btnClearHistory').classList.toggle('hidden', h.length === 0);
    if (!h.length) { list.innerHTML = '<div class="empty">Belum ada riwayat pindaian.<br>Hasil scan yang disimpan akan muncul di sini.</div>'; return; }
    list.innerHTML = h.map(function (it, i) {
      return '<div class="hist-item">' +
        (it.thumb ? '<img src="' + it.thumb + '" style="width:100%;border-radius:8px;margin-bottom:8px;max-height:140px;object-fit:cover;">' : '') +
        '<div class="hist-latin">' + esc(it.latin) + '</div>' +
        '<div class="hist-id">' + esc(it.indonesian) + '</div>' +
        '<div class="hist-meta"><span class="hist-date">' + esc(it.date) + '</span>' +
        '<button class="hist-del" data-i="' + i + '">Hapus</button></div></div>';
    }).join('');
    list.querySelectorAll('.hist-del').forEach(function (b) {
      b.addEventListener('click', function () {
        var hh = getHistory();
        hh.splice(parseInt(b.getAttribute('data-i'), 10), 1);
        setHistory(hh); renderHistory(); toast('Dihapus');
      });
    });
  }
  $('btnClearHistory').addEventListener('click', function () {
    setHistory([]); renderHistory(); toast('Riwayat dihapus');
  });

  // ---------- Belajar: flashcard ----------
  var fi = 0;
  function renderFlash() {
    var d = AKSARA[fi];
    $('flashAksara').textContent = d.a;
    $('flashLatin').textContent = d.l;
    $('flashName').textContent = fi < 20 ? 'Aksara nglegena' : 'Sandhangan / tanda';
    $('flashCount').textContent = (fi + 1) + ' / ' + AKSARA.length;
    $('flashWrap').classList.remove('flipped');
  }
  $('flashWrap').addEventListener('click', function (e) {
    if (e.target.closest('.flash-nav')) return;
    $('flashWrap').classList.toggle('flipped');
  });
  $('flashPrev').addEventListener('click', function () { fi = (fi - 1 + AKSARA.length) % AKSARA.length; renderFlash(); });
  $('flashNext').addEventListener('click', function () { fi = (fi + 1) % AKSARA.length; renderFlash(); });
  renderFlash();

  $('segFlash').addEventListener('click', function () {
    $('segFlash').classList.add('active'); $('segQuiz').classList.remove('active');
    show($('flashWrap')); hide($('quizWrap'));
  });
  $('segQuiz').addEventListener('click', function () {
    $('segQuiz').classList.add('active'); $('segFlash').classList.remove('active');
    hide($('flashWrap')); show($('quizWrap')); nextQuiz();
  });

  // ---------- Kuis ----------
  var qScore = 0, qTotal = 0, qLock = false;
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function nextQuiz() {
    qLock = false;
    $('quizFeedback').textContent = ''; $('quizFeedback').className = 'quiz-feedback';
    hide($('quizNext'));
    var pool = AKSARA.slice(0, 20);
    var q = pool[Math.floor(Math.random() * pool.length)];
    var opts = shuffle([q].concat(shuffle(pool.filter(function (x) { return x !== q; })).slice(0, 3)));
    $('quizQ').textContent = q.a;
    $('quizQ').dataset.answer = q.l;
    $('quizOpts').innerHTML = '';
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.className = 'quiz-opt'; b.textContent = o.l; b.dataset.l = o.l;
      b.addEventListener('click', answerQuiz);
      $('quizOpts').appendChild(b);
    });
  }
  function answerQuiz(e) {
    if (qLock) return;
    qLock = true; qTotal++;
    var ans = $('quizQ').dataset.answer;
    var btns = $('quizOpts').querySelectorAll('.quiz-opt');
    btns.forEach(function (b) {
      b.disabled = true;
      if (b.dataset.l === ans) b.classList.add('correct');
    });
    var fb = $('quizFeedback');
    if (e.currentTarget.dataset.l === ans) {
      qScore++; fb.textContent = 'Benar! Hebat.'; fb.classList.add('ok');
    } else {
      e.currentTarget.classList.add('wrong');
      fb.textContent = 'Kurang tepat. Jawabannya: ' + ans; fb.classList.add('no');
    }
    $('quizScore').textContent = qScore; $('quizTotal').textContent = qTotal;
    show($('quizNext'));
  }
  $('quizNext').addEventListener('click', nextQuiz);

  // ---------- Latin -> Aksara ----------
  $('btnConvert').addEventListener('click', function () {
    var t = $('latinInput').value.trim();
    if (!t) { toast('Ketik teks dulu'); return; }
    hide($('aksaraOut')); hide($('btnCopyAksara')); show($('convertLoading'));
    $('btnConvert').disabled = true;
    fetch('/api/text-to-aksara', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t })
    })
      .then(function (r) {
        if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.detail || ('Server error ' + r.status));
        });
        return r.json();
      })
      .then(function (d) {
        hide($('convertLoading'));
        if (!d.aksara) { toast('Gagal mengonversi'); return; }
        $('aksaraOut').textContent = d.aksara;
        show($('aksaraOut')); show($('btnCopyAksara'));
      })
      .catch(function (e) { hide($('convertLoading')); toast('Gagal: ' + e.message); })
      .finally(function () { $('btnConvert').disabled = false; });
  });
  $('btnCopyAksara').addEventListener('click', function () { copyText('aksaraOut'); });

  // ---------- Info modal ----------
  $('btnInfo').addEventListener('click', function () { show($('infoModal')); });
  $('btnInfoClose').addEventListener('click', function () { hide($('infoModal')); });
  $('infoModal').addEventListener('click', function (e) {
    if (e.target === $('infoModal')) hide($('infoModal'));
  });

  renderHistory();
})();
