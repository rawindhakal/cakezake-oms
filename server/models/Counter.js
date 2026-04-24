const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  year: { type: Number },
  seq:  { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', CounterSchema);
