"use client";

import type { ReactNode } from "react";

export type MobileRecordCardField = {
  label: string;
  value: ReactNode;
};

export type MobileRecordCardSection = {
  title?: string;
  fields: MobileRecordCardField[];
};

export type MobileRecordCardProps = {
  title: ReactNode;
  badge?: ReactNode;
  subtitle?: ReactNode;
  sections: MobileRecordCardSection[];
  detailsSections?: MobileRecordCardSection[];
  detailsLabel?: string;
  actions?: ReactNode;
  className?: string;
};

export function MobileRecordCard({
  title,
  badge,
  subtitle,
  sections,
  detailsSections,
  detailsLabel = "Lihat detail lengkap",
  actions,
  className,
}: MobileRecordCardProps) {
  return (
    <article className={`mobile-record-card${className ? ` ${className}` : ""}`}>
      <div className="mobile-record-card-head">
        <div className="mobile-record-card-heading">
          <div className="mobile-record-card-title">{title}</div>
          {subtitle ? <div className="mobile-record-card-subtitle">{subtitle}</div> : null}
        </div>
        {badge ? <div className="mobile-record-card-badge">{badge}</div> : null}
      </div>

      <div className="mobile-record-card-body">
        {sections.map((section, sectionIndex) => (
          <div className="mobile-record-card-section" key={`${section.title || "section"}-${sectionIndex}`}>
            {section.title ? <div className="mobile-record-card-section-title">{section.title}</div> : null}
            {section.fields.map((field) => (
              <div className="mobile-record-field" key={field.label}>
                <span className="mobile-record-field-label">{field.label}</span>
                <span className="mobile-record-field-separator">:</span>
                <span className="mobile-record-field-value">{field.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {detailsSections?.length ? (
        <details className="mobile-record-card-details">
          <summary>{detailsLabel}</summary>
          <div className="mobile-record-card-body mobile-record-card-details-body">
            {detailsSections.map((section, sectionIndex) => (
              <div className="mobile-record-card-section" key={`${section.title || "detail"}-${sectionIndex}`}>
                {section.title ? <div className="mobile-record-card-section-title">{section.title}</div> : null}
                {section.fields.map((field) => (
                  <div className="mobile-record-field" key={field.label}>
                    <span className="mobile-record-field-label">{field.label}</span>
                    <span className="mobile-record-field-separator">:</span>
                    <span className="mobile-record-field-value">{field.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {actions ? <div className="mobile-record-card-actions">{actions}</div> : null}
    </article>
  );
}
