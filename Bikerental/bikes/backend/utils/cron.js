import Rental from '../models/Rental.js';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';

function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

export const initCronJobs = () => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('⚠️ Cron jobs disabled: SMTP not configured');
    return;
  }

  setInterval(async () => {
    try {
      // Check if MongoDB is connected before running queries
      if (mongoose.connection.readyState !== 1) {
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        console.log('⏳ Skipping cron job: MongoDB not connected');
        return;
      }

      const now = new Date();
      const startRange = new Date(now.getTime() + 59 * 60 * 1000);
      const endRange = new Date(now.getTime() + 61 * 60 * 1000);

      const rentals = await Rental.find({
        status: 'confirmed',
        pickupTime: {
          $gte: startRange,
          $lte: endRange
        },
        reminderSent: { $ne: true }
      }).populate('userId').populate('bikeId');

      for (const rental of rentals) {
        if (!rental.userId || !rental.bikeId) continue;

        const mailOptions = {
          from: process.env.SMTP_USER,
          to: rental.userId.email,
          subject: 'Ride Reminder: Pickup in 1 Hour!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #F97316;">Pickup Reminder</h2>
              <p>Hi ${rental.userId.name},</p>
              <p>Your ride for <b>${rental.bikeId.name}</b> is scheduled for pickup in approximately 1 hour.</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p><b>Time:</b> ${new Date(rental.pickupTime).toLocaleString()}</p>
                <p><b>Location:</b> ${rental.bikeId.locationId ? 'See dashboard' : 'Main Garage'}</p>
                <p><b>Booking ID:</b> ${rental.bookingId}</p>
              </div>
              <p>Please have your ID ready.</p>
            </div>
          `
        };

        try {
          await transporter.sendMail(mailOptions);
          rental.reminderSent = true;
          await rental.save();
        } catch (err) {
          console.error('Error sending reminder email:', err.message);
        }
      }
    } catch (error) {
      // Only log if it's not a connection error
      if (error.name !== 'MongoServerSelectionError' && error.name !== 'MongoNetworkError') {
        console.error('Cron job error:', error.message);
      }
    }
  }, 60 * 1000);
};
