/*
  portfolio.js
  Live data for sebastech.me
    1. GitHub projects feed  -> public GitHub REST API
    2. Cybersecurity news feed -> multiple RSS sources via public JSON/XML
       proxies, with a static fallback so it never looks broken.

  No build step, no dependencies. Vanilla JS, safe DOM insertion (textContent only).
*/
(function () {
  "use strict";

  var GH_USER = "sebasp-9";
  var FEATURED_REPOS = {
    "network-intrusion-detection": {
      badge: "IDS lab",
      description: "Python NSL-KDD intrusion-detection lab that prepares train/test data, maps attack families, and sets up macro F1 evaluation.",
      topics: ["python", "ids", "nsl-kdd", "machine-learning"],
      rank: 1
    },
    "Domain-registration-web-hosting": {
      badge: "live site",
      description: "The sebastech.me GitHub Pages portfolio, tuned around security learning, live repo data, and threat-intel feeds.",
      topics: ["github-pages", "portfolio", "security", "static-site"],
      rank: 2
    },
    "XOR-Encryption": {
      badge: "crypto lab",
      description: "Python XOR encryption and cryptanalysis project showing why a 1-byte key can be recovered with brute force.",
      topics: ["python", "xor", "cryptanalysis", "bruteforce"],
      rank: 3
    }
  };

  // RSS sources for the security news feed.
  var NEWS_FEEDS = [
    { url: "https://www.cisa.gov/cybersecurity-advisories/all.xml", source: "CISA" },
    { url: "https://feeds.feedburner.com/TheHackersNews", source: "The Hacker News" },
    { url: "https://www.bleepingcomputer.com/feed/", source: "BleepingComputer" },
    { url: "https://krebsonsecurity.com/feed/", source: "Krebs" }
  ];

  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("gh-projects")) loadProjects();
    if (document.getElementById("news-feed")) {
      loadNews();
      var btn = document.getElementById("news-refresh");
      if (btn) btn.addEventListener("click", function () { loadNews(true); });
    }
    var yr = document.getElementById("year");
    if (yr) yr.textContent = new Date().getFullYear();
  });

  /* ----------------------------------------------------------------
     Small helpers
  ---------------------------------------------------------------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function stripHtml(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
  }

  function truncate(str, n) {
    if (!str) return "";
    return str.length > n ? str.slice(0, n - 1).trimEnd() + "…" : str;
  }

  function timeAgo(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d)) return "";
    var s = Math.floor((Date.now() - d.getTime()) / 1000);
    var units = [["y", 31536000], ["mo", 2592000], ["d", 86400], ["h", 3600], ["m", 60]];
    for (var i = 0; i < units.length; i++) {
      var v = Math.floor(s / units[i][1]);
      if (v >= 1) return v + units[i][0] + " ago";
    }
    return "just now";
  }

  function byDateDesc(a, b) {
    return new Date(b.date || b.pushed_at || 0) - new Date(a.date || a.pushed_at || 0);
  }

  function readCache(key, maxAgeMs) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (Date.now() - obj.t > maxAgeMs) return null;
      return obj.d;
    } catch (e) { return null; }
  }

  function writeCache(key, data) {
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); }
    catch (e) { /* storage full / disabled — ignore */ }
  }

  /* ----------------------------------------------------------------
     1. GitHub projects
  ---------------------------------------------------------------- */
  function loadProjects() {
    var box = document.getElementById("gh-projects");
    var cacheKey = "gh_repos_" + GH_USER;
    var cached = readCache(cacheKey, 60 * 60 * 1000); // 1 hour
    if (cached) { renderRepos(box, cached); return; }

    renderRepoSkeletons(box);

    fetch("https://api.github.com/users/" + GH_USER + "/repos?per_page=100&sort=updated", {
      headers: { "Accept": "application/vnd.github+json" }
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (repos) {
        if (!Array.isArray(repos)) throw new Error("Unexpected response");
        var cleaned = repos
          .filter(function (r) { return !r.archived && (!r.fork || FEATURED_REPOS[r.name]); })
          .sort(function (a, b) {
            var ar = FEATURED_REPOS[a.name] ? FEATURED_REPOS[a.name].rank : 99;
            var br = FEATURED_REPOS[b.name] ? FEATURED_REPOS[b.name].rank : 99;
            return ar - br || new Date(b.pushed_at) - new Date(a.pushed_at);
          })
          .slice(0, 6)
          .map(function (r) {
            var featured = FEATURED_REPOS[r.name] || {};
            return {
              name: r.name,
              description: r.description || featured.description,
              url: r.html_url,
              language: r.language,
              stars: r.stargazers_count,
              forks: r.forks_count,
              pushed_at: r.pushed_at,
              topics: (r.topics && r.topics.length ? r.topics : featured.topics || []).slice(0, 4),
              badge: featured.badge,
              fork: r.fork
            };
          });
        writeCache(cacheKey, cleaned);
        renderRepos(box, cleaned);
      })
      .catch(function () { renderReposError(box); });
  }

  function renderRepoSkeletons(box) {
    box.innerHTML = "";
    for (var i = 0; i < 6; i++) {
      var col = el("div", "col-md-6 col-lg-4");
      var card = el("div", "card repo-card");
      var body = el("div", "card-body");
      body.appendChild(el("div", "skeleton skeleton-line", null)).style.width = "60%";
      body.appendChild(el("div", "skeleton skeleton-line", null));
      body.appendChild(el("div", "skeleton skeleton-line", null)).style.width = "85%";
      card.appendChild(body); col.appendChild(card); box.appendChild(col);
    }
  }

  function renderRepos(box, repos) {
    box.innerHTML = "";
    if (!repos.length) { renderReposError(box); return; }

    repos.forEach(function (r) {
      var col = el("div", "col-md-6 col-lg-4");
      var card = el("div", "card repo-card");
      var body = el("div", "card-body");

      var title = el("h6", "repo-name card-title");
      var icon = el("i", "bi-folder2-open me-2");
      title.appendChild(icon);
      title.appendChild(document.createTextNode(r.name));
      body.appendChild(title);

      if (r.badge) {
        var badge = el("span", "project-badge");
        badge.appendChild(el("i", "bi-stars"));
        badge.appendChild(document.createTextNode(r.badge));
        body.appendChild(badge);
      }

      body.appendChild(el("p", "card-text small", truncate(r.description, 110) || "No description provided."));

      if (r.topics && r.topics.length) {
        var topics = el("div", "repo-topics");
        r.topics.forEach(function (t) { topics.appendChild(el("span", "repo-topic", t)); });
        body.appendChild(topics);
      }

      var meta = el("div", "repo-meta");
      if (r.language) {
        var lang = el("span", null);
        lang.appendChild(el("span", "lang-dot"));
        lang.appendChild(document.createTextNode(r.language));
        meta.appendChild(lang);
      }
      var stars = el("span", null);
      stars.innerHTML = '<i class="bi-star"></i>';
      stars.appendChild(document.createTextNode(String(r.stars)));
      meta.appendChild(stars);

      if (r.fork) {
        var fork = el("span", null);
        fork.innerHTML = '<i class="bi-git"></i>';
        fork.appendChild(document.createTextNode("fork"));
        meta.appendChild(fork);
      }

      var upd = el("span", null);
      upd.innerHTML = '<i class="bi-clock-history"></i>';
      upd.appendChild(document.createTextNode(timeAgo(r.pushed_at)));
      meta.appendChild(upd);
      body.appendChild(meta);

      var link = el("a", "stretched-link");
      link.href = r.url; link.target = "_blank"; link.rel = "noopener";
      link.setAttribute("aria-label", "Open " + r.name + " on GitHub");
      body.appendChild(link);

      card.appendChild(body); col.appendChild(card); box.appendChild(col);
    });
  }

  function renderReposError(box) {
    box.innerHTML = "";
    var col = el("div", "col-12");
    var card = el("div", "card");
    var body = el("div", "card-body feed-error");
    body.appendChild(document.createTextNode("Couldn't load repositories right now. "));
    var a = el("a", null, "Browse them on GitHub →");
    a.href = "https://github.com/" + GH_USER + "?tab=repositories";
    a.target = "_blank"; a.rel = "noopener";
    body.appendChild(a);
    card.appendChild(body); col.appendChild(card); box.appendChild(col);
  }

  /* ----------------------------------------------------------------
     2. Security news feed
  ---------------------------------------------------------------- */
  function loadNews(force) {
    var box = document.getElementById("news-feed");
    var status = document.getElementById("news-status");
    var cacheKey = "cyber_news_v2";

    if (!force) {
      var cached = readCache(cacheKey, 30 * 60 * 1000); // 30 min
      if (cached) { renderNews(box, status, cached); return; }
    }

    renderNewsSkeletons(box);
    if (status) status.textContent = "fetching…";

    fetchAllFeeds()
      .then(function (result) {
        writeCache(cacheKey, result);
        renderNews(box, status, result);
      })
      .catch(function () { renderNewsError(box, status); });
  }

  function fetchAllFeeds() {
    return Promise.allSettled(NEWS_FEEDS.map(fetchFeed))
      .then(function (results) {
        var seen = {};
        var items = [];
        results.forEach(function (res) {
          if (res.status !== "fulfilled") return;
          res.value.items.forEach(function (it) {
            var key = (it.link || it.title || "").toLowerCase();
            if (!key || seen[key]) return;
            seen[key] = true;
            items.push(it);
          });
        });
        items = items.sort(byDateDesc).slice(0, 9);
        if (!items.length) throw new Error("empty");
        return { source: "multi-source", items: items };
      });
  }

  function fetchFeed(feed) {
    return fetchViaRss2Json(feed)
      .catch(function () { return fetchViaAllOrigins(feed); })
      .then(function (items) {
        return {
          source: feed.source,
          items: (items || []).map(function (it) {
            it.source = feed.source;
            it.priority = classifyThreat(it.title + " " + (it.summary || ""));
            return it;
          })
        };
      });
  }

  function fetchViaRss2Json(feed) {
    // NOTE: the `count` parameter requires a paid rss2json API key — omit it
    // (the free endpoint returns ~10 items, which we merge and slice in JS).
    var api = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feed.url);
    return fetch(api)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        if (data.status !== "ok" || !data.items) throw new Error("bad payload");
        return data.items.map(function (it) {
          return {
            title: it.title,
            link: it.link,
            date: it.pubDate,
            summary: truncate(stripHtml(it.description || it.content), 150)
          };
        });
      });
  }

  function fetchViaAllOrigins(feed) {
    var api = "https://api.allorigins.win/raw?url=" + encodeURIComponent(feed.url);
    return fetch(api)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (xmlText) {
        var doc = new DOMParser().parseFromString(xmlText, "application/xml");
        var nodes = doc.querySelectorAll("item");
        var items = [];
        nodes.forEach(function (node, idx) {
          if (idx >= 9) return;
          var get = function (tag) {
            var n = node.querySelector(tag);
            return n ? n.textContent : "";
          };
          items.push({
            title: get("title"),
            link: get("link"),
            date: get("pubDate"),
            summary: truncate(stripHtml(get("description")), 150)
          });
        });
        return items;
      });
  }

  function classifyThreat(text) {
    text = (text || "").toLowerCase();
    if (/cve-|zero[- ]day|actively exploited|known exploited|critical|ransomware|breach|supply chain/.test(text)) {
      return "high signal";
    }
    if (/malware|phishing|vulnerability|exploit|patch|backdoor|botnet/.test(text)) {
      return "watch";
    }
    return "";
  }

  function renderNewsSkeletons(box) {
    box.innerHTML = "";
    for (var i = 0; i < 5; i++) {
      var item = el("div", "news-item");
      var t = el("div", "skeleton skeleton-line"); t.style.width = (60 + (i % 3) * 12) + "%";
      var m = el("div", "skeleton skeleton-line"); m.style.width = "30%"; m.style.height = "9px";
      item.appendChild(t); item.appendChild(m); box.appendChild(item);
    }
  }

  function renderNews(box, status, result) {
    box.innerHTML = "";
    result.items.forEach(function (it) {
      var a = el("a", "news-item");
      a.href = it.link; a.target = "_blank"; a.rel = "noopener";
      a.appendChild(el("div", "news-title", it.title));
      var meta = el("div", "news-meta");
      meta.appendChild(el("span", "news-source", it.source || result.source));
      var when = timeAgo(it.date);
      if (when) meta.appendChild(document.createTextNode("  ·  " + when));
      if (it.priority) meta.appendChild(el("span", "threat-tag", it.priority));
      a.appendChild(meta);
      if (it.summary) a.appendChild(el("div", "small text-muted mt-1", it.summary));
      box.appendChild(a);
    });
    if (status) status.textContent = "updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderNewsError(box, status) {
    box.innerHTML = "";
    var wrap = el("div", "feed-error");
    wrap.appendChild(document.createTextNode("Live feed unavailable right now. Read the latest at "));
    [["The Hacker News", "https://thehackernews.com/"],
     ["BleepingComputer", "https://www.bleepingcomputer.com/"],
     ["CISA Alerts", "https://www.cisa.gov/news-events/cybersecurity-advisories"]
    ].forEach(function (s, idx) {
      if (idx) wrap.appendChild(document.createTextNode(" · "));
      var a = el("a", null, s[0]); a.href = s[1]; a.target = "_blank"; a.rel = "noopener";
      wrap.appendChild(a);
    });
    wrap.appendChild(document.createTextNode("."));
    box.appendChild(wrap);
    if (status) status.textContent = "offline";
  }

})();
