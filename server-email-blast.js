
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
app.use(express.urlencoded({ extended: true }));

app.post('/send-blast', upload.fields([
  { name: 'csv' }, { name: 'logo' }, { name: 'product' }
]), async (req, res) => {
  try {
    const emails = [];
    const csvFilePath = req.files['csv'][0].path;

    // Parse emails with "Receive marketing emails" = 1
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

    if (emails.length === 0) return res.send('No valid emails found in CSV.');

    const messageText = req.body.message || '';
    const logoPath = req.files['logo'][0].path;
    const productPath = req.files['product'][0].path;

    const subject = req.body.useCurrentSubject
      ? "Frank & Fran Fresh Bait Alert!"
      : (req.body.customSubject || "Frank & Fran Fresh Bait Alert!");

    const transporter = nodemailer.createTransport({
      host: 'mail.hatteras-island.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

  const html = `
  <div style="text-align:center;">
    <img src="cid:logo" style="max-width: 200px;"><br>
    <h2 style="color:#0078a0;">Fresh Bait Alert!</h2>
    <p>${messageText}</p>
    <img src="cid:product" style="max-width:100%; margin-top: 10px;"><br>
    <p style="font-size:12px;color:#777;">
      You're receiving this because you opted in at Frank & Fran's. <br>
      Need to unsubscribe? 
      <a href="https://hatteras-island.com/fresh-bait-alert-sign-up/">Click here</a>
    </p>
  </div>
`;

    const mailOptions = {
      from: process.env.MAIL_FROM,
      bcc: emails,
      subject,
      html,
      attachments: [
        { filename: 'logo.jpg', path: logoPath, cid: 'logo' },
        { filename: 'product.jpg', path: productPath, cid: 'product' }
      ]
    };

    await transporter.sendMail(mailOptions);
   res.send(`✅ Email sent to ${emails.length} recipients`);


    fs.unlinkSync(csvFilePath);
    fs.unlinkSync(logoPath);
    fs.unlinkSync(productPath);
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Failed to send email');
  }
});

app.listen(PORT, () => {
  console.log(\`✅ Server running on port \${PORT}\`);
});
