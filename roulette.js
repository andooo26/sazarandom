// ルーレット画面のロジック
// storage から候補者 {key, url} を読み込み、1人ずつスロット演出で発表順を決める。

const display = document.getElementById("display");
const drawBtn = document.getElementById("draw-btn");
const openBtn = document.getElementById("open-btn");
const resetBtn = document.getElementById("reset-btn");
const remainingEl = document.getElementById("remaining");
const orderEl = document.getElementById("order");

let all = []; // 全候補者 [{key, url}]
let remaining = []; // まだ抽選していない候補者
let order = []; // 確定した発表順 [{key, url}]
let spinning = false;

function pickIndex(n) {
  return Math.floor(Math.random() * n);
}

function updateRemaining() {
  if (remaining.length === 0 && all.length > 0) {
    remainingEl.textContent = "抽選完了";
    drawBtn.disabled = true;
    drawBtn.textContent = "完了";
    openBtn.hidden = false; // 抽選完了でファイルを開くボタンを表示
  } else {
    remainingEl.textContent = `残り ${remaining.length} 人`;
  }
}

function addToOrder(candidate) {
  order.push(candidate);
  const li = document.createElement("li");
  li.textContent = candidate.key;
  orderEl.appendChild(li);
}

function reset() {
  remaining = all.slice();
  order = [];
  orderEl.innerHTML = "";
  openBtn.hidden = true;
  if (all.length) {
    display.textContent = all.map((c) => c.key).join("　");
    display.className = "display roster";
  } else {
    display.textContent = "候補者がいません";
    display.className = "display";
  }
  drawBtn.disabled = all.length === 0;
  drawBtn.textContent = "スタート";
  updateRemaining();
}

function draw() {
  if (spinning || remaining.length === 0) return;
  spinning = true;
  drawBtn.disabled = true;
  display.className = "display spinning";

  // 当選者を先に決定
  const winnerIdx = pickIndex(remaining.length);
  const winner = remaining[winnerIdx];

  const total = 500; // 1人あたりの演出時間(ms)
  let elapsed = 0;
  let interval = 50;

  function tick() {
    // ランダムな候補名をチラ見せ
    display.textContent = remaining[pickIndex(remaining.length)].key;
    elapsed += interval;

    if (elapsed >= total) {
      finish();
      return;
    }
    // 終盤は徐々に減速
    const left = total - elapsed;
    if (left < 700) interval = Math.min(260, interval + 40);
    setTimeout(tick, interval);
  }

  function finish() {
    remaining.splice(winnerIdx, 1);
    display.textContent = winner.key;
    display.className = "display winner";
    addToOrder(winner);
    updateRemaining();
    spinning = false;
    // 残りがいれば連続で次の抽選へ
    if (remaining.length > 0) {
      drawBtn.textContent = "抽選中...";
      setTimeout(draw, 0);
    }
  }

  tick();
}

// 発表順に資料を別タブで開く
function openAll() {
  order.forEach((c) => {
    if (c.url) chrome.tabs.create({ url: c.url, active: false });
  });
}

drawBtn.addEventListener("click", draw);
resetBtn.addEventListener("click", reset);
openBtn.addEventListener("click", openAll);

(async () => {
  const { candidates } = await chrome.storage.local.get("candidates");
  all = Array.isArray(candidates) ? candidates : [];
  reset();
})();
