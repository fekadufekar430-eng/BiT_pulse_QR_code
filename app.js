




require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { Resend } = require("resend");

const app = express();

// Initialize Resend with the private API key.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Parse JSON requests sent by the frontend.
app.use(express.json({ limit: "20kb" }));

// Allow form-encoded requests too.
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

// Configure browser access.
// If FRONTEND_ORIGIN is set, allow that origin.
// Otherwise, allow cross-origin requests.
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

// Serve the existing frontend from ../frontend.
const frontendPath = path.join(__dirname, "public");
app.use(express.static(frontendPath));

// Health-check endpoint.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bahir Dar University Feedback API is running."
  });
});

// Receive and process feedback.
app.post("/api/feedback", async (req, res) => {
  try {
    // Read submitted data.
    const { name, email, category, rating, message } = req.body || {};

    // Validate the required name.
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        error: "Your name is required."
      });
    }

    // Validate the required message.
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "A feedback message is required."
      });
    }

    // Remove unnecessary spaces.
    const cleanName = name.trim();
    const cleanMessage = message.trim();
    const cleanCategory =
      typeof category === "string" ? category.trim() : "General";
    const cleanEmail = typeof email === "string" ? email.trim() : "";

    // Enforce server-side length limits.
    if (cleanName.length > 120) {
      return res.status(400).json({
        error: "Name must be 120 characters or fewer."
      });
    }

    if (cleanMessage.length > 1000) {
      return res.status(400).json({
        error: "Message must be 1000 characters or fewer."
      });
    }

    if (cleanCategory.length > 60) {
      return res.status(400).json({
        error: "Feedback category is too long."
      });
    }

    // Validate email only when the user provides one.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      cleanEmail &&
      (cleanEmail.length > 160 || !emailPattern.test(cleanEmail))
    ) {
      return res.status(400).json({
        error: "Please provide a valid email address."
      });
    }

    // Rating is optional; if provided, it must be 1–5.
    let cleanRating = null;

    if (rating !== undefined && rating !== null && rating !== "") {
      const parsedRating = Number(rating);

      if (
        !Number.isInteger(parsedRating) ||
        parsedRating < 1 ||
        parsedRating > 5
      ) {
        return res.status(400).json({
          error: "Rating must be a number from 1 to 5."
        });
      }

      cleanRating = parsedRating;
    }
   

//    this line of code to check the RESEND API key

        //    console.log(
        //      "Resend API key loaded:",
        //      Boolean(process.env.RESEND_API_KEY)
        //    );

    // Verify that Resend has been configured.
    if (!resend) {
      console.error("RESEND_API_KEY is missing.");

      return res.status(500).json({
        error: "The email service is not configured."
      });
    }

    // Verify the email recipient and sender.
    if (!process.env.FEEDBACK_TO || !process.env.FEEDBACK_FROM) {
      console.error("Feedback email settings are missing.");

      return res.status(500).json({
        error: "The feedback email settings are incomplete."
      });
    }

    // Escape user-provided text before inserting it into HTML.
    const escapeHtml = (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const safeName = escapeHtml(cleanName);
    const safeEmail = escapeHtml(cleanEmail || "Not provided");
    const safeCategory = escapeHtml(cleanCategory || "General");

    const safeRating =
      cleanRating === null ? "Not provided" : `${cleanRating}/5`;

    const safeMessage = escapeHtml(cleanMessage).replace(
      /\r?\n/g,
      "<br>"
    );

    // Send the email using Resend.
    const { data, error } = await resend.emails.send({
      from: process.env.FEEDBACK_FROM,
      to: [process.env.FEEDBACK_TO],

      subject: `[Feedback: ${cleanCategory || "General"}] from ${cleanName}`,

      // Enables replying directly to the submitter if they supplied an email.
      replyTo: cleanEmail || undefined,

      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:680px;margin:auto">
          <h2 style="color:#087db8">
            Bahir Dar University — Feedback Desk
          </h2>

          <p>A new feedback submission has been received.</p>
          <hr>

          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Category:</strong> ${safeCategory}</p>
          <p><strong>Experience rating:</strong> ${safeRating}</p>

          <p><strong>Message:</strong></p>

          <div style="padding:14px;background:#f1f6fb;border-radius:8px">
            ${safeMessage}
          </div>
        </div>
      `
    });

    // Handle delivery errors returned by Resend.
    if (error) {
      // Log the actual error returned by Resend.
      console.error("Resend error details:", error);

      const resendMessage =
        error?.message &&
        error.message.includes("You can only send testing emails")
          ? "Resend is in testing mode. Set FEEDBACK_TO to your own verified email, or verify a custom domain and change FEEDBACK_FROM to an address on that domain."
          : "The email service could not deliver your feedback.";

      // Return a safe error message to the frontend.
      return res.status(502).json({
        error: resendMessage
      });
    }


    
    // // Handle errors returned by Resend.
    // if (error) {
    //   console.error("Resend error details:", error);

    //   if (
    //     error.message &&
    //     error.message.includes("You can only send testing emails")
    //   ) {
    //     return res.status(502).json({
    //       error:
    //         "Resend is in testing mode. To send feedback to other recipients, verify a domain in Resend and use a sender address from that domain."
    //     });
    //   }

    //   return res.status(502).json({
    //     error: "The email service could not deliver your feedback."
    //   });
    // }


    // Log the identifier returned by Resend.
    console.log("Resend accepted email:", data?.id || "ID unavailable");

    // Tell the frontend that the request succeeded.
    return res.status(200).json({
      success: true,
      message: "Thank you. Your feedback has been submitted successfully."
    });

  } catch (error) {
    // Log the technical error on the server.
    console.error("Unexpected feedback API error:", error);

    // Return a generic error to the visitor.
    return res.status(500).json({
      error: "An unexpected server error occurred. Please try again later."
    });
  }
});

// Export the Express application for deployment platforms.
module.exports = app;

// Start the local server when running node app.js.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Feedback server running at http://localhost:${PORT}`);
  });
}
