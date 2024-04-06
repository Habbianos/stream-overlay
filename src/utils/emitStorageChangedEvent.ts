export function emitStorageChangedEvent() {
	const iframeEl = document.createElement("iframe");
	iframeEl.style.display = "none";
	document.body.appendChild(iframeEl);

	iframeEl.contentWindow?.localStorage.setItem("t", Date.now().toString());
	iframeEl.remove();
}
