import { Resend } from "resend"

// ponytail: plain HTML string, no React Email — overkill for portfolio
const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`
  const { error } = await resend.emails.send({
    from: "NewsPortal <noreply@mail.newsportal.my.id>",
    to,
    subject: "Reset Password — NewsPortal",
    html: `
      <p>Halo,</p>
      <p>Kami menerima permintaan reset password untuk akun NewsPortal kamu.</p>
      <p>Klik link berikut untuk membuat password baru (berlaku <strong>1 jam</strong>):</p>
      <p><a href="${url}">${url}</a></p>
      <p>Jika kamu tidak meminta reset password, abaikan email ini.</p>
      <br/>
      <p>Tim NewsPortal</p>
    `,
  })
  if (error) throw new Error(error.message)
}
