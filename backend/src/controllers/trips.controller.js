const crypto = require('crypto');
const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const User = require('../models/User');
const { sanitizeSnapshot, SnapshotError } = require('../utils/tripSnapshot');
const { CLIENT_ORIGIN } = require('../config/env');

const LIST_FIELDS = 'title isShared shareToken updatedAt createdAt snapshot.totalDistanceKm snapshot.locations.name';

const shareUrl = (token) => `${CLIENT_ORIGIN.replace(/\/$/, '')}/shared/${token}`;
const notFound = (res) => res.status(404).json({ error: 'Trip not found.' });

const summary = (t) => ({
  id: String(t._id),
  title: t.title,
  stops: t.snapshot?.locations?.length ?? 0,
  totalDistanceKm: t.snapshot?.totalDistanceKm ?? 0,
  isShared: t.isShared,
  shareToken: t.isShared ? t.shareToken : null,
  updatedAt: t.updatedAt,
});

const full = (t) => ({
  ...summary(t),
  snapshot: t.snapshot,
});

function parseTitle(raw) {
  const title = String(raw ?? '').trim();
  return title && title.length <= 120 ? title : null;
}

// Returns the owned trip, or null (also for malformed ids / other owners).
function findOwned(req, projection) {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  return Trip.findOne({ _id: req.params.id, owner: req.userId }, projection);
}

exports.create = async (req, res) => {
  const title = parseTitle(req.body?.title);
  if (!title) return res.status(400).json({ error: 'Title is required (max 120 characters).' });

  let snapshot;
  try {
    snapshot = sanitizeSnapshot(req.body?.snapshot);
  } catch (err) {
    if (err instanceof SnapshotError) return res.status(400).json({ error: err.message });
    throw err;
  }

  const trip = await Trip.create({ owner: req.userId, title, snapshot });
  res.status(201).json(full(trip));
};

exports.list = async (req, res) => {
  const trips = await Trip.find({ owner: req.userId }, LIST_FIELDS).sort({ updatedAt: -1 }).limit(200);
  res.json({ trips: trips.map(summary) });
};

exports.get = async (req, res) => {
  const trip = await findOwned(req);
  if (!trip) return notFound(res);
  res.json(full(trip));
};

exports.update = async (req, res) => {
  const trip = await findOwned(req);
  if (!trip) return notFound(res);

  if (req.body?.title !== undefined) {
    const title = parseTitle(req.body.title);
    if (!title) return res.status(400).json({ error: 'Title must be 1-120 characters.' });
    trip.title = title;
  }
  if (req.body?.snapshot !== undefined) {
    try {
      trip.snapshot = sanitizeSnapshot(req.body.snapshot);
    } catch (err) {
      if (err instanceof SnapshotError) return res.status(400).json({ error: err.message });
      throw err;
    }
  }
  await trip.save();
  res.json(full(trip));
};

exports.remove = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  const { deletedCount } = await Trip.deleteOne({ _id: req.params.id, owner: req.userId });
  if (!deletedCount) return notFound(res);
  res.status(204).end();
};

exports.enableShare = async (req, res) => {
  const trip = await findOwned(req);
  if (!trip) return notFound(res);

  if (!trip.shareToken) trip.shareToken = crypto.randomBytes(16).toString('base64url');
  trip.isShared = true;
  await trip.save();
  res.json({ shareToken: trip.shareToken, url: shareUrl(trip.shareToken) });
};

exports.revokeShare = async (req, res) => {
  const trip = await findOwned(req);
  if (!trip) return notFound(res);

  trip.shareToken = undefined;
  trip.isShared = false;
  await trip.save();
  res.status(204).end();
};

// Public: no auth. Exposes trip content and owner first name only.
exports.getShared = async (req, res) => {
  const trip = await Trip.findOne({ shareToken: String(req.params.token), isShared: true });
  if (!trip) return notFound(res);

  const owner = await User.findById(trip.owner, 'name');
  res.set('Cache-Control', 'no-store');
  res.json({
    title: trip.title,
    ownerName: owner ? owner.name.split(' ')[0] : null,
    updatedAt: trip.updatedAt,
    snapshot: trip.snapshot,
  });
};
