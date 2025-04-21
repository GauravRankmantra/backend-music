const express = require('express');
const router = express.Router();
const Terms  = require("../../../models/terms.model.js")


router.get("/", async (req, res) => {
    try {
      const policy = await Terms.findOne().sort({ updatedAt: -1 });
      res.status(200).json(policy);
    } catch (error) {
      res.status(500).json({ message: "Error fetching policy." });
    }
  });
  
  // Update or Create policy
  router.post("/", async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || content.length < 100) {
        return res
          .status(400)
          .json({ message: "Content must be at least 100 characters long." });
      }
  
      const existing = await Terms.findOne();
      if (existing) {
        existing.content = content;
        await existing.save();
        return res.status(200).json({ message: "Terms and Conditions updated." });
      } else {
        await Terms.create({ content });
        return res.status(201).json({ message: "Terms and Conditions created." });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error." });
    }
  });


module.exports = router;
