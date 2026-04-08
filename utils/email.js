const sendEmail = async (options) => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "E-Com Support", email: "urj7905@gmail.com" },
      to: [{ email: options.email }],
      subject: options.subject,
      htmlContent: options.html,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(JSON.stringify(err));
  }
};

module.exports = sendEmail;