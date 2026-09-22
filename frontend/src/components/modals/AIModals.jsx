import React from 'react';
import { Sparkles, Wand2, ArrowLeft, ChevronRight } from 'lucide-react';
import Modal from '../Modal';

export const CATEGORIES = [
  'Mixed', 'Nature', 'Food', 'Tourist', 'Shopping', 'Hidden Gems',
  'Historical', 'Religious', 'Adventure', 'Nightlife', 'Family Friendly',
  'Romantic', 'Luxury', 'Budget', 'Photography Spots', 'Road Trip',
  'Local Favorites', 'Cafes', 'Museums', 'Beaches',
];

const CATEGORY_ICONS = {
  Mixed: '🌐', Nature: '🌿', Food: '🍽️', Tourist: '🗺️', Shopping: '🛍️',
  'Hidden Gems': '💎', Historical: '🏛️', Religious: '🕌', Adventure: '🧗',
  Nightlife: '🌙', 'Family Friendly': '👨‍👩‍👧', Romantic: '💕', Luxury: '✨',
  Budget: '💰', 'Photography Spots': '📸', 'Road Trip': '🚗',
  'Local Favorites': '❤️', Cafes: '☕', Museums: '🖼️', Beaches: '🏖️',
};

const BackLink = ({ onClick, disabled }) => (
  <button type="button" className="btn btn-ghost btn-sm" onClick={onClick} disabled={disabled} style={{ marginLeft: -8, marginBottom: 8 }}>
    <ArrowLeft size={15} /> Back
  </button>
);

export const AIChooserModal = ({ onClose, onAutofill, onNaturalPlan }) => (
  <Modal title="Plan with AI" description="Pick how you want AI to help fill your trip." onClose={onClose}>
    <div className="ai-options">
      <button type="button" className="ai-option" onClick={onAutofill}>
        <span className="ai-option-icon"><Sparkles size={20} /></span>
        <span className="ai-option-text">
          <strong>AI Autofill</strong>
          <small>Find nearby places around your first stop, by category and radius.</small>
        </span>
        <ChevronRight size={18} />
      </button>
      <button type="button" className="ai-option" onClick={onNaturalPlan}>
        <span className="ai-option-icon"><Wand2 size={20} /></span>
        <span className="ai-option-text">
          <strong>Describe your trip</strong>
          <small>Write it in plain words, like “a 3 day foodie weekend in Lisbon”.</small>
        </span>
        <ChevronRight size={18} />
      </button>
    </div>
  </Modal>
);

export const NaturalPlanModal = ({ prompt, setPrompt, loading, error, onGenerate, onClose, onBack }) => (
  <Modal
    title="Describe your trip"
    onClose={onClose}
    busy={loading}
    size="lg"
    actions={(
      <>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <button type="button" className="btn btn-ai" onClick={onGenerate} disabled={loading}>
          {loading ? <span className="spinner" /> : <Wand2 size={16} />}
          {loading ? 'Planning…' : 'Generate plan'}
        </button>
      </>
    )}
  >
    <BackLink onClick={onBack} disabled={loading} />
    <label className="field">
      <span className="field-label">What do you want to do?</span>
      <textarea
        className="input"
        rows={4}
        autoFocus
        value={prompt}
        disabled={loading}
        placeholder="e.g. Best street food and temples in Kyoto over a weekend"
        onChange={(e) => setPrompt(e.target.value)}
      />
    </label>
    {error && <div role="alert" className="alert alert-danger" style={{ marginTop: 12 }}>{error}</div>}
  </Modal>
);

export const AutofillModal = ({
  radius, setRadius, maxStops, setMaxStops, maxAvailable, category, setCategory,
  loading, onGenerate, onClose, onBack,
}) => (
  <Modal
    title="AI Autofill"
    description="We search around your first stop and add the best matches."
    onClose={onClose}
    busy={loading}
    size="lg"
    actions={(
      <>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <button type="button" className="btn btn-ai" onClick={onGenerate} disabled={loading}>
          {loading ? <span className="spinner" /> : <Sparkles size={16} />}
          {loading ? 'Finding places…' : 'Add places'}
        </button>
      </>
    )}
  >
    <BackLink onClick={onBack} disabled={loading} />

    <div className="field" style={{ marginBottom: 18 }}>
      <span className="field-label">Search radius</span>
      <div className="chip-row">
        {[5, 10, 25, 50, 100].map((r) => (
          <button key={r} type="button" className={`chip${radius === r ? ' is-active' : ''}`} onClick={() => setRadius(r)} disabled={loading}>
            {r} km
          </button>
        ))}
      </div>
    </div>

    <div className="field" style={{ marginBottom: 18 }}>
      <span className="field-label">Places to add: <b className="num" style={{ color: 'var(--ai)' }}>{maxStops}</b></span>
      <input
        type="range" min="1" max={Math.max(1, maxAvailable)} value={maxStops} disabled={loading}
        onChange={(e) => setMaxStops(Number(e.target.value))}
        className="range"
      />
    </div>

    <div className="field">
      <span className="field-label">Category</span>
      <div className="chip-row chip-scroll">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className={`chip${category === c ? ' is-active' : ''}`} onClick={() => setCategory(c)} disabled={loading}>
            <span aria-hidden="true">{CATEGORY_ICONS[c]}</span> {c}
          </button>
        ))}
      </div>
    </div>
  </Modal>
);
