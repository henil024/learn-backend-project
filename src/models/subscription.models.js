import mongoose, {Schema} from "mongoose";

const subcriptionSchema = new Schema({
    subscriber:{
        type: Schema.Types.ObjectId, //One who is subscriberibing
        ref: "User"
    },
    chanal: {
        type: Schema.Types.ObjectId, //One to whom is 'subscribers' is subscriberibing
        ref: "User"
    }
},{timestamps: true})

export const Subcription = mongoose.model("subcription",subcriptionSchema)