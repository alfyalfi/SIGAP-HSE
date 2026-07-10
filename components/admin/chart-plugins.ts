import type { Chart, Plugin } from "chart.js";

function getArcCenter(arc: { x: number; y: number; startAngle: number; endAngle: number; innerRadius: number; outerRadius: number }) {
  const angle = (arc.startAngle + arc.endAngle) / 2;
  const radius = arc.innerRadius + (arc.outerRadius - arc.innerRadius) * 0.58;
  return {
    x: arc.x + Math.cos(angle) * radius,
    y: arc.y + Math.sin(angle) * radius,
  };
}

export const piePercentLabelsPlugin: Plugin = {
  id: "piePercentLabels",
  afterDatasetsDraw(chart: Chart) {
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    if (!dataset || !meta || meta.type !== "doughnut" && meta.type !== "pie") return;

    const values = (dataset.data || []).map((value) => Number(value) || 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    if (!total) return;

    const { ctx } = chart;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 6;

    meta.data.forEach((arc, index) => {
      const value = values[index];
      if (!value) return;

      const percent = Math.round((value / total) * 100);
      const label = `${percent}%`;
      const fontSize = percent >= 10 ? 13 : 12;
      ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
      const props = arc.getProps(["x", "y", "startAngle", "endAngle", "innerRadius", "outerRadius"], true) as unknown as {
        x: number;
        y: number;
        startAngle: number;
        endAngle: number;
        innerRadius: number;
        outerRadius: number;
      };
      const { x, y } = getArcCenter(props);
      ctx.fillText(label, x, y);
    });

    ctx.restore();
  },
};
