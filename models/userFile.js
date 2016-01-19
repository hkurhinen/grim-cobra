var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var userFileSchema = new Schema({
  data: Buffer,
  contentType: String
});

module.exports = mongoose.model('UserFile', userFileSchema);