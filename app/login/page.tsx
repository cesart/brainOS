import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UnicornScene from "unicornstudio-react/next";
import { OTPInput } from "./otp-input";

async function login(formData: FormData) {
  "use server";
  const passcode = formData.get("passcode") as string;
  if (passcode === process.env.PASSCODE) {
    (await cookies()).set("brain-auth", process.env.AUTH_SECRET!, {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 border border-border rounded-2xl overflow-hidden p-8 w-full max-w-sm">
        <div className="w-full rounded-xl overflow-hidden">
          <UnicornScene
            projectId="iHobY0fcDE7oTK9pZRAo"
            sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.4/dist/unicornStudio.umd.js"
            width="100%"
            height="240px"
          />
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="text-sm text-muted-foreground">Enter your passcode</p>
        </div>
        <OTPInput action={login} error={!!searchParams.error} />
      </div>
    </div>
  );
}
