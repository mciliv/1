import React, { useState, useEffect, useRef } from 'react';
import { VALIDATION_PATTERNS } from '../utils/config-loader.js';
import { isMobileDevice } from '../utils/device.js';

const QueryMessage = ({ query, loading, failed }) => (
  <div className="chat-msg user">
    <span className="chat-msg-text">{query}</span>
    {loading && <span className="chat-msg-status thinking">Analyzing...</span>}
    {failed && <span className="chat-msg-status failed">Failed</span>}
    {!loading && !failed && <span className="chat-msg-status done">Done</span>}
  </div>
);

const TextInput = ({ value, onChange, onSubmit, isProcessing, error, history }) => {
  const [localError, setLocalError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isMac = navigator.userAgent.toLowerCase().includes('mac');
  const keyboardHint = isMac ? '⌘K' : 'Ctrl+K';

  useEffect(() => {
    if (localError && value) {
      setLocalError('');
    }
  }, [value, localError]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const validateInput = (text) => {
    if (!text || !text.trim()) {
      return 'Enter a thing to structuralize';
    }

    const trimmed = text.trim().toLowerCase();

    if (trimmed.length < 2) {
      return 'Input must be at least 2 characters long';
    }
    if (trimmed.length > 500) {
      return 'Input must be less than 500 characters';
    }

    const invalidPatterns = Object.values(VALIDATION_PATTERNS);

    if (invalidPatterns.some(pattern => pattern.test(trimmed))) {
      return 'Please describe a real, physical object (food, materials, plants, etc.)';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateInput(value);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setIsValidating(true);
    try {
      await onSubmit(value.trim());
      setLocalError('');
    } catch (err) {
      setLocalError(err.message || 'Structuralization failed. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      await handleSubmit();
    }
  };

  const displayError = localError || error;

  return (
    <div className="chat-container">
      {/* Scrollable query history */}
      {history && history.length > 0 && (
        <div className="chat-messages">
          {history.map(col => (
            <QueryMessage
              key={col.id}
              query={col.query}
              loading={col.loading}
              failed={col.failed}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input pinned at bottom */}
      <div className="chat-input-bar">
        <div className="input-row">
          <input
            ref={inputRef}
            id="object-input"
            type="text"
            placeholder="What's in..."
            className={`input-base${displayError ? ' input-error' : ''}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-describedby={displayError ? 'input-error' : undefined}
          />
          {!isMobileDevice() && !value.trim() && (
            <div className="kbd-hint kbd-inside">{keyboardHint}</div>
          )}

          {value.trim() && (
            <button
              id="object-submit"
              className="btn-icon"
              onClick={handleSubmit}
              aria-label="Structuralize"
            >
              →
           </button>
          )}
        </div>

        {displayError && (
          <div id="input-error" className="error-text" role="alert">
            {displayError}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextInput;
