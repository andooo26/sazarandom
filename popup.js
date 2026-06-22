// ポップアップのロジック
// 開いている Google Drive のフォルダ画面からファイル名を読み取り、
// 「xxx-xx名前」(例: NF1-13黒宮朝大) を抽出して発表順をシャッフルする。

const button = document.getElementById("action-btn");
const status = document.getElementById("status");
const result = document.getElementById("result");

// Drive のタブに注入してファイル名一覧を返す関数。
// DOM 構造が変わる可能性があるため複数のセレクタでフォールバックする。
function scrapeFileNames() {
  const names = new Set();

  const pushName = (raw) => {
    if (typeof raw !== "string") return;
    const name = raw.trim();
    if (name) names.add(name);
  };

  // 各ファイル行からファイル名を取得する。
  const rows = document.querySelectorAll('[role="row"][data-id]');
  rows.forEach((row) => {
    // 1) ファイル名そのものを持つ要素
    const strong = row.querySelector("strong.DNoYtb, .WQJtxb");
    if (strong && strong.textContent) {
      pushName(strong.textContent);
      return;
    }
    // 2) data-tooltip / aria-label からの抽出 (末尾の種類表記を落とす)
    const tip = row.querySelector("[data-tooltip]");
    if (tip) pushName(tip.getAttribute("data-tooltip"));
  });

  return Array.from(names);
}

// ファイル名から「xxx-xx名前」部分を取り出す。
// 例: "NF1-13黒宮朝大_2026年..." -> "NF1-13黒宮朝大"
//     "ST2-05小川倖輝_ST2_..."  -> "ST2-05小川倖輝"
function extractKey(fileName) {
  const m = fileName.match(/^[A-Za-z]+\d*-\d+[^_．.\s（(]+/);
  return m ? m[0] : null;
}

// Fisher-Yates シャッフル
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function render(order) {
  result.innerHTML = "";
  order.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    result.appendChild(li);
  });
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

    const [{ result: fileNames }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeFileNames,
    });

    // 抽出 + 重複除去 (1人1エントリ)
    const keys = Array.from(
      new Set((fileNames || []).map(extractKey).filter(Boolean))
    );

    if (keys.length === 0) {
      status.textContent = "対象のファイル名が見つかりませんでした";
      return;
    }

    status.textContent = `${keys.length}人で抽選しました`;
    render(shuffle(keys));
  } catch (e) {
    status.textContent = "エラー: " + (e && e.message ? e.message : e);
  }
});
