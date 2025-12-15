export declare class MailService {
    private transporter;
    constructor();
    sendPasswordReset(email: string, token: string): Promise<void>;
    sendNewMessageNotification(toEmail: string, senderName: string, productTitle: string, messageContent: string): Promise<void>;
}
