/* Photos page. Loads /portfolio/photos/photos.json, renders a filterable
   map + timeline, and a per-collection scrapbook at #collection/<slug>. */
(function () {
    "use strict";

    // ---- Config ----------------------------------------------------------
    // Chapter buttons. null years mean "full data range".
    var CHAPTERS = [
        ["All years", null, null],
        ["Early years", 2004, 2009],
        ["Growing up", 2010, 2017],
        ["High school", 2018, 2021],
        ["Purdue", 2022, 2026],
        ["This year", 2026, 2026],
    ];
    var BASE = "/portfolio/photos/";
    var STRIP_MAX = 40;
    var UNTAGGED = "Not tagged yet";

    var params = new URLSearchParams(location.search);
    var dataUrl = params.get("data") || BASE + "photos.json";

    var REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---- State -----------------------------------------------------------
    var photos = []; // enriched entries
    var collectionsMeta = {}; // slug -> {title, intro}
    var whoValues = []; // every who value in the data, plus UNTAGGED if needed
    var selectedWho = null; // Set
    var YMIN = 2004, YMAX = new Date().getFullYear();
    var yearLo, yearHi;
    var selected = null; // photo highlighted in the strip
    var map, markerLayer, clusterIndex, geoPhotos = [];
    var mapReady = false;

    var $ = function (id) { return document.getElementById(id); };

    function slugify(s) {
        return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    function src(rel) { return BASE + rel; }

    function thumbImg(p, size, cls) {
        var alt = p.title || "Photo from " + p.year;
        return '<img loading="lazy" src="' + src(p.thumbs[size]) + '" alt="' +
            alt.replace(/"/g, "&quot;") + '"' + (cls ? ' class="' + cls + '"' : "") + ">";
    }

    function fmtDate(p) {
        return new Date(p.date).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
        });
    }

    function yearsLabel(list) {
        var lo = Infinity, hi = -Infinity;
        list.forEach(function (p) {
            if (p.year < lo) lo = p.year;
            if (p.year > hi) hi = p.year;
        });
        return lo === hi ? String(lo) : lo + "–" + hi;
    }

    function matches(p) {
        if (p.year < yearLo || p.year > yearHi) return false;
        if (p.who.length === 0) return selectedWho.has(UNTAGGED);
        return p.who.some(function (w) { return selectedWho.has(w); });
    }

    function visible() { return photos.filter(matches); }

    // ---- Load ------------------------------------------------------------
    Promise.all([
        fetch(dataUrl).then(function (r) { return r.json(); }),
        fetch(BASE + "collections.json")
            .then(function (r) { return r.ok ? r.json() : { collections: [] }; })
            .catch(function () { return { collections: [] }; }),
    ]).then(function (results) {
        (results[1].collections || []).forEach(function (c) {
            collectionsMeta[c.slug] = c;
        });

        photos = results[0].photos.map(function (p) {
            p.year = +p.date.slice(0, 4);
            p.time = Date.parse(p.date);
            p.hasGeo = p.lat != null && p.lng != null;
            return p;
        });
        photos.sort(function (a, b) { return a.time - b.time; });

        if (photos.length) {
            YMIN = photos[0].year;
            YMAX = photos[photos.length - 1].year;
        }
        yearLo = YMIN;
        yearHi = YMAX;

        var seen = {};
        photos.forEach(function (p) {
            p.who.forEach(function (w) { seen[w] = true; });
        });
        whoValues = Object.keys(seen).sort();
        if (photos.some(function (p) { return p.who.length === 0; })) {
            whoValues.push(UNTAGGED);
        }
        selectedWho = new Set(whoValues);

        buildWho();
        buildChapters();
        buildAxis();
        initMap();
        initSlider();
        update();
        route();
    }).catch(function (err) {
        $("strip").innerHTML = '<p class="empty">Could not load photos.json.</p>';
        console.error(err);
    });

    // ---- Sidebar: who ----------------------------------------------------
    function buildWho() {
        var box = $("who");
        box.innerHTML = "";
        whoValues.forEach(function (w) {
            var label = document.createElement("label");
            var input = document.createElement("input");
            input.type = "checkbox";
            input.checked = true;
            input.addEventListener("change", function () {
                if (input.checked) selectedWho.add(w);
                else selectedWho.delete(w);
                update();
            });
            var name = document.createElement("span");
            name.textContent = w;
            var n = document.createElement("span");
            n.className = "n";
            n.dataset.who = w;
            label.appendChild(input);
            label.appendChild(name);
            label.appendChild(n);
            box.appendChild(label);
        });
    }

    function whoCounts() {
        whoValues.forEach(function (w) {
            var count = photos.filter(function (p) {
                if (p.year < yearLo || p.year > yearHi) return false;
                return w === UNTAGGED ? p.who.length === 0 : p.who.indexOf(w) !== -1;
            }).length;
            var el = document.querySelector('.n[data-who="' + CSS.escape(w) + '"]');
            if (el) el.textContent = count;
        });
    }

    // ---- Sidebar: chapters + slider --------------------------------------
    function buildChapters() {
        var box = $("chapters");
        CHAPTERS.forEach(function (ch) {
            var b = document.createElement("button");
            b.type = "button";
            b.textContent = ch[0];
            b.addEventListener("click", function () {
                yearLo = Math.max(YMIN, ch[1] === null ? YMIN : ch[1]);
                yearHi = Math.min(YMAX, ch[2] === null ? YMAX : ch[2]);
                if (yearLo > yearHi) yearLo = yearHi;
                update();
            });
            box.appendChild(b);
        });
    }

    function buildAxis() {
        var span = YMAX - YMIN;
        var step = span > 12 ? 4 : span > 6 ? 2 : 1;
        var out = [];
        for (var y = YMIN; y <= YMAX; y += step) out.push("<span>" + y + "</span>");
        if ((YMAX - YMIN) % step !== 0) out.push("<span>" + YMAX + "</span>");
        $("axis").innerHTML = out.join("");
    }

    function drawTimeline() {
        var tl = $("tl");
        var years = [];
        for (var y = YMIN; y <= YMAX; y++) years.push(y);
        var per = years.map(function (yy) {
            return photos.filter(function (p) {
                if (p.year !== yy) return false;
                if (p.who.length === 0) return selectedWho.has(UNTAGGED);
                return p.who.some(function (w) { return selectedWho.has(w); });
            }).length;
        });
        var mx = Math.max.apply(null, per.concat(1));
        $("hist").innerHTML = years.map(function (yy, i) {
            return '<i class="' + (yy >= yearLo && yy <= yearHi ? "in" : "") +
                '" style="height:' + Math.max(4, (per[i] / mx) * 100) +
                '%" title="' + yy + ": " + per[i] + '"></i>';
        }).join("");

        var W = tl.clientWidth;
        var slots = YMAX - YMIN + 1;
        var a = ((yearLo - YMIN) / slots) * W;
        var b = ((yearHi - YMIN + 1) / slots) * W;
        $("range").style.left = a + "px";
        $("range").style.width = (b - a) + "px";
        $("h0").style.left = a + "px";
        $("h1").style.left = b + "px";
        $("h0").setAttribute("aria-valuemin", YMIN);
        $("h0").setAttribute("aria-valuemax", YMAX);
        $("h0").setAttribute("aria-valuenow", yearLo);
        $("h0").setAttribute("aria-valuetext", String(yearLo));
        $("h1").setAttribute("aria-valuemin", YMIN);
        $("h1").setAttribute("aria-valuemax", YMAX);
        $("h1").setAttribute("aria-valuenow", yearHi);
        $("h1").setAttribute("aria-valuetext", String(yearHi));

        var buttons = $("chapters").querySelectorAll("button");
        CHAPTERS.forEach(function (ch, i) {
            var lo = Math.max(YMIN, ch[1] === null ? YMIN : ch[1]);
            var hi = Math.min(YMAX, ch[2] === null ? YMAX : ch[2]);
            buttons[i].setAttribute("aria-pressed", lo === yearLo && hi === yearHi);
        });

        $("sel").innerHTML = yearLo === yearHi
            ? "Showing <b>" + yearLo + "</b>"
            : "Showing <b>" + yearLo + "</b> to <b>" + yearHi + "</b>";
    }

    function initSlider() {
        var tl = $("tl");
        function attach(handle, isEnd) {
            handle.addEventListener("pointerdown", function (e) {
                e.preventDefault();
                handle.setPointerCapture(e.pointerId);
                var move = function (ev) {
                    var rect = tl.getBoundingClientRect();
                    var x = Math.min(rect.width, Math.max(0, ev.clientX - rect.left));
                    var slots = YMAX - YMIN + 1;
                    var y = YMIN + Math.round((x / rect.width) * slots - (isEnd ? 1 : 0));
                    y = Math.min(YMAX, Math.max(YMIN, y));
                    if (isEnd) yearHi = Math.max(y, yearLo);
                    else yearLo = Math.min(y, yearHi);
                    update();
                };
                handle.addEventListener("pointermove", move);
                handle.addEventListener("pointerup", function () {
                    handle.removeEventListener("pointermove", move);
                }, { once: true });
            });
            handle.addEventListener("keydown", function (e) {
                var d = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1
                    : e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : 0;
                if (e.key === "Home") { d = -99; }
                if (e.key === "End") { d = 99; }
                if (!d) return;
                e.preventDefault();
                if (isEnd) yearHi = Math.min(YMAX, Math.max(yearLo, yearHi + d));
                else yearLo = Math.max(YMIN, Math.min(yearHi, yearLo + d));
                update();
            });
        }
        attach($("h0"), false);
        attach($("h1"), true);
        addEventListener("resize", drawTimeline);
    }

    // ---- Facts + collections list ----------------------------------------
    function drawFacts() {
        var places = new Set(), states = new Set();
        photos.forEach(function (p) {
            if (!p.place) return;
            places.add(p.place);
            var parts = p.place.split(",");
            states.add(parts[parts.length - 1].trim());
        });
        var bits = ["<b>" + photos.length + "</b> photos",
            "<b>" + YMIN + "–" + YMAX + "</b>"];
        if (places.size) {
            bits.push("<b>" + places.size + "</b> place" + (places.size === 1 ? "" : "s") +
                " in <b>" + states.size + "</b> state" + (states.size === 1 ? "" : "s"));
        }
        $("facts").innerHTML = bits.join(" · ");
    }

    function drawCollections(current) {
        var byColl = {};
        photos.forEach(function (p) {
            if (!p.collection) return;
            (byColl[p.collection] = byColl[p.collection] || []).push(p);
        });
        var names = Object.keys(byColl).sort(function (a, b) {
            return byColl[a][0].time - byColl[b][0].time;
        });
        $("colls").innerHTML = names.map(function (name) {
            var all = byColl[name];
            var inView = all.filter(function (p) { return current.indexOf(p) !== -1; }).length;
            return '<a href="#collection/' + slugify(name) + '"' +
                (inView ? "" : ' class="dim"') + "><span>" + name + "</span><small>" +
                inView + " of " + all.length + " · " + yearsLabel(all) + "</small></a>";
        }).join("") || '<p class="empty" style="font-size:.85em;color:#888">None yet.</p>';
    }

    // ---- Map -------------------------------------------------------------
    function initMap() {
        map = L.map("map", { zoomControl: true });
        // Greyscale comes from a CSS filter on .leaflet-tile.
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 18,
        }).addTo(map);
        markerLayer = L.layerGroup().addTo(map);
        map.on("zoomend moveend", drawMap);
        mapReady = true;
    }

    function fitToPhotos(list) {
        var pts = list.filter(function (p) { return p.hasGeo; });
        if (!pts.length) { map.setView([39.8, -86.1], 5); return; }
        var bounds = L.latLngBounds(pts.map(function (p) { return [p.lat, p.lng]; }));
        map.fitBounds(bounds.pad(0.2), { maxZoom: 10, animate: false });
    }

    function rebuildIndex() {
        geoPhotos = visible().filter(function (p) { return p.hasGeo; });
        clusterIndex = new Supercluster({ radius: 60, maxZoom: 17 });
        clusterIndex.load(geoPhotos.map(function (p, i) {
            return {
                type: "Feature",
                geometry: { type: "Point", coordinates: [p.lng, p.lat] },
                properties: { i: i },
            };
        }));
    }

    function flyTo(latlng, zoom) {
        if (REDUCED) map.setView(latlng, zoom);
        else map.flyTo(latlng, zoom, { duration: 0.5 });
    }

    function drawMap() {
        if (!mapReady || !clusterIndex) return;
        markerLayer.clearLayers();
        var b = map.getBounds();
        var bbox = [
            Math.max(-180, b.getWest()), Math.max(-90, b.getSouth()),
            Math.min(180, b.getEast()), Math.min(90, b.getNorth()),
        ];
        var clusters = clusterIndex.getClusters(bbox, Math.round(map.getZoom()));
        clusters.forEach(function (c) {
            var isCluster = c.properties.cluster;
            var count = isCluster ? c.properties.point_count : 1;
            var lead = isCluster
                ? geoPhotos[clusterIndex.getLeaves(c.properties.cluster_id, 1)[0].properties.i]
                : geoPhotos[c.properties.i];
            var html = '<div class="pin">' + thumbImg(lead, "160") +
                (count > 1 ? '<span class="n">' + count + "</span>" : "") + "</div>";
            var latlng = [c.geometry.coordinates[1], c.geometry.coordinates[0]];
            var m = L.marker(latlng, {
                icon: L.divIcon({ html: html, className: "", iconSize: [48, 48], iconAnchor: [24, 24] }),
                keyboard: false,
            }).addTo(markerLayer);
            m.on("click", function () {
                if (isCluster) {
                    var z = Math.min(clusterIndex.getClusterExpansionZoom(c.properties.cluster_id), 17);
                    flyTo(latlng, z);
                } else {
                    openPhoto(lead);
                }
            });
        });

        var pts = visible();
        var noGeo = pts.filter(function (p) { return !p.hasGeo; }).length;
        var note = $("mapnote");
        if (!pts.length) note.textContent = "No photos match. Widen the years or check another box.";
        else if (noGeo) note.textContent = noGeo + " photo" + (noGeo === 1 ? " has" : "s have") + " no location";
        else note.textContent = "";
        note.style.display = note.textContent ? "" : "none";
    }

    // ---- Filmstrip -------------------------------------------------------
    function drawStrip() {
        var pts = visible();
        var stripEl = $("strip");
        if (!pts.length) {
            stripEl.innerHTML = '<p class="empty">No photos match. Widen the years or check another box.</p>';
            return;
        }
        var shown = pts.slice(0, STRIP_MAX);
        var html = shown.map(function (p, i) {
            var t = (p.title || "Photo") + ", " + p.year;
            return '<button type="button" data-i="' + i + '"' +
                (selected === p ? ' class="on"' : "") +
                ' title="' + t.replace(/"/g, "&quot;") + '" aria-label="' +
                t.replace(/"/g, "&quot;") + '">' + thumbImg(p, "160") + "</button>";
        }).join("");
        if (pts.length > shown.length) {
            html += '<div class="more" title="' + (pts.length - shown.length) +
                ' more in this view">+' + (pts.length - shown.length) + "</div>";
        }
        stripEl.innerHTML = html;
        stripEl.querySelectorAll("button").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var p = shown[+btn.dataset.i];
                selected = p;
                drawStrip();
                if (p.hasGeo) {
                    flyTo([p.lat, p.lng], Math.max(map.getZoom(), 11));
                    setTimeout(function () { openPhoto(p); }, REDUCED ? 0 : 550);
                } else {
                    openPhoto(p);
                }
            });
        });
    }

    // ---- Photo view ------------------------------------------------------
    var lastFocus = null;

    function openPhoto(p) {
        selected = p;
        drawStrip();
        var card = $("card");
        var rows = [];
        rows.push(["Date", fmtDate(p)]);
        if (p.place) rows.push(["Place", p.place]);
        if (p.who.length) rows.push(["Who", p.who.join(", ")]);
        if (p.collection) rows.push(["Collection", p.collection]);
        var big = p.thumbs["800"] || p.thumbs["160"];
        var full = p.thumbs["1600"] || big;
        card.innerHTML =
            '<div class="img"><img src="' + src(big) + '" srcset="' + src(big) +
            ' 800w, ' + src(full) + ' 1600w" sizes="(max-width: 640px) 100vw, 470px" alt="' +
            (p.title || "Photo from " + p.year).replace(/"/g, "&quot;") + '"></div>' +
            '<div class="body">' +
            (p.title ? "<h2>" + p.title + "</h2>" : "") +
            (p.caption ? '<p class="caption">' + p.caption + "</p>" : "") +
            "<dl>" + rows.map(function (r) {
                return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>";
            }).join("") + "</dl>" +
            '<div class="acts">' +
            (p.collection ? '<button type="button" id="lb-coll">Open the ' + p.collection + " collection</button>" : "") +
            '<button type="button" id="lb-year">Show only ' + p.year + "</button>" +
            "</div></div>" +
            '<button type="button" class="x" id="lb-x" aria-label="Close">&times;</button>';
        lastFocus = document.activeElement;
        $("lb").classList.add("open");
        $("lb-x").focus();
        $("lb-x").addEventListener("click", closePhoto);
        $("lb-year").addEventListener("click", function () {
            yearLo = yearHi = p.year;
            closePhoto();
            update();
        });
        var collBtn = $("lb-coll");
        if (collBtn) {
            collBtn.addEventListener("click", function () {
                closePhoto();
                location.hash = "collection/" + slugify(p.collection);
            });
        }
    }

    function closePhoto() {
        $("lb").classList.remove("open");
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $("lb").addEventListener("click", function (e) {
        if (e.target === $("lb")) closePhoto();
    });
    addEventListener("keydown", function (e) {
        if (e.key === "Escape" && $("lb").classList.contains("open")) closePhoto();
    });

    // ---- Collection view (hash route) ------------------------------------
    function route() {
        var m = location.hash.match(/^#collection\/(.+)$/);
        if (m) showCollection(decodeURIComponent(m[1]));
        else showMapView();
    }
    addEventListener("hashchange", route);

    function showMapView() {
        $("map-view").hidden = false;
        $("collection-view").hidden = true;
        document.title = "Photos | Greg Gottlieb";
        if (mapReady) map.invalidateSize();
    }

    function showCollection(slug) {
        var list = photos.filter(function (p) {
            return p.collection && slugify(p.collection) === slug;
        });
        var meta = collectionsMeta[slug] || {};
        var title = meta.title || (list.length ? list[0].collection : slug);
        var view = $("collection-view");
        var html = '<p class="coll-back"><a href="#">&larr; All photos</a></p>' +
            "<h1>" + title + "</h1>";
        if (list.length) html += '<p class="range-line">' + yearsLabel(list) + "</p>";
        if (meta.intro) html += '<p class="coll-intro">' + meta.intro + "</p>";
        if (!list.length) html += "<p>No photos in this collection yet.</p>";
        html += list.map(function (p) {
            var cap = [];
            if (p.title) cap.push("<strong>" + p.title + "</strong>");
            if (p.caption) cap.push(p.caption);
            cap.push('<span class="when">' + fmtDate(p) +
                (p.place ? " · " + p.place : "") + "</span>");
            return "<figure>" + thumbImg(p, "800") +
                "<figcaption>" + cap.join(" ") + "</figcaption></figure>";
        }).join("");
        view.innerHTML = html;
        $("map-view").hidden = true;
        view.hidden = false;
        document.title = title + " | Greg Gottlieb";
        scrollTo(0, 0);
    }

    // ---- Update ----------------------------------------------------------
    // Debug handle used by the local perf test (scripts don't ship state).
    window._photos = {
        update: function () { update(); },
        getMap: function () { return map; },
        count: function () { return visible().length; },
    };

    var fitted = false;
    function update() {
        var pts = visible();
        drawTimeline();
        whoCounts();
        drawFacts();
        drawCollections(pts);
        drawStrip();
        rebuildIndex();
        if (!fitted && mapReady) { fitToPhotos(photos); fitted = true; }
        drawMap();
    }
})();
