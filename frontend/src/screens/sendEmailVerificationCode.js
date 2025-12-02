const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

// Initialize admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Configure Gmail transporter
let transporter;

function initializeTransporter() {
  if (!transporter) {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      console.error("Gmail credentials not configured");
      throw new Error(
        "Gmail credentials not found. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables."
      );
    }

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });
  }
  return transporter;
}

// Main function to send verification email
exports.sendVerificationEmail = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to send verification email"
      );
    }

    const { email, verificationCode } = data;

    // Validate input
    if (!email || !verificationCode) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email and verification code are required"
      );
    }

    if (verificationCode.length !== 6 || isNaN(verificationCode)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Verification code must be 6 digits"
      );
    }

    try {
      const mailTransporter = initializeTransporter();

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: "A.I.D.E BINAN - Email Verification Code",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
                  font-size: 28px;
                  margin-bottom: 8px;
                  font-weight: 800;
                }
                .header p {
                  font-size: 14px;
                  opacity: 0.9;
                }
                .content {
                  padding: 40px 30px;
                }
                .content h2 {
                  color: #16662f;
                  margin-bottom: 16px;
                  font-size: 20px;
                }
                .content p {
                  color: #666;
                  margin-bottom: 20px;
                  font-size: 14px;
                }
                .code-container {
                  background-color: #f9f9f9;
                  border: 2px solid #2e7d32;
                  border-radius: 8px;
                  padding: 30px;
                  text-align: center;
                  margin: 30px 0;
                }
                .code {
                  font-size: 48px;
                  font-weight: 800;
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
                .security-warning {
                  background-color: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 16px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .security-warning h3 {
                  color: #856404;
                  font-size: 14px;
                  margin-bottom: 8px;
                }
                .security-warning p {
                  color: #856404;
                  font-size: 13px;
                  margin: 0;
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
                .divider {
                  height: 1px;
                  background-color: #eee;
                  margin: 30px 0;
                }
                .button-container {
                  text-align: center;
                  margin: 30px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <!-- Header -->
                <div class="header">
                  <h1>A.I.D.E BINAN</h1>
                  <p>E-Bike Registration & Management System</p>
                </div>

                <!-- Content -->
                <div class="content">
                  <h2>Email Verification Required</h2>
                  <p>Hello,</p>
                  <p>
                    You have initiated a login request to your A.I.D.E BINAN account. 
                    To ensure the security of your account, please verify your email by 
                    entering the code below:
                  </p>

                  <!-- Code Box -->
                  <div class="code-container">
                    <p class="code">${verificationCode}</p>
                    <p class="code-note">This code expires in 10 minutes</p>
                  </div>

                  <p>
                    Enter this code in the verification prompt on your login screen to complete 
                    the authentication process.
                  </p>

                  <!-- Security Warning -->
                  <div class="security-warning">
                    <h3>⚠️ Security Notice</h3>
                    <p>
                      If you did not request this code or did not attempt to log in, 
                      please ignore this email and do not share this code with anyone. 
                      Your account security is our priority.
                    </p>
                  </div>

                  <div class="divider"></div>

                  <p style="margin-top: 30px;">
                    <strong>Need help?</strong><br>
                    If you have any questions or encounter any issues, please contact our support team 
                    or reply to this email.
                  </p>
                </div>

                <!-- Footer -->
                <div class="footer">
                  <p>&copy; 2024-2025 A.I.D.E BINAN. All rights reserved.</p>
                  <p>Binan City Tricycle Franchising And Regulatory Board</p>
                  <p><em>This is an automated email. Please do not reply directly to this message.</em></p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

      // Send the email
      const info = await mailTransporter.sendMail(mailOptions);

      console.log(`Verification email sent to ${email}`);
      console.log(`Message ID: ${info.messageId}`);

      return {
        success: true,
        message: "Verification email sent successfully",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error sending verification email:", error);

      // Return more detailed error messages
      if (error.message.includes("Invalid login")) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Gmail authentication failed. Please check your Gmail credentials."
        );
      } else if (error.message.includes("ECONNREFUSED")) {
        throw new functions.https.HttpsError(
          "unavailable",
          "Email service is temporarily unavailable. Please try again later."
        );
      } else {
        throw new functions.https.HttpsError(
          "internal",
          "Failed to send verification email. Please try again."
        );
      }
    }
  });

// Optional: Function to test Gmail configuration
exports.testGmailConfig = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    // Only allow admins to test configuration
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    try {
      const mailTransporter = initializeTransporter();

      // Verify connection with test message
      await mailTransporter.verify();

      return {
        success: true,
        message: "Gmail configuration is valid",
        email: process.env.GMAIL_USER,
      };
    } catch (error) {
      console.error("Gmail configuration error:", error);
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Gmail configuration error: ${error.message}`
      );
    }
  });

// Optional: Cleanup function to remove expired codes every 10 minutes
exports.cleanupExpiredCodes = functions
  .region("asia-southeast1")
  .pubsub.schedule("every 10 minutes")
  .onRun(async (context) => {
    try {
      const db = admin.firestore();
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      // Find documents with expired verification codes
      const snapshot = await db
        .collection("users")
        .where("emailVerificationCodeSentAt", "<", tenMinutesAgo)
        .get();

      let deletedCount = 0;
      const batch = db.batch();

      snapshot.forEach((doc) => {
        // Clear expired codes
        batch.update(doc.ref, {
          emailVerificationCode: null,
          emailVerificationCodeSentAt: null,
        });
        deletedCount++;
      });

      if (deletedCount > 0) {
        await batch.commit();
        console.log(`Cleaned up ${deletedCount} expired verification codes`);
      }

      return null;
    } catch (error) {
      console.error("Error cleaning up expired codes:", error);
      return null;
    }
  });

// Optional: Log Cloud Function configurations on startup
exports.initializeConfig = functions
  .region("asia-southeast1")
  .https.onRequest(async (req, res) => {
    try {
      const config = {
        gmailConfigured: !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD,
        region: "asia-southeast1",
        functions: ["sendVerificationEmail", "cleanupExpiredCodes", "testGmailConfig"],
      };

      res.status(200).json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });