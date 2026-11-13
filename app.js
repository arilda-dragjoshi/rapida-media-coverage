// Live job status: polls /api/status while a run is in progress and updates the job bar.
(function () {
  var bar = document.querySelector("[data-job-bar]");
  if (!bar) return;
  var stepEl = bar.querySelector("[data-job-step]");
  var countEl = bar.querySelector("[data-job-counts]");
  var logEl = document.querySelector("[data-job-log]");
  var wasRunning = bar.getAttribute("data-running") === "1";

  function tick() {
    fetch("/api/status", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.run) return;
        var run = data.run;
        if (data.running) {
          bar.setAttribute("data-running", "1");
          if (stepEl) stepEl.textContent = run.step || "Running";
          if (countEl) countEl.textContent = run.candidates + " candidates · " + run.relevant + " relevant so far";
          if (logEl) { logEl.textContent = run.log || ""; logEl.scrollTop = logEl.scrollHeight; }
          wasRunning = true;
          setTimeout(tick, 2000);
        } else if (wasRunning) {
          window.location.reload(); // run finished: refresh numbers and charts
        }
      })
      .catch(function () { setTimeout(tick, 5000); });
  }
  if (wasRunning) tick();
})();

// Confirm destructive buttons.
document.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-confirm]");
  if (btn && !window.confirm(btn.getAttribute("data-confirm"))) e.preventDefault();
});

// Accept / Reject on the References list without reloading the page.
document.addEventListener("submit", function (e) {
  var form = e.target.closest("[data-inline-review]");
  if (!form) return;
  var btn = e.submitter;
  if (!btn) return;
  e.preventDefault();
  var item = form.closest("[data-ref]");
  var body = new URLSearchParams({ status: btn.value });
  form.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
  fetch(form.action, { method: "POST", body: body, credentials: "same-origin", headers: { "x-inline": "1" } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      item.className = "result result--" + data.status;
      var chip = item.querySelector(".status-chip");
      if (chip) { chip.className = "status-chip status-" + data.status; chip.textContent = data.label; }
      form.querySelectorAll("button").forEach(function (b) {
        var current = b.value === data.status;
        b.disabled = current;
        b.classList.toggle("disabled", current);
      });
      // In the "To review" list a reviewed item moves out of the list.
      if (new URLSearchParams(location.search).get("status") !== "all" && location.search.indexOf("status=" + data.status) === -1) {
        item.classList.add("is-leaving");
        setTimeout(function () { item.remove(); }, 600);
      }
    })
    .catch(function () {
      form.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      alert("Could not save. Please try again.");
    });
});
