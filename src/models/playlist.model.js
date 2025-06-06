const mongoose = require('mongoose');
const mongooseAgregatePaginate = require('mongoose-aggregate-paginate-v2');

const playListSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 20
    },
    description: {
      type: String,
      maxlength: 100
    },
    coverImage:{
      type:String,
      default:''
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song'
      }
    ]
  },
  { timestamps: true }
);

playListSchema.plugin(mongooseAgregatePaginate);

module.exports = mongoose.model('Playlist', playListSchema);
