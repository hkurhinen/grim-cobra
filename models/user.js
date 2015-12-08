var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10;

var serverSchema = new Schema({
     host: String,
     port: Number,
     worker: String,
     channels : [String] 
});

var userSchema = new Schema({
    username: { type: String, required: true, index: { unique: true } },
    password: { type: String, required: true },
    servers: [serverSchema]
});

userSchema.pre('save', function(next) {
    var user = this;

	if (!user.isModified('password')) return next();
	
	bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
	    if (err) return next(err);
	
	    bcrypt.hash(user.password, salt, function(err, hash) {
	        if (err) return next(err);
	        user.password = hash;
	        next();
	    });
	});
});

userSchema.methods.validPassword = function(password, cb) {
    bcrypt.compare(password, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

module.exports = mongoose.model('User', userSchema);
