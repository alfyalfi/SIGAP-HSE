// Setup Chart.js — dipanggil dari Analytic Mode & Presentation Mode.
// Membutuhkan CDN Chart.js sudah dimuat sebelum file ini.

window.App = window.App || {};

(function () {
  const instances = {};

  function destroyChart(canvasId) {
    if (instances[canvasId]) {
      instances[canvasId].destroy();
      delete instances[canvasId];
    }
  }

  function createCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    destroyChart(canvasId);
    return canvas.getContext("2d");
  }

  window.App.charts = {
    renderTrendChart(canvasId, labels, newData, closedData) {
      const ctx = createCanvas(canvasId);
      if (!ctx) return null;

      const orange = this.getThemeColor("--accent-orange");
      const blue = this.getThemeColor("--accent-blue");
      const faint = this.getThemeColor("--text-faint");
      const border = this.getThemeColor("--border");

      instances[canvasId] = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Temuan Baru",
              data: newData,
              borderColor: orange,
              backgroundColor: orange,
              borderWidth: 2,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 4,
            },
            {
              label: "Diselesaikan",
              data: closedData,
              borderColor: blue,
              backgroundColor: blue,
              borderWidth: 2,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              align: "start",
              labels: {
                usePointStyle: true,
                boxWidth: 8,
                color: this.getThemeColor("--text-secondary"),
                font: { family: "Inter", size: 12, weight: "600" },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: faint, font: { family: "Inter", size: 11 } },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0,
                color: faint,
                font: { family: "Inter", size: 11 },
              },
              border: { display: false },
              grid: { color: border, drawTicks: false },
            },
          },
        },
      });

      return instances[canvasId];
    },

    renderCategoryDonut(canvasId, categoryData) {
      const ctx = createCanvas(canvasId);
      if (!ctx) return null;

      const palette = [
        this.getThemeColor("--accent-primary"),
        this.getThemeColor("--accent-orange"),
        this.getThemeColor("--accent-blue"),
        this.getThemeColor("--accent-green"),
        this.getThemeColor("--accent-red"),
        this.getThemeColor("--accent-yellow"),
      ];

      instances[canvasId] = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: categoryData.map((item) => item.label),
          datasets: [
            {
              data: categoryData.map((item) => item.value),
              backgroundColor: categoryData.map((_, index) => palette[index % palette.length]),
              borderWidth: 0,
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "72%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                usePointStyle: true,
                boxWidth: 8,
                padding: 16,
                color: this.getThemeColor("--text-secondary"),
                font: { family: "Inter", size: 12, weight: "600" },
              },
            },
          },
        },
      });

      return instances[canvasId];
    },

    destroyAll() {
      Object.keys(instances).forEach(destroyChart);
    },

    getThemeColor(varName) {
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    },
  };
})();
