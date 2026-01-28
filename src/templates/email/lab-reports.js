// Email templates for lab reports
module.exports = {
  lab_report_ready: (data) => ({
    subject: `Lab Report Ready – ${data.reportId || 'N/A'}`,
    html: `
      <html>
        <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:24px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:6px; overflow:hidden;">
                  <tr>
                    <td style="background:#2f80ed; color:#ffffff; padding:20px;">
                      <h2 style="margin:0; font-size:20px;">Lab Report Ready</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px; color:#333333;">
                      <p style="font-size:14px; line-height:1.6;">
                        Your lab report <strong>${data.reportId || 'N/A'}</strong> for SKU
                        <strong>${data.sku || 'N/A'}</strong> is now ready.
                      </p>
                      <p style="font-size:14px; line-height:1.6;">
                        You may access the report through the platform at your convenience.
                      </p>
                      <p style="font-size:14px; margin-top:24px;">
                        Thank you for using our service.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f4f6f8; padding:16px; font-size:12px; color:#777777; text-align:center;">
                      This is an automated notification. Please do not reply.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Lab Report Ready

Your lab report ${data.reportId || 'N/A'} for SKU ${data.sku || 'N/A'} is now ready.

Thank you for using our service.`,
  }),

  lab_report_pending: (data) => ({
    subject: `Lab Report Pending – ${data.reportId || 'N/A'}`,
    html: `
      <html>
        <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:24px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:6px;">
                  <tr>
                    <td style="background:#f2994a; color:#ffffff; padding:20px;">
                      <h2 style="margin:0; font-size:20px;">Lab Report Pending</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px; color:#333333;">
                      <p style="font-size:14px; line-height:1.6;">
                        Your lab report <strong>${data.reportId || 'N/A'}</strong> for SKU
                        <strong>${data.sku || 'N/A'}</strong> is currently under processing.
                      </p>
                      <p style="font-size:14px; line-height:1.6;">
                        You will be notified as soon as the report becomes available.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f4f6f8; padding:16px; font-size:12px; color:#777777; text-align:center;">
                      This is an automated notification.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Lab Report Pending

Your lab report ${data.reportId || 'N/A'} for SKU ${data.sku || 'N/A'} is currently pending.

You will be notified once it is available.`,
  }),

  lab_report_qr_missing: (data) => ({
    subject: `Lab Report QR Missing – SKU ${data.sku || 'N/A'}`,
    html: `
      <html>
        <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:24px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:6px;">
                  <tr>
                    <td style="background:#eb5757; color:#ffffff; padding:20px;">
                      <h2 style="margin:0; font-size:20px;">QR Code Missing</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px; color:#333333;">
                      <p style="font-size:14px; line-height:1.6;">
                        The lab report for SKU <strong>${data.sku || 'N/A'}</strong> does not have an associated QR code.
                      </p>
                      <p style="font-size:14px; line-height:1.6;">
                        Please verify the report details or upload a valid QR code to proceed.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f4f6f8; padding:16px; font-size:12px; color:#777777; text-align:center;">
                      Action required from operations.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Lab Report QR Missing

The lab report for SKU ${data.sku || 'N/A'} does not have an associated QR code.

Please verify the report details or upload a valid QR code.`,
  }),

  unknown_sku_detected: (data) => ({
    subject: `New Unknown SKU Detected – ${data.sku || 'N/A'}`,
    html: `
      <html>
        <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:24px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:6px;">
                  <tr>
                    <td style="background:#6f42c1; color:#ffffff; padding:20px;">
                      <h2 style="margin:0; font-size:20px;">Unknown SKU Detected</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px; color:#333333;">
                      <p style="font-size:14px; line-height:1.6;">
                        A new, unrecognized SKU <strong>${data.sku || 'N/A'}</strong> has been detected in the system.
                      </p>
                      <p style="font-size:14px; line-height:1.6;">
                        Please review and ensure that lab report is available for this SKU.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f4f6f8; padding:16px; font-size:12px; color:#777777; text-align:center;">
                      Operational notification.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `New Unknown SKU Detected

A new, unknown SKU ${data.sku || 'N/A'} has been detected.

Please review and map this SKU to the appropriate product.`,
  }),
};
