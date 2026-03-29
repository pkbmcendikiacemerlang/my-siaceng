/* ╔══════════════════════════════════════════════════════════════╗
   ║  PKBM FIREBASE REAL-TIME SYNC ENGINE                        ║
   ║  Konfigurasi Firebase — GANTI dengan project Anda sendiri   ║
   ║  Cara: https://console.firebase.google.com → Buat project   ║
   ╚══════════════════════════════════════════════════════════════╝ */

// ─── Firebase Config (hardcoded + localStorage fallback) ───
const FIREBASE_CONFIG_DEFAULT = {
  apiKey:            "AIzaSyCOj1XTjM8uXi-u6QUfmbEMchSn5WB4ImA",
  authDomain:        "fir-config-bbd5f.firebaseapp.com",
  projectId:         "fir-config-bbd5f",
  storageBucket:     "fir-config-bbd5f.firebasestorage.app",
  messagingSenderId: "173546060429",
  appId:             "1:173546060429:web:4316547a1a2c080b1700c4",
  databaseURL:       "https://fir-config-bbd5f-default-rtdb.firebaseio.com"
};
function _loadFirebaseConfig() {
  try {
    const saved = localStorage.getItem('pkbm_firebase_config');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return FIREBASE_CONFIG_DEFAULT;
}
function _saveFirebaseConfig(cfg) {
  try { localStorage.setItem('pkbm_firebase_config', JSON.stringify(cfg)); } catch(e) {}
}
// Auto-simpan config default ke localStorage
(function(){
  try { if (!localStorage.getItem('pkbm_firebase_config'))
    localStorage.setItem('pkbm_firebase_config', JSON.stringify(FIREBASE_CONFIG_DEFAULT));
  } catch(e) {}
})();
const FIREBASE_CONFIG = _loadFirebaseConfig();
let _fbAuth = null, _fbFirestore = null, _fbStorage = null;

// ─── Semua kunci data yang disync ke Firebase (Admin + Guru + Siswa) ───
const SYNC_KEYS = [
  // Data akademik
  'soal','ujian','ujian_online','jawaban_ujian','mapel','nilai',
  'naik_kelas','sumber_belajar','perangkat_ajar','video_pembelajaran',
  // Fitur & aktivitas
  'activity','fitur_baru','fitur_respons','flayer_files',
  // Akun pengguna — tersinkron ke semua server
  'siswa','guru','admin_config'
];

// ─── State Firebase ───
let _fbApp = null;
let _fbDb  = null;
let _fbRef = null;
let _fbOnline = false;
let _fbListeners = {};
let _fbInitialized = false;

/* Indikator status sync di UI */
function _renderSyncIndicator(status) {
  let el = document.getElementById('fb-sync-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fb-sync-indicator';
    el.style.cssText = `
      position:fixed; bottom:16px; right:16px; z-index:9999;
      display:flex; align-items:center; gap:8px;
      background:#fff; border-radius:20px; padding:6px 14px 6px 10px;
      box-shadow:0 4px 20px rgba(0,0,0,0.15); font-size:12px; font-weight:600;
      border:1.5px solid #e2e8f0; transition:.3s; cursor:pointer;
    `;
    el.title = 'Status sinkronisasi data real-time';
    el.onclick = () => _showSyncModal();
    document.body.appendChild(el);
  }
  const configs = {
    connecting: { dot:'🟡', text:'Menghubungkan...', color:'#f59e0b' },
    online:     { dot:'🟢', text:'Tersinkron',       color:'#10b981' },
    offline:    { dot:'🔴', text:'Offline (lokal)',  color:'#ef4444' },
    error:      { dot:'🟠', text:'Perlu konfigurasi',color:'#f97316' },
    syncing:    { dot:'🔵', text:'Menyinkronkan...', color:'#3b82f6' },
  };
  const c = configs[status] || configs.offline;
  el.innerHTML = `<span style="font-size:10px">${c.dot}</span> <span style="color:${c.color}">${c.text}</span>`;
}

/* Modal info/konfigurasi Firebase — wizard setup */
function _showSyncModal() {
  const cfg = _loadFirebaseConfig();
  const online = _fbOnline;
  let html = '';
  if (online) {
    html = `<div style="font-family:'Plus Jakarta Sans',sans-serif;padding:4px">
      <div style="background:#d1fae5;border-radius:12px;padding:16px;color:#065f46;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:28px;">✅</span>
        <div><strong style="font-size:15px;">Terhubung ke Firebase!</strong><br>
        <span style="font-size:12px;">Data tersinkron real-time ke semua perangkat.</span></div>
      </div>
      <div style="font-size:12px;color:#475569;background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:14px;line-height:1.8;">
        <strong>Project:</strong> ${cfg ? cfg.projectId : '-'}<br>
        <strong>Database:</strong> ${cfg ? cfg.databaseURL : '-'}<br><br>
        <strong>Data yang disinkronkan:</strong> Soal, Ujian, Nilai, Mapel, Aktivitas, Sumber Belajar, Video, Perangkat Ajar
      </div>
      <button onclick="_fbResetConfig()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:8px 16px;font-size:12px;cursor:pointer;font-weight:600;">
        🗑️ Hapus Konfigurasi Firebase
      </button>
    </div>`;
  } else {
    const s = cfg || {};
    html = `<div style="font-family:'Plus Jakarta Sans',sans-serif;padding:4px">
      <div style="background:#fef3c7;border-radius:10px;padding:12px 14px;color:#92400e;font-size:12px;margin-bottom:14px;line-height:1.7;">
        ⚠️ <strong>Firebase belum dikonfigurasi.</strong> Isi form berikut dari Firebase Console.<br>
        👉 <a href="https://console.firebase.google.com" target="_blank" style="color:#1d4ed8;font-weight:700;">console.firebase.google.com</a>
        → Project Settings → Your apps → SDK configuration
      </div>
      <div style="display:grid;gap:9px;margin-bottom:14px;">
        <div>
          <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:3px;">🔑 API Key <span style="color:#dc2626">*</span></label>
          <input id="fb-apiKey" type="text" placeholder="AIzaSy..." value="${s.apiKey||''}"
            style="width:100%;box-sizing:border-box;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:11px;font-family:monospace;outline:none;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:3px;">🗄️ Database URL <span style="color:#dc2626">*</span></label>
          <input id="fb-databaseURL" type="text" placeholder="https://nama-project-default-rtdb.asia-southeast1.firebasedatabase.app" value="${s.databaseURL||''}"
            style="width:100%;box-sizing:border-box;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:11px;font-family:monospace;outline:none;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:3px;">Auth Domain</label>
            <input id="fb-authDomain" type="text" placeholder="project.firebaseapp.com" value="${s.authDomain||''}"
              style="width:100%;box-sizing:border-box;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:11px;font-family:monospace;outline:none;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:3px;">Project ID</label>
            <input id="fb-projectId" type="text" placeholder="nama-project" value="${s.projectId||''}"
              style="width:100%;box-sizing:border-box;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:11px;font-family:monospace;outline:none;">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:3px;">Sender ID</label>
            <input id="fb-messagingSenderId" type="text" placeholder="123456789012" value="${s.messagingSenderId||''}"
              style="width:100%;box-sizing:border-box;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:11px;font-family:monospace;outline:none;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:3px;">App ID</label>
            <input id="fb-appId" type="text" placeholder="1:123:web:abc" value="${s.appId||''}"
              style="width:100%;box-sizing:border-box;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:11px;font-family:monospace;outline:none;">
          </div>
        </div>
      </div>
      <div id="fb-setup-msg" style="display:none;border-radius:8px;padding:9px 12px;font-size:12px;margin-bottom:12px;"></div>
      <div style="background:#f0f9ff;border-radius:8px;padding:10px 12px;font-size:11px;color:#0369a1;margin-bottom:14px;line-height:1.7;">
        <strong>💡 Tips:</strong> Di Firebase Console → <strong>Realtime Database → Rules</strong>, paste lalu Publish:<br>
        <code style="background:#e0f2fe;padding:2px 6px;border-radius:4px;font-size:10px;">{ "rules": { ".read": true, ".write": true } }</code>
      </div>
      <button onclick="_fbSaveConfig()" style="width:100%;background:linear-gradient(135deg,#1a4dbe,#2563eb);color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.3px;">
        🔗 Hubungkan ke Firebase
      </button>
    </div>`;
  }
  document.getElementById('modal-sync-info').querySelector('.modal-body').innerHTML = html;
  openModal('modal-sync-info');
}

/* Simpan config dari form dan init Firebase */
function _fbSaveConfig() {
  const apiKey            = (document.getElementById('fb-apiKey').value||'').trim();
  const databaseURL       = (document.getElementById('fb-databaseURL').value||'').trim();
  const authDomain        = (document.getElementById('fb-authDomain').value||'').trim();
  const projectId         = (document.getElementById('fb-projectId').value||'').trim();
  const messagingSenderId = (document.getElementById('fb-messagingSenderId').value||'').trim();
  const appId             = (document.getElementById('fb-appId').value||'').trim();
  const msgEl             = document.getElementById('fb-setup-msg');

  const showMsg = (text, bg, color) => {
    msgEl.style.display = 'block';
    msgEl.style.background = bg;
    msgEl.style.color = color;
    msgEl.textContent = text;
  };

  if (!apiKey) return showMsg('⚠️ API Key wajib diisi!', '#fee2e2', '#dc2626');
  if (!databaseURL) return showMsg('⚠️ Database URL wajib diisi!', '#fee2e2', '#dc2626');
  if (!databaseURL.startsWith('https://')) return showMsg('⚠️ Database URL harus diawali https://', '#fee2e2', '#dc2626');

  showMsg('🔄 Menyimpan dan menghubungkan ke Firebase...', '#dbeafe', '#1d4ed8');

  const cfg = { apiKey, databaseURL, authDomain, projectId, messagingSenderId, appId };
  _saveFirebaseConfig(cfg);

  // Reset Firebase instance lama
  _fbInitialized = false; _fbOnline = false;
  Object.keys(_fbListeners).forEach(k => { try { if(_fbRef) _fbRef.child(k).off(); } catch(e){} });
  _fbListeners = {}; _fbRef = null; _fbDb = null;
  try { firebase.apps.slice().forEach(a => { try { a.delete(); } catch(e){} }); } catch(e){}
  _fbApp = null;

  setTimeout(() => {
    _initFirebase();
    setTimeout(() => {
      if (_fbOnline) {
        closeModal('modal-sync-info');
        showNotif('✅ Firebase terhubung! Sync real-time aktif.', '#10b981');
      } else {
        showMsg('⚠️ Gagal terhubung. Cek Database URL dan pastikan Rules Firebase sudah diset ke read/write: true', '#fef3c7', '#92400e');
      }
    }, 4500);
  }, 400);
}

/* Hapus konfigurasi Firebase */
function _fbResetConfig() {
  if (!confirm('Hapus konfigurasi Firebase? Data akan kembali ke mode lokal saja.')) return;
  localStorage.removeItem('pkbm_firebase_config');
  _fbOnline = false; _fbInitialized = false;
  _renderSyncIndicator('error');
  closeModal('modal-sync-info');
  showNotif('Konfigurasi Firebase dihapus. Mode lokal aktif.', '#f59e0b');
}
/* ─── Inisialisasi Firebase ─── */
function _initFirebase() {
  try {
    // Cek apakah config ada dan valid
    const cfg = _loadFirebaseConfig();
    if (!cfg || !cfg.apiKey || !cfg.databaseURL) {
      console.log('[PKBM Sync] Firebase belum dikonfigurasi — klik indikator untuk setup');
      _renderSyncIndicator('error');
      return;
    }
    _renderSyncIndicator('connecting');
    if (!firebase.apps.length) {
      _fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      _fbApp = firebase.apps[0];
    }
    _fbDb  = firebase.database(_fbApp);
    _fbRef = _fbDb.ref('pkbm_data');
    try { _fbAuth      = firebase.auth(_fbApp);      } catch(e){}
    try { _fbFirestore = firebase.firestore(_fbApp); } catch(e){}
    try { _fbStorage   = firebase.storage(_fbApp);  } catch(e){}

    // Monitor koneksi
    _fbDb.ref('.info/connected').on('value', snap => {
      _fbOnline = snap.val() === true;
      _renderSyncIndicator(_fbOnline ? 'online' : 'offline');
      if (_fbOnline) {
        console.log('[PKBM Sync] ✅ Terhubung ke Firebase');
        // Seed data embedded ke Firebase jika belum ada
        _seedEmbeddedToFirebase();
        // Push perubahan lokal yang mungkin tertinggal
        _pushPendingToFirebase();
      }
    });

    // ─── Real-time LISTENERS: terima semua perubahan dari Firebase → update state lokal ───
    // Ini berlaku untuk SEMUA key termasuk siswa, guru, admin_config
    SYNC_KEYS.forEach(key => {
      if (_fbListeners[key]) return; // sudah ada listener
      _fbListeners[key] = _fbRef.child(key).on('value', snap => {
        const val = snap.val();
        if (val === null) return; // belum ada data
        try {
          const parsed = typeof val === 'string' ? JSON.parse(val) : val;
          // Hanya update jika data benar-benar berbeda (cegah loop)
          const current = JSON.stringify(state[key]);
          const incoming = JSON.stringify(parsed);
          if (current !== incoming) {
            state[key] = parsed;
            // Refresh UI yang relevan jika sedang aktif
            _refreshUIForKey(key);
            console.log('[PKBM Sync] ↓ Terima update:', key);
          }
        } catch(e) { console.warn('[PKBM Sync] Parse error for', key, e); }
      }, err => {
        console.warn('[PKBM Sync] Listener error for', key, err);
      });
    });

    _fbInitialized = true;
    console.log('[PKBM Sync] Firebase listener aktif untuk semua kunci data');

  } catch(e) {
    console.warn('[PKBM Sync] Gagal init Firebase:', e);
    _renderSyncIndicator('offline');
  }
}

/* ─── Push data ke Firebase saat save() dipanggil ─── */
function _pushToFirebase(key, data) {
  if (!_fbInitialized || !_fbRef || !_fbOnline) {
    // Tandai sebagai pending untuk dikirim saat online
    try {
      localStorage.setItem('pkbm_fb_pending_' + key, '1');
    } catch(e) {}
    return;
  }
  try {
    const payload = JSON.stringify(data);
    _fbRef.child(key).set(payload).then(() => {
      console.log('[PKBM Sync] ↑ Push ke Firebase:', key);
    }).catch(e => {
      console.warn('[PKBM Sync] Push gagal:', key, e);
    });
  } catch(e) { console.warn('[PKBM Sync] Stringify error:', e); }
}

/* ─── Saat reconnect, push semua key yang tertunda ─── */
/* Seed data awal ke Firebase jika node masih kosong (dari embedded data) */
function _seedEmbeddedToFirebase() {
  if (!_fbRef || !_fbOnline) return;
  if (typeof PKBM_EMBEDDED_DATA === 'undefined' || !PKBM_EMBEDDED_DATA) return;
  const seedKeys = ['siswa','guru'];
  seedKeys.forEach(key => {
    if (!PKBM_EMBEDDED_DATA[key] || !PKBM_EMBEDDED_DATA[key].length) return;
    _fbRef.child(key).once('value', snap => {
      if (snap.val() === null || snap.val() === '' || snap.val() === '[]') {
        console.log('[PKBM Sync] Seed ' + key + ' ke Firebase (' + PKBM_EMBEDDED_DATA[key].length + ' data)');
        _fbRef.child(key).set(JSON.stringify(PKBM_EMBEDDED_DATA[key]));
      }
    });
  });
  if (PKBM_EMBEDDED_DATA.admin_user) {
    _fbRef.child('admin_config').once('value', snap => {
      if (snap.val() === null) {
        _fbRef.child('admin_config').set(JSON.stringify({
          admin_user: PKBM_EMBEDDED_DATA.admin_user,
          admin_pass: PKBM_EMBEDDED_DATA.admin_pass || 'admin123'
        }));
      }
    });
  }
}

function _pushPendingToFirebase() {
  SYNC_KEYS.forEach(key => {
    const pending = localStorage.getItem('pkbm_fb_pending_' + key);
    if (pending === '1' && state[key] !== undefined) {
      _pushToFirebase(key, state[key]);
      localStorage.removeItem('pkbm_fb_pending_' + key);
    }
  });
}

/* ─── Refresh UI setelah terima update dari Firebase ─── */
function _refreshUIForKey(key) {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  const pid = activePage.id.replace('page-', '');
  try {
    if (key === 'nilai'   && pid === 'laporan')  updateLaporan();
    if (key === 'nilai'   && pid === 'rapor')    updateRaporSelect();
    if (key === 'nilai'   && pid === 'dashboard') updateDashboard();
    if (key === 'soal'    && pid === 'soal')     { if(typeof renderSoal==='function') renderSoal(); }
    if (key === 'ujian'   && pid === 'ujian')    { if(typeof renderUjian==='function') renderUjian(); }
    if (key === 'ujian_online' && pid === 'ujian-online') { if(typeof renderUjianOnline==='function') renderUjianOnline(); }
    if (key === 'jawaban_ujian' && pid === 'ujian-online') { if(typeof renderUjianOnline==='function') renderUjianOnline(); }
    if (key === 'mapel'   && pid === 'mapel')    { if(typeof renderMapel==='function') renderMapel(); }
    if (key === 'activity'&& pid === 'dashboard') updateDashboard();
    if (key === 'fitur_baru' && pid === 'fitur-baru') { if(typeof renderFiturBaru==='function') renderFiturBaru(); }
    if (key === 'sumber_belajar' && pid === 'sumber-belajar') { if(typeof renderSumberBelajar==='function') renderSumberBelajar(); }
    if (key === 'video_pembelajaran' && pid === 'video') { if(typeof renderVideo==='function') renderVideo(); }
    if (key === 'perangkat_ajar' && pid === 'perangkat') { if(typeof renderPerangkat==='function') renderPerangkat(); }
    if (key === 'naik_kelas' && pid === 'naik-kelas') { if(typeof renderNaikKelas==='function') renderNaikKelas(); }

    // Notifikasi halus saat ada update masuk
    _showSyncToast(key);
  } catch(e) {}
}

/* ─── Toast kecil saat ada data masuk dari device lain ─── */
let _toastTimer = null;
function _showSyncToast(key) {
  const labels = {
    nilai:'Nilai', soal:'Soal', ujian:'Ujian', mapel:'Mata Pelajaran',
    activity:'Aktivitas', ujian_online:'Ujian Online', jawaban_ujian:'Jawaban Ujian',
    fitur_baru:'Fitur Baru', sumber_belajar:'Sumber Belajar',
    video_pembelajaran:'Video', perangkat_ajar:'Perangkat Ajar', naik_kelas:'Naik Kelas'
  };
  const label = labels[key] || key;
  let el = document.getElementById('fb-sync-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fb-sync-toast';
    el.style.cssText = `
      position:fixed; bottom:60px; right:16px; z-index:9999;
      background:#1e293b; color:#fff; border-radius:10px; padding:10px 16px;
      font-size:12px; font-weight:600; box-shadow:0 4px 20px rgba(0,0,0,0.3);
      opacity:0; transition:opacity .3s; pointer-events:none;
    `;
    document.body.appendChild(el);
  }
  el.textContent = `🔄 Update ${label} diterima dari perangkat lain`;
  el.style.opacity = '1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

// Inisialisasi Firebase — SDK inline, langsung tersedia
(function() {
  function tryInit() {
    if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
      _initFirebase();
    } else {
      setTimeout(tryInit, 50);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();