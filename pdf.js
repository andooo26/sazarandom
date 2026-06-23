// Drive上のPDFを取得し、Blob化してChrome内蔵PDFビューアで表示する。
// これにより F11 全画面 + 矢印キーでのページ送り(発表)が可能になる。

const msg = document.getElementById("msg");

(async () => {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    msg.textContent = "ファイルIDがありません";
    return;
  }

  const src = `https://drive.usercontent.google.com/download?id=${id}&export=download`;

  try {
    const res = await fetch(src, { credentials: "include" });
    if (!res.ok) throw new Error("HTTP " + res.status);

    const buf = await res.arrayBuffer();
    // content-type が octet-stream でも内蔵ビューアで開けるよう明示
    const blob = new Blob([buf], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);

    // #zoom=page-fit でページ全体を画面に収める(右が切れるのを防ぐ)
    // 拡張ページからBlob URLへ遷移 → Chrome内蔵PDFビューアで表示
    location.replace(blobUrl + "#zoom=page-fit");
  } catch (e) {
    msg.innerHTML =
      "PDFを読み込めませんでした (" + (e && e.message ? e.message : e) + ")<br>" +
      '<a href="https://drive.google.com/file/d/' + id + '/view" target="_blank">' +
      "Driveで開く</a>";
  }
})();
