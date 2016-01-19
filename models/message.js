var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var messageSchema = new Schema({
  server: Schema.Types.ObjectId,
  sender: String,
  channel: String,
  time: Number,
  text: String
});

module.exports = mongoose.model('Message', messageSchema);