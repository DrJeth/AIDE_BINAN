const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

// Initialize admin SDK
admin.initializeApp();

// Configure Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// HTTP endpoint for sending verification email
exports.sendVerificationEmail = functions.https.onRequest(
  async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      console.log("Request method:", req.method);
      console.log("Request headers:", req.headers);
      console.log("Request body:", req.body);

      // Extract data from request body
      const { email, verificationCode } = req.body;

      console.log("Extracted email:", email);
      console.log("Extracted verificationCode:", verificationCode);

      // Validate input
      if (!email) {
        console.error("Email is missing");
        return res.status(400).json({
          error: "Email is required",
        });
      }

      if (!verificationCode) {
        console.error("Verification code is missing");
        return res.status(400).json({
          error: "Verification code is required",
        });
      }

      console.log(`Sending email to ${email} with code ${verificationCode}`);

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: "A.I.D.E BINAN - Email Verification Code",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  background-color: #f4f4f4;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: white;
                  border-radius: 8px;
                  overflow: hidden;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .header {
                  background: linear-gradient(135deg, #16662f 0%, #2e7d32 100%);
                  color: white;
                  padding: 40px 20px;
                  text-align: center;
                }
                .header h1 {
                  margin: 0;
                  font-size: 28px;
                }
                .header p {
                  margin: 8px 0 0 0;
                  font-size: 14px;
                  opacity: 0.9;
                }
                .content {
                  padding: 40px 30px;
                }
                .code-box {
                  background-color: #f9f9f9;
                  border: 2px solid #2e7d32;
                  border-radius: 8px;
                  padding: 30px;
                  text-align: center;
                  margin: 30px 0;
                }
                .code {
                  font-size: 48px;
                  font-weight: bold;
                  color: #16662f;
                  letter-spacing: 8px;
                  font-family: 'Courier New', monospace;
                  margin: 0;
                }
                .code-note {
                  color: #999;
                  font-size: 12px;
                  margin-top: 12px;
                }
                .warning {
                  background-color: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 16px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .warning h3 {
                  color: #856404;
                  margin-top: 0;
                  font-size: 14px;
                }
                .warning p {
                  color: #856404;
                  margin: 8px 0 0 0;
                  font-size: 13px;
                }
                .footer {
                  background-color: #f9f9f9;
                  padding: 20px 30px;
                  text-align: center;
                  border-top: 1px solid #eee;
                }
                .footer p {
                  color: #999;
                  font-size: 12px;
                  margin: 4px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>A.I.D.E BINAN</h1>
                  <p>E-Bike Registration & Management System</p>
                </div>

                <div class="content">
                  <h2>Email Verification</h2>
                  <p>Hello,</p>
                  <p>You have requested to log in to your A.I.D.E BINAN account. Please use the verification code below:</p>

                  <div class="code-box">
                    <p class="code">${verificationCode}</p>
                    <p class="code-note">This code expires in 10 minutes</p>
                  </div>

                  <div class="warning">
                    <h3>⚠️ Security Notice</h3>
                    <p>If you did not request this code, please ignore this email and do not share it with anyone.</p>
                  </div>

                  <p>If you have any questions, please contact our support team.</p>
                </div>

                <div class="footer">
                  <p>&copy; 2024-2025 A.I.D.E BINAN. All rights reserved.</p>
                  <p>Binan City Tricycle Franchising And Regulatory Board</p>
                  <p><em>This is an automated email. Please do not reply.</em></p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);

      console.log(`Email sent successfully to ${email}. Message ID: ${info.messageId}`);

      return res.status(200).json({
        success: true,
        message: "Email sent successfully",
        messageId: info.messageId,
      });
    } catch (error) {
      console.error("Error in sendVerificationEmail:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      return res.status(500).json({
        error: error.message || "Failed to send email",
      });
    }
  }
);