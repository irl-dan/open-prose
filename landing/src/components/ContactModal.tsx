"use client";

import { useState, useEffect, useRef } from "react";
import analytics from "@/lib/analytics";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormState = "idle" | "submitting" | "success" | "error";

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFormState("idle");
        setErrorMessage("");
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("submitting");
    setErrorMessage("");

    analytics.track("inquiry_submit", { hasCompany: !!company });

    try {
      const response = await fetch("https://api.prose.md/v1/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          message: message.trim(),
          source: "landing",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }

      setFormState("success");
      analytics.track("inquiry_success", {});

      // Reset form after success
      setTimeout(() => {
        setName("");
        setEmail("");
        setCompany("");
        setMessage("");
      }, 500);
    } catch (error) {
      setFormState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
      analytics.track("inquiry_error", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`contact-modal-backdrop ${isOpen ? "open" : ""}`}
        onClick={handleBackdropClick}
        aria-hidden={!isOpen}
      >
        {/* Modal */}
        <div
          ref={modalRef}
          className={`contact-modal ${isOpen ? "open" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="contact-modal-close"
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
          <div className="contact-modal-header">
            <div className="contact-modal-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 8L12 13L3 8M21 8V16C21 17.1046 20.1046 18 19 18H5C3.89543 18 3 17.1046 3 16V8M21 8L12 3L3 8" />
              </svg>
            </div>
            <h2 id="contact-modal-title" className="contact-modal-title">
              Let&apos;s talk
            </h2>
            <p className="contact-modal-subtitle">
              Tell me about your project or idea.
              <br />
              I&apos;ll get back to you within 24 hours.
            </p>
          </div>

          {/* Form */}
          {formState === "success" ? (
            <div className="contact-modal-success">
              <div className="success-icon">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="24" cy="24" r="20" />
                  <path d="M16 24l6 6 12-12" />
                </svg>
              </div>
              <h3>Message sent</h3>
              <p>Thank you for reaching out. I&apos;ll be in touch soon.</p>
              <button onClick={onClose} className="btn-secondary mt-6">
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-modal-form">
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="contact-name">Name *</label>
                  <input
                    ref={firstInputRef}
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    disabled={formState === "submitting"}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="contact-email">Email *</label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    disabled={formState === "submitting"}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="contact-company">
                  Company <span className="optional">(optional)</span>
                </label>
                <input
                  id="contact-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your company"
                  disabled={formState === "submitting"}
                />
              </div>

              <div className="form-field">
                <label htmlFor="contact-message">Message *</label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  placeholder="Tell me about your project, timeline, and what you're looking for..."
                  rows={5}
                  disabled={formState === "submitting"}
                />
              </div>

              {formState === "error" && (
                <div className="form-error">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm-.75 4.5h1.5v4h-1.5v-4zm0 5.5h1.5v1.5h-1.5V10z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="contact-submit-btn"
                disabled={formState === "submitting"}
              >
                {formState === "submitting" ? (
                  <>
                    <span className="spinner" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send message
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M2 8h12M10 4l4 4-4 4" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Backdrop */
        .contact-modal-backdrop {
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

        .contact-modal-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }

        /* Modal */
        .contact-modal {
          position: relative;
          width: 100%;
          max-width: 520px;
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

        .contact-modal-backdrop.open .contact-modal {
          transform: translateY(0) scale(1);
          opacity: 1;
        }

        /* Mobile: full screen */
        @media (max-width: 640px) {
          .contact-modal-backdrop {
            padding: 0;
            align-items: flex-end;
          }

          .contact-modal {
            max-width: 100%;
            max-height: 95vh;
            border-radius: 20px 20px 0 0;
            transform: translateY(100%);
          }

          .contact-modal-backdrop.open .contact-modal {
            transform: translateY(0);
          }
        }

        /* Close button */
        .contact-modal-close {
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
        }

        .contact-modal-close:hover {
          background: var(--paper-warm);
          color: var(--ink-dark);
        }

        /* Header */
        .contact-modal-header {
          padding: 2.5rem 2rem 1.5rem;
          text-align: center;
          border-bottom: 1px solid var(--paper-aged);
        }

        .contact-modal-icon {
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

        .contact-modal-title {
          font-family: var(--font-prose);
          font-size: 1.75rem;
          font-weight: 400;
          color: var(--ink-dark);
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }

        .contact-modal-subtitle {
          font-size: 0.95rem;
          color: var(--ink-light);
          margin: 0;
          line-height: 1.5;
        }

        /* Form */
        .contact-modal-form {
          padding: 1.5rem 2rem 2rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 480px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-field {
          margin-bottom: 1.25rem;
        }

        .form-field label {
          display: block;
          font-family: var(--font-code);
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--ink-medium);
          margin-bottom: 0.5rem;
        }

        .form-field label .optional {
          text-transform: none;
          font-weight: 400;
          color: var(--ink-light);
        }

        .form-field input,
        .form-field textarea {
          width: 100%;
          padding: 0.875rem 1rem;
          font-family: var(--font-code);
          font-size: 0.95rem;
          color: var(--ink-dark);
          background: var(--paper-warm);
          border: 1px solid var(--paper-aged);
          border-radius: 6px;
          outline: none;
          transition: all 0.2s ease;
        }

        .form-field input::placeholder,
        .form-field textarea::placeholder {
          color: var(--ink-faded);
        }

        .form-field input:focus,
        .form-field textarea:focus {
          border-color: var(--semantic-gold);
          box-shadow: 0 0 0 3px var(--semantic-gold-bg);
          background: var(--paper-cream);
        }

        .form-field input:disabled,
        .form-field textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .form-field textarea {
          resize: vertical;
          min-height: 120px;
        }

        /* Error message */
        .form-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          background: rgba(185, 28, 28, 0.08);
          border: 1px solid rgba(185, 28, 28, 0.2);
          border-radius: 6px;
          color: var(--ribbon-red);
          font-size: 0.875rem;
        }

        /* Submit button */
        .contact-submit-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          font-family: var(--font-code);
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--paper-cream);
          background: var(--ink-dark);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .contact-submit-btn:hover:not(:disabled) {
          background: var(--ink-medium);
          transform: translateY(-1px);
        }

        .contact-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Spinner */
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Success state */
        .contact-modal-success {
          padding: 3rem 2rem;
          text-align: center;
        }

        .success-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 1.5rem;
          color: var(--semantic-gold);
        }

        .success-icon svg {
          width: 100%;
          height: 100%;
        }

        .contact-modal-success h3 {
          font-family: var(--font-prose);
          font-size: 1.5rem;
          font-weight: 400;
          color: var(--ink-dark);
          margin: 0 0 0.5rem;
        }

        .contact-modal-success p {
          color: var(--ink-medium);
          margin: 0;
        }
      `}</style>
    </>
  );
}
