// list your sources here:
const SOURCES = [
  {
    name: "AP News — Top Headlines",
    rss: "https://apnews.com/hub/ap-top-news/rss",
  },
  {
    name: "BBC News — Top Stories",
    rss: "http://feeds.bbci.co.uk/news/rss.xml",
  },
  {
    name: "TechCrunch — Technology",
    rss: "https://techcrunch.com/feed/",
  },
  {
    name: "ESPN — Sports",
    rss: "https://www.espn.com/espn/rss/news",
  },
  {
    name: "NASA — Breaking News",
    rss: "https://www.nasa.gov/rss/dyn/breaking_news.rss",
  },
];

// public CORS proxy that returns JSON { contents: '…XML…' }
const PROXY_BASE = "https://api.allorigins.win/get?url=";

function formatDate(dt) {
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function loadAllNews() {
  // set the page date
  document.querySelector(".date").textContent = formatDate(new Date());

  const container = document.getElementById("news-container");
  container.innerHTML = "";

  for (let { name, rss } of SOURCES) {
    // Section wrapper
    const section = document.createElement("section");
    section.className = "feed-section";

    // Section title
    const titleEl = document.createElement("h2");
    titleEl.className = "section-title";
    titleEl.textContent = name;
    section.appendChild(titleEl);

    try {
      // fetch & parse
      const url = PROXY_BASE + encodeURIComponent(rss);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const xmlText = payload.contents;
      const xml = new DOMParser().parseFromString(xmlText, "application/xml");
      const items = xml.querySelectorAll("item");

      // limit per section
      Array.from(items)
        .slice(0, 4)
        .forEach((item) => {
          const title = item.querySelector("title")?.textContent || "";
          const link = item.querySelector("link")?.textContent || "#";
          const dateStr = item.querySelector("pubDate")?.textContent || "";
          const desc = item.querySelector("description")?.textContent || "";

          const art = document.createElement("article");
          art.className = "article";
          art.innerHTML = `
          <h3 class="headline">${title}</h3>
          <p class="byline">${new Date(dateStr).toLocaleDateString()}</p>
          <div class="content">
            <p>${desc}</p>
            <p><a href="${link}" target="_blank">Read more →</a></p>
          </div>`;
          section.appendChild(art);
        });
    } catch (err) {
      console.error(`Failed to load ${name}:`, err);
      const errMsg = document.createElement("p");
      errMsg.textContent = `⚠️ Could not load ${name}.`;
      section.appendChild(errMsg);
    }

    container.appendChild(section);
  }
}

window.addEventListener("DOMContentLoaded", loadAllNews);
