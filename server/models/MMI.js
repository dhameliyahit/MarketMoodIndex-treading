// models/MMI.js
import mongoose from "mongoose";

const mmiSchema = new mongoose.Schema({
    value: { 
        type: Number, 
        required: true,
    },
    status: { 
        type: String, 
        required: true,
        enum: ['up', 'down', 'same']
    },
    updatedAt: { 
        type: Date, 
        default: Date.now,
        index: true 
    },
}, {
    timestamps: true
});

// Create index for better query performance
mmiSchema.index({ updatedAt: -1 });
mmiSchema.index({ value: 1 });

export default mongoose.model("MMI", mmiSchema);