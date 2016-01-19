var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var serverSchema = new Schema({
  host: String,
  user: Schema.Types.ObjectId,
  port: Number,
  nick: String,
  channels: [String]
});

module.exports = mongoose.model('Server', serverSchema);