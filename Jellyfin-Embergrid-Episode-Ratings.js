(function () {
    'use strict';

    // Jellyfin Embergrid v1.1.0 — SPDX-License-Identifier: MIT
    // Derived from Damocles-fr/jellyfin-imdb-episodes-heatmap-ratings-grid.
    // Copyright (c) 2026 Damocles-fr. See LICENSE and NOTICE.md.
    // Embergrid: heatmap palette, season averages, cache isolation and retry handling.
    /*  Episodes Ratings Grid  SETTINGS  */
    const CONFIG = {
        DEBUG: false,                                       // Show mount diagnostics; enable only when troubleshooting
        TITLE: 'IMDb Episodes Grid',                         // Label of the collapsible block (also the IMDb ratings link text when no grid can be built)
        EMPTY_TEXT: 'No ratings available for this series.', // Text shown when the series has no episode data and no IMDb id
        TOOLTIP: true,                                       // Episode tooltip: mouse hover, or touch and hold a cell on touch screens
        TOOLTIP_DELAY_MS: 800,                               // Mouse hover time (ms) before the episode tooltip appears (touch uses the device long-press)
        TOOLTIP_WIDTH_PX: 400,                               // Episode tooltip width (px), capped to the screen width
        CACHE_MINUTES: 120,                                  // Lifetime of the episodes and IMDb data kept in the browser tab (minutes)
        MAX_SEASONS: 500,                                    // Highest season number shown
        MAX_EPISODE_SPAN: 200,                               // Max episodes covered by a single multi-episode file
        MAX_EPISODE_NUMBER: 2000,                             // Protect against malformed or unreasonable episode numbers
        MAX_GRID_CELLS: 12000,                               // Limit DOM size for unusually large series
        LOCAL_TIMEOUT_MS: 15000,                              // Deadline for each Jellyfin API request (underlying request may continue)
        EXTERNAL_TIMEOUT_MS: 15000,                           // External dataset request deadline
        DATASET_URL: 'https://cdn.jsdelivr.net/gh/ya0903/imdb-episode-dataset@main/data/shows' // IMDb ratings dataset folder, one <imdbId>.json file per series
    };

    if (window.__jfEmbergrid) return;
    window.__jfEmbergrid = true;

    // Optional mount diagnostics. Silent unless CONFIG.DEBUG is true.
    let diagnosticNode = null;
    function diagnostic(message) {
        if (!CONFIG.DEBUG) return;
        console.info('[JF-Embergrid]', message);
        if (!document.body) return;
        if (!diagnosticNode) {
            diagnosticNode = document.createElement('div');
            diagnosticNode.id = 'jf-embergrid-diagnostic';
            diagnosticNode.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:2147483647;max-width:80vw;padding:10px 14px;background:#17212b;color:white;border:1px solid #1da1f2;border-radius:6px;font:13px sans-serif;pointer-events:none';
            document.body.appendChild(diagnosticNode);
        }
        diagnosticNode.textContent = 'Embergrid 1.1.0: ' + message;
    }
    let lastDiagnostic = '';
    function report(message) { if(message !== lastDiagnostic) { lastDiagnostic=message; diagnostic(message); } }
    diagnostic('script started');
    const ROOT = '[data-jf-ieg-root="1"]';
    const STYLE_ID = 'jf-embergrid-style-v1';
    const INV_KEY = 'jf-imdb-episodes-grid-inverted-v1';
    const TIP_ID = 'jf-hover-tooltip';
    const TIP_STYLE_ID = 'jf-hover-tooltip-style';
    const IMDB = 'https://www.imdb.com/title/';
    const BOXES = ['#listChildrenCollapsible', '#childrenCollapsible'];
    const SEASON = BOXES.map(b => b + ' [data-type="Season"]').join(',');
    const CELL = '.jf-ieg-rating,.jf-ieg-empty';
    const TTL = Math.max(1, +CONFIG.CACHE_MINUTES || 120) * 60000;
    const TIP_WIDTH = 'min(' + Math.max(200, +CONFIG.TOOLTIP_WIDTH_PX || 400) + 'px, calc(100vw - 20px))';
    const CAP = { capture: true, passive: true };
    const MAX_EPISODE_NUMBER = Math.max(1, Math.floor(+CONFIG.MAX_EPISODE_NUMBER || 2000));
    const MAX_GRID_CELLS = Math.max(100, Math.floor(+CONFIG.MAX_GRID_CELLS || 12000));

    const client = () => {
        const c = window.ApiClient;
        return c && typeof c.getJSON === 'function' && typeof c.getUrl === 'function' && typeof c.accessToken === 'function' && c.accessToken() ? c : null;
    };
    // ApiClient.getJSON does not expose a guaranteed AbortSignal interface. This bounds
    // the UI wait, without claiming the underlying Jellyfin request was cancelled.
    const withTimeout = (operation, ms, description) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(description + ' timed out')), Math.max(1000, +ms || 15000));
        Promise.resolve().then(operation).then(
            value => { clearTimeout(timer); resolve(value); },
            error => { clearTimeout(timer); reject(error); }
        );
    });
    const api = path => withTimeout(() => {
        const c = client();
        if (!c) throw new Error('ApiClient not ready');
        return c.getJSON(c.getUrl(path));
    }, CONFIG.LOCAL_TIMEOUT_MS, 'Jellyfin request');
    const getItem = (id, fields) => withTimeout(() => {
        const c = client(), uid = c && typeof c.getCurrentUserId === 'function' ? c.getCurrentUserId() : '';
        if (!uid) throw new Error('Jellyfin user not available');
        const q = new URLSearchParams({ ids: id, userId: uid, fields, enableImages: false, enableUserData: false, enableTotalRecordCount: false });
        return c.getJSON(c.getUrl('Items?' + q)).then(r => (r && r.Items && r.Items[0]) || null);
    }, CONFIG.LOCAL_TIMEOUT_MS, 'Jellyfin item request');
    const hashParams = () => {
        const h = String(location.hash || ''), i = h.indexOf('?'), p = {};
        if (i >= 0) new URLSearchParams(h.slice(i + 1)).forEach((v, k) => { p[k] = v; });
        return p;
    };
    const scope = () => {
        const c = client();
        const info = c && c.serverInfo;
        return JSON.stringify([location.origin, location.pathname, info && info.Id,
            c && typeof c.getCurrentUserId === 'function' ? c.getCurrentUserId() : '']);
    };
    const cacheGet = k => {
        k = 'embergrid-v1:' + scope() + ':' + k;
        try {
            const o = JSON.parse(sessionStorage.getItem(k) || 'null');
            return o && Date.now() <= o.e ? o.v : null;
        } catch { return null; }
    };
    const cacheSet = (k, v) => {
        k = 'embergrid-v1:' + scope() + ':' + k;
        try { sessionStorage.setItem(k, JSON.stringify({ v, e: Date.now() + TTL })); } catch { }
    };
    const toRating = v => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 && n <= 10 ? n : null;
    };
    const getInv = () => { try { return localStorage.getItem(INV_KEY) === 'true'; } catch { return false; } };
    const setInv = v => { try { localStorage.setItem(INV_KEY, v ? 'true' : 'false'); } catch { } };
    const detailsHash = (id, sid) => '/details?id=' + encodeURIComponent(id) + '&serverId=' + encodeURIComponent(sid);
    const webRoot = () => {
        const m = String(location.pathname || '').match(/^(.*\/web\/)(?:index\.html)?$/i);
        return m ? m[1] : '/web/';
    };
    const detailsUrl = (id, sid) => location.origin + webRoot() + '#' + detailsHash(id, sid);
    const external = (a, url) => {
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('is', 'emby-linkbutton');
    };

    async function fetchJf(seriesId) {
        const k = 'ieg_jf_' + seriesId, c = cacheGet(k);
        if (c) return c;
        let epsFailed = false, ssFailed = false;
        const [epsRes, ssRes] = await Promise.all([
            api('Shows/' + encodeURIComponent(seriesId) + '/Episodes?Fields=CommunityRating,IndexNumberEnd,ParentIndexNumber,IndexNumber,Name,PremiereDate&EnableImages=false&EnableUserData=false&Limit=20000').catch(() => { epsFailed = true; return { Items: [] }; }),
            api('Shows/' + encodeURIComponent(seriesId) + '/Seasons?Fields=IndexNumber&EnableImages=false&EnableUserData=false').catch(() => { ssFailed = true; return { Items: [] }; })
        ]);
        if (epsFailed) throw new Error('episodes request failed');
        const seasonsByNum = {}, seasonIds = {};
        let name = '';
        for (const s of (ssRes.Items || [])) {
            const n = Number(s && s.IndexNumber);
            if (Number.isSafeInteger(n) && n > 0 && n <= CONFIG.MAX_SEASONS) seasonIds[n] = s.Id || '';
            if (!name && s && s.SeriesName) name = s.SeriesName;
        }
        for (const ep of (epsRes.Items || [])) {
            if (!ep) continue;
            if (!name && ep.SeriesName) name = ep.SeriesName;
            const sn = Number(ep.ParentIndexNumber), en = Number(ep.IndexNumber);
            if (!Number.isSafeInteger(sn) || !Number.isSafeInteger(en) || sn < 1 || sn > CONFIG.MAX_SEASONS || en < 1 || en > MAX_EPISODE_NUMBER) continue;
            const endNumber = Number(ep.IndexNumberEnd);
            const end = Number.isSafeInteger(endNumber) && endNumber >= en ? Math.min(endNumber, en + CONFIG.MAX_EPISODE_SPAN, MAX_EPISODE_NUMBER) : en;
            (seasonsByNum[sn] = seasonsByNum[sn] || []).push({ ep: en, epEnd: end, jfId: ep.Id || '', rating: toRating(ep.CommunityRating), name: ep.Name || '', airDate: ep.PremiereDate || '' });
        }
        const val = { seasonsByNum, seasonIds, name };
        if (!ssFailed) cacheSet(k, val);
        return val;
    }

    async function fetchImdbId(seriesId) {
        const k = 'ieg_tt_' + seriesId, c = cacheGet(k);
        if (c !== null) return c;
        const item = await getItem(seriesId, 'ProviderIds');
        if (!item) throw new Error('Series metadata unavailable');
        const ids = item.ProviderIds || {}, key = Object.keys(ids).find(x => x.toLowerCase() === 'imdb');
        const m = key ? String(ids[key]).trim().match(/^(?:tt)?(\d+)$/i) : null;
        const val = m ? 'tt' + m[1] : '';
        cacheSet(k, val);
        return val;
    }

    async function fetchDataset(imdbId) {
        const k = 'ieg_imdb_' + imdbId, c = cacheGet(k);
        if (c !== null) return c || null;
        const r = await fetch(String(CONFIG.DATASET_URL).replace(/\/+$/, '') + '/' + encodeURIComponent(imdbId) + '.json', { credentials: 'omit', signal: AbortSignal.timeout(CONFIG.EXTERNAL_TIMEOUT_MS) });
        if (!r.ok && r.status !== 404) throw new Error('dataset ' + r.status);
        const show = r.ok ? await r.json() : null, seasons = show && show.seasons, out = {};
        let any = false;
        if (seasons && typeof seasons === 'object') {
            for (const sk of Object.keys(seasons)) {
                const s = Number(sk), eps = seasons[sk];
                if (!Number.isSafeInteger(s) || s < 1 || s > CONFIG.MAX_SEASONS || !eps || typeof eps !== 'object') continue;
                for (const ek of Object.keys(eps)) {
                    const e = Number(ek);
                    if (!Number.isSafeInteger(e) || e < 1 || e > MAX_EPISODE_NUMBER) continue;
                    (out[s] = out[s] || {})[e] = toRating(eps[ek] && eps[ek].r);
                    any = true;
                }
            }
        }
        cacheSet(k, any ? out : 0);
        return any ? out : null;
    }

    function mergeData(ds, jf) {
        const nums = [...Object.keys(jf.seasonsByNum || {}), ...Object.keys(ds || {})]
            .map(Number).filter(n => Number.isSafeInteger(n) && n > 0 && n <= CONFIG.MAX_SEASONS);
        const max = Math.max(0, ...nums), out = [];
        for (let s = 1; s <= max; s++) {
            const byEp = new Map(), d = (ds && ds[s]) || {};
            for (const n of Object.keys(d)) {
                const ep = Number(n), rating = toRating(d[n]);
                if (Number.isSafeInteger(ep) && ep > 0 && ep <= MAX_EPISODE_NUMBER)
                    byEp.set(ep, { ep, rating, source: rating == null ? null : 'IMDb', jfId: '' });
            }
            for (const j of (jf.seasonsByNum[s] || [])) {
                const end = Math.min(j.epEnd >= j.ep ? j.epEnd : j.ep, MAX_EPISODE_NUMBER);
                for (let n = j.ep; n <= end; n++) {
                    const x = byEp.get(n) || { ep: n, rating: null, source: null, jfId: '' };
                    if (x.rating == null && j.rating != null) {
                        x.rating = j.rating;
                        x.source = 'Jellyfin';
                    }
                    if (!x.jfId && j.jfId) x.jfId = j.jfId;
                    x.name = x.name || j.name;
                    x.airDate = x.airDate || j.airDate;
                    byEp.set(n, x);
                }
            }
            const episodes = [...byEp.values()].sort((a, b) => a.ep - b.ep);
            if (episodes.length) out.push({ num: s, seasonJfId: jf.seasonIds[s] || '', episodes });
        }
        return out;
    }

    function ratingStyle(r) {
        const v = toRating(r);
        if (v == null) return '';
        const stops = [[9.6,'#1da1f2','#fff'],[9,'#186a3b','#fff'],[8,'#28b463','#2a2a2a'],[7,'#f4d03f','#2a2a2a'],[6,'#f39c12','#2a2a2a'],[5,'#e74c3c','#fff'],[0,'#633974','#fff']];
        const [,bg,text] = stops.find(([min]) => v >= min);
        return 'background:'+bg+';color:'+text+' !important;text-shadow:none;box-shadow:none;';
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = `
${ROOT}{--c1:2.72rem;--rh:2.36rem;--axis:rgba(34,34,40,.84);--axis2:rgba(48,48,56,.90);margin:.85em 0 1.1em;position:relative;z-index:3;clear:both;width:100%;max-width:calc(100% - 3.15rem)}
.jf-ieg-box{border-radius:12px;overflow:hidden;background:rgba(18,18,18,.26);border:1px solid rgba(255,255,255,.08)}
.jf-ieg-toggle{width:100%;display:flex;align-items:center;gap:.42rem;border:0;margin:0;padding:.72rem .95rem;cursor:pointer;color:inherit;background:rgba(255,255,255,.03);text-align:left;font:inherit;box-shadow:none !important;-webkit-tap-highlight-color:transparent}.jf-ieg-toggle:hover{background:rgba(255,255,255,.05)}.jf-ieg-toggle-label{font-size:1.05rem;font-weight:700;line-height:1.2}.jf-ieg-toggle-icon{transition:transform .16s ease;opacity:.92;flex:0 0 auto}.jf-ieg-toggle[aria-expanded="true"] .jf-ieg-toggle-icon{transform:rotate(180deg)}
.jf-ieg-panel{border-top:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.09);overflow:hidden}.jf-ieg-panel[hidden]{display:none !important}.jf-ieg-body{padding:.72rem .82rem .82rem;background:rgba(0,0,0,.06);overflow:hidden}.jf-ieg-status{font-size:.92rem;opacity:.9;padding:.15rem .05rem}.jf-ieg-link{color:inherit !important;text-decoration:none !important;font-weight:700}
.jf-ieg-scroll{overflow-x:auto;overflow-y:hidden;padding-bottom:.08rem;padding-right:.55rem;max-width:100%;scrollbar-gutter:stable}
.jf-ieg-scroll:focus-visible{outline:3px solid #1da1f2;outline-offset:2px}
.jf-ieg-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.jf-ieg-slot{padding:0;border:0;font-weight:normal;text-align:center;vertical-align:middle;box-sizing:border-box;min-width:var(--c1);max-width:var(--c1);height:var(--rh)}
.jf-ieg-grid{display:table;border-collapse:separate;border-spacing:.26rem;min-width:max-content;width:max-content;table-layout:fixed}
.jf-ieg-cell{height:var(--rh);min-height:var(--rh);max-height:var(--rh);display:flex;align-items:center;justify-content:center;text-align:center;border-radius:8px;box-sizing:border-box;padding:.18rem .24rem;line-height:1;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:.86rem;position:relative;flex:0 0 auto}
.jf-ieg-corner,.jf-ieg-season,.jf-ieg-episode,.jf-ieg-rating,.jf-ieg-empty,.jf-ieg-ghost{width:var(--c1);min-width:var(--c1);max-width:var(--c1)}
.jf-ieg-corner{position:sticky;left:0;z-index:6;background:var(--axis) !important;border-color:rgba(255,255,255,.14) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
.jf-ieg-corner-btn{cursor:pointer;-webkit-tap-highlight-color:transparent;color:inherit}.jf-ieg-corner-btn:hover{background:var(--axis2) !important;border-color:rgba(255,255,255,.24) !important}.jf-ieg-corner-icon{width:1rem;height:1rem;display:block;opacity:.92;transition:transform .16s ease,opacity .16s ease;pointer-events:none;color:inherit}
.jf-ieg-season,.jf-ieg-episode{font-weight:700;background:var(--axis) !important;font-size:.89rem;color:inherit !important;text-decoration:none !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05) !important;border-color:rgba(255,255,255,.14) !important}
.jf-ieg-season:hover,.jf-ieg-episode:hover{background:var(--axis2) !important;border-color:rgba(255,255,255,.24) !important}
.jf-ieg-sticky-left{position:sticky;left:0;z-index:5;background:var(--axis) !important;border-color:rgba(255,255,255,.14) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05) !important}
.jf-ieg-axis-match{background:var(--axis2) !important;border-color:rgba(255,255,255,.30) !important;box-shadow:0 0 0 1px rgba(255,255,255,.04),inset 0 1px 0 rgba(255,255,255,.05) !important}
.jf-ieg-rating{cursor:pointer;font-family:inherit !important;font-weight:700 !important;font-size:1.28rem;letter-spacing:-.01em;font-variant-numeric:tabular-nums;transition:filter .16s ease,border-color .16s ease,box-shadow .16s ease;text-decoration:none !important;z-index:1}.jf-ieg-rating:hover{filter:brightness(1.36) saturate(1.42) contrast(1.12);border-color:rgba(255,255,255,.22)}
.jf-ieg-empty{cursor:pointer;font-weight:800;font-size:1.02rem;color:rgba(255,255,255,.76) !important;text-decoration:none !important;background:rgba(112,112,124,.18) !important;border-color:rgba(220,220,230,.12) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04) !important}.jf-ieg-empty:hover{filter:brightness(1.10);border-color:rgba(255,255,255,.18) !important}
.jf-ieg-ghost{opacity:0;pointer-events:none;background:transparent !important;border-color:transparent !important;box-shadow:none !important}
.jf-ieg-rating,.jf-ieg-empty{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}

${ROOT} :is(a,button):focus-visible{outline:3px solid #1da1f2 !important;outline-offset:3px}
.jf-embergrid-legend{display:flex;flex-wrap:wrap;gap:.4rem;margin:.8rem 0}.jf-embergrid-legend span{padding:.3rem .5rem;border-radius:5px;font-size:.8rem}
.jf-ieg-source-note,.jf-ieg-notice{font-size:.84rem;line-height:1.45;opacity:.9;margin:.35rem 0 .65rem}.jf-ieg-notice{padding:.55rem .65rem;border:1px solid rgba(255,255,255,.22);border-radius:7px;background:rgba(255,255,255,.055)}.jf-ieg-notice button{margin-left:.6rem;color:inherit;text-decoration:underline;cursor:pointer;border:0;background:transparent}
@media (pointer:coarse){${ROOT}{--rh:2.75rem;--c1:2.75rem}}
@media (max-width:600px){${ROOT}{max-width:100%;--c1:2.62rem}.jf-ieg-rating{font-size:1.05rem}.jf-ieg-cell{font-size:.78rem}.jf-ieg-toggle{padding:.7rem}}
@media (max-width:900px){${ROOT}{max-width:calc(100% - .4rem)}.jf-ieg-body{padding:.72rem .42rem .82rem .42rem !important}.jf-ieg-scroll{padding-right:.12rem !important}}
`;
        document.head.appendChild(s);
    }

    function ensureTipStyle() {
        if (document.getElementById(TIP_STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = TIP_STYLE_ID;
        s.textContent = '#' + TIP_ID + '{position:fixed;z-index:99999;background:rgba(15,15,15,.95);color:#fff;padding:16px;border-radius:10px;box-sizing:border-box;width:min(320px,calc(100vw - 20px));max-height:calc(100vh - 20px);overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.8);border:1px solid rgba(255,255,255,.15);backdrop-filter:blur(12px);pointer-events:none;opacity:0;transition:opacity .2s ease-in-out;display:none;font-family:sans-serif}' +
            '#' + TIP_ID + '.visible{opacity:1;display:block}' +
            '.jf-tooltip-title{font-size:1.15em;font-weight:800;margin:0 0 6px;color:#fff;line-height:1.2}' +
            '.jf-tooltip-meta{font-size:.8em;color:#10b981;margin-bottom:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}' +
            ':where(#' + TIP_ID + ') .jf-tooltip-meta>span{color:#666}' +
            '.jf-tooltip-overview{font-size:.85em;line-height:1.5;color:#d1d5db;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}';
        (document.head || document.documentElement).appendChild(s);
    }

    let tipRoot = null, hov = null, timer = 0, raf = 0, armed = false, mx = 0, my = 0, tw = 0, th = 0, axisOn = [], lastType = '';
    const tipCache = new Map();

    const tipEl = () => {
        let t = document.getElementById(TIP_ID);
        if (!t) {
            t = document.createElement('div');
            t.id = TIP_ID;
            t.setAttribute('role', 'tooltip');
            document.body.appendChild(t);
        }
        return t;
    };

    function fetchTip(id) {
        const key = scope() + ':' + id;
        let p = tipCache.get(key);
        if (p) return p;
        p = getItem(id, 'Overview,Genres').then(v => {
            if (!v) tipCache.delete(key);
            return v;
        }, err => {
            tipCache.delete(key);
            throw err;
        });
        tipCache.set(key, p);
        if (tipCache.size > 200) tipCache.delete(tipCache.keys().next().value);
        return p;
    }

    function place() {
        raf = 0;
        const t = tipRoot && tipRoot.parentNode;
        if (!t) return;
        const m = 10, vw = window.innerWidth, vh = window.innerHeight;
        let x = mx + 15, y = my + 15;
        if (hov && hov.touch) {
            x = mx - tw / 2;
            y = my - 30 - th;
            if (y < m) y = my + 30;
        } else {
            if (x + tw + m > vw) x = mx - 15 - tw;
            if (y + th + m > vh) y = my - 15 - th;
        }
        t.style.left = Math.max(m, Math.min(x, vw - tw - m)) + 'px';
        t.style.top = Math.max(m, Math.min(y, vh - th - m)) + 'px';
    }

    function showTip(item) {
        ensureTipStyle();
        const t = tipEl(), box = document.createElement('div'), meta = document.createElement('div');
        const mk = (cls, text) => {
            const d = document.createElement('div');
            d.className = cls;
            d.textContent = text;
            return d;
        };
        const parts = [
            item.ProductionYear || '',
            hov && hov.rating ? '⭐ ' + hov.rating + ' (' + hov.source + ')' : (item.CommunityRating ? '⭐ ' + Number(item.CommunityRating).toFixed(1) + ' (Jellyfin)' : ''),
            item.Genres && item.Genres.length ? item.Genres.slice(0, 3).join(', ') : ''
        ].filter(Boolean);
        meta.className = 'jf-tooltip-meta';
        parts.forEach((p, i) => {
            if (i) {
                const sep = document.createElement('span');
                sep.textContent = '|';
                meta.appendChild(sep);
            }
            meta.appendChild(document.createTextNode(String(p)));
        });
        box.className = 'jf-ieg-tip';
        box.append(mk('jf-tooltip-title', item.Name || ''), meta, mk('jf-tooltip-overview', item.Overview || 'No synopsis available.'));
        t.textContent = '';
        t.appendChild(box);
        t.style.width = TIP_WIDTH;
        t.classList.add('visible');
        if (hov && hov.keyboard) hov.el.setAttribute('aria-describedby', TIP_ID);
        tipRoot = box;
        tw = t.offsetWidth;
        th = t.offsetHeight;
        place();
    }

    function onMove(e) {
        if (e.pointerType !== 'mouse') return;
        mx = e.clientX;
        my = e.clientY;
        if (tipRoot && !raf) raf = requestAnimationFrame(place);
    }

    function arm() {
        if (armed) return;
        armed = true;
        document.addEventListener('pointermove', onMove, CAP);
        document.addEventListener('pointerdown', hideTip, CAP);
        document.addEventListener('scroll', hideTip, CAP);
        document.addEventListener('viewbeforehide', hideTip, true);
    }

    function disarm() {
        if (!armed) return;
        armed = false;
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerdown', hideTip, true);
        document.removeEventListener('scroll', hideTip, true);
        document.removeEventListener('viewbeforehide', hideTip, true);
    }

    function hideTip() {
        if (timer) { clearTimeout(timer); timer = 0; }
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        disarm();
        if (hov && hov.keyboard) hov.el.removeAttribute('aria-describedby');
        hov = null;
        const t = tipRoot && tipRoot.parentNode;
        if (t) {
            t.classList.remove('visible');
            t.style.width = '';
        }
        tipRoot = null;
    }

    function startTip(el, e, touch, keyboard = false) {
        const h = { el, id: el.getAttribute('data-jf-internal-id'), rating: el.dataset.jfRating || '', source: el.dataset.jfSource || 'Unknown', touch, keyboard };
        hov = h;
        const rect = keyboard ? el.getBoundingClientRect() : null;
        mx = keyboard ? rect.left + rect.width / 2 : e.clientX;
        my = keyboard ? rect.top + rect.height / 2 : e.clientY;
        arm();
        const load = () => fetchTip(h.id).then(item => {
            if (item && hov === h && el.isConnected) showTip(item);
        }).catch(() => { if (hov === h) hideTip(); });
        if (touch || keyboard) load();
        else timer = setTimeout(() => { timer = 0; load(); }, Math.max(0, +CONFIG.TOOLTIP_DELAY_MS || 0));
    }

    function axis(grid, cell) {
        axisOn.forEach(el => el.classList.remove('jf-ieg-axis-match'));
        axisOn = [];
        if (!cell) return;
        const s = grid.querySelector('[data-jf-axis-season="' + cell.dataset.jfIegS + '"]');
        const e = grid.querySelector('[data-jf-axis-episode="' + cell.dataset.jfIegE + '"]');
        if (s) axisOn.push(s);
        if (e) axisOn.push(e);
        axisOn.forEach(el => el.classList.add('jf-ieg-axis-match'));
    }

    const cellOf = t => t && t.closest ? t.closest(CELL) : null;

    function bindGrid(scroll, grid, onInvert, sid) {
        scroll.addEventListener('click', e => {
            const t = e.target;
            if (!t || !t.closest) return;
            if (hov && hov.touch) { e.preventDefault(); e.stopPropagation(); return; }
            if (t.closest('.jf-ieg-corner')) {
                e.preventDefault();
                e.stopPropagation();
                onInvert();
                return;
            }
            if (t.closest('a[aria-disabled="true"]')) { e.preventDefault(); e.stopPropagation(); return; }
            const a = t.closest('a[data-jf-internal-id]');
            if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            location.hash = detailsHash(a.dataset.jfInternalId, sid);
        }, true);
        scroll.addEventListener('pointerover', e => {
            lastType = e.pointerType;
            const cell = cellOf(e.target);
            if (cell) axis(grid, cell);
            if (!CONFIG.TOOLTIP || e.pointerType !== 'mouse') return;
            const el = cell && cell.dataset.jfIegTip ? cell : null;
            if (hov && hov.el === el) return;
            if (hov) hideTip();
            if (el) startTip(el, e, false);
        }, { passive: true });
        scroll.addEventListener('pointerout', e => {
            const cell = cellOf(e.target);
            if (!cell || (e.relatedTarget && cell.contains(e.relatedTarget))) return;
            axis(grid, null);
            if (hov && hov.el === cell && !hov.touch && !hov.keyboard) hideTip();
        }, { passive: true });
        scroll.addEventListener('contextmenu', e => {
            if (!CONFIG.TOOLTIP || (e.pointerType || lastType) === 'mouse') return;
            const cell = cellOf(e.target);
            if (!cell || !cell.dataset.jfIegTip) return;
            e.preventDefault();
            if (hov) hideTip();
            startTip(cell, e, true);
        });
        scroll.addEventListener('focusin', e => {
            const cell = cellOf(e.target);
            if (cell) axis(grid, cell);
            if (CONFIG.TOOLTIP && cell && cell.dataset.jfIegTip) {
                if (hov && hov.el === cell) return;
                if (hov) hideTip();
                startTip(cell, e, false, true);
            }
        });
        scroll.addEventListener('focusout', e => {
            axis(grid, null);
            if (hov && hov.keyboard && hov.el === cellOf(e.target)) hideTip();
        });
    }

    function renderFallback(body, imdbId) {
        body.innerHTML = '';
        const el = document.createElement(imdbId ? 'a' : 'div');
        if (imdbId) {
            el.className = 'jf-ieg-link emby-button button-link';
            external(el, IMDB + encodeURIComponent(imdbId) + '/ratings/');
            el.textContent = CONFIG.TITLE;
        } else {
            el.className = 'jf-ieg-status';
            el.textContent = CONFIG.EMPTY_TEXT;
        }
        body.appendChild(el);
    }

    function renderGrid(body, seasons, imdbId, sid, seriesName, notices = []) {
        body.replaceChildren();
        const inverted = getInv();
        const legend = document.createElement('div');
        legend.className = 'jf-embergrid-legend';
        for (const [score, text] of [[9.6, 'Masterpiece'], [9, 'Amazing'], [8, 'Great'], [7, 'Good'], [6, 'Average'], [5, 'Bad'], [1, 'Trash']]) {
            const badge = document.createElement('span');
            badge.textContent = text;
            badge.title = score === 1 ? 'Below 5' : score + '+';
            badge.style.cssText = ratingStyle(score);
            legend.appendChild(badge);
        }
        body.appendChild(legend);
        const note = document.createElement('p');
        note.className = 'jf-ieg-source-note';
        note.textContent = 'IMDb ratings are preferred; Jellyfin CommunityRating is used when IMDb data is missing. Averages may combine sources.';
        body.appendChild(note);
        for (const notice of notices) appendNotice(body, notice.text, notice.retry);

        const allEpNums = [...new Set(seasons.flatMap(s => s.episodes.map(e => e.ep)))].sort((a, b) => a - b);
        const episodeLimit = Math.max(1, Math.floor(MAX_GRID_CELLS / Math.max(1, seasons.length)));
        const visibleEpNums = allEpNums.slice(0, episodeLimit);
        if (visibleEpNums.length < allEpNums.length) {
            const warning = document.createElement('p');
            warning.className = 'jf-ieg-notice';
            warning.setAttribute('role', 'status');
            warning.textContent = 'Displaying the first ' + visibleEpNums.length + ' of ' + allEpNums.length + ' episode numbers to keep the grid responsive. Averages still include all rated episodes.';
            body.appendChild(warning);
        }
        const lookups = new Map(seasons.map(s => [s.num, new Map(s.episodes.map(ep => [ep.ep, ep]))]));
        const scroll = document.createElement('div');
        scroll.className = 'jf-ieg-scroll';
        scroll.tabIndex = 0;
        scroll.setAttribute('role', 'region');
        scroll.setAttribute('aria-label', 'Scrollable episode ratings');
        const grid = document.createElement('table');
        grid.className = 'jf-ieg-grid';
        const caption = document.createElement('caption');
        caption.className = 'jf-ieg-visually-hidden';
        caption.textContent = 'Episode ratings for ' + (seriesName || 'this series') + '. Row and column labels identify the episode and season.';
        grid.appendChild(caption);
        const head = document.createElement('thead'), tbody = document.createElement('tbody');
        grid.append(head, tbody);

        const slot = (tag, content, sticky = false) => {
            const el = document.createElement(tag);
            el.className = 'jf-ieg-slot' + (sticky ? ' jf-ieg-sticky-left' : '');
            if (content) el.appendChild(content);
            return el;
        };
        const link = (a, id, num) => {
            if (id && sid) {
                a.href = detailsUrl(id, sid);
                a.dataset.jfInternalId = id;
            } else if (imdbId) {
                external(a, IMDB + encodeURIComponent(imdbId) + '/episodes/?season=' + num);
            } else {
                a.href = '#';
                a.setAttribute('aria-disabled', 'true');
                a.tabIndex = -1;
            }
        };
        const mkSeason = s => {
            const a = document.createElement('a');
            a.className = 'jf-ieg-cell jf-ieg-season emby-button button-link';
            a.textContent = 'S' + s.num;
            a.title = (seriesName || CONFIG.TITLE) + ' - Season ' + String(s.num).padStart(2, '0');
            a.dataset.jfAxisSeason = String(s.num);
            link(a, s.seasonJfId, s.num);
            return a;
        };
        const mkEpHead = n => {
            const d = document.createElement('div');
            d.className = 'jf-ieg-cell jf-ieg-episode';
            d.textContent = 'E' + n;
            d.dataset.jfAxisEpisode = String(n);
            return d;
        };
        const mkCell = (ep, season) => {
            const d = document.createElement(ep ? 'a' : 'div');
            if (!ep) {
                d.className = 'jf-ieg-cell jf-ieg-ghost';
                d.setAttribute('aria-hidden', 'true');
                return d;
            }
            const rating = toRating(ep.rating);
            if (rating == null) {
                d.className = 'jf-ieg-cell jf-ieg-empty emby-button button-link';
                d.textContent = '—';
            } else {
                d.className = 'jf-ieg-cell jf-ieg-rating emby-button button-link';
                d.textContent = rating.toFixed(1);
                d.style.cssText = ratingStyle(rating);
            }
            link(d, ep.jfId, season.num);
            const source = rating == null ? 'Unrated' : rating.toFixed(1) + ' (' + (ep.source || 'Unknown') + ')';
            d.title = 'S' + season.num + 'E' + ep.ep + (ep.name ? ' · ' + ep.name : '') + ' · ' + source;
            d.setAttribute('aria-label', d.title);
            if (rating != null) { d.dataset.jfRating = rating.toFixed(1); d.dataset.jfSource = ep.source || 'Unknown'; }
            if (ep.jfId && sid) d.dataset.jfIegTip = '1';
            d.dataset.jfIegS = String(season.num);
            d.dataset.jfIegE = String(ep.ep);
            return d;
        };
        const avgCell = s => {
            const rated = s.episodes.filter(ep => toRating(ep.rating) != null);
            const avg = rated.length ? rated.reduce((sum, ep) => sum + ep.rating, 0) / rated.length : null;
            const cell = document.createElement('div');
            cell.className = 'jf-ieg-cell';
            const display = avg == null ? null : Number(avg.toFixed(1));
            const sources = [...new Set(rated.map(ep => ep.source || 'Unknown'))];
            const sourceText = sources.length > 1 ? 'Mixed sources' : sources[0] || 'No ratings';
            cell.textContent = display == null ? '—' : display.toFixed(1);
            cell.title = 'Season ' + s.num + ' average (all rated episodes, ' + sourceText + ')';
            cell.setAttribute('aria-label', cell.title + ': ' + cell.textContent);
            if (display != null) cell.style.cssText = ratingStyle(display);
            return cell;
        };
        const avgHead = () => {
            const label = document.createElement('div');
            label.className = 'jf-ieg-cell jf-ieg-episode';
            label.textContent = 'AVG.';
            label.title = 'Average of rated episodes';
            return label;
        };
        const corner = document.createElement('button');
        corner.type = 'button';
        corner.className = 'jf-ieg-cell jf-ieg-corner jf-ieg-corner-btn';
        corner.setAttribute('aria-label', 'Episodes as columns');
        corner.setAttribute('aria-pressed', inverted ? 'true' : 'false');
        corner.title = inverted ? 'Switch to seasons across the top' : 'Switch to episodes across the top';
        corner.innerHTML = '<svg class="jf-ieg-corner-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="color:inherit"><path d="M2.5 4.5H11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8.5 2L11 4.5 8.5 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 11.5H5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7.5 9L5 11.5 7.5 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const top = document.createElement('tr');
        const cornerSlot = slot('th', corner, true);
        cornerSlot.scope = 'col';
        top.appendChild(cornerSlot);
        if (inverted) {
            for (const n of visibleEpNums) {
                const th = slot('th', mkEpHead(n)); th.scope = 'col'; top.appendChild(th);
            }
            const avg = slot('th', avgHead()); avg.scope = 'col'; top.appendChild(avg);
        } else {
            for (const season of seasons) {
                const th = slot('th', mkSeason(season)); th.scope = 'col'; top.appendChild(th);
            }
        }
        head.appendChild(top);
        if (inverted) {
            for (const season of seasons) {
                const tr = document.createElement('tr');
                const rowhead = slot('th', mkSeason(season), true); rowhead.scope = 'row'; tr.appendChild(rowhead);
                const lookup = lookups.get(season.num);
                for (const n of visibleEpNums) tr.appendChild(slot('td', mkCell(lookup.get(n), season)));
                tr.appendChild(slot('td', avgCell(season)));
                tbody.appendChild(tr);
            }
        } else {
            for (const n of visibleEpNums) {
                const tr = document.createElement('tr');
                const rowhead = slot('th', mkEpHead(n), true); rowhead.scope = 'row'; tr.appendChild(rowhead);
                for (const season of seasons) tr.appendChild(slot('td', mkCell(lookups.get(season.num).get(n), season)));
                tbody.appendChild(tr);
            }
            const foot = document.createElement('tfoot'), tr = document.createElement('tr');
            const rowhead = slot('th', avgHead(), true); rowhead.scope = 'row'; tr.appendChild(rowhead);
            for (const season of seasons) tr.appendChild(slot('td', avgCell(season)));
            foot.appendChild(tr);
            grid.appendChild(foot);
        }
        scroll.appendChild(grid);
        body.appendChild(scroll);
        bindGrid(scroll, grid, () => {
            hideTip();
            setInv(!inverted);
            renderGrid(body, seasons, imdbId, sid, seriesName, notices);
            const next = body.querySelector('.jf-ieg-corner-btn');
            if (next) next.focus({ preventScroll: true });
        }, sid);
    }

    function appendNotice(body, message, retry) {
        const notice = document.createElement('div');
        notice.className = 'jf-ieg-notice';
        notice.setAttribute('role', 'status');
        const text = document.createElement('span');
        text.textContent = message;
        notice.appendChild(text);
        if (retry) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Retry';
            button.addEventListener('click', retry);
            notice.appendChild(button);
        }
        body.appendChild(notice);
    }

    function renderError(body, root) {
        body.replaceChildren();
        appendNotice(body, 'Could not load episode ratings from Jellyfin or IMDb.', () => loadPanel(root));
    }

    async function loadPanel(root, refresh = false) {
        if ((!refresh && root.dataset.loaded === '1') || root.dataset.loading === '1') return;
        root.dataset.loading = '1';
        const body = root.querySelector('.jf-ieg-body');
        if (!body) { root.dataset.loading = '0'; return; }
        // Keep existing ratings visible while an optional source is retried.
        if (!refresh) body.innerHTML = '<div class="jf-ieg-status" role="status">Loading…</div>';
        const id = root.dataset.itemId;
        const requestScope = scope();
        try {
            const [jfResult, imdbResult] = await Promise.allSettled([fetchJf(id), fetchImdbId(id)]);
            if (!root.isConnected || scope() !== requestScope) return;
            const jfFailed = jfResult.status === 'rejected';
            const imdbFailed = imdbResult.status === 'rejected';
            if (jfFailed) console.warn('[JF-Embergrid] Jellyfin episodes unavailable', jfResult.reason);
            if (imdbFailed) console.warn('[JF-Embergrid] IMDb ID lookup unavailable', imdbResult.reason);
            const jf = jfFailed ? { seasonsByNum: {}, seasonIds: {}, name: '' } : jfResult.value;
            const imdbId = imdbFailed ? '' : imdbResult.value;
            let ds = null, datasetFailed = false;
            if (imdbId) {
                try { ds = await fetchDataset(imdbId); }
                catch (error) {
                    datasetFailed = true;
                    console.warn('[JF-Embergrid] IMDb dataset unavailable', error);
                }
            }
            if (!root.isConnected || scope() !== requestScope) return;
            root.dataset.imdbId = imdbId || '';
            if (jf.name) root.dataset.seriesName = jf.name;
            const seasons = mergeData(ds, jf);
            if (seasons.some(s => s.episodes.some(e => e.rating != null || e.jfId))) {
                const retry = () => loadPanel(root, true);
                const notices = [];
                if (jfFailed) notices.push({ text: 'Jellyfin episodes are temporarily unavailable. Showing external IMDb scores without local episode links.', retry });
                if (imdbFailed) notices.push({ text: 'IMDb lookup failed. Showing the available Jellyfin ratings.', retry });
                else if (datasetFailed) notices.push({ text: 'IMDb ratings could not be fetched. Showing the available Jellyfin ratings.', retry });
                else if (!imdbId || !ds) notices.push({ text: 'IMDb ratings are unavailable for this show. Displaying any available Jellyfin ratings.' });
                hideTip();
                renderGrid(body, seasons, imdbId, root.dataset.serverId || '', root.dataset.seriesName || '', notices);
                root.dataset.loaded = '1';
            } else if (jfFailed || imdbFailed || datasetFailed) {
                renderError(body, root);
                root.dataset.loaded = '0';
            } else {
                renderFallback(body, imdbId);
                root.dataset.loaded = '1';
            }
        } catch (error) {
            // Unexpected programming failures must remain retryable too.
            console.warn('[JF-Embergrid] Panel load failed', error);
            if (root.isConnected && scope() === requestScope) {
                renderError(body, root);
                root.dataset.loaded = '0';
            }
        } finally {
            root.dataset.loading = '0';
        }
    }

    function createBlock(itemId, sid) {
        const root = document.createElement('section');
        root.setAttribute('data-jf-ieg-root', '1');
        root.dataset.itemId = itemId;
        root.dataset.scope = scope();
        root.dataset.serverId = sid || '';
        root.dataset.seriesName = '';
        root.dataset.loaded = '0';
        root.dataset.loading = '0';
        root.innerHTML = '<div class="jf-ieg-box"><button type="button" class="jf-ieg-toggle" aria-expanded="false"><span class="jf-ieg-toggle-label"></span><span class="material-icons jf-ieg-toggle-icon" aria-hidden="true">expand_more</span></button><div class="jf-ieg-panel" hidden><div class="jf-ieg-body"></div></div></div>';
        root.querySelector('.jf-ieg-toggle-label').textContent = CONFIG.TITLE;
        const t = root.querySelector('.jf-ieg-toggle'), p = root.querySelector('.jf-ieg-panel');
        t.addEventListener('click', () => {
            const nx = t.getAttribute('aria-expanded') !== 'true';
            t.setAttribute('aria-expanded', nx ? 'true' : 'false');
            p.hidden = !nx;
            if (nx) loadPanel(root);
        });
        return root;
    }

    function mount(view, id, sid, season) {
        let block = view.querySelector(ROOT);
        if (block && block.dataset.itemId === id && block.dataset.scope === scope()) return;
        if (block) block.remove();
        injectStyle();
        block = createBlock(id, sid);
        const anchor = view.querySelector('#castCollapsible');
        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(block, anchor);
        } else {
            const box = season.closest(BOXES.join(','));
            box.parentNode.insertBefore(block, box.nextSibling);
        }
    }

    function check(view, p) {
        const season = view.querySelector(SEASON);
        if (!season || !p.id) return false;
        mount(view, p.id, p.serverId || season.getAttribute('data-serverid') || '', season);
        return true;
    }

    // React to Jellyfin navigation and late-mounted season cards. Only retry
    // periodically if a visible series page still has no Embergrid block.
    function watch(view, params) {
        const p = Object.assign({}, hashParams(), params);
        if (!p.id) return;
        check(view, p);
    }

    function reconcile() {
        try {
            const current = document.querySelector('.itemDetailPage:not(.hide)');
            if (!current) { report('waiting for a series page'); return; }
            const params = hashParams();
            if (!params.id) { report('no series id in the page address'); return; }
            if (!current.querySelector(SEASON)) { report('series page found; waiting for the seasons block'); return; }
            watch(current, params);
            report(current.querySelector(ROOT) ? 'ratings block inserted' : 'ratings block missing after insert');
        } catch (error) {
            report('insert failed: ' + error.message);
            console.warn('[JF-Embergrid] Could not mount episode ratings', error);
        }
    }

    let reconcileQueued = false;
    function scheduleReconcile() {
        if (reconcileQueued) return;
        reconcileQueued = true;
        requestAnimationFrame(() => {
            reconcileQueued = false;
            reconcile();
        });
    }

    const watchSelector = '.itemDetailPage,#childrenCollapsible,#listChildrenCollapsible,#castCollapsible,[data-type="Season"]';
    const relevantNode = node => node.nodeType === 1 &&
        (node.matches(watchSelector) || node.querySelector(watchSelector));
    const mutationObserver = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'attributes') {
                if (record.target.matches(watchSelector)) { scheduleReconcile(); return; }
            } else if ([...record.addedNodes, ...record.removedNodes].some(relevantNode)) {
                scheduleReconcile();
                return;
            }
        }
    });
    function startObserving() {
        if (!document.body) return;
        mutationObserver.observe(document.body, {
            childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-type']
        });
        scheduleReconcile();
    }
    document.addEventListener('viewshow', e => {
        const view = e.target;
        if (view && view.classList && view.classList.contains('itemDetailPage')) {
            watch(view, (e.detail && e.detail.params) || {});
        }
        scheduleReconcile();
    }, true);
    window.addEventListener('hashchange', () => { hideTip(); scheduleReconcile(); });
    window.addEventListener('popstate', scheduleReconcile);
    window.addEventListener('pageshow', scheduleReconcile);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') scheduleReconcile();
    });
    // Compatibility fallback for Jellyfin versions that do not emit navigation
    // events or mutate relevant nodes. Never poll hidden tabs or mounted grids.
    setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        const current = document.querySelector('.itemDetailPage:not(.hide)');
        if (current && !current.querySelector(ROOT)) scheduleReconcile();
    }, 30000);
    if (document.body) startObserving();
    else document.addEventListener('DOMContentLoaded', startObserving, { once: true });
})();

