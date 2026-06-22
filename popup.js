// ポップアップのロジック
const button = document.getElementById("action-btn");
const result = document.getElementById("result");

button.addEventListener("click", () => {
  // サンプル: ランダムな数値を表示
  const value = Math.floor(Math.random() * 100) + 1;
  result.textContent = `結果: ${value}`;
});
