import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // In a real app, these would come from ConfigService
        // For now, we'll try to use environment variables directly or fallback to Ethereal for dev
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || 'ethereal_user',
                pass: process.env.SMTP_PASS || 'ethereal_pass',
            },
        });
    }

    async sendPasswordReset(email: string, token: string) {
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

        await this.transporter.sendMail({
            from: '"TechFinder Team" <noreply@techfinder.com>',
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset</h1>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>If you didn't request this, please ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
            `,
        });

        console.log(`Password reset email sent to ${email}`);
    }

    async sendNewMessageNotification(toEmail: string, senderName: string, productTitle: string, messageContent: string) {
        await this.transporter.sendMail({
            from: '"TechFinder Team" <noreply@techfinder.com>',
            to: toEmail,
            subject: `New message regarding ${productTitle}`,
            html: `
                <h2>New Message from ${senderName}</h2>
                <p><strong>Product:</strong> ${productTitle}</p>
                <p>${messageContent}</p>
                <hr />
                <p>Log in to TechFinder to reply.</p>
            `,
        });

        console.log(`Notification email sent to ${toEmail}`);
    }
}
