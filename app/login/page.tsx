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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center w-full max-w-[360px] border border-border rounded-2xl overflow-hidden">
        {/* Scene — flush to card edges, no padding */}
        <div className="w-full">
          <UnicornScene
            projectId="iHobY0fcDE7oTK9pZRAo"
            sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.4/dist/unicornStudio.umd.js"
            width="100%"
            height="120px"
          />
        </div>

        {/* Content */}
        <div className="flex flex-col items-center gap-8 px-8 py-8 w-full">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h1 className="text-lg font-mono font-semibold text-foreground">brainOS</h1>
            <p className="text-sm text-muted-foreground">Enter your passcode to continue</p>
          </div>
          <OTPInput action={login} error={!!searchParams.error} />
        </div>
      </div>
    </div>
  );
}
