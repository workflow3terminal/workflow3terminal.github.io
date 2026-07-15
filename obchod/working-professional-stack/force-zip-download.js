(function (global) {
  var FILENAME = "Working_Professional_Prompt_Stack.zip";

  function resolveFetchUrl(cfg) {
    if (cfg && cfg.zipFetchUrl) return cfg.zipFetchUrl;
    if (cfg && cfg.downloadPath && cfg.downloadPath.charAt(0) === "/") {
      return global.location.origin + cfg.downloadPath;
    }
    return "https://workflow3terminal.github.io/downloads/working-professional-stack/" + FILENAME;
  }

  function resolveDirectUrl(cfg) {
    if (cfg && cfg.releaseDownloadUrl) return cfg.releaseDownloadUrl;
    return resolveFetchUrl(cfg);
  }

  async function forceZipDownload(fetchUrl, filename, statusEl, directUrl) {
    filename = filename || FILENAME;
    fetchUrl = fetchUrl || resolveFetchUrl(window.W3_PAYGATE && window.W3_PAYGATE.working_professional_stack);
    directUrl = directUrl || resolveDirectUrl(window.W3_PAYGATE && window.W3_PAYGATE.working_professional_stack);
    if (statusEl) statusEl.textContent = "Připravuji stažení ZIP…";
    try {
      var response = await fetch(fetchUrl, { mode: "cors", cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      var blob = await response.blob();
      var zipBlob =
        blob.type === "application/zip" || blob.type === "application/x-zip-compressed"
          ? blob
          : new Blob([blob], { type: "application/zip" });
      var objectUrl = URL.createObjectURL(zipBlob);
      var link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      if (statusEl) {
        statusEl.textContent =
          "ZIP stažen. Pokud se místo toho otevřela složka, zkuste Chrome nebo Firefox.";
      }
      return true;
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = "Automatické stažení selhalo — zkuste přímý odkaz níže.";
      }
      return false;
    }
  }

  function bindZipDownload(anchorId, statusId, cfg) {
    var anchor = document.getElementById(anchorId);
    var status = statusId ? document.getElementById(statusId) : null;
    if (!anchor) return;
    var fetchUrl = resolveFetchUrl(cfg);
    var directUrl = resolveDirectUrl(cfg);
    anchor.href = directUrl;
    anchor.setAttribute("download", FILENAME);
    anchor.addEventListener("click", function (event) {
      event.preventDefault();
      forceZipDownload(fetchUrl, FILENAME, status, directUrl).then(function (ok) {
        if (!ok) {
          anchor.href = directUrl;
          anchor.removeAttribute("download");
          anchor.removeAttribute("id");
          anchor.click();
          anchor.id = anchorId;
        }
      });
    });
  }

  global.W3ForceZipDownload = {
    forceZipDownload: forceZipDownload,
    bindZipDownload: bindZipDownload,
    FILENAME: FILENAME,
    resolveFetchUrl: resolveFetchUrl,
    resolveDirectUrl: resolveDirectUrl
  };
})(window);
