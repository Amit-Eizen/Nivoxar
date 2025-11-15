using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Nivoxar.Services
{
    public interface IEmailService
    {
        Task SendVerificationEmailAsync(string toEmail, string verificationCode);
        Task SendPasswordResetEmailAsync(string toEmail, string resetCode);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendVerificationEmailAsync(string toEmail, string verificationCode)
        {
            try
            {
                // Read from appsettings.json configuration
                var emailFrom = _configuration["Email:From"] ?? "nivoxarteam@gmail.com";
                var emailHost = _configuration["Email:Host"] ?? "smtp.gmail.com";
                var emailPort = int.Parse(_configuration["Email:Port"] ?? "587");
                var emailUsername = _configuration["Email:Username"] ?? "nivoxarteam@gmail.com";
                var emailPassword = _configuration["Email:Password"]
                    ?? throw new Exception("Email:Password not configured in appsettings.json");

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress("Nivoxar Team", emailFrom));
                message.To.Add(new MailboxAddress("", toEmail));
                message.Subject = "Nivoxar - Email Verification Code";

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <!DOCTYPE html>
                        <html lang='en'>
                        <head>
                            <meta charset='UTF-8'>
                            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                            <style>
                                body {{
                                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                    background-color: #f4f4f4;
                                    margin: 0;
                                    padding: 0;
                                }}
                                .container {{
                                    max-width: 600px;
                                    margin: 50px auto;
                                    background-color: #ffffff;
                                    border-radius: 10px;
                                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                                    overflow: hidden;
                                }}
                                .header {{
                                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                    color: white;
                                    text-align: center;
                                    padding: 30px;
                                }}
                                .header h1 {{
                                    margin: 0;
                                    font-size: 32px;
                                }}
                                .content {{
                                    padding: 40px 30px;
                                    text-align: center;
                                }}
                                .code-box {{
                                    background-color: #f8f9fa;
                                    border: 2px dashed #667eea;
                                    border-radius: 8px;
                                    padding: 20px;
                                    margin: 30px 0;
                                }}
                                .verification-code {{
                                    font-size: 36px;
                                    font-weight: bold;
                                    color: #667eea;
                                    letter-spacing: 8px;
                                    font-family: 'Courier New', monospace;
                                }}
                                .message {{
                                    font-size: 16px;
                                    color: #555;
                                    line-height: 1.6;
                                    margin: 20px 0;
                                }}
                                .warning {{
                                    font-size: 14px;
                                    color: #e74c3c;
                                    margin-top: 20px;
                                }}
                                .footer {{
                                    background-color: #f8f9fa;
                                    text-align: center;
                                    padding: 20px;
                                    font-size: 12px;
                                    color: #888;
                                }}
                            </style>
                        </head>
                        <body>
                            <div class='container'>
                                <div class='header'>
                                    <h1>🎯 Nivoxar</h1>
                                </div>
                                <div class='content'>
                                    <h2>Email Verification Code</h2>
                                    <p class='message'>
                                        Hello! Thank you for signing up for Nivoxar.<br>
                                        Enter the following verification code to complete your registration:
                                    </p>
                                    <div class='code-box'>
                                        <div class='verification-code'>{verificationCode}</div>
                                    </div>
                                    <p class='message'>
                                        This code is valid for <strong>10 minutes</strong> only.
                                    </p>
                                    <p class='warning'>
                                        ⚠️ If you didn't request this code, please ignore this email.
                                    </p>
                                </div>
                                <div class='footer'>
                                    <p>© 2025 Nivoxar. All rights reserved.</p>
                                    <p>Smart Task Management System</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    ",
                    TextBody = $@"
                        Nivoxar - Email Verification Code

                        Hello! Thank you for signing up for Nivoxar.

                        Your verification code: {verificationCode}

                        This code is valid for 10 minutes only.

                        If you didn't request this code, please ignore this email.

                        © 2025 Nivoxar
                    "
                };

                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(emailHost, emailPort, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(emailUsername, emailPassword);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation($"✅ Verification email sent to {toEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error sending verification email to {toEmail}: {ex.Message}");
                throw new Exception("Failed to send verification email", ex);
            }
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string resetCode)
        {
            try
            {
                // Read from appsettings.json configuration
                var emailFrom = _configuration["Email:From"] ?? "nivoxarteam@gmail.com";
                var emailHost = _configuration["Email:Host"] ?? "smtp.gmail.com";
                var emailPort = int.Parse(_configuration["Email:Port"] ?? "587");
                var emailUsername = _configuration["Email:Username"] ?? "nivoxarteam@gmail.com";
                var emailPassword = _configuration["Email:Password"]
                    ?? throw new Exception("Email:Password not configured in appsettings.json");

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress("Nivoxar Team", emailFrom));
                message.To.Add(new MailboxAddress("", toEmail));
                message.Subject = "Nivoxar - Password Reset Code";

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <!DOCTYPE html>
                        <html lang='en'>
                        <head>
                            <meta charset='UTF-8'>
                            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                            <style>
                                body {{
                                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                    background-color: #f4f4f4;
                                    margin: 0;
                                    padding: 0;
                                }}
                                .container {{
                                    max-width: 600px;
                                    margin: 50px auto;
                                    background-color: #ffffff;
                                    border-radius: 10px;
                                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                                    overflow: hidden;
                                }}
                                .header {{
                                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                                    color: white;
                                    text-align: center;
                                    padding: 30px;
                                }}
                                .header h1 {{
                                    margin: 0;
                                    font-size: 32px;
                                }}
                                .content {{
                                    padding: 40px 30px;
                                    text-align: center;
                                }}
                                .code-box {{
                                    background-color: #fef2f2;
                                    border: 2px dashed #ef4444;
                                    border-radius: 8px;
                                    padding: 20px;
                                    margin: 30px 0;
                                }}
                                .reset-code {{
                                    font-size: 36px;
                                    font-weight: bold;
                                    color: #ef4444;
                                    letter-spacing: 8px;
                                    font-family: 'Courier New', monospace;
                                }}
                                .message {{
                                    font-size: 16px;
                                    color: #555;
                                    line-height: 1.6;
                                    margin: 20px 0;
                                }}
                                .warning {{
                                    font-size: 14px;
                                    color: #dc2626;
                                    margin-top: 20px;
                                    font-weight: bold;
                                }}
                                .footer {{
                                    background-color: #f8f9fa;
                                    text-align: center;
                                    padding: 20px;
                                    font-size: 12px;
                                    color: #888;
                                }}
                            </style>
                        </head>
                        <body>
                            <div class='container'>
                                <div class='header'>
                                    <h1>🔒 Nivoxar</h1>
                                </div>
                                <div class='content'>
                                    <h2>Password Reset Request</h2>
                                    <p class='message'>
                                        We received a request to reset your password.<br>
                                        Enter the following code to proceed with resetting your password:
                                    </p>
                                    <div class='code-box'>
                                        <div class='reset-code'>{resetCode}</div>
                                    </div>
                                    <p class='message'>
                                        This code is valid for <strong>10 minutes</strong> only.
                                    </p>
                                    <p class='warning'>
                                        ⚠️ If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                                    </p>
                                </div>
                                <div class='footer'>
                                    <p>© 2025 Nivoxar. All rights reserved.</p>
                                    <p>Smart Task Management System</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    ",
                    TextBody = $@"
                        Nivoxar - Password Reset Code

                        We received a request to reset your password.

                        Your password reset code: {resetCode}

                        This code is valid for 10 minutes only.

                        If you didn't request a password reset, please ignore this email.

                        © 2025 Nivoxar
                    "
                };

                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(emailHost, emailPort, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(emailUsername, emailPassword);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation($"✅ Password reset email sent to {toEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Error sending password reset email to {toEmail}: {ex.Message}");
                throw new Exception("Failed to send password reset email", ex);
            }
        }
    }
}
