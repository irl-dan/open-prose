"use client";

import { useEffect, useRef } from "react";
import analytics from "@/lib/analytics";

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const donationTiers = [
  {
    name: "Supporter",
    amount: "$20",
    href: "https://buy.stripe.com/9B64gA2OH0bwcu76EM5AQ02",
    highlighted: false,
  },
  {
    name: "Sponsor",
    amount: "$100",
    href: "https://buy.stripe.com/9B66oI1KDaQa1Ptfbi5AQ03",
    highlighted: true,
  },
  {
    name: "Patron",
    amount: "$10k",
    href: "https://buy.stripe.com/5kQcN6exp6zUbq35AI5AQ04",
    highlighted: false,
  },
];

export default function FundingModal({ isOpen, onClose }: FundingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`funding-modal-backdrop ${isOpen ? "open" : ""}`}
        onClick={handleBackdropClick}
        aria-hidden={!isOpen}
      >
        {/* Modal */}
        <div
          ref={modalRef}
          className={`funding-modal ${isOpen ? "open" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="funding-modal-title"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="funding-modal-close"
            aria-label="Close"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="funding-modal-header">
            <div className="funding-modal-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <h2 id="funding-modal-title" className="funding-modal-title">
              Fund the benchmarker
            </h2>
            <p className="funding-modal-subtitle">
              Your support funds the creatine and caffeine budget—and maybe
              some extra hours on benchmarks, tooling, and documentation.
            </p>
          </div>

          {/* Appeal */}
          <div className="funding-appeal">
            <p>
              To date, I&apos;ve built OpenProse independently—no VC funds, no big lab backing.
              I&apos;m a father of four kids under five, working on this because it&apos;s fun.
            </p>
            <p>
              Every contribution helps me keep the lights on and dedicate more time
              to this work.
            </p>
          </div>

          {/* Donation Tiers */}
          <div className="funding-tiers">
            {donationTiers.map((tier) => (
              <a
                key={tier.name}
                href={tier.href}
                onClick={() =>
                  analytics.track("donation_click", {
                    tier: tier.amount,
                    name: tier.name,
                    source: "funding_modal",
                  })
                }
                className={`funding-tier ${tier.highlighted ? "highlighted" : ""}`}
              >
                {tier.highlighted && (
                  <span className="tier-badge">POPULAR</span>
                )}
                <span className="tier-amount">{tier.amount}</span>
                <span className="tier-name">{tier.name}</span>
                <span className="tier-button">Select</span>
              </a>
            ))}
          </div>

          {/* Custom amount link */}
          <div className="funding-custom">
            <a
              href="https://buy.stripe.com/9B67sM60TaQacu77IQ5AQ01"
              onClick={() =>
                analytics.track("donation_click", {
                  tier: "custom",
                  name: "Custom",
                  source: "funding_modal",
                })
              }
            >
              Or choose your own amount
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          {/* Fine print */}
          <div className="funding-fine-print">
            <p>
              Voluntary contribution. No expectation of control, influence, or
              future maintenance.
            </p>
            <p className="patron-note">
              Patrons, DM me on{" "}
              <a
                href="https://twitter.com/irl_dan"
                target="_blank"
                rel="noopener noreferrer"
              >
                twitter
              </a>{" "}
              so I can say thanks.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Backdrop */
        .funding-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(28, 25, 23, 0.6);
          backdrop-filter: blur(8px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .funding-modal-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }

        /* Modal */
        .funding-modal {
          position: relative;
          width: 100%;
          max-width: 480px;
          max-height: calc(100vh - 2rem);
          overflow-y: auto;
          background: var(--paper-cream);
          border-radius: 12px;
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(0, 0, 0, 0.05);
          transform: translateY(20px) scale(0.98);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .funding-modal-backdrop.open .funding-modal {
          transform: translateY(0) scale(1);
          opacity: 1;
        }

        /* Mobile: full screen */
        @media (max-width: 640px) {
          .funding-modal-backdrop {
            padding: 0;
            align-items: stretch;
          }

          .funding-modal {
            max-width: 100%;
            max-height: 100vh;
            height: 100vh;
            border-radius: 0;
            transform: translateY(100%);
          }

          .funding-modal-backdrop.open .funding-modal {
            transform: translateY(0);
          }
        }

        /* Close button */
        .funding-modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--ink-light);
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .funding-modal-close:hover {
          background: var(--paper-warm);
          color: var(--ink-dark);
        }

        /* Header */
        .funding-modal-header {
          padding: 2.5rem 2rem 1.5rem;
          text-align: center;
          border-bottom: 1px solid var(--paper-aged);
        }

        .funding-modal-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--semantic-gold-bg);
          color: var(--semantic-gold);
          border-radius: 12px;
        }

        .funding-modal-title {
          font-family: var(--font-prose);
          font-size: 1.75rem;
          font-weight: 400;
          color: var(--ink-dark);
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }

        .funding-modal-subtitle {
          font-size: 0.95rem;
          color: var(--ink-medium);
          margin: 0;
          line-height: 1.5;
        }

        /* Appeal */
        .funding-appeal {
          padding: 1.5rem 2rem;
          background: var(--paper-warm);
          border-bottom: 1px solid var(--paper-aged);
        }

        .funding-appeal p {
          font-size: 0.9rem;
          color: var(--ink-medium);
          line-height: 1.6;
          margin: 0 0 0.75rem;
        }

        .funding-appeal p:last-child {
          margin-bottom: 0;
        }

        /* Tiers */
        .funding-tiers {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          padding: 1.5rem 2rem;
        }

        @media (max-width: 480px) {
          .funding-tiers {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
        }

        .funding-tier {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.25rem 1rem;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.2s ease;
          background: var(--paper-warm);
          border: 1px solid var(--paper-aged);
        }

        .funding-tier:hover {
          border-color: var(--ink-light);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .funding-tier.highlighted {
          background: var(--paper-cream);
          border: 2px solid var(--semantic-gold);
          box-shadow: 0 0 0 4px var(--semantic-gold-bg);
        }

        @media (max-width: 480px) {
          .funding-tier {
            flex-direction: row;
            justify-content: space-between;
            padding: 1rem 1.25rem;
          }
        }

        .tier-badge {
          position: absolute;
          top: -0.5rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.25rem 0.5rem;
          background: var(--semantic-gold);
          color: white;
          font-family: var(--font-code);
          font-size: 0.6rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 4px;
          white-space: nowrap;
        }

        @media (max-width: 480px) {
          .tier-badge {
            position: static;
            transform: none;
            order: 3;
          }
        }

        .tier-amount {
          font-size: 1.5rem;
          font-weight: 300;
          color: var(--ink-dark);
          letter-spacing: -0.02em;
        }

        .funding-tier.highlighted .tier-amount {
          color: var(--semantic-gold);
        }

        .tier-name {
          font-family: var(--font-code);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--ink-light);
          margin-top: 0.25rem;
        }

        @media (max-width: 480px) {
          .tier-name {
            margin-top: 0;
            order: 1;
          }
        }

        .tier-button {
          display: none;
        }

        @media (max-width: 480px) {
          .tier-button {
            display: block;
            font-family: var(--font-code);
            font-size: 0.75rem;
            color: var(--ink-medium);
            order: 2;
          }

          .funding-tier.highlighted .tier-button {
            color: var(--semantic-gold);
          }
        }

        /* Custom amount */
        .funding-custom {
          padding: 0 2rem 2rem;
          text-align: center;
        }

        .funding-custom a {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-code);
          font-size: 0.85rem;
          color: var(--ink-light);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .funding-custom a:hover {
          color: var(--ink-dark);
        }

        /* Fine print */
        .funding-fine-print {
          padding: 0 2rem 1.5rem;
          text-align: center;
        }

        .funding-fine-print p {
          font-size: 0.7rem;
          color: var(--ink-light);
          margin: 0 0 0.5rem;
          line-height: 1.4;
        }

        .funding-fine-print .patron-note {
          margin-top: 0.75rem;
          font-style: italic;
        }

        .funding-fine-print a {
          color: var(--ink-medium);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .funding-fine-print a:hover {
          color: var(--ink-dark);
        }
      `}</style>
    </>
  );
}
