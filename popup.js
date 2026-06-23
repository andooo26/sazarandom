// ポップアップ

const button = document.getElementById("action-btn");
const status = document.getElementById("status");
const result = document.getElementById("result");

// Driveのタブに注入して {name, id} の一覧を返す関数
function scrapeFiles() {
  const files = [];

  const rows = document.querySelectorAll('[role="row"][data-id]');
  rows.forEach((row) => {
    const id = row.getAttribute("data-id");
    if (!id) return;

    let name = "";
    // 1) ファイル名そのものを持つ要素
    const strong = row.querySelector("strong.DNoYtb, .WQJtxb");
    if (strong && strong.textContent) {
      name = strong.textContent.trim();
    } else {
      // 2) data-tooltip からの抽出
      const tip = row.querySelector("[data-tooltip]");
      if (tip) name = (tip.getAttribute("data-tooltip") || "").trim();
    }

    // ファイル種別 (アイコンの <title> 例: "Microsoft PowerPoint" "Google Slides")
    const titleEl = row.querySelector("svg title");
    const type = titleEl && titleEl.textContent ? titleEl.textContent.trim() : "";

    if (name) files.push({ name, id, type });
  });

  return files;
}

// 種別に応じて「そのまま発表/編集できる」URLを組み立てる
function buildUrl(type, id) {
  const t = (type || "").toLowerCase();
  if (t.includes("powerpoint") || t.includes("slides")) {
    return `https://docs.google.com/presentation/d/${id}/edit`;
  }
  if (t.includes("word") || t.includes("docs")) {
    return `https://docs.google.com/document/d/${id}/edit`;
  }
  if (t.includes("excel") || t.includes("sheets")) {
    return `https://docs.google.com/spreadsheets/d/${id}/edit`;
  }
  if (t.includes("pdf")) {
    // 拡張内のビューアでデータを取得し、Chrome内蔵PDFビューアで表示する
    return `${chrome.runtime.getURL("pdf.html")}?id=${id}`;
  }
  // 画像・動画・テキストなどはファイル単体ビューで開く
  return `https://drive.google.com/file/d/${id}/view`;
}

function extractKey(fileName) {
  // 最初の "_" までを名前として扱う。
  // 例: "NT1-1安藤 陽太_元ファイル名.pptx" -> "NT1-1安藤 陽太"
  let name = fileName.split("_")[0];
  // "_" が無く拡張子が残った場合は除去 (例: "NT1-1安藤 陽太.pptx")
  name = name.replace(/\.[A-Za-z0-9]+$/, "").trim();
  return name || null;
}

button.addEventListener("click", async () => {
  result.innerHTML = "";
  status.textContent = "読み取り中...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !/^https:\/\/drive\.google\.com\//.test(tab.url || "")) {
      status.textContent = "Google ドライブのフォルダを開いてから実行してください";
      return;
    }

    const [{ result: files }] = await chrome.scripting.executeScript({

      target: { tabId: tab.id },
      func: scrapeFiles,
    });

    // 抽出 + 重複除去 (1人1エントリ、最初のファイルを採用)
    const seen = new Set();
    const candidates = [];
    (files || []).forEach((f) => {
      const key = extractKey(f.name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      candidates.push({ key, url: buildUrl(f.type, f.id) });
    });

    if (candidates.length === 0) {
      status.textContent = "対象のファイル名が見つかりませんでした";
      return;
    }

    // 候補を保存してルーレット用の新しいタブを開く
    await chrome.storage.local.set({ candidates, createdAt: Date.now() });
    await chrome.tabs.create({ url: chrome.runtime.getURL("roulette.html") });

    status.textContent = `${candidates.length}人でルーレットを開きました`;
  } catch (e) {
    status.textContent = "エラー: " + (e && e.message ? e.message : e);
  }
});
