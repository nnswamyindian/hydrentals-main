const nodemailer = require('nodemailer');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOTP(email, otp) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("❌ CRITICAL: SMTP credentials are missing in server/.env! Cannot physically send OTP to", email);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"HydRentals Security" <support@hydrentals.com>`,
      to: email,
      subject: "🔒 Your HydRentals Verification Code",
      text: `Welcome to HydRentals! Your 6-digit verification code is: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
          <h2 style="color: #4F46E5;">Welcome to HydRentals!</h2>
          <p>Thank you for registering. To complete your secure sign up, please enter the following 6-digit verification code:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="letter-spacing: 5px; color: #111827; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #6b7280; font-size: 14px;">If you did not request this code, you can safely ignore this email.</p>
        </div>
      `
    });
    console.log("✅ Live OTP Email successfully sent to:", email, "MessageID:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Failed to send SMTP Email:", error);
    return false;
  }
}

async function sendBrokerReportConfirmation(reporterEmail, reporterName, brokerName, complaintId) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials missing. Cannot send broker report confirmation to', reporterEmail);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"HydRentals Team" <support@hydrentals.com>`,
      to: reporterEmail,
      subject: '✅ Your Broker Report Has Been Received – HydRentals',
      text: `Dear ${reporterName}, your report against broker "${brokerName}" has been received. Our team will verify and take legal action. Once confirmed, you will receive a reward.`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 40px 32px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 12px;">🏠</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">HydRentals</h1>
            <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Keeping Hyderabad Broker-Free</p>
          </div>

          <!-- Body -->
          <div style="padding: 40px 32px;">
            <div style="display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 20px; margin-bottom: 24px;">
              <span style="color: #16a34a; font-weight: 600; font-size: 15px;">✅ Report Submitted Successfully</span>
            </div>

            <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 12px; font-weight: 700;">Thank you, ${reporterName}!</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;"
            >Your report against broker <strong style="color: #1e293b;">${brokerName}</strong> has been successfully received. We truly appreciate your effort in helping keep Hyderabad's rental market transparent and broker-free.</p>

            <!-- What Happens Next -->
            <div style="background: #f8fafc; border-radius: 10px; padding: 24px; margin: 0 0 24px;">
              <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 16px; font-weight: 700;">📋 What happens next?</h3>
              <div style="display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="background: #e0e7ff; color: #4f46e5; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; text-align: center; line-height: 28px;">1</div>
                  <div>
                    <p style="margin: 0; color: #1e293b; font-weight: 600; font-size: 14px;">Report Under Review</p>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Our team will review your report within <strong>48 hours</strong> and verify the details provided.</p>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="background: #fef3c7; color: #d97706; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; text-align: center; line-height: 28px;">2</div>
                  <div>
                    <p style="margin: 0; color: #1e293b; font-weight: 600; font-size: 14px;">Broker Verification</p>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Once we confirm the broker's identity, <strong>legal action will be initiated</strong> and the broker will be removed from the platform.</p>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="background: #d1fae5; color: #059669; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; text-align: center; line-height: 28px;">3</div>
                  <div>
                    <p style="margin: 0; color: #1e293b; font-weight: 600; font-size: 14px;">🎁 You Earn a Reward!</p>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Once the broker is verified and removed, you will be notified and <strong>rewarded with a Community Guardian Badge</strong> — a nationally recognized digital credential for your contribution.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Reference ID -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">Report Reference ID</p>
              <p style="margin: 4px 0 0; color: #1d4ed8; font-weight: 700; font-size: 16px; letter-spacing: 0.5px; font-family: monospace;">#${complaintId.substring(0, 8).toUpperCase()}</p>
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">Your identity remains completely <strong>anonymous and protected</strong>. If you have additional information or evidence, feel free to reply to this email.</p>
          </div>

          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 HydRentals · Hyderabad, Telangana</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 6px 0 0;">support@hydrentals.com · +91 9000207739</p>
          </div>
        </div>
      `
    });
    console.log('✅ Broker report confirmation sent to:', reporterEmail, '| MessageID:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send broker report confirmation email:', error);
    return false;
  }
}

async function sendComplaintStatusUpdate(reporterEmail, reporterName, brokerName, complaintId, status) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials missing. Cannot send status update to', reporterEmail);
    return false;
  }

  let statusText = '';
  let statusColor = '#3b82f6';
  
  if (status === 'investigating') {
    statusText = 'is now under active investigation';
    statusColor = '#3b82f6'; // Blue
  } else if (status === 'resolved') {
    statusText = 'has been resolved and the broker verified/banned';
    statusColor = '#10b981'; // Green
  } else if (status === 'dismissed') {
    statusText = 'has been dismissed due to insufficient evidence';
    statusColor = '#f43f5e'; // Red
  } else {
    statusText = `has updated its status to: ${status}`;
  }

  try {
    const info = await transporter.sendMail({
      from: `"HydRentals Support" <support@hydrentals.com>`,
      to: reporterEmail,
      subject: `🔄 Update on your Broker Report (#${complaintId.substring(0, 8).toUpperCase()})`,
      text: `Dear ${reporterName}, your broker report against ${brokerName} ${statusText}.`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaec; border-radius: 10px; padding: 20px;">
          <h2 style="color: #1e293b;">Report Status Update</h2>
          <p>Dear ${reporterName},</p>
          <p>Your report against broker <strong>${brokerName}</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>.</p>
          <br/>
          <p style="color: #64748b; font-size: 14px;">Report Reference ID: <strong>#${complaintId.substring(0, 8).toUpperCase()}</strong></p>
          <p style="color: #64748b; font-size: 13px;">Thank you for helping keep HydRentals broker-free! If you believe this is an error or have further evidence, please reply to this email.</p>
        </div>
      `
    });
    console.log('✅ Status update email sent to:', reporterEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send status update email:', error);
    return false;
  }
}

async function sendPropertySubmissionEmails(ownerEmail, ownerName, propertyTitle, propertyId, adminEmails) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials missing. Cannot send property submission emails.');
    return false;
  }

  // 1. Mail to Owner
  try {
    const ownerInfo = await transporter.sendMail({
      from: `"HydRentals Team" <support@hydrentals.com>`,
      to: ownerEmail,
      subject: `🏠 Property Listing Submitted Successfully – HydRentals`,
      text: `Dear ${ownerName}, your property listing "${propertyTitle}" has been submitted successfully and is under verification. Reference ID: #${propertyId.substring(0, 8).toUpperCase()}.`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 30px 24px; text-align: center;">
            <img src="cid:logo" alt="HydRentals Logo" style="height: 60px; width: auto; margin-bottom: 8px;" />
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">HydRentals</h1>
            <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">Hyderabad's Premium Rental Platform</p>
          </div>

          <!-- Body -->
          <div style="padding: 40px 32px;">
            <div style="display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 20px; margin-bottom: 24px;">
              <span style="color: #16a34a; font-weight: 600; font-size: 15px;">🎉 Listing Submitted Successfully</span>
            </div>

            <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 12px; font-weight: 700;">Dear ${ownerName},</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
              Your property listing <strong style="color: #1e293b;">"${propertyTitle}"</strong> has been successfully received. 
              Our team is reviewing the listing details to ensure compliance with our anti-broker policy and verify the location.
            </p>

            <!-- Status Box -->
            <div style="background: #f8fafc; border-radius: 10px; padding: 24px; margin: 0 0 24px; border: 1px solid #e2e8f0;">
              <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 16px; font-weight: 700;">📋 What happens next?</h3>
              <div style="display: flex; flex-direction: column; gap: 14px;">
                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
                  <strong>1. Review & Verification:</strong> Admins will audit your listing description, images, and locality parameters within <strong>24 hours</strong>.
                </p>
                <p style="margin: 8px 0 0; color: #475569; font-size: 14px; line-height: 1.6;">
                  <strong>2. Live Status:</strong> Once approved, you will receive an email and in-app notification confirming your listing is live.
                </p>
              </div>
            </div>

            <!-- Reference ID -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">Listing Reference ID</p>
              <p style="margin: 4px 0 0; color: #1d4ed8; font-weight: 700; font-size: 16px; letter-spacing: 0.5px; font-family: monospace;">#${propertyId.substring(0, 8).toUpperCase()}</p>
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
              Thank you for listing your property on HydRentals. If you need to make any changes, please visit your dashboard.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 HydRentals · Hyderabad, Telangana</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 6px 0 0;">support@hydrentals.com · +91 9000207739</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: 'hydrent-logo.png',
        path: path.join(__dirname, '../src/assets/hydrent-logo.png'),
        cid: 'logo'
      }]
    });
    console.log(`✅ Property submission confirmation email sent to owner ${ownerEmail}`);
  } catch (error) {
    console.error('❌ Failed to send property submission confirmation email to owner:', error);
  }

  // 2. Mail to Admins
  if (adminEmails && adminEmails.length > 0) {
    try {
      const adminInfo = await transporter.sendMail({
        from: `"HydRentals System" <system@hydrentals.com>`,
        to: adminEmails.join(','),
        subject: `🔔 New Property Submission Pending Approval – HydRentals`,
        text: `A new property listing "${propertyTitle}" has been submitted by ${ownerName} and requires admin review. Reference ID: #${propertyId.substring(0, 8).toUpperCase()}.`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 30px 24px; text-align: center;">
              <img src="cid:logo" alt="HydRentals Logo" style="height: 60px; width: auto; margin-bottom: 8px;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">HydRentals</h1>
              <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">Admin Security Operations Center</p>
            </div>

            <!-- Body -->
            <div style="padding: 40px 32px;">
              <div style="display: inline-block; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 20px; margin-bottom: 24px;">
                <span style="color: #d97706; font-weight: 600; font-size: 15px;">🔔 Action Required: Verification Pending</span>
              </div>

              <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 12px; font-weight: 700;">Hello Admin,</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
                A new property listing has been submitted for review. Please audit the details to prevent brokers from posting on the platform.
              </p>

              <!-- Property Summary -->
              <div style="background: #f8fafc; border-radius: 10px; padding: 24px; margin: 0 0 24px; border: 1px solid #e2e8f0; font-size: 14px;">
                <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 16px; font-weight: 700;">🏠 Listing Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 130px;"><strong>Property Title:</strong></td>
                    <td style="padding: 6px 0; color: #1e293b;">${propertyTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Owner Name:</strong></td>
                    <td style="padding: 6px 0; color: #1e293b;">${ownerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Owner Email:</strong></td>
                    <td style="padding: 6px 0; color: #1e293b;"><a href="mailto:${ownerEmail}" style="color: #4f46e5; text-decoration: none;">${ownerEmail}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Reference ID:</strong></td>
                    <td style="padding: 6px 0; color: #1e293b; font-family: monospace;">#${propertyId.substring(0, 8).toUpperCase()}</td>
                  </tr>
                </table>
              </div>

              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                Please log into the Admin Control Panel at your earliest convenience to approve or reject this listing.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 HydRentals · Hyderabad, Telangana</p>
            </div>
          </div>
        `,
        attachments: [{
          filename: 'hydrent-logo.png',
          path: path.join(__dirname, '../src/assets/hydrent-logo.png'),
          cid: 'logo'
        }]
      });
      console.log(`✅ Property submission alert email sent to admins: ${adminEmails.join(', ')}`);
    } catch (error) {
      console.error('❌ Failed to send property submission alert email to admins:', error);
    }
  }
}

async function sendPropertyApprovalPaymentEmail(ownerEmail, ownerName, propertyTitle, paymentLink) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials missing. Cannot send property approval payment email.');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"HydRentals Team" <support@hydrentals.com>`,
      to: ownerEmail,
      subject: `Property Approved - Complete Listing Fee Payment`,
      text: `Dear ${ownerName},\n\nYour property "${propertyTitle}" has been approved.\n\nTo activate and publish your property on HYD Rentals, please complete the listing fee payment of ₹500.\n\nPayment Link: ${paymentLink}\n\nOnce payment is completed your property will automatically go live.\n\nRegards,\nHYD Rentals Team`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 30px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">HydRentals</h1>
            <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">Hyderabad's Premium Rental Platform</p>
          </div>
          <div style="padding: 40px 32px;">
            <div style="display: inline-block; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 20px; margin-bottom: 24px;">
              <span style="color: #1e40af; font-weight: 600; font-size: 15px;">🏠 Listing Approved - Payment Pending</span>
            </div>
            <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 12px; font-weight: 700;">Dear ${ownerName},</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
              Great news! Your property listing <strong>"${propertyTitle}"</strong> has been approved by our administrators.
            </p>
            <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
              To activate and publish your listing on the public platform, please complete the property listing fee payment of <strong>₹500</strong>.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentLink}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                Pay ₹500 Listing Fee Now
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
              If the button doesn't work, you can copy and paste the following link into your browser:<br/>
              <a href="${paymentLink}" style="color: #4f46e5; word-break: break-all;">${paymentLink}</a>
            </p>
            <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 24px 0 0;">
              Once payment is completed, your property will automatically go live in search results.
            </p>
          </div>
          <div style="background: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 HydRentals · Hyderabad, Telangana</p>
          </div>
        </div>
      `
    });
    console.log(`✅ Property approval payment email sent to: ${ownerEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send property approval payment email:', error);
    return false;
  }
}

async function sendPropertyActivationSuccessEmail(ownerEmail, ownerName, propertyTitle) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials missing. Cannot send property activation success email.');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"HydRentals Team" <support@hydrentals.com>`,
      to: ownerEmail,
      subject: `Property Activated Successfully`,
      text: `Dear ${ownerName},\n\nYour payment has been received.\n\nYour property "${propertyTitle}" is now live on HYD Rentals.\n\nThank you for listing with us.\n\nRegards,\nHYD Rentals Team`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 30px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">HydRentals</h1>
            <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">Hyderabad's Premium Rental Platform</p>
          </div>
          <div style="padding: 40px 32px;">
            <div style="display: inline-block; background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 20px; margin-bottom: 24px;">
              <span style="color: #065f46; font-weight: 600; font-size: 15px;">🚀 Property Listing Live</span>
            </div>
            <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 12px; font-weight: 700;">Dear ${ownerName},</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
              Your listing fee payment of ₹500 has been verified successfully.
            </p>
            <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
              Your property listing <strong>"${propertyTitle}"</strong> is now active and live on HydRentals! It can now be searched and viewed by potential tenants.
            </p>
            <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
              Thank you for listing with us and keeping HydRentals a broker-free community.
            </p>
          </div>
          <div style="background: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 HydRentals · Hyderabad, Telangana</p>
          </div>
        </div>
      `
    });
    console.log(`✅ Property activation success email sent to: ${ownerEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send property activation success email:', error);
    return false;
  }
}

module.exports = { sendOTP, sendBrokerReportConfirmation, sendComplaintStatusUpdate, sendPropertySubmissionEmails, sendPropertyApprovalPaymentEmail, sendPropertyActivationSuccessEmail };

