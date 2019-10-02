const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReqHistorySchema = new Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        index: false,
        required: true,
        auto: true,
    },
    request: Object,
});

const ReqHistoryModel = mongoose.model('history', ReqHistorySchema);

module.exports = ReqHistoryModel;
