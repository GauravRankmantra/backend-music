const mongoose = require('mongoose');


const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      require: true
    },
    album:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Album'
    }
  },
  { timestamps: true }
);

module.exports=mongoose.model('Comment',commentSchema)
