export function openShareModal(canvasId) {
  const modal = document.getElementById("share-modal");
  const url = `${location.origin}${location.pathname}?join=${encodeURIComponent(canvasId)}`;
  document.getElementById("share-id").value = canvasId;
  document.getElementById("share-url").value = url;

  const qrEl = document.getElementById("qrcode");
  qrEl.innerHTML = "";
  // QRCode is loaded globally via CDN
  if (window.QRCode) {
    new window.QRCode(qrEl, {
      text: url,
      width: 160,
      height: 160,
      colorDark: "#21201C",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M
    });
  } else {
    qrEl.textContent = "QR unavailable";
  }

  modal.hidden = false;
}
