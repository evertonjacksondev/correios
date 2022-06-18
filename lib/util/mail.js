const nodemailer = require('nodemailer');

const sendMail = async (to, subject, message) => {



  let transporter = nodemailer.createTransport({
    // host: 'smtp.kinghost.net',
    // port: 587,
    // secure: false,
    // auth: {
    //   user: 'contato@digigrow.com.br', 
    //   pass: 'em@il*265dg',
    // },
    service: 'gmail',
    auth: {
      user: 'digigrow@aigroup.com.br',
      pass: 'infr@c@r2018*'
    }
  });

  let mailOptions = {
    from: 'digigrow@aigroup.com.br',
    to,
    subject,
    html: message
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendMail }