/* Tiruan layanan Apps Script di memori, dipakai mode demo dan pengujian. */
function buatShim(simpanan) {
  var db = simpanan || { sheets: {}, props: {}, files: {}, n: 0 };
  var cache = {};

  function sha256(teks) {
    var data = Array.from(new TextEncoder().encode(teks));
    var K = [], H = [], p = 2, n = 0;
    while (n < 64) {
      for (var i = 2; i * i <= p && p % i; i++);
      if (i * i > p) {
        if (n < 8) H[n] = (Math.pow(p, 1 / 2) * 4294967296) >>> 0;
        K[n++] = (Math.pow(p, 1 / 3) * 4294967296) >>> 0;
      }
      p++;
    }
    var bit = data.length * 8;
    data.push(128);
    while (data.length % 64 !== 56) data.push(0);
    for (var s = 56; s >= 0; s -= 8) data.push(Math.floor(bit / Math.pow(2, s)) & 255);
    var rot = function (x, r) { return (x >>> r) | (x << (32 - r)); };
    for (var o = 0; o < data.length; o += 64) {
      var w = [], h = H.slice();
      for (var t = 0; t < 64; t++) {
        if (t < 16) w[t] = (data[o + 4 * t] << 24) | (data[o + 4 * t + 1] << 16) | (data[o + 4 * t + 2] << 8) | data[o + 4 * t + 3];
        else w[t] = (w[t - 16] + (rot(w[t - 15], 7) ^ rot(w[t - 15], 18) ^ (w[t - 15] >>> 3)) + w[t - 7] + (rot(w[t - 2], 17) ^ rot(w[t - 2], 19) ^ (w[t - 2] >>> 10))) | 0;
        var a = h[0], e = h[4];
        var t1 = (h[7] + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & h[5]) ^ (~e & h[6])) + K[t] + w[t]) | 0;
        var t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]))) | 0;
        h = [(t1 + t2) | 0, a, h[1], h[2], (h[3] + t1) | 0, e, h[5], h[6]];
      }
      for (var j = 0; j < 8; j++) H[j] = (H[j] + h[j]) >>> 0;
    }
    var out = [];
    H.forEach(function (v) { out.push(v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); });
    return out;
  }

  function sheet(nama) {
    var rows = db.sheets[nama];
    function range(r, c, nr, nc) {
      var api = {
        setValues: function (v) {
          v.forEach(function (baris, i) {
            while (rows.length < r + i) rows.push([]);
            baris.forEach(function (x, j) { rows[r - 1 + i][c - 1 + j] = String(x).replace(/^'/, ''); });
          });
          return api;
        },
        setNumberFormat: function () { return api; },
        setFontWeight: function () { return api; },
        setBackground: function () { return api; }
      };
      return api;
    }
    return {
      getRange: range,
      getLastRow: function () { return rows.length; },
      getMaxRows: function () { return 1000; },
      setFrozenRows: function () {},
      getDataRange: function () {
        return { getValues: function () { return rows.map(function (x) { return x.slice(); }); } };
      }
    };
  }

  var folder = {
    getId: function () { return 'folder-demo'; },
    createFile: function (blob) {
      var id = 'file' + (++db.n);
      db.files[id] = { data: blob.data, trashed: false };
      return berkas(id);
    }
  };
  function berkas(id) {
    return {
      getId: function () { return id; },
      setSharing: function () {},
      setTrashed: function (v) { db.files[id].trashed = v; }
    };
  }

  return {
    db: db,
    SpreadsheetApp: {
      getActiveSpreadsheet: function () {
        return {
          getSheetByName: function (n) { return db.sheets[n] ? sheet(n) : null; },
          insertSheet: function (n) { db.sheets[n] = []; return sheet(n); }
        };
      }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 1 },
      Charset: { UTF_8: 1 },
      computeDigest: function (_, s) { return sha256(s); },
      getUuid: function () {
        return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, function () {
          return (crypto.getRandomValues(new Uint8Array(1))[0] & 15).toString(16);
        });
      },
      formatDate: function (d, zona, pola) {
        var iso = new Date(d.getTime() + 7 * 3600000).toISOString();
        return iso.slice(0, pola.length);
      },
      base64Decode: function (s) { return s; },
      newBlob: function (data) { return { data: data }; }
    },
    PropertiesService: {
      getScriptProperties: function () {
        return {
          getProperty: function (k) { return db.props[k] || null; },
          setProperty: function (k, v) { db.props[k] = v; },
          deleteProperty: function (k) { delete db.props[k]; },
          getProperties: function () { return Object.assign({}, db.props); }
        };
      }
    },
    CacheService: {
      getScriptCache: function () {
        return {
          get: function (k) { return cache[k] || null; },
          put: function (k, v) { cache[k] = v; },
          remove: function (k) { delete cache[k]; }
        };
      }
    },
    LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
    DriveApp: {
      Access: {}, Permission: {},
      getFoldersByName: function () { return { hasNext: function () { return true; }, next: function () { return folder; } }; },
      createFolder: function () { return folder; },
      getFolderById: function () { return folder; },
      getFileById: berkas
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: function (t) { return { setMimeType: function () { return this; }, getContent: function () { return t; } }; }
    },
    ScriptApp: {}
  };
}
