const API = "/api";
const SOURCE_LABEL = {
  netease: "网易云",
  tencent: "QQ音乐",
  kugou: "酷狗",
  kuwo: "酷我",
  migu: "咪咕",
};

const keywordEl = document.querySelector("#keyword");
const resultBody = document.querySelector("#resultBody");
const statusEl = document.querySelector("#status");
const dialog = document.querySelector("#playerDialog");
const audio = document.querySelector("#audio");
const lyricsEl = document.querySelector("#lyrics");
const fallbackEl = document.querySelector("#fallback");
const playerTitle = document.querySelector("#playerTitle");

document.querySelector("#searchBtn").addEventListener("click", () => searchAll());
keywordEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchAll();
});
document.querySelector("#closePlayer").addEventListener("click", () => {
  audio.pause();
  dialog.close();
});

function selectedSources() {
  return [...document.querySelectorAll(".filters input:checked")].map((i) => i.value);
}

async function searchAll() {
  const keyword = keywordEl.value.trim();
  if (!keyword) {
    statusEl.textContent = "请先输入关键词。";
    return;
  }

  const sources = selectedSources();
  if (!sources.length) {
    statusEl.textContent = "请至少勾选一个平台。";
    return;
  }

  statusEl.textContent = "搜索中...";
  resultBody.innerHTML = "";

  const all = await Promise.allSettled(sources.map((source) => searchBySource(source, keyword)));
  const tracks = all.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  if (!tracks.length) {
    statusEl.textContent = "没有找到结果，或聚合 API 当前不可用。";
    return;
  }

  statusEl.textContent = `共 ${tracks.length} 条结果。`;
  tracks.forEach(renderRow);
}

async function searchBySource(source, keyword) {
  const url = `${API}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=8`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((item) => ({
    source,
    id: item.id,
    name: item.name,
    artist: Array.isArray(item.artist) ? item.artist.join("/") : item.artist || "-",
    album: item.album || "-",
  }));
}

function renderRow(track) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${SOURCE_LABEL[track.source] ?? track.source}</td>
    <td>${track.name}</td>
    <td>${track.artist}</td>
    <td>${track.album}</td>
    <td><button data-play="${track.source}|${track.id}|${track.name}">播放</button></td>
  `;
  tr.querySelector("button").addEventListener("click", () => openPlayer(track));
  resultBody.appendChild(tr);
}

async function openPlayer(track) {
  playerTitle.textContent = `${track.name} - ${track.artist}`;
  lyricsEl.textContent = "正在加载歌词...";
  fallbackEl.innerHTML = "";
  dialog.showModal();

  const [url, lrc] = await Promise.all([fetchPlayableUrl(track), fetchLyric(track)]);

  if (url) {
    audio.src = url;
    audio.play().catch(() => {});
  } else {
    audio.removeAttribute("src");
    fallbackEl.innerHTML = `该歌曲暂不支持直链播放。<a href="${platformSearchUrl(track)}" target="_blank" rel="noreferrer">前往平台搜索播放</a>`;
  }

  lyricsEl.textContent = lrc || "暂无歌词。";
}

async function fetchPlayableUrl(track) {
  const url = `${API}?types=url&source=${track.source}&id=${track.id}`;
  const res = await fetch(url);
  if (!res.ok) return "";
  const data = await res.json();
  return data?.url || "";
}

async function fetchLyric(track) {
  const url = `${API}?types=lyric&source=${track.source}&id=${track.id}`;
  const res = await fetch(url);
  if (!res.ok) return "";
  const data = await res.json();
  return data?.lyric || "";
}

function platformSearchUrl(track) {
  const q = encodeURIComponent(`${track.name} ${track.artist}`);
  if (track.source === "netease") return `https://music.163.com/#/search/m/?s=${q}&type=1`;
  if (track.source === "tencent") return `https://y.qq.com/n/ryqq/search?w=${q}`;
  if (track.source === "kugou") return `https://www.kugou.com/yy/html/search.html#searchType=song&searchKeyWord=${q}`;
  if (track.source === "kuwo") return `https://www.kuwo.cn/search/list?key=${q}`;
  if (track.source === "migu") return `https://music.migu.cn/v3/search?keyword=${q}`;
  return "https://www.baidu.com/s?wd=" + q;
}
