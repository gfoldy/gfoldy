/*
 * app.js — UI wiring for the Feeds & Speeds calculator.
 * Populates the form from data.js, recomputes on every change, and renders
 * results. Persists the last-used inputs in localStorage.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "feeds-speeds.v1";
  let unit = "in";

  // --- Populate selects -----------------------------------------------------
  function option(value, label) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    return o;
  }

  function fillSelect(el, obj) {
    for (const [key, v] of Object.entries(obj)) el.appendChild(option(key, v.label));
  }

  function fillMaterials(el) {
    const groups = {};
    for (const [key, m] of Object.entries(MATERIALS)) {
      (groups[m.group] = groups[m.group] || []).push([key, m.label]);
    }
    for (const [group, items] of Object.entries(groups)) {
      const og = document.createElement("optgroup");
      og.label = group;
      for (const [key, label] of items) og.appendChild(option(key, label));
      el.appendChild(og);
    }
  }

  fillSelect($("machine"), MACHINES);
  fillSelect($("toolType"), TOOL_TYPES);
  fillSelect($("toolMaterial"), TOOL_MATERIALS);
  fillSelect($("operation"), OPERATIONS);
  fillMaterials($("material"));

  // Sensible defaults.
  $("machine").value = "router_hobby";
  $("toolType").value = "endmill";
  $("toolMaterial").value = "carbide";
  $("material").value = "alu_6061";
  $("operation").value = "roughing";

  // --- Unit handling --------------------------------------------------------
  function setUnit(next) {
    if (next === unit) return;
    const dia = $("diameter");
    const val = parseFloat(dia.value);
    if (!isNaN(val)) {
      dia.value = next === "mm" ? +(val * 25.4).toFixed(3) : +(val / 25.4).toFixed(4);
    }
    unit = next;
    document.querySelectorAll(".unit-toggle button").forEach((b) => {
      b.classList.toggle("active", b.dataset.unit === unit);
    });
    dia.step = unit === "mm" ? "0.01" : "0.001";
    recompute();
  }

  document.querySelectorAll(".unit-toggle button").forEach((b) => {
    b.addEventListener("click", () => setUnit(b.dataset.unit));
  });

  // --- Conditional fields ---------------------------------------------------
  function syncConditionalFields() {
    const isCustom = $("machine").value === "custom";
    $("custom-rpm").classList.toggle("hidden", !isCustom);

    const isDrill = $("toolType").value === "drill";
    // Drilling: hide operation + chip thinning, relabel flutes as "lips".
    $("operation-field").classList.toggle("hidden", isDrill);
    $("thinning-field").classList.toggle("hidden", isDrill);
    const flutesLabel = $("flutes-field").querySelector("span");
    flutesLabel.textContent = isDrill ? "Cutting lips" : "Flutes";
    if (isDrill) $("flutes").value = 2;
  }

  const AGGR_LABELS = ["Conservative", "Nominal", "Aggressive"];
  function syncAggrLabel() {
    $("aggr-out").textContent = AGGR_LABELS[+$("aggr").value] || "Nominal";
  }

  // --- Gather + persist -----------------------------------------------------
  function gather() {
    return {
      machineKey: $("machine").value,
      customRpmMin: parseFloat($("rpmMin").value) || 100,
      customRpmMax: parseFloat($("rpmMax").value) || 10000,
      materialKey: $("material").value,
      toolMaterialKey: $("toolMaterial").value,
      toolTypeKey: $("toolType").value,
      diameter: parseFloat($("diameter").value),
      unit,
      flutes: parseInt($("flutes").value, 10),
      operation: $("operation").value,
      aggressiveness: parseInt($("aggr").value, 10),
      chipThinning: $("chipThinning").checked,
    };
  }

  function persist(input) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...input, unit }));
    } catch (_) {/* private mode / disabled storage — ignore */}
  }

  function restore() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (_) { saved = null; }
    if (!saved) return;
    const set = (id, val) => { if (val != null && $(id)) $(id).value = val; };
    if (saved.unit === "mm") { unit = "mm"; }
    set("machine", saved.machineKey);
    set("toolType", saved.toolTypeKey);
    set("toolMaterial", saved.toolMaterialKey);
    set("material", saved.materialKey);
    set("operation", saved.operation);
    set("diameter", saved.diameter);
    set("flutes", saved.flutes);
    set("aggr", saved.aggressiveness);
    set("rpmMin", saved.customRpmMin);
    set("rpmMax", saved.customRpmMax);
    if ($("chipThinning") && saved.chipThinning != null) $("chipThinning").checked = saved.chipThinning;
    document.querySelectorAll(".unit-toggle button").forEach((b) => {
      b.classList.toggle("active", b.dataset.unit === unit);
    });
  }

  // --- Rendering ------------------------------------------------------------
  const U = () => (unit === "mm" ? "mm" : "in");

  function statCard(label, value, sub) {
    return `<div class="stat">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ""}
    </div>`;
  }

  function render(r) {
    const el = $("results");
    if (r.error) {
      el.innerHTML = `<div class="notice error">${r.error}</div>`;
      return;
    }

    const isDrill = r.toolType.model === "drilling";
    const feed = unit === "mm" ? `${r.feed.mmpm} <span class="unit">mm/min</span>` : `${r.feed.ipm} <span class="unit">in/min</span>`;
    const fpt = unit === "mm" ? `${r.feedPerTooth.mm} mm` : `${r.feedPerTooth.in} in`;
    const fpr = unit === "mm" ? `${r.feedPerRev.mm} mm` : `${r.feedPerRev.in} in`;
    const speed = unit === "mm" ? `${r.vc_mpm} <span class="unit">m/min</span>` : `${r.sfm} <span class="unit">SFM</span>`;

    let cards = "";
    cards += statCard("Spindle speed", `${r.rpm.toLocaleString()} <span class="unit">RPM</span>`,
      (r.rpmClamped ? "⚠ capped at machine max" : r.rpmFloored ? "⚠ raised to machine min" : `surface speed ${speed}`));
    cards += statCard(isDrill ? "Feed rate" : "Feed rate", feed,
      isDrill ? `${fpr} / rev` : `${fpt} / tooth × ${r.flutes}`);

    if (!isDrill && r.ap) {
      const ap = unit === "mm" ? `${r.ap.mm} <span class="unit">mm</span>` : `${r.ap.in} <span class="unit">in</span>`;
      cards += statCard("Depth of cut (Ap)", ap, "axial, per pass");
    }
    if (!isDrill && r.ae) {
      const ae = unit === "mm" ? `${r.ae.mm} <span class="unit">mm</span>` : `${r.ae.in} <span class="unit">in</span>`;
      const pct = Math.round((r.ae.in / r.diameter.in) * 100);
      cards += statCard("Width of cut (Ae)", ae, `radial stepover · ${pct}% of Ø`);
    }
    if (r.mrr) {
      const mrr = unit === "mm" ? `${r.mrr.cc} <span class="unit">cm³/min</span>` : `${r.mrr.cuin} <span class="unit">in³/min</span>`;
      cards += statCard("Material removal", mrr, "MRR");
    }

    let warns = "";
    if (r.thinningApplied) {
      warns += `<div class="notice info">Radial chip-thinning applied: feed raised ×${r.thinningFactor} for the light stepover.</div>`;
    }
    for (const w of r.warnings) {
      warns += `<div class="notice warn">${w}</div>`;
    }

    el.innerHTML = `
      <div class="stats">${cards}</div>
      ${r.opNote ? `<p class="op-note">${r.opNote}</p>` : ""}
      ${warns}
      <div class="summary">
        <strong>${r.material.label}</strong> · ${r.toolMat.label} ${r.toolType.label.toLowerCase()}
        Ø${unit === "mm" ? r.diameter.mm + "mm" : r.diameter.in + '"'}
        · ${r.agg.label} · ${r.machine.label}
      </div>
    `;
  }

  // --- Recompute loop -------------------------------------------------------
  function recompute() {
    syncConditionalFields();
    syncAggrLabel();
    const input = gather();
    if (isNaN(input.diameter)) {
      $("results").innerHTML = `<div class="notice error">Enter a tool diameter.</div>`;
      return;
    }
    const r = computeFeedsSpeeds(input);
    persist(input);
    render(r);
  }

  // Wire up every input.
  $("calc-form").addEventListener("input", recompute);
  $("calc-form").addEventListener("change", recompute);

  // Boot.
  restore();
  recompute();
})();
