import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OTPInput } from "./otp-input";

async function login(formData: FormData) {
  "use server";
  const passcode = formData.get("passcode") as string;
  if (passcode === process.env.PASSCODE) {
    cookies().set("brain-auth", process.env.AUTH_SECRET!, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    redirect("/");
  }
  redirect("/login?error=1");
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 bg-background">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
            <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
            <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
            <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
            <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
            <path d="M6 18a4 4 0 0 1-1.967-.516" />
            <path d="M19.967 17.484A4 4 0 0 1 18 18" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">Enter your passcode</p>
      </div>
      <OTPInput action={login} error={!!searchParams.error} />
    </div>
  );
}
