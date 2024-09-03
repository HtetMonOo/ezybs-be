const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const busStopSchema = new Schema(
  {
    id: {
      type: Number,
      required: true,
    },
    lat: {
      type: String,
      required: true,
    },
    lng: {
      type: String,
      required: true,
    },
    name_en: {
      type: String,
      required: true,
    },
    name_mm: {
      type: String,
      required: true,
    },
    road_en: {
      type: String,
      required: true,
    },
    road_mm: {
      type: String,
      required: true,
    },
    township_en: {
      type: String,
      required: true,
    },
    township_mm: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const BusStop = mongoose.model('BusStop', busStopSchema);

module.exports = BusStop;
