window.App = window.App || {};

(function () {
  const state = {
    profile: null,
    isAdmin: false,
    areas: [],
    categories: [],
    findings: [],
    currentView: "form",
    formStep: 1,
    updateStep: 1,
    selectedFinding: null,
    pendingFindingId: null,
  };

  const STATUS_LABELS = {
    open: "Open",
    progress: "On Progress",
    closed: "Closed",
    pending: "Pending",
  };

  function $(id) { return document.getElementById(id); }

  function escapeHtml(v) {
    return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function formatDateTime(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function toLocalDatetimeValue(date) {
    const d = date || new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function setLoading(on, msg) {
    const el = $("global-loading");
    if (!el) return;
    el.textContent = msg || "Memuat...";
    el.classList.toggle("hidden", !on);
  }

  function showToast(msg, isError) {
    const t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = `toast${isError ? " toast-error" : ""}`;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.add("hidden"), 3500);
  }

  function setLoginStatus(msg, isError) {
    const el = $("login-status");
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? "var(--accent-red)" : "var(--text-secondary)";
  }

  function statusBadge(status) {
    const label = STATUS_LABELS[status] || status;
    return `<span class="status-badge status-${escapeHtml(status)}">${escapeHtml(label)}</span>`;
  }

  function showAuth(show) {
    $("auth-screen")?.classList.toggle("active", show);
    $("app-shell")?.classList.toggle("app-hidden", show);
  }

  function initCompanyDropdown() {
    const sel = $("company-select");
    if (!sel) return;
    sel.innerHTML = `<option value="">— Pilih Perusahaan —</option>` +
      window.App.users.companies.map((c) =>
        `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`
      ).join("");
  }

  function initLoginTabs() {
    document.querySelectorAll(".login-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".login-tab").forEach((t) => t.classList.toggle("active", t === tab));
        document.querySelectorAll(".login-panel").forEach((p) => p.classList.remove("active"));
        $(tab.dataset.tab === "admin" ? "admin-login-form" : "user-login-form")?.classList.add("active");
      });
    });
  }

  async function loginAsCompany(companyId) {
    const company = window.App.users.getCompanyById(companyId);
    if (!company) throw new Error("Perusahaan tidak ditemukan.");
    await window.App.queries.signIn(company.email, window.App.users.DEMO_PASSWORD);
  }

  async function loginAsAdmin(pin) {
    if (pin !== window.App.users.ADMIN_PIN) throw new Error("PIN salah.");
    await window.App.queries.signIn(window.App.users.ADMIN_EMAIL, window.App.users.DEMO_PASSWORD);
  }

  async function syncProfile() {
    state.profile = await window.App.queries.getCurrentProfile();
    state.isAdmin = state.profile.role === "admin";
    $("user-name").textContent = state.profile.full_name || "User";
    $("user-role").textContent = state.isAdmin ? "Administrator" : "PIC";
    $("user-avatar").textContent = (state.profile.full_name || "U").slice(0, 2).toUpperCase();
    $("user-nav")?.classList.toggle("hidden", state.isAdmin);
    $("admin-nav")?.classList.toggle("hidden", !state.isAdmin);
    if (!state.isAdmin) {
      $("field-company").value = state.profile.full_name || "";
    }
  }

  async function loadOptions() {
    [state.areas, state.categories] = await Promise.all([
      window.App.queries.getAreas(),
      window.App.queries.getCategories(),
    ]);
    const areaSel = $("input-area");
    const catSel = $("input-category");
    if (areaSel) {
      areaSel.innerHTML = `<option value="">Pilih area</option>` +
        state.areas.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join("");
    }
    if (catSel) {
      catSel.innerHTML = `<option value="">Pilih kategori</option>` +
        state.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    }
  }

  async function loadFindings() {
    state.findings = await window.App.queries.getFindings();
  }

  function showView(view) {
    state.currentView = view;
    const views = state.isAdmin
      ? ["admin-dashboard", "admin-approval"]
      : ["form", "dashboard", "monthly"];
    views.forEach((v) => {
      $(`view-${v}`)?.classList.toggle("active", v === view);
    });
    document.querySelectorAll(state.isAdmin ? "#admin-nav .nav-link" : "#user-nav .nav-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    const titles = {
      form: "Form Temuan",
      dashboard: "Dashboard",
      monthly: "Monthly Report",
      "admin-dashboard": "Dashboard Admin",
      "admin-approval": "Approval",
    };
    $("header-subtitle").textContent = titles[view] || "SIGAP HSE";
    if (!state.isAdmin) localStorage.setItem("sigap:lastView", view);

    if (view === "dashboard" || view === "admin-dashboard") renderDashboard();
    if (view === "admin-approval") renderApproval();
    if (view === "monthly") renderMonthlyHistory();
  }

  function renderKpis(targetId, findings) {
    const el = $(targetId);
    if (!el) return;
    const cards = [
      { label: "Total", value: findings.length, cls: "" },
      { label: "Open", value: findings.filter((f) => f.status === "open").length, cls: "open" },
      { label: "On Progress", value: findings.filter((f) => f.status === "progress").length, cls: "progress" },
      { label: "Closed", value: findings.filter((f) => f.status === "closed").length, cls: "closed" },
    ];
    el.innerHTML = cards.map((c) => `
      <div class="kpi-card kpi-${c.cls}">
        <p>${c.label}</p>
        <strong>${c.value}</strong>
      </div>
    `).join("");
  }

  function renderDashboard() {
    if (state.isAdmin) {
      renderKpis("admin-kpis", state.findings);
      const body = $("admin-findings-body");
      if (!body) return;
      body.innerHTML = state.findings.length ? state.findings.map((f) => `
        <tr>
          <td class="mono">${escapeHtml(f.code)}</td>
          <td>${escapeHtml(f.companyName)}</td>
          <td>${escapeHtml(formatDateTime(f.foundDatetime || f.foundAt))}</td>
          <td>${escapeHtml(f.areaName)}</td>
          <td>${escapeHtml(f.categoryName)}</td>
          <td>${statusBadge(f.status)}</td>
        </tr>
      `).join("") : `<tr><td colspan="6" class="muted">Belum ada temuan.</td></tr>`;
    } else {
      renderKpis("user-kpis", state.findings);
      const body = $("user-findings-body");
      if (!body) return;
      body.innerHTML = state.findings.length ? state.findings.map((f) => `
        <tr class="${f.status === "open" ? "row-clickable" : ""}" data-id="${f.id}" data-status="${f.status}">
          <td class="mono">${escapeHtml(f.code)}</td>
          <td>${escapeHtml(formatDateTime(f.foundDatetime || f.foundAt))}</td>
          <td>${escapeHtml(f.areaName)}</td>
          <td>${escapeHtml(f.categoryName)}</td>
          <td>${statusBadge(f.status)}</td>
        </tr>
      `).join("") : `<tr><td colspan="5" class="muted">Belum ada temuan. Buat dari Form Temuan.</td></tr>`;

      body.querySelectorAll(".row-clickable").forEach((row) => {
        row.addEventListener("click", () => {
          const finding = state.findings.find((f) => f.id === row.dataset.id);
          if (!finding || finding.status !== "open") return;
          state.pendingFindingId = finding.id;
          state.selectedFinding = finding;
          openModal("confirm-modal");
        });
      });
    }
  }

  function renderApproval() {
    const list = $("approval-list");
    if (!list) return;
    const pending = state.findings.filter((f) => f.status === "progress");
    list.innerHTML = pending.length ? pending.map((f) => {
      const after = (f.photos || []).find((p) => p.stage === "after");
      const before = (f.photos || []).find((p) => p.stage === "before");
      return `
        <article class="approval-card card">
          <div class="approval-head">
            <div>
              <p class="eyebrow mono">${escapeHtml(f.code)}</p>
              <h3 class="section-title">${escapeHtml(f.companyName)}</h3>
            </div>
            ${statusBadge(f.status)}
          </div>
          <div class="approval-meta">
            <span>${escapeHtml(f.areaName)}</span>
            <span>${escapeHtml(f.categoryName)}</span>
            <span>Selesai: ${escapeHtml(formatDateTime(f.resolvedDatetime))}</span>
          </div>
          <p>${escapeHtml(f.photoDescription)}</p>
          <div class="photo-preview">
            ${before ? `<div class="photo-preview-item"><img src="${before.publicUrl}" alt="before"><div>Before</div></div>` : ""}
            ${after ? `<div class="photo-preview-item"><img src="${after.publicUrl}" alt="after"><div>After</div></div>` : ""}
          </div>
          <button type="button" class="button button-primary approve-btn" data-id="${f.id}">✓ Setujui (Closed)</button>
        </article>
      `;
    }).join("") : `<div class="card muted">Tidak ada temuan menunggu approval.</div>`;

    list.querySelectorAll(".approve-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        setLoading(true, "Menyetujui...");
        try {
          const result = await window.App.queries.approveFinding(btn.dataset.id);
          showToast(`Temuan ${result.code} disetujui — status Closed.`);
          await loadFindings();
          renderApproval();
        } catch (e) {
          showToast(e.message, true);
        } finally {
          setLoading(false);
        }
      });
    });
  }

  async function renderMonthlyHistory() {
    const el = $("monthly-history");
    if (!el) return;
    try {
      const reports = await window.App.queries.getMonthlyReports();
      el.innerHTML = reports.length ? reports.map((r) => `
        <div class="history-item">
          <strong>${escapeHtml(r.file_name)}</strong>
          <p class="muted">${escapeHtml(r.report_month)} · ${escapeHtml(formatDateTime(r.created_at))}</p>
        </div>
      `).join("") : `<p class="muted">Belum ada laporan diunggah.</p>`;
    } catch {
      el.innerHTML = `<p class="muted">Gagal memuat riwayat.</p>`;
    }
  }

  function setFormStep(step) {
    state.formStep = step;
    document.querySelectorAll("#form-stepper .step-item").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.step) === step);
      el.classList.toggle("done", Number(el.dataset.step) < step);
    });
    document.querySelectorAll("#finding-form .form-step").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.step) === step);
    });
    $("form-prev")?.classList.toggle("hidden", step === 1);
    $("form-next")?.classList.toggle("hidden", step === 3);
    $("form-submit")?.classList.toggle("hidden", step !== 3);
    if (step === 3) buildFormReview();
  }

  function setUpdateStep(step) {
    state.updateStep = step;
    document.querySelectorAll("#update-stepper .step-item").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.step) === step);
      el.classList.toggle("done", Number(el.dataset.step) < step);
    });
    document.querySelectorAll("#update-form .form-step").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.step) === step);
    });
    $("update-prev")?.classList.toggle("hidden", step === 1);
    $("update-next")?.classList.toggle("hidden", step === 2);
    $("update-submit")?.classList.toggle("hidden", step !== 2);
    if (step === 2) buildUpdateReview();
  }

  function validateFormStep(step) {
    const form = $("finding-form");
    if (step === 1) {
      if (!form.foundDatetime.value || !form.areaId.value || !form.categoryId.value) {
        showToast("Lengkapi tanggal, area, dan kategori.", true); return false;
      }
    }
    if (step === 2) {
      if (!form.beforePhoto.files?.[0]) { showToast("Foto temuan wajib diunggah.", true); return false; }
      if (!form.photoDescription.value.trim()) { showToast("Deskripsi wajib diisi.", true); return false; }
    }
    return true;
  }

  function validateUpdateStep(step) {
    const form = $("update-form");
    if (step === 1) {
      if (!form.afterPhoto.files?.[0]) { showToast("Foto after wajib diunggah.", true); return false; }
      if (!form.resolvedDatetime.value) { showToast("Tanggal penyelesaian wajib diisi.", true); return false; }
      const foundDt = new Date(state.selectedFinding?.foundDatetime || state.selectedFinding?.foundAt);
      const resolvedDt = new Date(form.resolvedDatetime.value);
      if (resolvedDt < foundDt) {
        showToast("Tanggal penyelesaian tidak boleh sebelum tanggal temuan.", true); return false;
      }
    }
    return true;
  }

  function buildFormReview() {
    const form = $("finding-form");
    const area = state.areas.find((a) => a.id === form.areaId.value)?.name || "-";
    const cat = state.categories.find((c) => c.id === form.categoryId.value)?.name || "-";
    $("review-panel").innerHTML = [
      ["Nama PT", $("field-company").value],
      ["Tanggal & Waktu", formatDateTime(form.foundDatetime.value)],
      ["Area", area],
      ["Kategori", cat],
      ["Deskripsi", form.photoDescription.value],
      ["Foto", form.beforePhoto.files?.[0]?.name || "-"],
    ].map(([k, v]) => `<div class="review-item"><strong>${escapeHtml(k)}</strong><span>${escapeHtml(v)}</span></div>`).join("");
  }

  function buildUpdateReview() {
    const form = $("update-form");
    $("update-review").innerHTML = [
      ["Kode Temuan", state.selectedFinding?.code],
      ["Foto After", form.afterPhoto.files?.[0]?.name || "-"],
      ["Tanggal Penyelesaian", formatDateTime(form.resolvedDatetime.value)],
      ["Status Baru", "On Progress (menunggu approval admin)"],
    ].map(([k, v]) => `<div class="review-item"><strong>${escapeHtml(k)}</strong><span>${escapeHtml(v)}</span></div>`).join("");
  }

  function previewPhoto(input, targetId) {
    const file = input.files?.[0];
    const el = $(targetId);
    if (!file || !el) return;
    el.innerHTML = `<div class="photo-preview-item"><img src="${URL.createObjectURL(file)}" alt="preview"><div>${escapeHtml(file.name)}</div></div>`;
  }

  function openModal(id) { $(id)?.classList.remove("hidden"); }
  function closeModal(id) { $(id)?.classList.add("hidden"); }

  function resetFindingForm() {
    $("finding-form")?.reset();
    $("field-company").value = state.profile?.full_name || "";
    $("found-datetime").value = toLocalDatetimeValue();
    $("before-preview").innerHTML = "";
    setFormStep(1);
  }

  function initNowButtons() {
    document.querySelectorAll(".btn-now").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = $(btn.dataset.target);
        if (target) target.value = toLocalDatetimeValue();
      });
    });
  }

  function initTheme() {
    const saved = localStorage.getItem("sigap:theme") || "light";
    document.documentElement.dataset.theme = saved;
    $("theme-toggle")?.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("sigap:theme", next);
    });
  }

  async function boot() {
    initCompanyDropdown();
    initLoginTabs();
    initNowButtons();
    initTheme();
    $("found-datetime").value = toLocalDatetimeValue();

    $("user-login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const companyId = $("company-select").value;
      if (!companyId) return;
      setLoginStatus("Sedang masuk...", false);
      try {
        await loginAsCompany(companyId);
        await syncProfile();
        await loadOptions();
        await loadFindings();
        showAuth(false);
        showView("form");
        resetFindingForm();
      } catch (err) {
        setLoginStatus(err.message || "Login gagal. Pastikan user sudah dibuat di Supabase.", true);
      }
    });

    $("admin-login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pin = e.target.pin.value;
      setLoginStatus("Memverifikasi PIN...", false);
      try {
        await loginAsAdmin(pin);
        await syncProfile();
        await loadFindings();
        showAuth(false);
        showView("admin-dashboard");
      } catch (err) {
        setLoginStatus(err.message || "Login admin gagal.", true);
      }
    });

    $("logout-button")?.addEventListener("click", async () => {
      await window.App.queries.signOut();
      showAuth(true);
      setLoginStatus("", false);
    });

    document.querySelectorAll("#user-nav .nav-link, #admin-nav .nav-link").forEach((btn) => {
      btn.addEventListener("click", () => showView(btn.dataset.view));
    });

    $("form-prev")?.addEventListener("click", () => setFormStep(state.formStep - 1));
    $("form-next")?.addEventListener("click", () => {
      if (!validateFormStep(state.formStep)) return;
      setFormStep(state.formStep + 1);
    });

    $("before-photo")?.addEventListener("change", (e) => previewPhoto(e.target, "before-preview"));

    $("finding-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateFormStep(2)) return;
      setLoading(true, "Menyimpan temuan...");
      try {
        const form = e.target;
        const finding = await window.App.queries.createFinding({
          foundDatetime: new Date(form.foundDatetime.value).toISOString(),
          areaId: form.areaId.value,
          categoryId: form.categoryId.value,
          photoDescription: form.photoDescription.value.trim(),
        });
        const compressed = await window.App.compress.compressImage(form.beforePhoto.files[0]);
        await window.App.queries.uploadFindingPhoto(finding.id, compressed, "before");
        showToast(`Temuan ${finding.code} berhasil disimpan.`);
        await loadFindings();
        resetFindingForm();
        showView("dashboard");
      } catch (err) {
        showToast(err.message, true);
      } finally {
        setLoading(false);
      }
    });

    $("confirm-no")?.addEventListener("click", () => {
      closeModal("confirm-modal");
      state.pendingFindingId = null;
    });

    $("confirm-yes")?.addEventListener("click", () => {
      closeModal("confirm-modal");
      $("update-finding-id").value = state.pendingFindingId;
      const foundMin = state.selectedFinding?.foundDatetime || state.selectedFinding?.foundAt;
      const resolved = $("resolved-datetime");
      if (resolved && foundMin) {
        resolved.min = toLocalDatetimeValue(new Date(foundMin));
        resolved.value = toLocalDatetimeValue();
      }
      $("after-preview").innerHTML = "";
      $("update-form").reset();
      $("update-finding-id").value = state.pendingFindingId;
      setUpdateStep(1);
      openModal("update-modal");
    });

    $("update-close")?.addEventListener("click", () => closeModal("update-modal"));
    document.querySelectorAll("#confirm-modal .modal-backdrop, #update-modal .modal-backdrop").forEach((el) => {
      el.addEventListener("click", () => {
        closeModal("confirm-modal");
        closeModal("update-modal");
      });
    });

    $("update-prev")?.addEventListener("click", () => setUpdateStep(state.updateStep - 1));
    $("update-next")?.addEventListener("click", () => {
      if (!validateUpdateStep(state.updateStep)) return;
      setUpdateStep(state.updateStep + 1);
    });

    $("after-photo")?.addEventListener("change", (e) => previewPhoto(e.target, "after-preview"));

    $("update-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateUpdateStep(1)) return;
      setLoading(true, "Mengirim update...");
      try {
        const form = e.target;
        const findingId = form.findingId.value;
        const compressed = await window.App.compress.compressImage(form.afterPhoto.files[0]);
        await window.App.queries.uploadFindingPhoto(findingId, compressed, "after");
        await window.App.queries.submitProgressUpdate(findingId, {
          resolvedDatetime: new Date(form.resolvedDatetime.value).toISOString(),
        });
        showToast("Update berhasil — status On Progress. Menunggu approval admin.");
        closeModal("update-modal");
        await loadFindings();
        renderDashboard();
      } catch (err) {
        showToast(err.message, true);
      } finally {
        setLoading(false);
      }
    });

    $("monthly-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const file = form.reportFile.files?.[0];
      if (!file) return;
      const month = form.reportMonth.value + "-01";
      setLoading(true, "Mengunggah laporan...");
      try {
        await window.App.queries.uploadMonthlyReport(file, file.name, month, state.profile.full_name);
        showToast("Laporan bulanan berhasil diunggah.");
        form.reset();
        renderMonthlyHistory();
      } catch (err) {
        showToast(err.message, true);
      } finally {
        setLoading(false);
      }
    });

    try {
      const session = await window.App.queries.getSession();
      if (session?.user) {
        await syncProfile();
        await loadOptions();
        await loadFindings();
        showAuth(false);
        showView(state.isAdmin ? "admin-dashboard" : localStorage.getItem("sigap:lastView") || "form");
      }
    } catch {
      showAuth(true);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
