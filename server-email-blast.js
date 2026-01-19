require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));

app.post('/send-blast', upload.fields([
  { name: 'csv' }, { name: 'logo' }, { name: 'product' }
]), async (req, res) => {
  try {
    const emails = [];
    const csvFilePath = req.files['csv'][0].path;

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', row => {
          const email = row[Object.keys(row)[0]];
          const receiveMarketing = row[Object.keys(row)[1]];
          if (email && receiveMarketing === '1' && email.includes('@')) {
            emails.push(email.trim());
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (!emails.length) return res.send('No valid emails found.');

    const messageText = req.body.message || '';
    const logoPath = req.files['logo'][0].path;
    const productPath = req.files['product'][0].path;
    const productLink = req.body.productLink || null;

    const productFilename = path.basename(productPath);
    const productImageUrl = `${req.protocol}://${req.get('host')}/uploads/${productFilename}`;

    const productImageHtml = productLink
      ? `<a href="${productLink}" target="_blank"><img src="${productImageUrl}" style="max-width:100%;margin-top:10px;" /></a>`
      : `<img src="${productImageUrl}" style="max-width:100%;margin-top:10px;" />`;

  const html = `
<div style="text-align:center;max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">

  <p>
    <a href="https://hatteras-island.com/apparel/">APPAREL</a> |
    <a href="https://hatteras-island.com/rods/">RODS</a> |
    <a href="https://hatteras-island.com/reels/">REELS</a> |
    <a href="https://hatteras-island.com/tools/">TOOLS</a> |
    <a href="https://hatteras-island.com/gear/">GEAR</a>
  </p>

  <img src="cid:logo" style="max-width:200px;" />

  <h2 style="color:#0078a0;">Fresh Bait Alert!</h2>

  <p>${messageText}</p>

  ${productImageHtml}

  <p>
    <a href="https://hatteras-island.com/apparel/">APPAREL</a> |
    <a href="https://hatteras-island.com/rods/">RODS</a> |
    <a href="https://hatteras-island.com/reels/">REELS</a> |
    <a href="https://hatteras-island.com/tools/">TOOLS</a> |
    <a href="https://hatteras-island.com/gear/">GEAR</a>
  </p>

  <!-- SOCIAL ICONS BELOW NAV LINKS -->
  <div style="margin-top:20px;">
    <a href="https://www.facebook.com/frankandfransavon" target="_blank" style="margin:0 10px;display:inline-block;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.495v-9.294H9.691V11.01h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12z"/>
      </svg>
    </a>

    <a href="https://www.instagram.com/frankandfrans/" target="_blank" style="margin:0 10px;display:inline-block;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#E1306C" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.75 2h8.5C19.55 2 22 4.45 22 7.75v8.5C22 19.55 19.55 22 16.25 22h-8.5C4.45 22 2 19.55 2 16.25v-8.5C2 4.45 4.45 2 7.75 2zm0 1.5C5.27 3.5 3.5 5.27 3.5 7.75v8.5c0 2.48 1.77 4.25 4.25 4.25h8.5c2.48 0 4.25-1.77 4.25-4.25v-8.5c0-2.48-1.77-4.25-4.25-4.25h-8.5zM12 7a5 5 0 110 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 100 7 3.5 3.5 0 0 0 0-7zm4.75-.88a1.13 1.13 0 110 2.26 1.13 1.13 0 0 0 0-2.26z"/>
      </svg>
    </a>
  </div>

  <p style="font-size:12px;color:#777;margin-top:20px;">
    You're receiving this because you opted in at Frank & Fran's.<br>
    <a href="https://hatteras-island.com/fresh-bait-alert-sign-up/">Unsubscribe</a>
  </p>
</div>
`;


    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      bcc: emails,
      subject: "Frank & Fran Fresh Bait Alert!",
      html,
      attachments: [{ filename: 'logo.png', path: logoPath, cid: 'logo' }]
    });

    res.send(`Email sent to ${emails.length} recipients`);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed');
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
