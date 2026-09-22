const mongoose = require('mongoose');

const { Schema } = mongoose;

const tripSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    snapshot: {
      locations: { type: [Schema.Types.Mixed], default: [] },
      totalDistanceKm: { type: Number, default: 0 },
      mode: { type: String, default: 'roundtrip' },
      matrix: { type: [[Number]], default: [] },
      durationMatrix: { type: [[Number]], default: [] },
      estimatedMatrix: { type: [[Boolean]], default: [] },
      routeGeometry: { type: [Schema.Types.Mixed], default: [] },
      itinerary: { type: [Schema.Types.Mixed], default: undefined },
      settings: { type: Schema.Types.Mixed, default: {} },
    },
    // Unset (not null) when sharing is off so the sparse unique index skips it.
    shareToken: { type: String, unique: true, sparse: true },
    isShared: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Trip', tripSchema);
