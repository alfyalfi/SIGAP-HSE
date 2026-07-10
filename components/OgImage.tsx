/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import logo from "@/public/logo.png";
import { COMPANIES, SIGAP_FULL_NAME } from "@/lib/constants";

type OgImageProps = {
  title: string;
  subtitle: string;
  kicker?: string;
  footer?: string;
};

export function OgImage({ title, subtitle, kicker = "SIGAP", footer = SIGAP_FULL_NAME }: OgImageProps) {
  const companyCount = COMPANIES.length;

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 18% 20%, rgba(255, 138, 61, 0.24) 0, rgba(255, 138, 61, 0.08) 18%, rgba(255, 138, 61, 0) 36%), radial-gradient(circle at 82% 18%, rgba(91, 157, 255, 0.22) 0, rgba(91, 157, 255, 0.08) 16%, rgba(91, 157, 255, 0) 34%), linear-gradient(135deg, #0f1218 0%, #14161c 42%, #1c1e26 100%)",
        color: "#f3f5fb",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 28%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 12,
          background:
            "repeating-linear-gradient(135deg, #ff8a3d 0 18px, #11141a 18px 36px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -70,
          bottom: -90,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "rgba(255, 138, 61, 0.12)",
          filter: "blur(10px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 60,
          bottom: 42,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "rgba(91, 157, 255, 0.14)",
          filter: "blur(10px)",
        }}
      />

      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 64,
          gap: 42,
          alignItems: "stretch",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1.15,
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 84,
                height: 84,
                borderRadius: 24,
                background:
                  "linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
                border: "1px solid rgba(255,255,255,0.16)",
                boxShadow: "0 18px 36px rgba(0, 0, 0, 0.24)",
                backdropFilter: "blur(8px)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <img
                src={logo.src}
                alt="SIGAP"
                width={66}
                height={66}
                style={{ display: "block", objectFit: "contain" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  width: "fit-content",
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#e8ecf5",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 0.08,
                }}
              >
                {kicker}
              </div>
              <div
                style={{
                  color: "#9aa3b2",
                  fontSize: 18,
                  fontWeight: 600,
                  letterSpacing: 0.04,
                }}
              >
                {SIGAP_FULL_NAME}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 620 }}>
            <div
              style={{
                fontSize: 68,
                lineHeight: 0.96,
                fontWeight: 800,
                letterSpacing: -2.2,
                color: "#f7f8fc",
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.38,
                color: "#c8cfdb",
                fontWeight: 500,
                maxWidth: 600,
              }}
            >
              {subtitle}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={pillStyle}>PIC submission</div>
            <div style={pillStyle}>Admin review</div>
            <div style={pillStyle}>Approval workflow</div>
            <div style={pillStyle}>{companyCount} perusahaan</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 0.85,
            flexDirection: "column",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              padding: 24,
              borderRadius: 28,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.26)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={eyebrowStyle}>Operational flow</div>
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    lineHeight: 1.05,
                    letterSpacing: -1,
                  }}
                >
                  Rapi, cepat, terukur
                </div>
              </div>
              <div style={badgeStyle}>v1.0</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <StepCard
                index="01"
                title="Submit temuan"
                description="PIC mengirim temuan unsafe act, unsafe condition, atau near miss lewat alur yang sederhana."
              />
              <StepCard
                index="02"
                title="Review admin"
                description="Admin meninjau, memvalidasi, dan mengarahkan tindak lanjut tanpa kehilangan konteks."
              />
              <StepCard
                index="03"
                title="Tutup dengan bukti"
                description="After submission dan approval tersimpan rapi untuk monitoring dan laporan bulanan."
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            <MiniStat label="Companies" value={`${companyCount}`} helper="PIC aktif" />
            <MiniStat label="Flow" value="3" helper="alur utama" />
            <MiniStat label="Control" value="1" helper="dashboard terpadu" />
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          color: "#9aa3b2",
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        <div>{footer}</div>
        <div style={{ fontFamily: "JetBrains Mono, Consolas, monospace", fontSize: 16 }}>
          SIGAP • SHARE READY
        </div>
      </div>
    </div>
  );
}

function StepCard({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: 16,
        borderRadius: 20,
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, rgba(255, 138, 61, 0.9), rgba(251, 191, 36, 0.9))",
          color: "#11141a",
          fontSize: 14,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {index}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f7f8fc" }}>{title}</div>
        <div style={{ fontSize: 16, lineHeight: 1.45, color: "#c6cedb" }}>{description}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div
      style={{
        flex: 1,
        padding: 18,
        borderRadius: 22,
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <div style={{ fontSize: 12, color: "#9aa3b2", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ marginTop: 10, fontSize: 34, lineHeight: 1, fontWeight: 800, color: "#f7f8fc" }}>{value}</div>
      <div style={{ marginTop: 8, fontSize: 15, color: "#c6cedb" }}>{helper}</div>
    </div>
  );
}

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 16px",
  borderRadius: 999,
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  color: "#eef1f6",
  fontSize: 15,
  fontWeight: 700,
};

const eyebrowStyle: CSSProperties = {
  color: "#9aa3b2",
  textTransform: "uppercase",
  letterSpacing: 1.6,
  fontSize: 12,
  fontWeight: 800,
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 36,
  padding: "0 14px",
  borderRadius: 999,
  background: "rgba(255, 138, 61, 0.16)",
  border: "1px solid rgba(255, 138, 61, 0.28)",
  color: "#ffb37a",
  fontSize: 14,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

